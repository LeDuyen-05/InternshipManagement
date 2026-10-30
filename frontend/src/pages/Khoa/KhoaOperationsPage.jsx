import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'
import ThucTapTuTimFacultyPanel from '../../components/khoa/ThucTapTuTimFacultyPanel'
import KhoaChotPhanBoPanel from '../../components/khoa/KhoaChotPhanBoPanel'
import KhoaPhongVanPanel from '../../components/khoa/KhoaPhongVanPanel'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import DocumentAttachments from '../../components/common/DocumentAttachments'

const statusLabel = {
  ChoDuyet: 'Chờ duyệt',
  DaDuyet: 'Đã duyệt',
  TuChoi: 'Từ chối',
  DaNop: 'Đã nộp',
  ChuaNop: 'Chưa nộp',
  YeuCauSua: 'Yêu cầu sửa',
}

export default function KhoaOperationsPage({ mode }) {
  const [data, setData] = useState(null)
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

  useEffect(() => {
    setRegistrationTab(resolveRegistrationTab(requestedType))
  }, [requestedType])

  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(false)

  // Bộ lọc tìm kiếm & trạng thái cho Tab Đăng ký
  const [searchQuery, setSearchQuery] = useState(requestedStudent)
  const [statusFilter, setStatusFilter] = useState('ALL')

  useEffect(() => {
    if (requestedStudent) setSearchQuery(requestedStudent)
  }, [requestedStudent])

  const requestVersion = useRef(0)
  const currentKey = `${mode}|${round}`
  const keyRef = useRef(currentKey)
  keyRef.current = currentKey
  const isRegistration = mode === 'registrations'
  const canEdit = !roundLoading && !roundLock.structureBlocked && ['ChuaBatDau', 'DangDienRa'].includes(selectedDot?.trangThai)

  const load = useCallback(async () => {
    if (!round) return
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get(mode === 'registrations' ? '/khoa/dang-ky' : '/khoa/theo-doi', {
        params: round ? { maDot: round } : {},
      })
      if (keyRef.current !== currentKey || version !== requestVersion.current) return
      setData(response.data)
      setError('')
    } catch (e) {
      if (keyRef.current === currentKey && version === requestVersion.current) {
        setError(e.response?.data?.message || 'Không tải được dữ liệu.')
      }
    } finally {
      if (keyRef.current === currentKey && version === requestVersion.current) setLoading(false)
    }
  }, [mode, round, currentKey])

  useEffect(() => {
    const versionRef = requestVersion
    setData(null)
    load()
    return () => {
      versionRef.current++
    }
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
      setSuccessMsg(`Đã ${actionText} nguyện vọng thành công!`)
      await load()
    } catch (e) {
      setError(e.response?.data?.message || 'Không cập nhật được trạng thái.')
    } finally {
      setBusy('')
    }
  }

  const reviewReport = async (id, status) => {
    if (roundLock.blocked || loading || busy) return
    const actionText = status === 'DaDuyet' ? 'Phê duyệt' : 'Yêu cầu sửa'
    if (!window.confirm(`Xác nhận ${actionText} báo cáo này?`)) return

    setBusy(id)
    setError('')
    setSuccessMsg('')
    try {
      await apiClient.put(`/khoa/theo-doi/${encodeURIComponent(id)}/duyet`, { trangThai: status })
      setSuccessMsg(`Đã cập nhật trạng thái báo cáo thành: ${statusLabel[status] || status}`)
      await load()
    } catch (e) {
      setError(e.response?.data?.message || 'Không cập nhật được trạng thái báo cáo.')
    } finally {
      setBusy('')
    }
  }

  const rows = useMemo(() => {
    return isRegistration ? (Array.isArray(data) ? data : []) : (data?.reports || [])
  }, [isRegistration, data])

  // Lọc dữ liệu theo từ khóa tìm kiếm & trạng thái
  const filteredRows = useMemo(() => {
    if (!isRegistration) return rows

    return rows.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.trangThai === statusFilter
      if (!matchStatus) return false

      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const svName = (r.sinhVien || '').toLowerCase()
      const svCode = (r.maSinhVien || '').toLowerCase()
      const compName = (r.congTy || '').toLowerCase()
      const className = (r.lop || '').toLowerCase()

      return svName.includes(q) || svCode.includes(q) || compName.includes(q) || className.includes(q)
    })
  }, [isRegistration, rows, statusFilter, searchQuery])

  // Thống kê nhanh số lượng
  const countChoDuyet = useMemo(() => rows.filter((r) => r.trangThai === 'ChoDuyet').length, [rows])
  const countDaDuyet = useMemo(() => rows.filter((r) => r.trangThai === 'DaDuyet').length, [rows])
  const countTuChoi = useMemo(() => rows.filter((r) => r.trangThai === 'TuChoi').length, [rows])

  const pagination = usePagination(filteredRows, JSON.stringify([mode, round, registrationTab, statusFilter, searchQuery]))

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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-xs disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin text-blue-600' : ''}`}>
                refresh
              </span>
              <span>Làm mới</span>
            </button>

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

        {/* Khối Bento Thống kê KPI */}
        {isRegistration && registrationTab === 'school' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">how_to_reg</span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Tổng nguyện vọng</p>
                <p className="text-xl font-black text-slate-900">{rows.length}</p>
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
        ) : (
          data && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng báo cáo</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{data.total || 0}</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm text-center">
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đã duyệt</p>
                <p className="text-xl font-black text-emerald-700 mt-0.5">{data.approved || 0}</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm text-center">
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Chờ duyệt</p>
                <p className="text-xl font-black text-amber-700 mt-0.5">{data.pending || 0}</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-sm text-center">
                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Yêu cầu sửa</p>
                <p className="text-xl font-black text-rose-700 mt-0.5">{data.revision || 0}</p>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm text-center">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chưa nộp</p>
                <p className="text-xl font-black text-slate-600 mt-0.5">{data.missing || 0}</p>
              </div>
            </div>
          )
        )}

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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
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
            {/* Header Danh mục */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-slate-800">
                {isRegistration ? 'Danh sách nguyện vọng đăng ký trên hệ thống' : 'Danh sách báo cáo'}
              </h3>

              {/* Thanh công cụ: Tìm kiếm & Lọc trạng thái */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative min-w-[240px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm mã SV, họ tên, công ty..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>

                {isRegistration && (
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {[
                      { key: 'ALL', label: 'Tất cả' },
                      { key: 'ChoDuyet', label: `Chờ duyệt (${countChoDuyet})` },
                      { key: 'DaDuyet', label: `Đã duyệt (${countDaDuyet})` },
                      { key: 'TuChoi', label: `Từ chối (${countTuChoi})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setStatusFilter(tab.key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                          statusFilter === tab.key
                            ? 'bg-blue-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bảng dữ liệu: Render table để hỗ trợ test pagination và mapper */}
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
                    ) : (
                      <>
                        <th className="py-3 px-4">Mã SV</th>
                        <th className="py-3 px-4">Sinh viên</th>
                        <th className="py-3 px-4">Lớp</th>
                        <th className="py-3 px-4">Đợt</th>
                        <th className="py-3 px-4">Hạn báo cáo</th>
                        <th className="py-3 px-4">Ngày nộp</th>
                        <th className="py-3 px-4">Nội dung</th>
                        <th className="py-3 px-4 text-right">Trạng thái</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pagination.items.map((r, i) => (
                    <tr key={r.maDangKy || r.maTienDo || i} className="hover:bg-slate-50/80 transition">
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
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition border border-rose-200 shadow-xs disabled:opacity-50"
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
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[16px]">check</span>
                                  <span>Duyệt hồ sơ</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={!!busy || !canEdit || loading}
                                  onClick={() => update(r.maDangKy, 'TuChoi')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-semibold transition border border-slate-200 disabled:opacity-50"
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
                      ) : (
                        <>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{r.maSinhVien}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{r.sinhVien}</td>
                          <td className="py-3.5 px-4 text-slate-600">{r.lop}</td>
                          <td className="py-3.5 px-4 text-slate-500">{r.dot}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {r.mocThoiGian ? String(r.mocThoiGian).slice(0, 10) : '—'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">
                            {r.ngayNop ? String(r.ngayNop).slice(0, 10) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate">
                            {r.noiDungBaoCao || 'Chưa có nội dung'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <DocumentAttachments key={r.maTienDo} kind="Progress" resourceId={r.maTienDo} title="Tệp báo cáo tiến độ" readOnly defer />
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                  r.trangThaiDuyet === 'DaDuyet'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : r.trangThaiDuyet === 'YeuCauSua'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : r.trangThaiDuyet === 'DaNop'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {statusLabel[r.trangThaiDuyet] || r.trangThaiDuyet}
                              </span>
                              {r.trangThaiDuyet !== 'DaDuyet' && (
                                <Link
                                  to="/khoa/han-bao-cao"
                                  className="text-[11px] font-medium text-blue-600 hover:underline"
                                >
                                  Quản lý hạn / Mở bổ sung →
                                </Link>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {!filteredRows.length && (
                    <tr>
                      <td colSpan={isRegistration ? 9 : 8} className="py-12 text-center text-slate-400">
                        {loading ? 'Đang tải dữ liệu…' : 'Chưa có dữ liệu phù hợp.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination
                pagination={pagination}
                label={isRegistration ? 'nguyện vọng thực tập' : 'báo cáo tiến độ'}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
