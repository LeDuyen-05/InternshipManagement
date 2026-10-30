import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import { useRoundLock } from '../../hooks/useRoundLock'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { deadlineText } from '../../hooks/useGradeDeadline'
import { recruitmentStatusLabel } from '../../utils/recruitmentStatus'

const local = (value) =>
  value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : ''

const blankPlan = {
  maCongTy: '',
  viTriTuyen: '',
  yeuCau: '',
  soLuongNhan: '',
  moDangKy: '',
  hanDangKy: '',
  hoatDong: true,
  phienBan: 0,
  lyDo: '',
  viTris: [
    {
      maViTri: null,
      tenViTri: '',
      yeuCau: '',
      soLuongNhan: '',
      hoatDong: true,
    },
  ],
}

const blankCompany = {
  maCongTy: '',
  tenCongTy: '',
  viTriTuyen: '',
  yeuCau: '',
  thoiGian: '3 tháng',
  soLuongNhan: 5,
}

const historyText = (value) => {
  try {
    const x = JSON.parse(value)
    if (x && 'MaGVGioiThieu' in x && !('SoLuongNhan' in x))
      return `${x.companyId || ''} · GV đầu mối: ${x.MaGVGioiThieu || 'Không xác nhận GV'}`
  } catch {
    /* legacy audit */
  }
  try {
    const x = JSON.parse(value)
    return x
      ? `${x.companyId || ''} ${x.ViTriTuyen}; chỉ tiêu ${x.SoLuongNhan}; ${deadlineText(
          x.MoDangKy
        )} → ${deadlineText(x.HanDangKy)}; ${x.HoatDong ? 'nhận đơn theo lịch' : 'ngừng đơn mới'}`
      : 'Chưa có kế hoạch'
  } catch {
    return value
  }
}

