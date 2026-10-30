import { useCallback, useEffect, useRef, useState } from 'react'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import { phieuChamDiemService } from '../../services/phieuChamDiemService'
import doanhNghiepService from '../../services/doanhNghiepService'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useGradeDeadline } from '../../hooks/useGradeDeadline'
import GradeDeadlineNotice from '../../components/common/GradeDeadlineNotice'
import ModalOverlay from '../../components/common/ModalOverlay'
import DocumentAttachments from '../../components/common/DocumentAttachments'

function EnterpriseGradeForm({ intern, onSaved, drafts }) {
  const deadline = useGradeDeadline(intern.maDot, 'DN')
  const [criteria, setCriteria] = useState([])
  const [scores, setScores] = useState(() => drafts.current[intern.maPhanBo]?.scores || {})
  const [review, setReview] = useState(() => drafts.current[intern.maPhanBo]?.review ?? intern.danhGia ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    phieuChamDiemService.getDanhSachTieuChi(intern.maDot, 'DN').then(r => {
      if (!active) return
      setCriteria(r.data?.data || [])
      setScores(drafts.current[intern.maPhanBo]?.scores ?? Object.fromEntries((intern.chiTietDiemDN || []).map(x => [x.maTieuChi, x.diemCham])))
      setReview(drafts.current[intern.maPhanBo]?.review ?? intern.danhGia ?? '')
    }).catch(() => { if (active) setError('Không tải được tiêu chí doanh nghiệp.') })
    return () => { active = false }
  }, [intern, drafts])

  const updateDraft = (nextScores, nextReview) => {
    setScores(nextScores)
    setReview(nextReview)
    drafts.current[intern.maPhanBo] = { scores: nextScores, review: nextReview }
  }

  const save = async e => {
    e.preventDefault()
    if (!deadline.canGrade) return
    setBusy(true)
    setError('')
    try {
      const chiTiets = criteria.filter(c => scores[c.maTieuChi] != null && scores[c.maTieuChi] !== '').map(c => ({ maTieuChi: c.maTieuChi, diemCham: Number(scores[c.maTieuChi]) }))
      if (!chiTiets.length) throw new Error('Vui lòng nhập điểm ít nhất một tiêu chí.')
      await doanhNghiepService.danhGia({ maPhanBo: intern.maPhanBo, chiTiets, nhanXet: review })
      delete drafts.current[intern.maPhanBo]
      await onSaved()
    } catch (e) {
      setError(e.response?.data?.message || e.message)
    } finally {
      setBusy(false)
    }
  }

  const currentTotal = criteria.reduce((sum, c) => sum + (Number(scores[c.maTieuChi]) || 0), 0)
  const isFullGraded = criteria.length > 0 && criteria.every(c => scores[c.maTieuChi] !== undefined && scores[c.maTieuChi] !== '' && !isNaN(scores[c.maTieuChi]))

  return (
    <><form onSubmit={save} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-5 lg:p-6 space-y-4">
      {/* Header card sinh viên */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
            {(intern.hoTenSV || 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">
                {intern.hoTenSV} ({intern.maSinhVien})
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                — {intern.tenDot || intern.maDot}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span className="material-symbols-outlined text-[15px] text-slate-400">school</span>
              <span>Lớp: {intern.tenLop || intern.lop || 'Chưa cập nhật'}</span>
              <span>•</span>
              <span className="material-symbols-outlined text-[15px] text-slate-400">badge</span>
              <span>Mã phân bổ: {intern.maPhanBo}</span>
            </div>
          </div>
        </div>

        {/* Trạng thái chấm & tổng điểm */}
        <div className="flex items-center gap-2.5 sm:self-center self-start">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isFullGraded ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isFullGraded ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>{isFullGraded ? 'Đã hoàn tất đánh giá' : 'Đang chờ đánh giá'}</span>
          </span>
          <div className="px-3 py-1 bg-indigo-50/80 border border-indigo-100 rounded-xl text-right">
            <div className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">Tổng điểm DN</div>
            <div className="text-sm font-extrabold text-indigo-900">
              {currentTotal.toFixed(2)} <span className="text-xs font-normal text-indigo-600">/ 5.00 đ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Thông báo thời hạn chấm điểm */}
      <GradeDeadlineNotice deadline={deadline} group="DN" />

      {/* Bảng nhập điểm các tiêu chí */}
      <div className="space-y-2.5 pt-1">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-indigo-600">checklist</span>
          <span>Chi tiết tiêu chí đánh giá chuẩn Khoa (Tối đa 5.00 điểm):</span>
        </div>
        {criteria.length === 0 && !error && (
          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs text-slate-500 animate-pulse flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-indigo-600 animate-spin">sync</span>
            <span>Đang tải danh mục tiêu chí đánh giá chuẩn Khoa CNTT…</span>
          </div>
        )}
        <div className="grid grid-cols-1 gap-2.5">
          {criteria.map(c => (
            <label key={c.maTieuChi} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50/70 border border-slate-200/60 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-xs">
                    {c.maCLO}
                  </span>
                  <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                    {c.tenTieuChi}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Thang điểm chuẩn: <span className="font-medium text-slate-700">0.00 — {c.diemToiDa} điểm</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="text-xs text-slate-500 font-medium">Điểm chấm:</span>
                <input 
                  aria-label={`Điểm ${c.maCLO}`} 
                  type="number" 
                  min="0" 
                  max={c.diemToiDa} 
                  step="0.01" 
                  disabled={busy || !deadline.canGrade} 
                  className="border border-slate-300 rounded-lg p-2 w-28 text-right font-bold text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400" 
                  placeholder={`0 - ${c.diemToiDa}`}
                  value={scores[c.maTieuChi] ?? ''} 
                  onChange={e => updateDraft({ ...scores, [c.maTieuChi]: e.target.value }, review)}
                />
                <span className="text-xs font-semibold text-slate-400 w-8">/ {c.diemToiDa}đ</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Nhận xét của doanh nghiệp */}
      <label className="block space-y-1.5 pt-1">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-indigo-600">rate_review</span>
          <span>Nhận xét quá trình thực tập & đóng góp của sinh viên:</span>
        </span>
        <textarea 
          className="border border-slate-300 rounded-xl p-3 w-full text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white shadow-2xs min-h-[90px] disabled:bg-slate-100 disabled:text-slate-400" 
          placeholder="Nhận xét cụ thể về thái độ làm việc, tinh thần kỷ luật, khả năng hòa nhập và kết quả thực hiện các công việc được giao tại doanh nghiệp..."
          value={review} 
          disabled={busy || !deadline.canGrade} 
          onChange={e => updateDraft(scores, e.target.value)}
        />
      </label>

      {/* Lỗi nếu có */}
      {error && (
        <div role="alert" className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl font-medium">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Thao tác lưu điểm */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-slate-400 italic">
          Điểm và nhận xét sẽ được chuyển ngay sang hệ thống quản lý học vụ Khoa CNTT sau khi lưu.
        </div>
        <button 
          type="submit"
          disabled={busy || !criteria.length || !deadline.canGrade} 
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">{busy ? 'hourglass_top' : 'save'}</span>
          <span>{busy ? 'Đang ghi nhận điểm…' : 'Lưu điểm doanh nghiệp'}</span>
        </button>
      </div>
    </form>
      <DocumentAttachments key={intern.maPhanBo} kind="EnterpriseForm" resourceId={intern.maPhanBo} title="Phiếu đánh giá DN có chữ ký" defer />
    </>
  )
}

export default function DanhGiaThucTapSinhPage() {
  const { activeCompany, maDot, loading: companyLoading } = useEnterprise()
  const globalDeadline = useGradeDeadline(maDot, 'DN')
  const [interns, setInterns] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState('TABLE') // 'TABLE' | 'CARDS'
  const [activeModalIntern, setActiveModalIntern] = useState(null)
  const drafts = useRef({})
  const pagination = usePagination(interns, activeCompany?.maCongTy)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const requestVersion = useRef(0)

  const loadInterns = useCallback(async () => {
    if (companyLoading) return
    const version = ++requestVersion.current
    if (!activeCompany?.maCongTy) {
      setInterns([])
      setError('Tài khoản doanh nghiệp chưa được gắn với công ty. Vui lòng liên hệ Khoa để kiểm tra tài khoản.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await doanhNghiepService.getThucTapSinh(activeCompany.maCongTy, maDot)
      if (version === requestVersion.current) {
        const list = Array.isArray(data) ? data : []
        setInterns(list)
        // Cập nhật lại sinh viên đang mở modal nếu có
        if (activeModalIntern) {
          const updated = list.find(x => x.maPhanBo === activeModalIntern.maPhanBo)
          if (updated) setActiveModalIntern(updated)
        }
      }
    } catch (err) {
      if (version === requestVersion.current) {
        setInterns([])
        setError(err.response?.data?.message || 'Không tải được danh sách thực tập sinh. Vui lòng thử làm mới trang.')
      }
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [activeCompany?.maCongTy, maDot, companyLoading, activeModalIntern])

  useEffect(() => {
    const activeRequestVersion = requestVersion
    loadInterns()
    return () => { activeRequestVersion.current++ }
  }, [loadInterns])

  // Lọc theo tìm kiếm và trạng thái
  const filteredInterns = interns.filter(item => {
    const matchSearch = !searchTerm || 
      (item.hoTenSV && item.hoTenSV.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.maSinhVien && item.maSinhVien.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const isGraded = item.chiTietDiemDN && item.chiTietDiemDN.length >= 2
    if (statusFilter === 'GRADED') return matchSearch && isGraded
    if (statusFilter === 'PENDING') return matchSearch && !isGraded
    return matchSearch
  })

  // Thống kê nhanh
  const totalCount = interns.length
  const gradedCount = interns.filter(x => x.chiTietDiemDN && x.chiTietDiemDN.length >= 2).length
  const pendingCount = totalCount - gradedCount
  const avgScore = gradedCount > 0 
    ? (interns.reduce((sum, x) => {
        const s = (x.chiTietDiemDN || []).reduce((acc, c) => acc + (Number(c.diemCham) || 0), 0)
        return sum + s
      }, 0) / gradedCount).toFixed(2)
    : '0.00'

  // Điều hướng chuyển sinh viên trong modal
  const handleNextIntern = () => {
    if (!activeModalIntern) return
    const currentIndex = filteredInterns.findIndex(x => x.maPhanBo === activeModalIntern.maPhanBo)
    if (currentIndex < filteredInterns.length - 1) {
      setActiveModalIntern(filteredInterns[currentIndex + 1])
    }
  }

  const handlePrevIntern = () => {
    if (!activeModalIntern) return
    const currentIndex = filteredInterns.findIndex(x => x.maPhanBo === activeModalIntern.maPhanBo)
    if (currentIndex > 0) {
      setActiveModalIntern(filteredInterns[currentIndex - 1])
    }
  }

  return (
    <div className="space-y-6">
      {/* Bento Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 lg:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <span className="material-symbols-outlined text-[16px] text-indigo-600">corporate_fare</span>
              <span>Cổng Doanh nghiệp</span>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Đánh giá thực tập sinh</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                Đánh giá thực tập sinh
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                {activeCompany?.tenCongTy || 'Doanh nghiệp'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              Doanh nghiệp nhập và cập nhật điểm đánh giá chuẩn đầu ra CLO4 (CLO4.1 & CLO4.2) theo rubric Khoa CNTT. Thang điểm 5.00 chiếm 50% tổng điểm học phần thực tập.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={loadInterns}
              disabled={loading || companyLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>{loading ? 'Đang tải…' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        {/* 4 Thẻ Bento KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tổng thực tập sinh</span>
              <span className="material-symbols-outlined text-[18px] text-indigo-600">group</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{totalCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Phân bổ tại công ty</div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Đã đánh giá</span>
              <span className="material-symbols-outlined text-[18px] text-emerald-600">task_alt</span>
            </div>
            <div className="text-2xl font-black text-emerald-900">{gradedCount}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Đã hoàn tất nhập điểm</div>
          </div>

          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Chờ đánh giá</span>
              <span className="material-symbols-outlined text-[18px] text-amber-600">pending</span>
            </div>
            <div className="text-2xl font-black text-amber-900">{pendingCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Cần nhập kết quả</div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-200/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Điểm trung bình DN</span>
              <span className="material-symbols-outlined text-[18px] text-indigo-600">insights</span>
            </div>
            <div className="text-2xl font-black text-indigo-900">
              {avgScore} <span className="text-xs font-semibold text-indigo-600">/ 5.00</span>
            </div>
            <div className="text-[10px] text-indigo-700 mt-0.5">Trên thang 5.00 điểm</div>
          </div>
        </div>
      </div>

      {/* Thông báo thời hạn chấm điểm chung toàn đợt */}
      <GradeDeadlineNotice deadline={globalDeadline} group="DN" />

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Thanh công cụ tìm kiếm, lọc & chế độ xem */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên sinh viên, mã số sinh viên..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          {/* Bộ lọc trạng thái & Switch Chế độ xem */}
          <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'ALL' ? 'bg-white text-indigo-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'PENDING' ? 'bg-white text-amber-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Chờ chấm ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('GRADED')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'GRADED' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Đã chấm ({gradedCount})
              </button>
            </div>

            {/* Chế độ xem Table / Cards */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs border border-slate-200/60">
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                title="Xem dạng Bảng tổng hợp"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${viewMode === 'TABLE' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <span className="material-symbols-outlined text-[16px]">table_chart</span>
                <span className="hidden sm:inline">Bảng tổng hợp</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                title="Xem dạng Thẻ chi tiết"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${viewMode === 'CARDS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <span className="material-symbols-outlined text-[16px]">view_agenda</span>
                <span className="hidden sm:inline">Thẻ chi tiết</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trạng thái tải & rỗng */}
      {loading || companyLoading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách thực tập sinh…</p>
        </div>
      ) : null}

      {!loading && !companyLoading && !error && filteredInterns.length === 0 && (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
          <span className="material-symbols-outlined text-[36px] text-slate-300">person_off</span>
          <p className="text-xs font-semibold text-slate-700">
            {activeCompany?.maCongTy
              ? searchTerm || statusFilter !== 'ALL'
                ? 'Không tìm thấy thực tập sinh nào phù hợp với bộ lọc.'
                : `Chưa có sinh viên được phân bổ thực tập tại ${activeCompany.tenCongTy || 'doanh nghiệp này'}.`
              : 'Chưa xác định được công ty của tài khoản doanh nghiệp.'}
          </p>
          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setStatusFilter('ALL') }}
              className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          )}
        </div>
      )}

      {/* CHẾ ĐỘ 1: BẢNG TỔNG HỢP (TABLE VIEW) - CỰC KỲ DỄ DÙNG & TỐI ƯU */}
      {viewMode === 'TABLE' && filteredInterns.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Sinh viên</th>
                  <th className="py-3.5 px-4">Lớp & Vị trí</th>
                  <th className="py-3.5 px-4 text-center">CLO4.1 (2.0đ)</th>
                  <th className="py-3.5 px-4 text-center">CLO4.2 (3.0đ)</th>
                  <th className="py-3.5 px-4 text-center">Tổng điểm DN</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInterns.map(intern => {
                  const score41 = (intern.chiTietDiemDN || []).find(x => x.maTieuChi === 'CLO4.1')?.diemCham
                  const score42 = (intern.chiTietDiemDN || []).find(x => x.maTieuChi === 'CLO4.2')?.diemCham
                  const total = (Number(score41) || 0) + (Number(score42) || 0)
                  const isGraded = score41 !== undefined && score42 !== undefined

                  return (
                    <tr key={intern.maPhanBo} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                            {(intern.hoTenSV || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{intern.hoTenSV}</div>
                            <div className="text-[11px] text-slate-500">{intern.maSinhVien}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{intern.tenLop || intern.lop || '—'}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={intern.viTriThucTap || ''}>
                          {intern.viTriThucTap || 'Thực tập sinh'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {score41 !== undefined ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {Number(score41).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {score42 !== undefined ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {Number(score42).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black ${
                          isGraded ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {total.toFixed(2)} <span className="text-[10px] font-normal text-slate-400 ml-1">/ 5.0</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          isGraded ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isGraded ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          <span>{isGraded ? 'Đã đánh giá' : 'Chờ đánh giá'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveModalIntern(intern)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs shadow-2xs transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit_square</span>
                            <span>{isGraded ? 'Sửa điểm' : 'Chấm điểm'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveModalIntern(intern)}
                            title="Lưu / xem phiếu đánh giá DN có chữ ký"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">description</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: THẺ CHI TIẾT (CARDS VIEW) */}
      {viewMode === 'CARDS' && (
        <div className="space-y-4">
          <Pagination pagination={pagination} label="thực tập sinh được đánh giá" />
          <div className="space-y-4">
            {pagination.items
              .filter(intern => {
                if (searchTerm) {
                  const matchName = intern.hoTenSV && intern.hoTenSV.toLowerCase().includes(searchTerm.toLowerCase())
                  const matchMSSV = intern.maSinhVien && intern.maSinhVien.toLowerCase().includes(searchTerm.toLowerCase())
                  if (!matchName && !matchMSSV) return false
                }
                const isGraded = intern.chiTietDiemDN && intern.chiTietDiemDN.length >= 2
                if (statusFilter === 'GRADED') return isGraded
                if (statusFilter === 'PENDING') return !isGraded
                return true
              })
              .map(intern => (
                <EnterpriseGradeForm 
                  key={intern.maPhanBo} 
                  intern={intern} 
                  onSaved={loadInterns} 
                  drafts={drafts} 
                />
              ))}
          </div>
        </div>
      )}

      {/* MODAL CHẤM ĐIỂM TẬP TRUNG (KHI BẤM NÚT "CHẤM ĐIỂM" TRONG BẢNG) */}
      {activeModalIntern && (
        <ModalOverlay onClose={() => setActiveModalIntern(null)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal & Điều hướng nhanh */}
            <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                  {(activeModalIntern.hoTenSV || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Đánh giá: {activeModalIntern.hoTenSV} ({activeModalIntern.maSinhVien})
                  </h3>
                  <div className="text-xs text-slate-500">
                    Lớp: {activeModalIntern.tenLop || activeModalIntern.lop || '—'} • Vị trí: {activeModalIntern.viTriThucTap || 'Thực tập sinh'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevIntern}
                    disabled={filteredInterns.findIndex(x => x.maPhanBo === activeModalIntern.maPhanBo) <= 0}
                    title="Sinh viên trước"
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <span className="text-[11px] font-semibold text-slate-500 px-1.5">
                    {filteredInterns.findIndex(x => x.maPhanBo === activeModalIntern.maPhanBo) + 1}/{filteredInterns.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextIntern}
                    disabled={filteredInterns.findIndex(x => x.maPhanBo === activeModalIntern.maPhanBo) >= filteredInterns.length - 1}
                    title="Sinh viên tiếp theo"
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-600 disabled:opacity-30 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalIntern(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Form chấm điểm sinh viên */}
            <div className="p-6">
              <EnterpriseGradeForm 
                key={activeModalIntern.maPhanBo} 
                intern={activeModalIntern} 
                onSaved={loadInterns} 
                drafts={drafts} 
              />
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
