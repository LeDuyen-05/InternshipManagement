import Pagination from '../../components/common/Pagination'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'
import ThucTapTuTimFacultyPanel from '../../components/khoa/ThucTapTuTimFacultyPanel'
import KhoaChotPhanBoPanel from '../../components/khoa/KhoaChotPhanBoPanel'
import KhoaPhongVanPanel from '../../components/khoa/KhoaPhongVanPanel'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import DocumentAttachments from '../../components/common/DocumentAttachments'
import { downloadExcelResponse, parseBlobError } from '../../utils/exportHuitExcel'

const statusLabel = {
  ChoDuyet: 'Chờ duyệt',
  DaDuyet: 'Đã duyệt',
  TuChoi: 'Từ chối',
  DaNop: 'Đã nộp',
  ChuaNop: 'Chưa nộp',
  YeuCauSua: 'Yêu cầu sửa',
}

export default function KhoaOperationsPage({ mode }) {
  const { selectedDot, loading: roundLoading, roundLock } = useDotThucTap()
  const [searchParams] = useSearchParams()
  const requestedType = searchParams.get('loai')
  const requestedStudent = searchParams.get('maSV') || ''
  const round = selectedDot?.maDot || ''

  const resolveRegistrationTab = (type) => {
    if (type === 'tu-tim') return 'self'
    if (type === 'chot-phan-bo') return 'placement'
    if (type === 'phong-van') return 'interviews'
    return 'school'
  }
  const [registrationTab, setRegistrationTab] = useState(resolveRegistrationTab(requestedType))
  const [progressTab, setProgressTab] = useState('summary') // 'summary' (1. Tổng hợp theo SV) | 'detail' (2. Chi tiết từng báo cáo tuần)
  const [detailStudent, setDetailStudent] = useState(null)
  const [detailReports, setDetailReports] = useState([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  const isRegistration = mode === 'registrations'
  const scope = `${mode}|${round}|${isRegistration ? registrationTab : progressTab}`
  const currentScope = useRef(scope)
  currentScope.current = scope

  useEffect(() => {
    setRegistrationTab(resolveRegistrationTab(requestedType))
  }, [requestedType])

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Server Pagination & Filter state
  const [loadedScope, setLoadedScope] = useState(null)
  const [responsePage, setPagedData] = useState({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    summary: {},
  })
  const pagedData = loadedScope === scope ? responsePage : { items: [], totalCount: 0, summary: {} }
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchQuery, setSearchQuery] = useState(requestedStudent)
  const [debouncedSearch, setDebouncedSearch] = useState(requestedStudent)
  const [statusFilter, setStatusFilter] = useState('')
  const [phamViFilter, setPhamViFilter] = useState('HienHanh')

  useEffect(() => {
    if (requestedStudent) setSearchQuery(requestedStudent)
  }, [requestedStudent])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset pagination when mode or round or sub-tab changes
  useEffect(() => {
    setLoadedScope(null)
    setBusy('')
    setSuccessMsg('')
    setError('')
    setPage(1)
    setStatusFilter('')
    setPagedData({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 20,
      summary: {},
    })
  }, [round, mode, progressTab, registrationTab])

  const requestVersion = useRef(0)
  const canEdit = loadedScope === scope && !roundLoading && !roundLock.structureBlocked && ['ChuaBatDau', 'DangDienRa'].includes(selectedDot?.trangThai)

  const load = useCallback(async () => {
    if (currentScope.current !== scope) return
    const version = ++requestVersion.current
    if (!round) {
      setPagedData({ items: [], totalCount: 0, page: 1, pageSize: 20, summary: {} })
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const endpoint = isRegistration
        ? '/khoa/dang-ky/paged'
        : progressTab === 'summary'
        ? '/khoa/theo-doi/sinh-vien/paged'
        : '/khoa/theo-doi/paged'

      const params = {
        page,
        pageSize,
        maDot: round,
        search: debouncedSearch || undefined,
        trangThai: statusFilter ? statusFilter : undefined,
      }
      if (!isRegistration) {
        params.phamVi = phamViFilter || 'HienHanh'
      }

      const response = await apiClient.get(endpoint, { params })
      if (version !== requestVersion.current || currentScope.current !== scope) return
      const raw = response.data
      if (raw && typeof raw === 'object' && Array.isArray(raw.items)) {
        setPagedData(raw)
      } else if (Array.isArray(raw)) {
        setPagedData({ items: raw, totalCount: raw.length, page: 1, pageSize: 20, summary: {} })
      } else {
        setPagedData({ items: [], totalCount: 0, page: 1, pageSize: 20, summary: {} })
      }
      setLoadedScope(scope)
      setError('')
    } catch (e) {
      if (version === requestVersion.current) {
        if (currentScope.current !== scope) return
        setLoadedScope(null)
        setError(e.response?.data?.message || 'Không tải được dữ liệu.')
      }
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [isRegistration, progressTab, round, scope, page, pageSize, debouncedSearch, statusFilter, phamViFilter])

  useEffect(() => {
    load()
    const ref = requestVersion
    return () => { ref.current++ }
  }, [load])

  const update = async (id, status) => {
    if (!canEdit || loading || busy) return
    const actionText = status === 'DaDuyet' ? 'phê duyệt' : 'từ chối / đóng'
    if (!window.confirm(`Xác nhận ${actionText} nguyện vọng đăng ký thực tập này?`)) return

    setBusy(id)
    setError('')
    setSuccessMsg('')
    try {
      await apiClient.put(`/khoa/dang-ky/${encodeURIComponent(id)}/duyet`, { trangThai: status })
      if (currentScope.current !== scope) return
      setSuccessMsg(`Đã ${actionText} nguyện vọng thành công!`)
      await load()
    } catch (e) {
      if (currentScope.current !== scope) return
      setError(e.response?.data?.message || 'Không cập nhật được trạng thái.')
    } finally {
      if (currentScope.current === scope) setBusy('')
    }
  }

  const _reviewReport = async (id, status) => {
    if (roundLock.blocked || loading || busy) return
    const actionText = status === 'DaDuyet' ? 'Phê duyệt' : 'Yêu cầu sửa'
    if (!window.confirm(`Xác nhận ${actionText} báo cáo này?`)) return

    setBusy(id)
    setError('')
    setSuccessMsg('')
    try {
      await apiClient.put(`/khoa/theo-doi/${encodeURIComponent(id)}/duyet`, { trangThai: status })
      if (currentScope.current !== scope) return
      setSuccessMsg(`Đã cập nhật trạng thái báo cáo thành: ${statusLabel[status] || status}`)
      await load()
    } catch (e) {
      if (currentScope.current !== scope) return
      setError(e.response?.data?.message || 'Không cập nhật được trạng thái báo cáo.')
    } finally {
      if (currentScope.current === scope) setBusy('')
    }
  }

  const handleExport = async () => {
    if (!round || exporting) return
    setExporting(true)
    setError('')
    setSuccessMsg('')
    try {
      let endpoint, defaultFileName
      if (isRegistration) {
        endpoint = '/khoa/dang-ky/export-xlsx'
        defaultFileName = `DanhSachDangKy_${round}_${new Date().toISOString().slice(0, 10)}.xlsx`
      } else if (progressTab === 'summary') {
        endpoint = '/khoa/theo-doi/sinh-vien/export-xlsx'
        defaultFileName = `TongHopTienDo_${round}_${new Date().toISOString().slice(0, 10)}.xlsx`
      } else {
        endpoint = '/khoa/theo-doi/export-xlsx'
        defaultFileName = `ChiTietTienDo_${round}_${new Date().toISOString().slice(0, 10)}.xlsx`
      }

      const params = {
        maDot: round,
        search: debouncedSearch || undefined,
        trangThai: statusFilter ? statusFilter : undefined,
      }
      if (!isRegistration) {
        params.phamVi = phamViFilter || 'HienHanh'
      }

      const response = await apiClient.get(endpoint, {
        params,
        responseType: 'blob',
      })
      downloadExcelResponse(response, defaultFileName)
      setSuccessMsg('Xuất file Excel thành công!')
    } catch (err) {
      const msg = await parseBlobError(err)
      setError(msg || 'Không thể xuất file Excel. Vui lòng thử lại.')
    } finally {
      setExporting(false)
    }
  }

  const openStudentDetail = async (student) => {
    setDetailStudent(student)
    setLoadingDetails(true)
    try {
      const res = await apiClient.get(`/TienDoThucTap/sinhvien/${encodeURIComponent(student.maSinhVien)}`, {
        params: { maDot: round },
      })
      setDetailReports(Array.isArray(res.data) ? res.data : [])
    } catch {
      setDetailReports([])
    } finally {
      setLoadingDetails(false)
    }
  }

  // Quick stats from summary
  const safeItems = Array.isArray(pagedData?.items) ? pagedData.items : []
  const summary = (pagedData && typeof pagedData.summary === 'object' && pagedData.summary) ? pagedData.summary : {}
  const countChoDuyet = summary.choDuyet || 0
  const countDaDuyet = summary.daDuyet || 0
  const countTuChoi = summary.tuChoi || 0

  const totalItems = pagedData?.totalCount || safeItems.length || 0
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const start = totalItems > 0 ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, totalItems)

  const paginationProps = {
    page,
    pageSize,
    totalItems,
    totalPages,
    start,
    end,
    setPage,
    setPageSize: (size) => {
      setPageSize(Number(size))
      setPage(1)
    },
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Banner Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
              <span>FIT Portal</span>
              <span>/</span>
              <span>Văn phòng Khoa</span>
              <span>/</span>
              <span className="text-blue-700 font-bold">
                {isRegistration ? 'Tiếp nhận & Xét duyệt hồ sơ' : 'Theo dõi tiến độ thực tập'}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                {isRegistration ? 'Học vụ & Tiếp nhận' : 'Giám sát tiến độ học vụ'}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-600">
                {selectedDot?.tenDot || 'Chưa chọn đợt thực tập'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {isRegistration ? 'Tiếp nhận & Xét duyệt hồ sơ thực tập' : 'Theo dõi tiến độ thực tập toàn khoa'}
            </h1>
            {isRegistration && (
              <span className="sr-only">cả hai do Khoa CNTT quản lý</span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={loading || !!busy}
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin text-blue-600' : ''}`}>
                refresh
              </span>
              <span>Làm mới</span>
            </button>

            {(!isRegistration || registrationTab === 'school') && (
              <button
                type="button"
                disabled={exporting || loading || totalItems === 0}
                onClick={handleExport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
                title={
                  !isRegistration && progressTab === 'summary'
                    ? 'Xuất bảng tổng hợp tiến độ sinh viên (1 dòng = 1 sinh viên)'
                    : 'Xuất dữ liệu theo bộ lọc đang áp dụng'
                }
              >
                <span className="material-symbols-outlined text-[18px]">table_chart</span>
                <span>
                  {exporting
                    ? 'Đang xuất…'
                    : !isRegistration && progressTab === 'summary'
                    ? 'Xuất bảng tổng hợp SV (.xlsx)'
                    : 'Xuất Excel (.xlsx)'}
                </span>
              </button>
            )}

            {isRegistration ? (
              <Link
                to="/khoa/phan-cong"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 text-xs font-semibold transition shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
                <span>Phân công GVHD</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            ) : (
              <>
                <Link
                  to="/khoa/han-bao-cao"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 text-xs font-semibold transition shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">event_busy</span>
                  <span>Quản lý hạn nộp & Mở bổ sung</span>
                </Link>
                <Link
                  to="/khoa"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  <span>Tổng quan</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Thông báo lỗi & thành công */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-3 shadow-sm">
            <span className="material-symbols-outlined text-rose-600 text-[20px]">error</span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center gap-3 shadow-sm">
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {!round ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 font-bold">
              <span className="material-symbols-outlined text-[32px]">event_busy</span>
            </div>
            <h3 className="text-base font-bold text-slate-800">Không có đợt phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Không tìm thấy đợt thực tập nào được chọn hoặc phù hợp. Vui lòng chọn đợt thực tập ở thanh điều hướng.
            </p>
          </div>
        ) : (
          <>
            {/* Khối Bento Thống kê KPI */}
            {isRegistration && registrationTab === 'school' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">how_to_reg</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Tổng nguyện vọng</p>
                    <p className="text-xl font-black text-slate-900">{summary.total ?? 0}</p>
                    <p className="text-[11px] text-slate-500 font-medium truncate">({summary.tongSinhVien ?? 0} sinh viên)</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-sm flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">pending_actions</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider truncate">Cần duyệt ngay</p>
                    <p className="text-xl font-black text-amber-700">{countChoDuyet}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-sm flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">check_circle</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider truncate">Đã phê duyệt</p>
                    <p className="text-xl font-black text-emerald-700">{countDaDuyet}</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">cancel</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Đã từ chối</p>
                    <p className="text-xl font-black text-slate-900">{countTuChoi}</p>
                  </div>
                </div>
              </div>
            ) : !isRegistration ? (
              <>
                {/* Khối Bento Thống kê KPI */}
                {progressTab === 'summary' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng sinh viên</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">{summary.tongSinhVien ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Đúng tiến độ</p>
                      <p className="text-xl font-black text-blue-700 mt-0.5">{summary.dangThucHien ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Chậm tiến độ</p>
                      <p className="text-xl font-black text-rose-700 mt-0.5">{summary.chamTienDo ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Có bài chờ duyệt</p>
                      <p className="text-xl font-black text-amber-700 mt-0.5">{summary.choDuyet ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Hoàn tất 100%</p>
                      <p className="text-xl font-black text-emerald-700 mt-0.5">{summary.hoanTat ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chưa nộp bài</p>
                      <p className="text-xl font-black text-slate-600 mt-0.5">{summary.chuaNop ?? 0}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng báo cáo</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">{summary.tongBaoCao ?? summary.total ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đã duyệt</p>
                      <p className="text-xl font-black text-emerald-700 mt-0.5">{summary.baoCaoDaDuyet ?? summary.approved ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Chờ duyệt</p>
                      <p className="text-xl font-black text-amber-700 mt-0.5">{summary.baoCaoChoDuyet ?? summary.pending ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Yêu cầu sửa</p>
                      <p className="text-xl font-black text-rose-700 mt-0.5">{summary.baoCaoYeuCauSua ?? summary.revision ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chưa nộp</p>
                      <p className="text-xl font-black text-slate-600 mt-0.5">{summary.baoCaoChuaNop ?? summary.missing ?? 0}</p>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-sm text-center">
                      <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Lưu trữ</p>
                      <p className="text-xl font-black text-indigo-700 mt-0.5">{summary.archived ?? 0}</p>
                    </div>
                  </div>
                )}

                {/* Thanh Tabs phân luồng Bento pills cho mode Theo dõi tiến độ */}
                <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Chế độ theo dõi tiến độ">
                  {[
                    { id: 'summary', label: '1. Tổng hợp theo Sinh viên', icon: 'groups', badge: summary.chamTienDo > 0 ? `${summary.chamTienDo} chậm nộp` : null, badgeClass: 'bg-rose-100 text-rose-800' },
                    { id: 'detail', label: '2. Chi tiết từng bài báo cáo tuần', icon: 'view_list', badge: (summary.baoCaoChoDuyet || summary.pending) > 0 ? `${summary.baoCaoChoDuyet || summary.pending} chờ duyệt` : null, badgeClass: 'bg-amber-100 text-amber-800' },
                  ].map((tab) => {
                    const active = progressTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          setProgressTab(tab.id)
                          setStatusFilter('')
                          setPage(1)
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-blue-700 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                        <span>{tab.label}</span>
                        {tab.badge && (
                          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-white/20 text-white' : tab.badgeClass}`}>
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : null}

            {/* Thanh Tabs phân luồng Bento pills */}
            {isRegistration && (
              <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-1.5 overflow-x-auto" role="tablist" aria-label="Loại hồ sơ">
                {[
                  { id: 'school', label: '1. Đăng ký nguyện vọng', icon: 'domain', badge: countChoDuyet > 0 ? countChoDuyet : null },
                  { id: 'interviews', label: '2. Theo dõi phỏng vấn', icon: 'event_available' },
                  { id: 'placement', label: '3. Hạn xác nhận & Chốt phân bổ', icon: 'task_alt' },
                  { id: 'self', label: '4. Hồ sơ tự tìm nơi thực tập', icon: 'person_search' },
                ].map((tab) => {
                  const active = registrationTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setRegistrationTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-blue-700 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Nội dung Tab con */}
            {isRegistration && registrationTab === 'placement' && (
              <KhoaChotPhanBoPanel maDot={round} canEdit={canEdit} />
            )}

            {isRegistration && registrationTab === 'interviews' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
                <KhoaPhongVanPanel maDot={round} canEdit={canEdit} />
              </div>
            )}

            {isRegistration && registrationTab === 'self' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
                <ThucTapTuTimFacultyPanel maDot={round} canEdit={canEdit} />
              </div>
            )}

            {/* Tab Đăng ký trên hệ thống (hoặc mode Theo dõi tiến độ) */}
            {(!isRegistration || registrationTab === 'school') && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
                {/* Header Danh mục & Thanh lọc */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">
                      {isRegistration
                        ? 'Danh sách nguyện vọng đăng ký trên hệ thống'
                        : progressTab === 'summary'
                        ? 'Bảng tổng hợp tiến độ thực tập sinh viên'
                        : 'Danh sách chi tiết bài báo cáo tuần'}
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {totalItems} {isRegistration ? 'nguyện vọng' : progressTab === 'summary' ? 'sinh viên' : 'báo cáo'}
                    </span>
                  </div>

                  {/* Thanh công cụ: Tìm kiếm & Lọc trạng thái / phạm vi */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                    <div className="relative min-w-[220px]">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                        search
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={
                          isRegistration
                            ? 'Tìm mã SV, họ tên, công ty...'
                            : progressTab === 'summary'
                            ? 'Tìm mã SV, họ tên...'
                            : 'Tìm mã SV, họ tên, nội dung...'
                        }
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                      />
                    </div>

                    {isRegistration ? (
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        {[
                          { key: '', label: 'Tất cả' },
                          { key: 'ChoDuyet', label: `Chờ duyệt (${countChoDuyet})` },
                          { key: 'DaDuyet', label: `Đã duyệt (${countDaDuyet})` },
                          { key: 'TuChoi', label: `Từ chối (${countTuChoi})` },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                              setStatusFilter(tab.key)
                              setPage(1)
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                              statusFilter === tab.key
                                ? 'bg-blue-700 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    ) : progressTab === 'summary' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Scope filter */}
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                          {[
                            { key: 'HienHanh', label: 'Hiện hành' },
                            { key: 'LuuTru', label: 'Lưu trữ' },
                            { key: 'TatCa', label: 'Tất cả' },
                          ].map((pv) => (
                            <button
                              key={pv.key}
                              type="button"
                              onClick={() => {
                                setPhamViFilter(pv.key)
                                setPage(1)
                              }}
                              className={`px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                                phamViFilter === pv.key
                                  ? 'bg-white text-blue-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {pv.label}
                            </button>
                          ))}
                        </div>

                        {/* Status filter for Summary */}
                        <div className="flex items-center gap-1 overflow-x-auto">
                          {[
                            { key: '', label: 'Tất cả học vụ' },
                            { key: 'DangThucHien', label: `Đúng tiến độ (${summary.dangThucHien ?? 0})` },
                            { key: 'ChamTienDo', label: `Chậm nộp (${summary.chamTienDo ?? 0})` },
                            { key: 'ChoDuyet', label: `Chờ duyệt (${summary.choDuyet ?? 0})` },
                            { key: 'HoanTat', label: `Hoàn tất (${summary.hoanTat ?? 0})` },
                            { key: 'ChuaNop', label: `Chưa nộp (${summary.chuaNop ?? 0})` },
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => {
                                setStatusFilter(tab.key)
                                setPage(1)
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                                statusFilter === tab.key
                                  ? 'bg-blue-700 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Scope filter */}
                        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
                          {[
                            { key: 'HienHanh', label: 'Hiện hành' },
                            { key: 'LuuTru', label: 'Lưu trữ' },
                            { key: 'TatCa', label: 'Tất cả' },
                          ].map((pv) => (
                            <button
                              key={pv.key}
                              type="button"
                              onClick={() => {
                                setPhamViFilter(pv.key)
                                setPage(1)
                              }}
                              className={`px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                                phamViFilter === pv.key
                                  ? 'bg-white text-blue-700 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {pv.label}
                            </button>
                          ))}
                        </div>

                        {/* Status filter for Detail */}
                        <div className="flex items-center gap-1 overflow-x-auto">
                          {[
                            { key: '', label: 'Tất cả TT' },
                            { key: 'DaNop', label: `Chờ duyệt (${summary.baoCaoChoDuyet ?? summary.pending ?? 0})` },
                            { key: 'DaDuyet', label: `Đã duyệt (${summary.baoCaoDaDuyet ?? summary.approved ?? 0})` },
                            { key: 'YeuCauSua', label: `Yêu cầu sửa (${summary.baoCaoYeuCauSua ?? summary.revision ?? 0})` },
                            { key: 'ChuaNop', label: `Chưa nộp (${summary.baoCaoChuaNop ?? summary.missing ?? 0})` },
                          ].map((tab) => (
                            <button
                              key={tab.key}
                              type="button"
                              onClick={() => {
                                setStatusFilter(tab.key)
                                setPage(1)
                              }}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                                statusFilter === tab.key
                                  ? 'bg-blue-700 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bảng dữ liệu server-paged */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                        {isRegistration ? (
                          <>
                            <th className="py-3 px-4">Mã SV</th>
                            <th className="py-3 px-4">Sinh viên</th>
                            <th className="py-3 px-4">Lớp</th>
                            <th className="py-3 px-4">Doanh nghiệp</th>
                            <th className="py-3 px-4">Đợt</th>
                            <th className="py-3 px-4">Ngày đăng ký</th>
                            <th className="py-3 px-4 text-center">Ưu tiên</th>
                            <th className="py-3 px-4">Trạng thái</th>
                            <th className="py-3 px-4 text-right">Thao tác</th>
                          </>
                        ) : progressTab === 'summary' ? (
                          <>
                            <th className="py-3 px-4 w-28">Mã SV</th>
                            <th className="py-3 px-4 min-w-[150px]">Sinh viên</th>
                            <th className="py-3 px-4 w-24">Lớp</th>
                            <th className="py-3 px-4 min-w-[170px]">Nơi thực tập</th>
                            <th className="py-3 px-4 min-w-[150px]">GVHD</th>
                            <th className="py-3 px-4 text-center w-28" title="Số tuần đã nộp / Tổng số tuần báo cáo trong đợt">Số tuần nộp</th>
                            <th className="py-3 px-4 w-36">Tiến độ</th>
                            <th className="py-3 px-4 text-center min-w-[140px]">Tình trạng học vụ</th>
                            <th className="py-3 px-4 text-right w-36">Thao tác</th>
                          </>
                        ) : (
                          <>
                            <th className="py-3 px-4 w-28">Mã SV</th>
                            <th className="py-3 px-4 min-w-[150px]">Sinh viên</th>
                            <th className="py-3 px-4 w-24">Lớp</th>
                            <th className="py-3 px-4 w-28">Hạn báo cáo</th>
                            <th className="py-3 px-4 w-28">Ngày nộp</th>
                            <th className="py-3 px-4 min-w-[180px]">Nội dung báo cáo</th>
                            <th className="py-3 px-4 text-center w-32">Trạng thái</th>
                            <th className="py-3 px-4 text-right w-36">Thao tác</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {safeItems.map((r, i) => (
                        <tr key={r.maDangKy || r.maTienDo || r.maSinhVien || i} className="hover:bg-slate-50/80 transition">
                          {isRegistration ? (
                            <>
                              <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{r.maSinhVien}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-900">{r.sinhVien}</td>
                              <td className="py-3.5 px-4 text-slate-600">{r.lop || '—'}</td>
                              <td className="py-3.5 px-4 font-semibold text-blue-900">{r.congTy}</td>
                              <td className="py-3.5 px-4 text-slate-500">{r.dot}</td>
                              <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                                {String(r.ngayDangKy || '').slice(0, 10)}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {r.thuTuUuTien || 1}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {r.trangThai === 'DaDuyet' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Đã duyệt
                                  </span>
                                )}
                                {r.trangThai === 'TuChoi' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                    Từ chối
                                  </span>
                                )}
                                {r.trangThai === 'ChoDuyet' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    Chờ duyệt
                                  </span>
                                )}
                                {!['DaDuyet', 'TuChoi', 'ChoDuyet'].includes(r.trangThai) && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                    {statusLabel[r.trangThai] || r.trangThai}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {r.daCoNoiThucTap && r.trangThai === 'ChoDuyet' ? (
                                  <div className="inline-flex flex-col items-end gap-1.5">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        disabled={!!busy || !canEdit || loading}
                                        onClick={() => update(r.maDangKy, 'TuChoi')}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition border border-rose-200 shadow-xs disabled:opacity-50 cursor-pointer"
                                        title="Sinh viên đã có nơi tiếp nhận chính thức trong đợt; đóng nguyện vọng phụ này để hoàn tất rà soát"
                                      >
                                        <span className="material-symbols-outlined text-[15px]">cancel</span>
                                        <span>Đóng nguyện vọng phụ</span>
                                      </button>
                                    </div>
                                    <Link
                                      to={`/khoa/sinh-vien-theo-dot?search=${encodeURIComponent(r.maSinhVien)}`}
                                      className="text-[11px] text-blue-600 hover:underline font-medium inline-flex items-center gap-0.5"
                                      title={r.tenNoiThucTap ? `Đã có phân bổ chính thức tại ${r.tenNoiThucTap}` : 'Xem tại hồ sơ đợt'}
                                    >
                                      <span>Đã có nơi TT: {r.tenNoiThucTap || 'Xem chi tiết'}</span>
                                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                                    </Link>
                                  </div>
                                ) : r.daCoNoiThucTap ? (
                                  <div className="inline-flex flex-col items-end gap-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                      Đã có nơi tiếp nhận
                                    </span>
                                    <Link
                                      to={`/khoa/sinh-vien-theo-dot?search=${encodeURIComponent(r.maSinhVien)}`}
                                      className="text-[11px] text-blue-600 hover:underline font-medium"
                                      title={r.tenNoiThucTap ? `Đang thực tập tại ${r.tenNoiThucTap}` : 'Xem tại hồ sơ đợt'}
                                    >
                                      {r.tenNoiThucTap ? `Tại ${r.tenNoiThucTap}` : 'Xử lý ở luồng nơi TT'} →
                                    </Link>
                                  </div>
                                ) : r.trangThai === 'ChoDuyet' ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={!!busy || !canEdit || loading}
                                      onClick={() => update(r.maDangKy, 'DaDuyet')}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">check</span>
                                      <span>Duyệt hồ sơ</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!!busy || !canEdit || loading}
                                      onClick={() => update(r.maDangKy, 'TuChoi')}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-semibold transition border border-slate-200 disabled:opacity-50 cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">close</span>
                                      <span>Từ chối</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">Đã xử lý</span>
                                )}
                              </td>
                            </>
                          ) : progressTab === 'summary' ? (
                            <>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{r.maSinhVien}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-900">{r.sinhVien}</td>
                              <td className="py-3.5 px-4 text-slate-600 font-medium">{r.lop || '—'}</td>
                              <td className="py-3.5 px-4 font-semibold text-blue-900">{r.noiThucTap || '—'}</td>
                              <td className="py-3.5 px-4 text-slate-700">
                                {r.giangVien && r.giangVien !== '—' ? (
                                  <span className="font-medium text-slate-800">{r.giangVien}</span>
                                ) : (
                                  <span className="text-slate-400 italic text-xs">Chưa phân công</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200"
                                  title={`Đã nộp ${r.soTuanDaNop} bài trên tổng số ${r.tongSoTuan} tuần báo cáo`}
                                >
                                  {r.soTuanDaNop} / {r.tongSoTuan} tuần
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        r.phanTramHoanThanh >= 100
                                          ? 'bg-emerald-500'
                                          : r.phanTramHoanThanh >= 50
                                          ? 'bg-blue-600'
                                          : 'bg-amber-500'
                                      }`}
                                      style={{ width: `${Math.min(100, r.phanTramHoanThanh)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold font-mono text-slate-700 w-11 text-right">
                                    {r.phanTramHoanThanh}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {r.tinhTrang === 'HoanTat' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    Hoàn tất ({r.tongSoTuan}/{r.tongSoTuan})
                                  </span>
                                )}
                                {r.tinhTrang === 'ChamTienDo' && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                                    title={`Có ${r.soTuanQuaHan} tuần quá hạn chưa nộp bài`}
                                  >
                                    <span className="material-symbols-outlined text-[14px]">warning</span>
                                    Chậm {r.soTuanQuaHan} tuần
                                  </span>
                                )}
                                {r.tinhTrang === 'DangThucHien' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                                    Đúng tiến độ
                                  </span>
                                )}
                                {r.tinhTrang === 'ChuaNop' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    Chưa nộp bài
                                  </span>
                                )}
                                {r.soTuanChoDuyet > 0 && r.tinhTrang !== 'HoanTat' && (
                                  <span className="block mt-1 text-[11px] font-semibold text-amber-700">
                                    ({r.soTuanChoDuyet} bài chờ duyệt)
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openStudentDetail(r)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition border border-blue-200 cursor-pointer shadow-xs"
                                    title="Xem lịch sử nộp báo cáo từng tuần của sinh viên này"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">visibility</span>
                                    <span>Xem chi tiết</span>
                                  </button>
                                  {r.soTuanQuaHan > 0 && (
                                    <Link
                                      to="/khoa/han-bao-cao"
                                      className="inline-flex items-center gap-0.5 px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition border border-rose-200"
                                      title="Mở hạn nộp bổ sung cho sinh viên có lý do chính đáng"
                                    >
                                      <span>Mở hạn</span>
                                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                    </Link>
                                  )}
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{r.maSinhVien}</td>
                              <td className="py-3.5 px-4 font-bold text-slate-900">{r.sinhVien}</td>
                              <td className="py-3.5 px-4 text-slate-600">{r.lop || '—'}</td>
                              <td className="py-3.5 px-4 font-mono text-slate-500">
                                {r.mocThoiGian ? String(r.mocThoiGian).slice(0, 10) : '—'}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-slate-500">
                                {r.ngayNop ? String(r.ngayNop).slice(0, 10) : <span className="text-slate-300 italic">—</span>}
                              </td>
                              <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate" title={r.noiDungBaoCao || ''}>
                                {r.noiDungBaoCao || <span className="text-slate-400 italic">Chưa có nội dung</span>}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex items-center justify-center gap-1">
                                  {r.maPhanBoLuuTru && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                      Lưu trữ
                                    </span>
                                  )}
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                      r.trangThaiDuyet === 'DaDuyet'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : r.trangThaiDuyet === 'YeuCauSua'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : r.trangThaiDuyet === 'DaNop'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {statusLabel[r.trangThaiDuyet] || r.trangThaiDuyet}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {r.trangThaiDuyet !== 'ChuaNop' ? (
                                    <DocumentAttachments
                                      key={r.maTienDo}
                                      kind="Progress"
                                      resourceId={r.maTienDo}
                                      title="Tệp báo cáo"
                                      readOnly
                                      defer
                                    />
                                  ) : (
                                    <Link
                                      to="/khoa/han-bao-cao"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition"
                                      title="Quản lý hạn nộp hoặc mở hạn bổ sung cho sinh viên"
                                    >
                                      <span>Mở hạn</span>
                                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                                    </Link>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {!safeItems.length && (
                        <tr>
                          <td colSpan={isRegistration ? 9 : progressTab === 'summary' ? 9 : 8} className="py-12 text-center text-slate-400">
                            {loading ? 'Đang tải dữ liệu…' : 'Chưa có dữ liệu phù hợp.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <Pagination
                    pagination={paginationProps}
                    label={
                      isRegistration
                        ? 'nguyện vọng thực tập'
                        : progressTab === 'summary'
                        ? 'sinh viên thực tập'
                        : 'báo cáo tiến độ'
                    }
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal chi tiết báo cáo từng tuần của sinh viên */}
        {detailStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">description</span>
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      Chi tiết tiến độ thực tập — {detailStudent.sinhVien} ({detailStudent.maSinhVien})
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 pl-10">
                    Lớp: <span className="font-semibold text-slate-700">{detailStudent.lop || '—'}</span> &bull; Nơi thực tập: <span className="font-semibold text-blue-900">{detailStudent.noiThucTap || '—'}</span> &bull; GVHD: <span className="font-semibold text-slate-700">{detailStudent.giangVien || '—'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailStudent(null)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {/* KPI Mini Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng số tuần</p>
                    <p className="text-base font-black text-slate-800">{detailStudent.tongSoTuan} tuần</p>
                  </div>
                  <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-center">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">Đã nộp bài</p>
                    <p className="text-base font-black text-blue-700">{detailStudent.soTuanDaNop} ({detailStudent.phanTramHoanThanh}%)</p>
                  </div>
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">Đã duyệt</p>
                    <p className="text-base font-black text-emerald-700">{detailStudent.soTuanDaDuyet}</p>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Chờ duyệt</p>
                    <p className="text-base font-black text-amber-700">{detailStudent.soTuanChoDuyet}</p>
                  </div>
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-center">
                    <p className="text-[10px] font-bold text-rose-600 uppercase">Chưa nộp / Quá hạn</p>
                    <p className="text-base font-black text-rose-700">{detailStudent.soTuanChuaNop}</p>
                  </div>
                </div>

                {/* Weekly Reports Table */}
                {loadingDetails ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
                    <p className="text-xs">Đang tải lịch sử báo cáo các tuần…</p>
                  </div>
                ) : detailReports.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Chưa có dữ liệu báo cáo tuần cho sinh viên này.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3 w-16 text-center">Tuần</th>
                          <th className="py-2.5 px-3 w-28">Hạn báo cáo</th>
                          <th className="py-2.5 px-3 w-28">Ngày nộp</th>
                          <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Nội dung & Nhận xét GV</th>
                          <th className="py-2.5 px-3 text-right w-36">Tệp & Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {(detailReports || []).map((item, idx) => (
                          <tr key={item.maTienDo || idx} className="hover:bg-slate-50/60 transition">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                              #{idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {item.mocThoiGian ? String(item.mocThoiGian).slice(0, 10) : '—'}
                              {item.hanNopBoSung && (
                                <span className="block text-[10px] text-amber-600 font-medium" title="Hạn nộp bổ sung">
                                  Hạn bù: {String(item.hanNopBoSung).slice(0, 10)}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {item.ngayNop ? String(item.ngayNop).slice(0, 10) : <span className="text-slate-300 italic">—</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  item.trangThaiDuyet === 'DaDuyet'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : item.trangThaiDuyet === 'YeuCauSua'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : item.trangThaiDuyet === 'DaNop'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {statusLabel[item.trangThaiDuyet] || item.trangThaiDuyet}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 space-y-1">
                              <div>
                                <span className="font-semibold text-slate-700">Báo cáo: </span>
                                <span className="text-slate-600">{item.noiDungBaoCao || <span className="text-slate-300 italic">Chưa nộp</span>}</span>
                              </div>
                              {(item.nhanXetGV || item.nhanXet) && (
                                <div className="bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60 text-[11px] text-amber-900">
                                  <span className="font-bold">GVHD nhận xét: </span>
                                  <span>{item.nhanXetGV || item.nhanXet}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.trangThaiDuyet !== 'ChuaNop' && (
                                  <DocumentAttachments
                                    key={item.maTienDo}
                                    kind="Progress"
                                    resourceId={item.maTienDo}
                                    title="Tệp báo cáo"
                                    readOnly
                                    defer
                                  />
                                )}
                                {item.trangThaiDuyet === 'ChuaNop' && (
                                  <Link
                                    to="/khoa/han-bao-cao"
                                    className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition"
                                    title="Mở hạn nộp bổ sung"
                                  >
                                    <span>Mở hạn</span>
                                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
                <span className="text-xs text-slate-500">
                  Chế độ giám sát học vụ &bull; FIT Portal
                </span>
                <button
                  type="button"
                  onClick={() => setDetailStudent(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