export default function KhoaDoanhNghiepPage() {
  const { selectedDot, roundLock } = useDotThucTap()
  const round = selectedDot?.maDot || ''
  const currentRound = useRef(round)
  currentRound.current = round

  const [activeTab, setActiveTab] = useState('theo-dot') // 'theo-dot' | 'danh-muc'
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Dữ liệu DN theo đợt
  const [roundItems, setRoundItems] = useState([])
  const [searchRound, setSearchRound] = useState('')

  // Dữ liệu danh mục DN chung
  const [allCompanies, setAllCompanies] = useState([])
  const [searchAll, setSearchAll] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Giảng viên đầu mối
  const [teachers, setTeachers] = useState([])
  const [confirmation, setConfirmation] = useState(null)
  const [teacher, setTeacher] = useState('')
  const [teacherReason, setTeacherReason] = useState('')

  // Form Kế hoạch đợt
  const [planForm, setPlanForm] = useState(blankPlan)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [isEditingPlan, setIsEditingPlan] = useState(false)

  // Form Thêm/Sửa DN danh mục chung
  const [companyForm, setCompanyForm] = useState(blankCompany)
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false)
  const [isEditingCompany, setIsEditingCompany] = useState(false)

  // Lịch sử kế hoạch đợt
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  // Import CSV
  const [csvFile, setCsvFile] = useState(null)
  const [csvMessage, setCsvMessage] = useState('')
  const [csvErrors, setCsvErrors] = useState([])

  const version = useRef(0)

  // Tải dữ liệu toàn bộ
  const loadData = useCallback(async () => {
    const req = ++version.current
    setLoading(true)
    setError('')
    try {
      const promises = [
        apiClient.get('/khoa/cong-ty'),
        apiClient.get('/khoa/giang-vien'),
      ]
      if (round) {
        promises.push(
          apiClient.get('/khoa/cong-ty-theo-dot', { params: { maDot: round } })
        )
      }
      const [resAll, resGV, resRound] = await Promise.all(promises)
      if (req !== version.current) return

      setAllCompanies(resAll.data || [])
      setTeachers(resGV.data || [])
      if (resRound) {
        setRoundItems(resRound.data || [])
      } else {
        setRoundItems([])
      }
    } catch (e) {
      if (req === version.current) {
        setError(e.response?.data?.message || 'Không tải được dữ liệu doanh nghiệp.')
      }
    } finally {
      if (req === version.current) setLoading(false)
    }
  }, [round])

  useEffect(() => {
    loadData()
  }, [loadData])

  const readOnly = selectedDot?.trangThai === 'DaKetThuc' || roundLock.structureBlocked

  // Danh sách công ty đã duyệt đủ điều kiện đưa vào đợt
  const approvedCompanies = useMemo(
    () => allCompanies.filter((x) => x.trangThai === 'DaDuyet' && !x.chiTiepNhanTuTim),
    [allCompanies]
  )

  // Lọc bảng DN theo đợt
  const filteredRoundItems = useMemo(() => {
    return roundItems.filter((x) =>
      `${x.maCongTy} ${x.tenCongTy} ${x.viTriTuyen || ''}`
        .toLowerCase()
        .includes(searchRound.trim().toLowerCase())
    )
  }, [roundItems, searchRound])

  // Lọc bảng Danh mục chung
  const filteredAllCompanies = useMemo(() => {
    return allCompanies.filter((x) => {
      if (statusFilter !== 'ALL' && x.trangThai !== statusFilter) return false
      if (searchAll.trim()) {
        const kw = searchAll.trim().toLowerCase()
        return `${x.maCongTy} ${x.tenCongTy} ${x.viTriTuyen || ''} ${x.yeuCau || ''}`
          .toLowerCase()
          .includes(kw)
      }
      return true
    })
  }, [allCompanies, statusFilter, searchAll])

  const paginationRound = usePagination(filteredRoundItems, `${round}|${searchRound}`)
  const paginationAll = usePagination(filteredAllCompanies, `${statusFilter}|${searchAll}`)
  const paginationHistory = usePagination(history, round)

  // KPI Metrics
  const totalQuota = useMemo(
    () => roundItems.reduce((acc, cur) => acc + (Number(cur.soLuongNhan) || 0), 0),
    [roundItems]
  )
  const totalReceived = useMemo(
    () => roundItems.reduce((acc, cur) => acc + (Number(cur.daTiepNhan) || 0), 0),
    [roundItems]
  )

  // Duyệt/Tạm dừng/Từ chối DN danh mục chung
  const handleApproveCompany = async (id, status) => {
    try {
      await apiClient.put(`/khoa/cong-ty/${id}/duyet`, { TrangThai: status })
      setMessage(`Đã cập nhật trạng thái doanh nghiệp sang "${status}".`)
      await loadData()
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể cập nhật trạng thái công ty.')
    }
  }

  // Mở modal Thêm kế hoạch vào đợt
  const handleOpenAddPlan = () => {
    setIsEditingPlan(false)
    setPlanForm(blankPlan)
    setIsPlanModalOpen(true)
    setError('')
  }

  // Mở modal Sửa kế hoạch đợt
  const handleOpenEditPlan = (item) => {
    setIsEditingPlan(true)
    setPlanForm({
      ...item,
      moDangKy: local(item.moDangKy),
      hanDangKy: local(item.hanDangKy),
      lyDo: '',
      viTris: item.viTris?.length
        ? item.viTris.map((v) => ({ ...v }))
        : [
            {
              maViTri: null,
              tenViTri: item.viTriTuyen || '',
              yeuCau: item.yeuCau || '',
              soLuongNhan: item.soLuongNhan,
              hoatDong: true,
            },
          ],
    })
    setIsPlanModalOpen(true)
    setError('')
  }

  // Lưu Kế hoạch DN theo đợt
  const handleSavePlan = async (e) => {
    e.preventDefault()
    if (readOnly || busy || loading || !round) return
    setBusy(true)
    setError('')
    try {
      await apiClient.put(
        `/khoa/cong-ty-theo-dot/${encodeURIComponent(round)}/${encodeURIComponent(
          planForm.maCongTy
        )}`,
        {
          ...planForm,
          viTriTuyen: planForm.viTris[0].tenViTri,
          yeuCau: planForm.viTris[0].yeuCau,
          viTris: planForm.viTris.map((x) => ({
            ...x,
            soLuongNhan: Number(x.soLuongNhan),
          })),
          soLuongNhan: Number(planForm.soLuongNhan),
          moDangKy: `${planForm.moDangKy}:00+07:00`,
          hanDangKy: `${planForm.hanDangKy}:00+07:00`,
          lyDo:
            planForm.lyDo?.trim() ||
            (planForm.phienBan > 0
              ? 'Điều chỉnh kế hoạch tiếp nhận trong đợt'
              : 'Tiếp nhận sinh viên theo thỏa thuận hợp tác với doanh nghiệp'),
        }
      )
      setMessage('Đã lưu kế hoạch DN trong đợt thành công.')
      setIsPlanModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu kế hoạch doanh nghiệp.')
    } finally {
      setBusy(false)
    }
  }

  // Xác nhận GV đầu mối
  const handleConfirmTeacher = async (e) => {
    e.preventDefault()
    if (!confirmation || confirmation.maDot !== round || readOnly || busy) return
    setBusy(true)
    setError('')
    try {
      const r = await apiClient.put(
        `/khoa/cong-ty-theo-dot/${encodeURIComponent(round)}/${encodeURIComponent(
          confirmation.maCongTy
        )}/gv-gioi-thieu`,
        {
          maGV: teacher || null,
          phienBan: confirmation.phienBan,
          lyDo: teacherReason,
        }
      )
      setMessage(r.data.message || 'Đã xác nhận Giảng viên đầu mối thành công.')
      setConfirmation(null)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Không xác nhận được GV đầu mối.')
    } finally {
      setBusy(false)
    }
  }

  // Tải lịch sử kế hoạch
  const handleToggleHistory = async () => {
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setShowHistory(true)
    try {
      const r = await apiClient.get('/khoa/cong-ty-theo-dot/lich-su', {
        params: { maDot: round },
      })
      setHistory(r.data || [])
    } catch {
      setError('Không tải được lịch sử kế hoạch.')
    }
  }

  // Mở modal Thêm DN danh mục chung
  const handleOpenAddCompany = () => {
    setCompanyForm(blankCompany)
    setIsEditingCompany(false)
    setIsCompanyModalOpen(true)
    setError('')
  }

  // Mở modal Sửa DN danh mục chung
  const handleOpenEditCompany = (item) => {
    setCompanyForm({
      maCongTy: item.maCongTy,
      tenCongTy: item.tenCongTy,
      viTriTuyen: item.viTriTuyen || '',
      yeuCau: item.yeuCau || '',
      thoiGian: item.thoiGian || '3 tháng',
      soLuongNhan: item.soLuongNhan || 5,
    })
    setIsEditingCompany(true)
    setIsCompanyModalOpen(true)
    setError('')
  }

  // Lưu DN danh mục chung
  const handleSaveCompany = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (isEditingCompany) {
        await apiClient.put(`/khoa/cong-ty/${encodeURIComponent(companyForm.maCongTy)}`, companyForm)
        setMessage(`Đã cập nhật thông tin doanh nghiệp ${companyForm.tenCongTy} thành công.`)
      } else {
        await apiClient.post('/khoa/cong-ty', companyForm)
        setMessage(`Đã thêm mới doanh nghiệp ${companyForm.tenCongTy} thành công.`)
      }
      setIsCompanyModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể lưu thông tin doanh nghiệp.')
    } finally {
      setBusy(false)
    }
  }

  // CSV Export/Import
  const handleDownloadCsvTemplate = async () => {
    try {
      const res = await apiClient.get('/khoa/danh-muc/cong-ty/mau-csv', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mau-doanh-nghiep.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Không tải được file mẫu CSV.')
    }
  }

  const handleExportCsv = async () => {
    try {
      const res = await apiClient.get('/khoa/danh-muc/cong-ty/export-csv', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = 'danh-sach-doanh-nghiep.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Không xuất được danh sách CSV.')
    }
  }

  const handleUploadCsv = async (e) => {
    e.preventDefault()
    if (!csvFile) return
    setBusy(true)
    setCsvMessage('')
    setCsvErrors([])
    const body = new FormData()
    body.append('file', csvFile)
    try {
      const { data } = await apiClient.post('/khoa/danh-muc/cong-ty/import', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setCsvMessage(`Đã nhập thành công ${data.soLuongNhap} doanh nghiệp vào hệ thống.`)
      setCsvFile(null)
      e.target.reset()
      await loadData()
    } catch (err) {
      const d = err.response?.data
      setCsvMessage(d?.message || 'File CSV có lỗi, chưa nhập dữ liệu.')
      setCsvErrors(d?.loi || [])
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Bento Top Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                QUẢN LÝ DOANH NGHIỆP ĐỐI TÁC
              </span>
              {selectedDot && (
                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Đợt: {selectedDot.tenDot}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
              Doanh nghiệp liên kết & Kế hoạch tiếp nhận theo đợt
            </h1>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-3xl">
              Quản lý mạng lưới doanh nghiệp đối tác, thiết lập chỉ tiêu tiếp nhận theo đợt, vị trí thực tập, thời hạn sinh viên đăng ký và phân công Giảng viên đầu mối.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Làm mới</span>
            </button>
            {activeTab === 'theo-dot' ? (
              <button
                onClick={handleOpenAddPlan}
                disabled={!round || readOnly || loading}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">add_business</span>
                <span>Đưa DN vào đợt</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddCompany}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Thêm doanh nghiệp mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Thông báo Alert */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs shadow-2xs">
            <span className="material-symbols-outlined text-rose-600 text-base shrink-0 mt-0.5">
              error
            </span>
            <div className="flex-1 font-medium">{error}</div>
            <button
              onClick={() => setError('')}
              className="text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {message && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-800 text-xs shadow-2xs">
            <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">
              check_circle
            </span>
            <div className="flex-1 font-medium">{message}</div>
            <button
              onClick={() => setMessage('')}
              className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* 4 Thẻ Bento KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                DN tham gia đợt này
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">domain_add</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-indigo-700 tracking-tight">
                {roundItems.length}
              </span>
              <span className="text-sm font-semibold text-slate-400">công ty</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Đợt: {selectedDot?.tenDot || 'Chưa chọn'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tổng chỉ tiêu tiếp nhận
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">group_add</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-teal-700 tracking-tight">
                {totalQuota}
              </span>
              <span className="text-sm font-semibold text-slate-400">chỉ tiêu</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Đã tiếp nhận: <strong className="text-slate-800">{totalReceived} SV</strong>
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Mạng lưới doanh nghiệp hợp tác
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">corporate_fare</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-800 tracking-tight">
                {allCompanies.length}
              </span>
              <span className="text-sm font-semibold text-slate-400">doanh nghiệp</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {approvedCompanies.length} DN đã duyệt sẵn sàng
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tiến độ tiếp nhận / phân bổ
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">percent</span>
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-purple-700 tracking-tight">
                {totalQuota > 0 ? Math.round((totalReceived / totalQuota) * 100) : 0}%
              </span>
              <span className="text-sm font-semibold text-slate-400">hoàn thành</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {totalReceived} / {totalQuota} vị trí
            </p>
          </div>
        </div>

        {/* Thanh chuyển Tab nghiệp vụ */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('theo-dot')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'theo-dot'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">domain_add</span>
            <span>1. Kế hoạch tiếp nhận & Vị trí theo đợt ({roundItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('danh-muc')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'danh-muc'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">apartment</span>
            <span>2. Danh mục Doanh nghiệp đối tác ({allCompanies.length})</span>
          </button>
        </div>

        {/* TAB 1: KẾ HOẠCH DOANH NGHIỆP THEO ĐỢT */}
        {activeTab === 'theo-dot' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Header Bảng theo đợt */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 m-0">
                    <span className="material-symbols-outlined text-indigo-600 text-lg">
                      business_center
                    </span>
                    <span>Doanh nghiệp & Vị trí tiếp nhận trong đợt</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 m-0">
                    Danh sách doanh nghiệp đối tác và chỉ tiêu tiếp nhận trong đợt thực tập.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchRound}
                      onChange={(e) => setSearchRound(e.target.value)}
                      placeholder="Tìm công ty hoặc vị trí..."
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-56 text-slate-900 shadow-2xs"
                    />
                  </div>
                  <button
                    onClick={handleToggleHistory}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">history</span>
                    <span>Lịch sử</span>
                  </button>
                </div>
              </div>

              {/* Bảng Kế hoạch theo đợt */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4 w-64">Doanh nghiệp & Vị trí thực tập</th>
                      <th className="py-3 px-3 w-36 text-center">Chỉ tiêu / Đã nhận</th>
                      <th className="py-3 px-3 w-48">Thời hạn nhận hồ sơ</th>
                      <th className="py-3 px-3 w-36 text-center">Trạng thái nhận đơn</th>
                      <th className="py-3 px-4 w-44 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-slate-400">
                          <span className="material-symbols-outlined animate-spin text-2xl">
                            progress_activity
                          </span>
                          <div className="text-xs mt-1">Đang tải kế hoạch doanh nghiệp...</div>
                        </td>
                      </tr>
                    ) : paginationRound.items.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-slate-500">
                          <span className="material-symbols-outlined text-3xl text-slate-300">
                            domain_disabled
                          </span>
                          <div className="text-xs font-medium mt-1">
                            {roundItems.length === 0
                              ? 'Chưa có doanh nghiệp nào được đưa vào đợt này. Bấm nút "+ Đưa DN vào đợt" ở trên để thiết lập.'
                              : 'Không tìm thấy doanh nghiệp nào khớp với từ khóa tìm kiếm.'}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginationRound.items.map((x) => (
                        <tr key={x.maCongTy} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm">{x.tenCongTy}</div>
                            <div className="font-mono text-[11px] text-slate-400">{x.maCongTy}</div>
                            {/* Chi tiết các vị trí JD */}
                            <div className="mt-2 space-y-1">
                              {(x.viTris || []).map((v, idx) => (
                                <details
                                  key={v.maViTri || idx}
                                  className="group bg-slate-50 rounded-lg p-2 border border-slate-200/70 text-xs"
                                >
                                  <summary className="font-semibold text-slate-800 cursor-pointer flex items-center justify-between">
                                    <span>
                                      • {v.tenViTri} ({v.daTiepNhan}/{v.soLuongNhan} SV)
                                    </span>
                                    <span
                                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 ${
                                        v.daTiepNhan >= v.soLuongNhan
                                          ? 'bg-rose-100 text-rose-700'
                                          : !v.hoatDong
                                          ? 'bg-slate-200 text-slate-600'
                                          : 'bg-emerald-100 text-emerald-700'
                                      }`}
                                    >
                                      {v.daTiepNhan >= v.soLuongNhan
                                        ? 'Đủ chỉ tiêu'
                                        : !v.hoatDong
                                        ? 'Ngừng nhận'
                                        : 'Đang mở'}
                                    </span>
                                  </summary>
                                  <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600 whitespace-pre-wrap text-[11px] leading-relaxed">
                                    <strong>Yêu cầu chuyên môn:</strong> {v.yeuCau}
                                  </div>
                                </details>
                              ))}
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                              <span className="material-symbols-outlined text-[14px] text-slate-400">person</span>
                              {x.tenGVGioiThieu ? (
                                <span>GV đầu mối: <strong className="text-indigo-700">{x.tenGVGioiThieu}</strong></span>
                              ) : (
                                <span className="text-slate-400">Chưa phân công đầu mối</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-block px-3 py-1.5 rounded-xl bg-slate-100 font-bold text-slate-800 text-sm font-mono">
                              {x.daTiepNhan} / {x.soLuongNhan}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">Đã nhận / Chỉ tiêu</div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs">
                            <div className="font-medium text-slate-800">
                              Từ: {deadlineText(x.moDangKy)}
                            </div>
                            <div className="text-slate-500">
                              Đến: {deadlineText(x.hanDangKy)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                x.trangThaiTuyen?.includes('Đủ')
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : x.trangThaiTuyen?.includes('Ngừng')
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              <span>{recruitmentStatusLabel(x.trangThaiTuyen)}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col gap-1.5">
                              <button
                                disabled={readOnly || busy || loading}
                                onClick={() => handleOpenEditPlan(x)}
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                              >
                                Chỉ tiêu & Thời hạn
                              </button>
                              <button
                                disabled={readOnly || busy || loading}
                                onClick={() => {
                                  setConfirmation(x)
                                  setTeacher(x.maGVGioiThieu || '')
                                  setTeacherReason('')
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                              >{x.tenGVGioiThieu ? 'Đổi GV đầu mối' : 'Phân công đầu mối'}</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Phân trang đợt */}
              <div className="p-4 border-t border-slate-100">
                <Pagination pagination={paginationRound} label="doanh nghiệp theo đợt" />
              </div>
            </div>

            {/* Khối Lịch Sử Kế Hoạch (Accordion) */}
            {showHistory && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 m-0">
                  <span className="material-symbols-outlined text-slate-500">history</span>
                  <span>Nhật ký điều chỉnh kế hoạch doanh nghiệp trong đợt</span>
                </h3>
                {paginationHistory.items.length === 0 ? (
                  <p className="text-xs text-slate-500 italic m-0">Chưa có lịch sử điều chỉnh nào trong đợt này.</p>
                ) : (
                  <div className="space-y-3">
                    {paginationHistory.items.map((x) => (
                      <div
                        key={x.maNhatKy}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1"
                      >
                        <div className="font-semibold text-slate-800 flex items-center justify-between">
                          <span>
                            {deadlineText(x.thoiDiem)} — Thực hiện bởi: {x.nguoiThucHien}
                          </span>
                          <span className="text-[11px] text-slate-500 font-normal">
                            Lý do: <em>{x.lyDo}</em>
                          </span>
                        </div>
                        <div className="text-slate-600">Trước: {historyText(x.truoc)}</div>
                        <div className="text-indigo-700 font-medium">Sau: {historyText(x.sau)}</div>
                      </div>
                    ))}
                    <Pagination pagination={paginationHistory} label="nhật ký kế hoạch" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DANH MỤC DOANH NGHIỆP ĐỐI TÁC */}
        {activeTab === 'danh-muc' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              {/* Header Bảng Danh mục chung */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 m-0">
                    <span className="material-symbols-outlined text-indigo-600 text-lg">
                      corporate_fare
                    </span>
                    <span>Danh bạ Doanh nghiệp đối tác</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 m-0">
                    Danh sách tổng thể các đối tác doanh nghiệp đã đăng ký, được duyệt hoặc hợp tác cùng Khoa.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Bộ lọc trạng thái */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tất cả ({allCompanies.length})
                    </button>
                    <button
                      onClick={() => setStatusFilter('DaDuyet')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'DaDuyet'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Đã duyệt
                    </button>
                    <button
                      onClick={() => setStatusFilter('ChoDuyet')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'ChoDuyet'
                          ? 'bg-white text-amber-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Chờ duyệt
                    </button>
                    <button
                      onClick={() => setStatusFilter('DongBang')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'DongBang'
                          ? 'bg-white text-slate-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tạm dừng
                    </button>
                  </div>

                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchAll}
                      onChange={(e) => setSearchAll(e.target.value)}
                      placeholder="Tìm mã hoặc tên công ty..."
                      className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 w-52 text-slate-900 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Bảng Danh mục chung */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4 w-28 font-mono">Mã DN</th>
                      <th className="py-3 px-4 w-60">Tên doanh nghiệp</th>
                      <th className="py-3 px-4">Vị trí tuyển dụng</th>
                      <th className="py-3 px-4">Yêu cầu tuyển</th>
                      <th className="py-3 px-3 w-32 text-center">Trạng thái</th>
                      <th className="py-3 px-4 w-44 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-400">
                          <span className="material-symbols-outlined animate-spin text-2xl">
                            progress_activity
                          </span>
                          <div className="text-xs mt-1">Đang tải danh bạ doanh nghiệp...</div>
                        </td>
                      </tr>
                    ) : paginationAll.items.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-12 text-center text-slate-500">
                          <span className="material-symbols-outlined text-3xl text-slate-300">
                            apartment
                          </span>
                          <div className="text-xs font-medium mt-1">
                            Không tìm thấy doanh nghiệp nào phù hợp.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginationAll.items.map((x) => (
                        <tr key={x.maCongTy} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                            {x.maCongTy}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {x.tenCongTy}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {x.viTriTuyen || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={x.yeuCau}>
                            {x.yeuCau || '—'}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                x.trangThai === 'DaDuyet'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : x.trangThai === 'TuChoi'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : x.trangThai === 'DongBang'
                                  ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {x.trangThai === 'DaDuyet'
                                ? 'Đã duyệt'
                                : x.trangThai === 'TuChoi'
                                ? 'Từ chối'
                                : x.trangThai === 'DongBang'
                                ? 'Tạm dừng'
                                : 'Chờ duyệt'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditCompany(x)}
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                              >
                                Sửa
                              </button>

                              {x.trangThai === 'ChoDuyet' ? (
                                <>
                                  <button
                                    onClick={() => handleApproveCompany(x.maCongTy, 'DaDuyet')}
                                    className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                                  >
                                    Duyệt
                                  </button>
                                  <button
                                    onClick={() => handleApproveCompany(x.maCongTy, 'TuChoi')}
                                    className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                                  >
                                    Từ chối
                                  </button>
                                </>
                              ) : x.trangThai === 'DaDuyet' ? (
                                <button
                                  onClick={() => handleApproveCompany(x.maCongTy, 'DongBang')}
                                  className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer"
                                >
                                  Tạm dừng
                                </button>
                              ) : x.trangThai === 'DongBang' ? (
                                <button
                                  onClick={() => handleApproveCompany(x.maCongTy, 'DaDuyet')}
                                  className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                                >
                                  Mở lại
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApproveCompany(x.maCongTy, 'ChoDuyet')}
                                  className="px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                >
                                  Xét lại
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Phân trang danh mục */}
              <div className="p-4 border-t border-slate-100">
                <Pagination pagination={paginationAll} label="doanh nghiệp" />
              </div>
            </div>

            {/* Khối Nhập / Xuất Danh Sách Doanh Nghiệp Bằng CSV */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 m-0">
                    <span className="material-symbols-outlined text-indigo-600">file_upload</span>
                    <span>Nhập danh sách Doanh nghiệp từ file</span>
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Hỗ trợ nhập hàng loạt danh sách doanh nghiệp đối tác theo mẫu quy định của Khoa.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Xuất CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span>Tải mẫu CSV</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleUploadCsv} className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="block w-full sm:w-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <button
                  type="submit"
                  disabled={!csvFile || busy}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {busy ? 'Đang xử lý…' : 'Tải lên và nhập dữ liệu'}
                </button>
              </form>

              {csvMessage && (
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs border border-blue-200">
                  {csvMessage}
                </div>
              )}

              {csvErrors.length > 0 && (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs border border-rose-200 space-y-1">
                  <strong>Danh sách lỗi trong file CSV:</strong>
                  <ul className="list-disc list-inside space-y-0.5 m-0">
                    {csvErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BENTO MODAL POPUP: THÊM / CẬP NHẬT KẾ HOẠCH ĐỢT */}
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="p-5 sm:p-6 bg-white border-b border-slate-200/80 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">business_center</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 m-0">
                      {isEditingPlan ? 'Điều chỉnh chỉ tiêu & Thời hạn nhận hồ sơ' : 'Đưa Doanh nghiệp vào đợt'}
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      {isEditingPlan ? (
                        <>Doanh nghiệp: <strong className="text-indigo-700">{planForm.tenCongTy}</strong> ({planForm.maCongTy})</>
                      ) : (
                        <>Đợt: <strong className="text-indigo-700">{selectedDot?.tenDot}</strong></>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="p-5 sm:p-6 space-y-4">
                {/* Chọn DN hoặc Hiển thị DN */}
                {isEditingPlan ? (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Doanh nghiệp tiếp nhận</span>
                      <strong className="text-sm text-slate-900">{planForm.tenCongTy}</strong>
                      <span className="text-xs font-mono text-slate-500 ml-2">({planForm.maCongTy})</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Đã tham gia đợt
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Doanh nghiệp đối tác <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      disabled={busy}
                      value={planForm.maCongTy}
                      onChange={(e) => {
                        const selectedC = approvedCompanies.find(c => c.maCongTy === e.target.value)
                        setPlanForm({
                          ...planForm,
                          maCongTy: e.target.value,
                          viTris: [
                            {
                              maViTri: null,
                              tenViTri: selectedC?.viTriTuyen || '',
                              yeuCau: selectedC?.yeuCau || '',
                              soLuongNhan: selectedC?.soLuongNhan || 5,
                              hoatDong: true,
                            }
                          ],
                          soLuongNhan: selectedC?.soLuongNhan || 5,
                        })
                      }}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-900 font-semibold shadow-2xs disabled:bg-slate-100"
                    >
                      <option value="">— Chọn DN đối tác đã duyệt —</option>
                      {approvedCompanies.map((c) => (
                        <option key={c.maCongTy} value={c.maCongTy}>
                          {c.tenCongTy} ({c.maCongTy})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Danh sách các vị trí thực tập */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                        Vị trí thực tập tiếp nhận trong đợt
                      </span>
                      {isEditingPlan && (
                        <span className="text-[11px] text-slate-500">
                          Khoa quản lý chỉ tiêu và trạng thái nhận đơn; yêu cầu chuyên môn do Doanh nghiệp xác lập.
                        </span>
                      )}
                    </div>
                    {!isEditingPlan && (
                      <button
                        type="button"
                        disabled={busy || planForm.viTris.length >= 20}
                        onClick={() =>
                          setPlanForm({
                            ...planForm,
                            viTris: [
                              ...planForm.viTris,
                              {
                                maViTri: null,
                                tenViTri: '',
                                yeuCau: '',
                                soLuongNhan: '',
                                hoatDong: true,
                              },
                            ],
                          })
                        }
                        className="px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                      >
                        + Thêm vị trí
                      </button>
                    )}
                  </div>

                  {planForm.viTris.map((v, idx) => (
                    <div
                      key={v.maViTri || idx}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3"
                    >
                      <div className="flex items-center justify-between font-bold text-xs text-slate-800">
                        <span>Vị trí {idx + 1}</span>
                        {!isEditingPlan && !v.maViTri && planForm.viTris.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedViTris = planForm.viTris.filter((_, i) => i !== idx)
                              const sumPositions = updatedViTris.reduce(
                                (acc, cur) => acc + (Number(cur.soLuongNhan) || 0),
                                0
                              )
                              setPlanForm({
                                ...planForm,
                                viTris: updatedViTris,
                                soLuongNhan: sumPositions > 0 ? sumPositions : planForm.soLuongNhan,
                              })
                            }}
                            className="text-rose-600 hover:text-rose-800 text-xs cursor-pointer font-normal"
                          >
                            Xóa vị trí
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Tên vị trí <span className="text-rose-500">*</span>
                          </label>
                          {isEditingPlan ? (
                            <div className="px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 font-bold text-slate-900 shadow-2xs">
                              {v.tenViTri}
                            </div>
                          ) : (
                            <input
                              required
                              maxLength="500"
                              placeholder="VD: Lập trình viên Backend, Frontend Intern..."
                              value={v.tenViTri}
                              onChange={(e) =>
                                setPlanForm({
                                  ...planForm,
                                  viTris: planForm.viTris.map((x, i) =>
                                    i === idx ? { ...x, tenViTri: e.target.value } : x
                                  ),
                                })
                              }
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Chỉ tiêu vị trí <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="VD: 5"
                            value={v.soLuongNhan}
                            onChange={(e) => {
                              const val = e.target.value
                              const updatedViTris = planForm.viTris.map((x, i) =>
                                i === idx ? { ...x, soLuongNhan: val } : x
                              )
                              const sumPositions = updatedViTris.reduce(
                                (acc, cur) => acc + (Number(cur.soLuongNhan) || 0),
                                0
                              )
                              setPlanForm({
                                ...planForm,
                                viTris: updatedViTris,
                                soLuongNhan: sumPositions > 0 ? sumPositions : planForm.soLuongNhan,
                              })
                            }}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold text-indigo-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Yêu cầu chuyên môn
                        </label>
                        {isEditingPlan ? (
                          <div className="p-2.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-600 whitespace-pre-wrap leading-relaxed shadow-2xs">
                            {v.yeuCau || 'Theo văn bản thỏa thuận tiếp nhận của doanh nghiệp.'}
                          </div>
                        ) : (
                          <textarea
                            rows="3"
                            required
                            maxLength="10000"
                            placeholder="Mô tả công việc, kỹ năng yêu cầu..."
                            value={v.yeuCau}
                            onChange={(e) =>
                              setPlanForm({
                                ...planForm,
                                viTris: planForm.viTris.map((x, i) =>
                                  i === idx ? { ...x, yeuCau: e.target.value } : x
                                ),
                              })
                            }
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white resize-none"
                          />
                        )}
                      </div>

                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={v.hoatDong}
                          onChange={(e) =>
                            setPlanForm({
                              ...planForm,
                              viTris: planForm.viTris.map((x, i) =>
                                i === idx ? { ...x, hoatDong: e.target.checked } : x
                              ),
                            })
                          }
                          className="rounded text-indigo-600 w-4 h-4"
                        />
                        <span className={v.hoatDong ? 'font-semibold text-emerald-700' : 'text-slate-500'}>
                          {v.hoatDong ? 'Đang mở tiếp nhận đơn đăng ký cho vị trí này' : 'Tạm ngừng nhận đăng ký mới'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Tổng chỉ tiêu & Lịch nhận đơn */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Tổng chỉ tiêu DN trong đợt <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="VD: 10"
                      value={planForm.soLuongNhan}
                      onChange={(e) => setPlanForm({ ...planForm, soLuongNhan: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Thời gian mở nhận hồ sơ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={planForm.moDangKy}
                      onChange={(e) => setPlanForm({ ...planForm, moDangKy: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                    <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-slate-400">schedule</span>
                      <span>{planForm.moDangKy ? `Bắt đầu: ${deadlineText(planForm.moDangKy)}` : 'Chưa thiết lập'}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Hạn chót nhận hồ sơ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={planForm.hanDangKy}
                      onChange={(e) => setPlanForm({ ...planForm, hanDangKy: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                    <div className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-slate-400">event_busy</span>
                      <span>{planForm.hanDangKy ? `Hạn chót: ${deadlineText(planForm.hanDangKy)}` : 'Chưa thiết lập'}</span>
                    </div>
                  </div>
                </div>

                {/* Ghi chú / Căn cứ tiếp nhận */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {isEditingPlan ? (
                      <>
                        Căn cứ / Lý do điều chỉnh kế hoạch <span className="text-rose-500">*</span>
                      </>
                    ) : (
                      <>
                        Ghi chú / Căn cứ tiếp nhận <span className="text-slate-400 font-normal">(tùy chọn)</span>
                      </>
                    )}
                  </label>
                  <textarea
                    rows="2"
                    required={isEditingPlan}
                    maxLength="1000"
                    placeholder={
                      isEditingPlan
                        ? 'Ghi rõ lý do điều chỉnh chỉ tiêu tiếp nhận hoặc gia hạn thời hạn nộp hồ sơ...'
                        : 'Ghi chú văn bản thỏa thuận tiếp nhận (nếu có)...'
                    }
                    value={planForm.lyDo}
                    onChange={(e) => setPlanForm({ ...planForm, lyDo: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPlanModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {busy ? 'Đang lưu…' : isEditingPlan ? 'Lưu thay đổi kế hoạch' : 'Đưa Doanh nghiệp vào đợt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BENTO MODAL POPUP: XÁC NHẬN GV ĐẦU MỐI */}
        {confirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">school</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 m-0">{confirmation.tenGVGioiThieu ? 'Điều chỉnh Giảng viên đầu mối' : 'Phân công Giảng viên đầu mối'}</h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      {confirmation.tenCongTy} ({confirmation.maCongTy})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmation(null)}
                  className="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleConfirmTeacher} className="p-5 sm:p-6 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Giảng viên phụ trách đầu mối liên hệ
                  </label>
                  <select
                    disabled={busy}
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    <option value="">— Chưa phân công GV đầu mối —</option>
                    {teachers.map((t) => (
                      <option key={t.maGV} value={t.maGV}>
                        {t.hoTen} ({t.maGV})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    {confirmation.tenGVGioiThieu ? 'Lý do điều chỉnh GV đầu mối' : 'Lý do phân công GV đầu mối'} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows="3"
                    required
                    maxLength="1000"
                    placeholder={confirmation.tenGVGioiThieu ? 'Ghi nhận lý do điều chỉnh GV đầu mối...' : 'Ghi nhận lý do phân công GV phụ trách đầu mối tiếp nhận...'}
                    value={teacherReason}
                    onChange={(e) => setTeacherReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white resize-none"
                  />
                </div>

                <p className="text-slate-500 italic m-0">
                  * Xác nhận này làm cơ sở ưu tiên phân công sinh viên cho giảng viên khi công ty tiếp nhận.
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConfirmation(null)}
                    className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {busy ? 'Đang lưu…' : (confirmation.tenGVGioiThieu ? 'Lưu thay đổi' : 'Xác nhận phân công')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BENTO MODAL POPUP: THÊM / SỬA DN DANH MỤC TOÀN TRƯỜNG */}
        {isCompanyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">domain</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 m-0">
                      {isEditingCompany ? `Chỉnh sửa: ${companyForm.tenCongTy}` : 'Thêm Doanh nghiệp đối tác mới'}
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      Danh bạ đối tác chính thức của Khoa CNTT
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveCompany} className="p-5 sm:p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Mã doanh nghiệp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isEditingCompany}
                      placeholder="VD: FPT_SOFTWARE"
                      value={companyForm.maCongTy}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, maCongTy: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-800 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Tên doanh nghiệp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Công ty TNHH Phần mềm FPT"
                      value={companyForm.tenCongTy}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, tenCongTy: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Vị trí tuyển dụng mẫu
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Lập trình viên / Tester"
                      value={companyForm.viTriTuyen}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, viTriTuyen: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1.5">
                      Thời gian thực tập
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 3 tháng"
                      value={companyForm.thoiGian}
                      onChange={(e) =>
                        setCompanyForm({ ...companyForm, thoiGian: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">
                    Yêu cầu tuyển dụng chung
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Mô tả kỹ năng, ngoại ngữ hoặc quy trình tuyển..."
                    value={companyForm.yeuCau}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, yeuCau: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 resize-none"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCompanyModalOpen(false)}
                    className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {busy ? 'Đang lưu…' : isEditingCompany ? 'Lưu thay đổi' : 'Thêm công ty'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
