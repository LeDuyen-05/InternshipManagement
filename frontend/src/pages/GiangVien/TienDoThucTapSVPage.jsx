import { toast } from "../../contexts/ToastContext.jsx"
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import DocumentAttachments from '../../components/common/DocumentAttachments'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import tienDoThucTapService from '../../services/tienDoThucTapService'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { useIdentity } from '../../hooks/useIdentity'
import { submissionBlock, revisionWindowStatus, SO_NGAY_NOP_LAI } from '../../utils/reportDeadline'
import { findReviewReport, reportsOutsideRound, responseList, reportWeekLabel, studentReportPeriod, academicReportEntries } from '../../utils/lecturerDashboard'

// Định dạng ngày chuẩn Việt Nam DD/MM/YYYY
const formatDateVN = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export default function TienDoThucTapSVPage() {
  const [params] = useSearchParams()
  const { selectedDot } = useDotThucTap()
  const identity = useIdentity() || {}
  if (params.get('dot') && params.get('dot') !== selectedDot?.maDot) {
    return <div role="status" className="p-4 rounded-xl bg-amber-50 text-amber-800">Báo cáo trong liên kết thuộc đợt khác. Hãy chọn đúng đợt thực tập để xem.</div>
  }
  return <ProgressStudentPage key={JSON.stringify([identity.role, identity.maGV, params.get('gv'), params.get('sv'), params.get('report'), selectedDot?.maDot])} />
}

function ProgressStudentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { selectedDot, roundLock } = useDotThucTap()
  const { maGV: identityMaGV, role } = useIdentity() || {}
  const isStaff = role === 'VT01' || role === 'VT02'
  const currentMaGV = isStaff && searchParams.get('gv') ? searchParams.get('gv') : identityMaGV
  const mounted = useRef(true)
  const reportRequest = useRef(0)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; reportRequest.current++ }
  }, [])
  const [lecturerInfo, setLecturerInfo] = useState(null)

  const [studentList, setStudentList] = useState([])
  const urlMaSV = searchParams.get('sv')
  const [selectedMaSV, setSelectedMaSV] = useState(urlMaSV || '')

  const [listTienDo, setListTienDo] = useState([])
  const [loadedReportKey, setLoadedReportKey] = useState('')
  const [reviewNotice, setReviewNotice] = useState('')
  const openedReportLink = useRef('')
  const linkedReportId = searchParams.get('report')
  const [loading, setLoading] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [error, setError] = useState(null)

  // Modal duyệt báo cáo tuần
  const [selectedTienDo, setSelectedTienDo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [duyetStatus, setDuyetStatus] = useState('DaDuyet')
  const [nhanXetGV, setNhanXetGV] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Bộ lọc và tìm kiếm tiến độ
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('PRIORITY')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [modalMode, setModalMode] = useState('duyet')

  // 1. Tải danh sách sinh viên do GV hướng dẫn từ cơ sở dữ liệu thật theo currentMaGV
  useEffect(() => {
    let active = true
    const fetchStudents = async () => {
      if (!currentMaGV || !selectedDot?.maDot) { setLoadingStudents(false); return }
      try {
        setLoadingStudents(true)
        const [res, resTai] = await Promise.all([
          gvHuongDanService.getSVTheoGiangVien(currentMaGV, '', selectedDot?.maDot),
          gvHuongDanService.getGiangVienTai(selectedDot?.maDot).catch(() => ({ data: { data: [] } })),
        ])
        if (!active) return
        const data = res.data?.data || res.data || []
        const taiList = resTai.data?.data || []
        const foundGv = taiList.find((g) => g.maGV === currentMaGV)
        if (foundGv) setLecturerInfo(foundGv)

        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item) => ({
            maSV: item.sinhVien?.maSV || item.maSV,
            hoTen: item.sinhVien?.hoTen || item.hoTen,
            lop: item.sinhVien?.lop || item.lop || '—',
            tenCongTy: item.congTy?.tenCongTy || item.tenCongTy || 'Chưa phân bổ công ty',
            ngayBatDauThucTap: item.ngayBatDauThucTap,
            ngayKetThucThucTap: item.ngayKetThucThucTap,
          }))
          setStudentList(mapped)
          if (!urlMaSV) {
            setSelectedMaSV(mapped[0].maSV)
          } else {
            const owned = mapped.some(s => s.maSV === urlMaSV)
            setSelectedMaSV(owned ? urlMaSV : '')
            if (!owned) setError('Sinh viên không thuộc danh sách hướng dẫn của đợt đang chọn.')
          }
        } else {
          setStudentList([])
          setSelectedMaSV('')
        }
      } catch (err) {
        if (!active) return
        console.error('Lỗi tải danh sách sinh viên:', err)
        setError('Không thể tải danh sách sinh viên hướng dẫn: ' + (err.response?.data?.message || err.message))
      } finally {
        if (active) setLoadingStudents(false)
      }
    }
    fetchStudents()
    return () => { active = false }
  }, [currentMaGV, urlMaSV, selectedDot?.maDot])

  // Đồng bộ selectedMaSV khi URL param thay đổi
  useEffect(() => {
    if (urlMaSV) {
      setSelectedMaSV(urlMaSV)
    }
  }, [urlMaSV])

  // 2. Tải tiến độ thực tập của sinh viên đang chọn từ SQL Server
  const loadData = async (svId) => {
    const request = ++reportRequest.current
    if (!mounted.current) return
    if (!svId || !selectedDot?.maDot) {
      setListTienDo([])
      return
    }
    try {
      setLoading(true)
      setError(null)
      const res = await tienDoThucTapService.getTienDoBySinhVien(svId, selectedDot?.maDot)
      if (!mounted.current || request !== reportRequest.current) return
      const data = responseList(res)
      setListTienDo(data)
      setLoadedReportKey(JSON.stringify([svId, selectedDot?.maDot]))
    } catch (err) {
      if (!mounted.current || request !== reportRequest.current) return
      console.error('Lỗi tải tiến độ thực tập:', err)
      setError('Lỗi khi tải tiến độ thực tập: ' + (err.response?.data?.message || err.message))
      setListTienDo([])
    } finally {
      if (mounted.current && request === reportRequest.current) setLoading(false)
    }
  }

  useEffect(() => {
    setListTienDo([])
    if (selectedMaSV && !loadingStudents && studentList.some(s => s.maSV === selectedMaSV)) {
      loadData(selectedMaSV)
    } else {
      setListTienDo([])
    }
  }, [selectedMaSV, selectedDot?.maDot, loadingStudents, studentList])

  // Sinh viên hiện tại
  const currentStudent = studentList.find((s) => s.maSV === selectedMaSV)
  const reportPeriod = studentReportPeriod(currentStudent, selectedDot)
  const reportStart = reportPeriod.thoiGianBD, reportEnd = reportPeriod.thoiGianKT
  const reportEntries = useMemo(() => academicReportEntries(listTienDo, { thoiGianBD: reportStart, thoiGianKT: reportEnd }), [listTienDo, reportStart, reportEnd])
  const historicalIds = useMemo(() => new Set(reportEntries.history.map(report => report.maTienDo)), [reportEntries])

  // Xử lý khi đổi sinh viên trong dropdown
  const handleSelectStudent = (newMaSV) => {
    setSelectedMaSV(newMaSV)
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      next.set('sv', newMaSV)
      next.delete('report')
      next.delete('dot')
      return next
    })
  }

  const handleOpenDuyet = (item) => {
    if (roundLock.blocked) return
    if (historicalIds.has(item.maTienDo) || item.trangThaiDuyet !== 'DaNop') return
    setSelectedTienDo(item)
    setDuyetStatus('DaDuyet')
    setNhanXetGV(item.nhanXetGV || '')
    setModalMode('duyet')
    setShowModal(true)
  }

  const handleOpenView = (item) => {
    setSelectedTienDo(item)
    setNhanXetGV(item.nhanXetGV || '')
    setModalMode('view')
    setShowModal(true)
  }

  useEffect(() => {
    if (!linkedReportId || loading || loadingStudents || roundLock.loading
      || loadedReportKey !== JSON.stringify([selectedMaSV, selectedDot?.maDot])) return
    const linkKey = JSON.stringify([currentMaGV, selectedMaSV, selectedDot?.maDot, linkedReportId])
    if (openedReportLink.current === linkKey) return
    openedReportLink.current = linkKey
    const report = findReviewReport(listTienDo, linkedReportId, selectedMaSV, selectedDot?.maDot)
    if (!report) {
      setReviewNotice('Không tìm thấy báo cáo trong liên kết. Báo cáo có thể đã thay đổi hoặc không thuộc sinh viên và đợt đang xem.')
      return
    }
    setSelectedTienDo(report)
    setNhanXetGV(report.nhanXetGV || '')
    setDuyetStatus('DaDuyet')
    setModalMode(report.trangThaiDuyet === 'DaNop' && !historicalIds.has(report.maTienDo) && !roundLock.blocked ? 'duyet' : 'view')
    setShowModal(true)
  }, [linkedReportId, loading, loadingStudents, roundLock.loading, roundLock.blocked, loadedReportKey,
    selectedMaSV, selectedDot?.maDot, currentMaGV, listTienDo, historicalIds])

  // 3. Phê duyệt tiến độ — CHỈ cập nhật UI khi database cập nhật thành công!
  const handleSaveDuyet = async () => {
    if (roundLock.blocked || submitting || !mounted.current) return
    if (!selectedTienDo || historicalIds.has(selectedTienDo.maTienDo) || selectedTienDo.trangThaiDuyet !== 'DaNop') return
    if (duyetStatus === 'YeuCauSua' && !nhanXetGV.trim()) {
      toast.error('Nhập nhận xét nêu rõ nội dung sinh viên cần sửa/bổ sung trước khi yêu cầu sửa.')
      return
    }
    try {
      setSubmitting(true)
      await tienDoThucTapService.duyetTienDo(selectedTienDo.maTienDo, duyetStatus, nhanXetGV.trim())
      if (!mounted.current) return

      // Cập nhật lại danh sách trực tiếp từ DB
      await loadData(selectedMaSV)
      if (!mounted.current) return

      setShowModal(false)
      setToastMessage('Đã lưu kết quả duyệt báo cáo.')
      setTimeout(() => setToastMessage(''), 4000)
    } catch (err) {
      if (!mounted.current) return
      toast.error('Không thể lưu trạng thái duyệt: ' + (err.response?.data?.message || err.message))
    } finally {
      if (mounted.current) setSubmitting(false)
    }
  }

  const getStatusBadge = (status, report) => {
    switch (status) {
      case 'DaNop':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Chờ GV duyệt
          </span>
        )
      case 'DaDuyet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-xs">check</span>
            Đã duyệt đạt
          </span>
        )
      case 'YeuCauSua':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="material-symbols-outlined text-xs">edit</span>
            Yêu cầu sửa
            {revisionWindowStatus(report) === 'open'
              ? ` · nộp lại đến ${new Date(report.hanNopLai).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
              : revisionWindowStatus(report) === 'expired' ? ' · đã hết hạn nộp lại' : ' · chưa có hạn nộp lại'}
          </span>
        )
      case 'ChuaNop':
      default: {
        const block = submissionBlock(report)
        const isPast = Boolean(block?.startsWith('Đã khóa'))
        if (block && !isPast) return <span className="text-xs text-amber-700">Chưa xác định hạn nộp</span>
        return isPast ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200" title="Đã quá hạn mốc báo cáo">
            Chưa nộp (Quá hạn)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50/70 text-blue-700 border border-blue-100" title="Còn hạn nộp báo cáo">
            {report.hanNopBoSung ? 'Đang mở nộp bổ sung' : 'Chưa nộp (còn hạn)'}
          </span>
        )
      }
    }
  }

  // Thống kê tiến độ trực tiếp từ danh sách DB
  const currentReports = reportEntries.current
  const archivedCount = reportEntries.history.length
  const totalReports = currentReports.length
  const daDuyetCount = currentReports.filter((t) => t.trangThaiDuyet === 'DaDuyet').length
  const choDuyetCount = currentReports.filter((t) => t.trangThaiDuyet === 'DaNop').length
  const yeuCauSuaCount = currentReports.filter((t) => t.trangThaiDuyet === 'YeuCauSua').length
  const chuaNopCount = currentReports.filter((t) => t.trangThaiDuyet === 'ChuaNop' || !t.trangThaiDuyet).length

  const outsideRoundCount = reportsOutsideRound(listTienDo, reportPeriod).length

  // Danh sách đã lọc theo trạng thái và từ khóa tìm kiếm
  const filteredReports = (showHistory ? listTienDo : currentReports).filter((item) => {
    if (statusFilter === 'DaNop' && item.trangThaiDuyet !== 'DaNop') return false
    if (statusFilter === 'DaDuyet' && item.trangThaiDuyet !== 'DaDuyet') return false
    if (statusFilter === 'YeuCauSua' && item.trangThaiDuyet !== 'YeuCauSua') return false
    if (statusFilter === 'ChuaNop' && (item.trangThaiDuyet && item.trangThaiDuyet !== 'ChuaNop')) return false

    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase()
      const matchMa = item.maTienDo?.toLowerCase().includes(kw)
      const matchNoiDung = item.noiDungBaoCao?.toLowerCase().includes(kw)
      const matchNhanXet = item.nhanXetGV?.toLowerCase().includes(kw)
      const matchMoc = item.mocThoiGian ? formatDateVN(item.mocThoiGian).includes(kw) : false
      if (!matchMa && !matchNoiDung && !matchNhanXet && !matchMoc) return false
    }
    return true
  })

  const sortedReports = useMemo(() => {
    const list = [...filteredReports]
    if (sortOrder === 'PRIORITY') {
      const getPriority = (item) => {
        if (item.trangThaiDuyet === 'DaNop') return 1
        if (item.trangThaiDuyet === 'YeuCauSua') return 2
        if (item.trangThaiDuyet === 'DaDuyet') return 3
        const isPast = Boolean(submissionBlock(item))
        if (isPast) return 4
        return 5
      }
      list.sort((a, b) => {
        const pA = getPriority(a)
        const pB = getPriority(b)
        if (pA !== pB) return pA - pB
        return new Date(b.mocThoiGian || 0) - new Date(a.mocThoiGian || 0)
      })
    } else if (sortOrder === 'NEWEST') {
      list.sort((a, b) => new Date(b.mocThoiGian || 0) - new Date(a.mocThoiGian || 0))
    } else if (sortOrder === 'OLDEST') {
      list.sort((a, b) => new Date(a.mocThoiGian || 0) - new Date(b.mocThoiGian || 0))
    }
    return list
  }, [filteredReports, sortOrder])

  const pagination = usePagination(sortedReports, JSON.stringify([currentMaGV, selectedDot?.maDot, selectedMaSV, statusFilter, searchKeyword, sortOrder]))

  return (
    <div className="space-y-6">
      {reviewNotice && <div role="status" className="p-3 rounded-xl bg-amber-50 text-amber-800 text-sm">{reviewNotice}</div>}
      {!loading && outsideRoundCount > 0 && <div role="status" className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">Có {outsideRoundCount} báo cáo cũ nằm ngoài thời gian thực tập của sinh viên. Các báo cáo đã nộp được giữ nguyên để đối chiếu lịch sử.</div>}
      {/* 1. Header Trang & Thông tin Đợt */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/giang-vien/sinh-vien')}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Quay lại danh sách sinh viên"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                <span>{selectedDot?.tenDot || 'Đợt thực tập hiện hành'}</span>
                <span>•</span>
                <span className="text-blue-600 font-bold">Theo dõi báo cáo tiến độ</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Chi Tiết Tiến Độ Thực Tập
              </h1>
            </div>
          </div>

          {/* Phím tắt sang Chấm điểm CLO */}
          {selectedMaSV && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Dropdown sắp xếp */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium whitespace-nowrap">Sắp xếp:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="h-8 pl-2 pr-7 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="PRIORITY">Ưu tiên cần xử lý</option>
                  <option value="NEWEST">Mới nhất (gần đây)</option>
                  <option value="OLDEST">Lịch trình (Cũ → Mới)</option>
                </select>
              </div>
              <Link
                to={`/giang-vien/cham-diem?sv=${selectedMaSV}`}
                className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-base">fact_check</span>
                Chấm điểm CLO sinh viên này
              </Link>
            </div>
          )}
        </div>

        {/* Bộ chọn sinh viên và thông tin tóm tắt */}
        {loadingStudents ? (
          <div className="py-6 text-center text-slate-400 text-xs">Đang tải danh sách sinh viên...</div>
        ) : studentList.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600">info</span>
            <span>Chưa có sinh viên được phân công trong đợt đang chọn. Vui lòng liên hệ Khoa để kiểm tra danh sách hướng dẫn.</span>
          </div>
        ) : (
          <>
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Chọn sinh viên hướng dẫn ({studentList.length} sinh viên):
                </label>
                <div className="relative">
                  <select
                    aria-label="Chọn sinh viên hướng dẫn"
                    value={selectedMaSV}
                    onChange={(e) => handleSelectStudent(e.target.value)}
                    className="w-full h-11 pl-3 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="" disabled>Chọn sinh viên hướng dẫn</option>
                    {studentList.map((s) => (
                      <option key={s.maSV} value={s.maSV}>
                        {s.hoTen} ({s.maSV}) - Lớp {s.lop}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-blue-100/90 border-blue-400 ring-2 ring-blue-500 shadow-sm'
                      : 'bg-blue-50/70 border-blue-100 hover:bg-blue-100/60'
                  }`}
                  title="Nhấn để xem tất cả báo cáo"
                >
                  <span className="text-slate-500 block font-medium">Tổng mốc báo cáo</span>
                  <span className="text-lg font-black text-blue-700 font-mono">{totalReports}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'DaDuyet' ? 'ALL' : 'DaDuyet')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    statusFilter === 'DaDuyet'
                      ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-500 shadow-sm'
                      : 'bg-emerald-50/70 border-emerald-100 hover:bg-emerald-100/60'
                  }`}
                  title="Nhấn để lọc báo cáo Đã duyệt đạt"
                >
                  <span className="text-slate-500 block font-medium">Đã duyệt</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">{daDuyetCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'DaNop' ? 'ALL' : 'DaNop')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    statusFilter === 'DaNop'
                      ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-500 shadow-sm'
                      : 'bg-amber-50/70 border-amber-100 hover:bg-amber-100/60'
                  }`}
                  title="Nhấn để lọc báo cáo Chờ GV duyệt"
                >
                  <span className="text-slate-500 block font-medium">Chờ duyệt</span>
                  <span className="text-lg font-black text-amber-700 font-mono">{choDuyetCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === 'ChuaNop' ? 'ALL' : 'ChuaNop')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    statusFilter === 'ChuaNop'
                      ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-500 shadow-sm'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                  }`}
                  title="Nhấn để lọc báo cáo Chưa nộp"
                >
                  <span className="text-slate-500 block font-medium">Chưa nộp</span>
                  <span className="text-lg font-black text-slate-700 font-mono">{chuaNopCount}</span>
                </button>
              </div>
            </div>

            {/* Thông tin đơn vị thực tập của sinh viên */}
            {currentStudent && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-base">domain</span>
                  <span className="text-slate-500">Đơn vị thực tập tiếp nhận:</span>
                  <strong className="text-slate-800">{currentStudent.tenCongTy}</strong>
                </div>
                <span className="text-slate-400">GVHD: {lecturerInfo?.hoTen || currentMaGV} ({currentMaGV})</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Thông báo cập nhật thành công nếu có */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* 2. Bảng Danh sách Tiến độ từ DB */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/75 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Nhật Ký Báo Cáo Thực Tập Định Kỳ
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lịch báo cáo: {formatDateVN(reportPeriod.thoiGianBD)} – {formatDateVN(reportPeriod.thoiGianKT)}. Học phần 12 tuần, nộp 2 tuần/lần (6 kỳ).
              </p>
            </div>
          </div>

          {/* Thanh công cụ Lọc trạng thái & Tìm kiếm */}
          {archivedCount > 0 && <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={showHistory} onChange={event => setShowHistory(event.target.checked)} />Xem thêm {archivedCount} báo cáo lịch sử (chỉ xem)</label>}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
            {/* Tabs trạng thái */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tất cả ({totalReports})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('DaNop')}
                className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'DaNop'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                }`}
              >
                <span>Chờ GV duyệt</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === 'DaNop' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {choDuyetCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('DaDuyet')}
                className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'DaDuyet'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <span>Đã duyệt đạt</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === 'DaDuyet' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {daDuyetCount}
                </span>
              </button>

              {yeuCauSuaCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('YeuCauSua')}
                  className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === 'YeuCauSua'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <span>Yêu cầu sửa</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    statusFilter === 'YeuCauSua' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {yeuCauSuaCount}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setStatusFilter('ChuaNop')}
                className={`px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'ChuaNop'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>Chưa nộp</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === 'ChuaNop' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {chuaNopCount}
                </span>
              </button>
            </div>

            {/* Ô tìm kiếm nhanh */}
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                  search
                </span>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="Tìm nội dung, mã, nhận xét..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>

              {(statusFilter !== 'ALL' || searchKeyword) && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL')
                    setSearchKeyword('')
                  }}
                  className="text-xs text-slate-500 hover:text-blue-600 font-medium whitespace-nowrap cursor-pointer px-2 py-1"
                  title="Đặt lại bộ lọc"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Đang tải dữ liệu tiến độ từ hệ thống...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">{error}</div>
        ) : listTienDo.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs space-y-2">
            <span className="material-symbols-outlined text-4xl text-slate-300">history_edu</span>
            <p>Chưa có mốc báo cáo được lưu cho sinh viên trong đợt này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[140px]">Tuần báo cáo</th>
                  <th className="py-3 px-4 w-32">Mốc thời gian</th>
                  <th className="py-3 px-4 w-32">Ngày nộp</th>
                  <th className="py-3 px-4 min-w-[240px]">Nội dung công việc & Kết quả</th>
                  <th className="py-3 px-4 min-w-[200px]">Nhận xét của GV</th>
                  <th className="py-3 px-4 w-36 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-28 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagination.items.map((item, idx) => (
                  <tr key={item.maTienDo || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 align-top">
                      <span className={`inline-block rounded-md border px-2.5 py-1 text-xs font-semibold ${reportWeekLabel(item, reportPeriod) === 'Ngoài lịch đợt' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{reportWeekLabel(item, reportPeriod)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 align-top font-medium">
                      {formatDateVN(item.mocThoiGian)}
                      {item.hanNopBoSung && <span className="block text-xs text-blue-700 mt-1">Hạn bổ sung: {new Date(item.hanNopBoSung).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 align-top">
                      {item.ngayNop ? (
                        <span className="font-medium text-slate-700">{formatDateVN(item.ngayNop)}</span>
                      ) : (
                        <span className="italic text-slate-400">Chưa nộp</span>
                      )}
                      {item.nopTre === true && (
                        <span className="block text-amber-700 text-[11px] font-semibold mt-0.5">
                          {item.hanNopBoSung ? 'Nộp bổ sung (Khoa duyệt)' : 'Nộp sau hạn gốc'}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 align-top leading-relaxed">
                      {item.noiDungBaoCao ? (
                        item.noiDungBaoCao
                      ) : (
                        <span className="italic text-slate-400">Sinh viên chưa cập nhật nội dung</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 align-top leading-relaxed">
                      {item.nhanXetGV ? (
                        <span className="text-blue-900 bg-blue-50/80 px-2 py-1 rounded-md inline-block border border-blue-100">
                          {item.nhanXetGV}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Chưa có nhận xét</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center align-top">
                      {getStatusBadge(item.trangThaiDuyet, item)}
                      {historicalIds.has(item.maTienDo) && <div className="text-[11px] text-slate-500 mt-1">Báo cáo lịch sử — chỉ xem</div>}
                    </td>
                    <td className="py-3.5 px-4 text-center align-top">
                      <div className="flex items-center justify-center gap-1.5">
                        {!historicalIds.has(item.maTienDo) && item.trangThaiDuyet === 'DaNop' ? (
                          <button
                            onClick={() => handleOpenDuyet(item)}
                            disabled={roundLock.blocked}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold transition shadow-xs cursor-pointer flex items-center gap-1 text-xs"
                            title="Phê duyệt hoặc yêu cầu chỉnh sửa báo cáo"
                          >
                            <span className="material-symbols-outlined text-sm">rate_review</span>
                            <span>Duyệt</span>
                          </button>
                        ) : item.trangThaiDuyet === 'ChuaNop' || !item.trangThaiDuyet ? (
                          <button
                            onClick={() => handleOpenView(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 font-medium transition cursor-pointer flex items-center gap-1 text-xs border border-slate-200"
                            title="Xem chi tiết mốc thời gian"
                          >
                            <span className="material-symbols-outlined text-sm">event_note</span>
                            <span>Xem mốc</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenView(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition cursor-pointer flex items-center gap-1 text-xs"
                            title="Xem chi tiết nội dung và tệp minh chứng đính kèm"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span>Chi tiết</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={pagination} label="báo cáo sinh viên hướng dẫn"/>
          </div>
        )}
      </div>

      {/* Modal Xem Chi Tiết / Duyệt Tiến Độ */}
      {showModal && selectedTienDo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">
                  {modalMode === 'duyet' ? 'rate_review' : 'assignment'}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {modalMode === 'duyet' ? 'Duyệt báo cáo' : 'Chi tiết báo cáo'} — {reportWeekLabel(selectedTienDo, reportPeriod)} · {formatDateVN(selectedTienDo.mocThoiGian)}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Thông tin mốc thời gian & ngày nộp */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[11px]">Hạn nộp ban đầu:</span>
                  <span className="font-semibold text-slate-800">
                    {formatDateVN(selectedTienDo.mocThoiGian)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Ngày nộp:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTienDo.ngayNop ? formatDateVN(selectedTienDo.ngayNop) : 'Chưa nộp'}
                  </span>
                  {selectedTienDo.nopTre && (
                    <span className="block text-amber-700 text-[10px]">
                      {selectedTienDo.hanNopBoSung ? '(Nộp bổ sung được Khoa mở)' : '(Nộp sau hạn gốc)'}
                    </span>
                  )}
                </div>
                {revisionWindowStatus(selectedTienDo) && <div className="col-span-2 border-t border-slate-200 pt-2">
                  <span className="text-slate-400 block text-[11px]">Hạn nộp lại theo yêu cầu sửa:</span>
                  <span className="font-semibold text-slate-800">{new Date(selectedTienDo.hanNopLai).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ Việt Nam)</span>
                </div>}
              </div>

              {/* Form duyệt hoặc Trạng thái hiện tại */}
              {modalMode === 'duyet' ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quyết định phê duyệt:</label>
                  <select
                    value={duyetStatus}
                    onChange={(e) => setDuyetStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="DaDuyet">Đã duyệt đạt</option>
                    <option value="YeuCauSua">Yêu cầu sửa / bổ sung</option>
                  </select>
                  {duyetStatus === 'YeuCauSua' && (
                    <p className="mt-1 text-[11px] text-rose-700">
                      Bắt buộc ghi nội dung cần sửa. Sinh viên được nộp lại trong {SO_NGAY_NOP_LAI} ngày (tính hết ngày, giờ Việt Nam), kể cả khi mốc gốc đã qua.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="font-bold text-slate-600">Trạng thái hiện tại:</span>
                  <div>{getStatusBadge(selectedTienDo.trangThaiDuyet, selectedTienDo)}</div>
                </div>
              )}

              {/* Nội dung báo cáo */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung báo cáo của SV:</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-36 overflow-y-auto text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedTienDo.noiDungBaoCao || <span className="italic text-slate-400">Sinh viên chưa nhập nội dung báo cáo</span>}
                </div>
              </div>

              {/* Tệp đính kèm & Minh chứng */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tệp đính kèm & Minh chứng:</label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <DocumentAttachments key={selectedTienDo.maTienDo} kind="Progress" resourceId={selectedTienDo.maTienDo} readOnly title="Tệp sinh viên đã nộp" />
                </div>
              </div>

              {/* Nhận xét của GV */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {modalMode === 'duyet' ? (duyetStatus === 'YeuCauSua' ? 'Nội dung cần sửa (bắt buộc):' : 'Nhận xét & Góp ý của GV:') : 'Nhận xét của GV đã ghi nhận:'}
                </label>
                {modalMode === 'duyet' ? (
                  <textarea
                    rows={3}
                    value={nhanXetGV}
                    onChange={(e) => setNhanXetGV(e.target.value)}
                    maxLength={500}
                    placeholder="Nhập nhận xét, đánh giá kết quả công việc hoặc yêu cầu chỉnh sửa..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none font-sans"
                  />
                ) : (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-900 leading-relaxed">
                    {selectedTienDo.nhanXetGV || <span className="italic text-slate-400">Chưa có nhận xét nào</span>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                {modalMode === 'duyet' ? 'Hủy' : 'Đóng'}
              </button>
              {modalMode === 'duyet' && (
                <button
                  type="button"
                  onClick={handleSaveDuyet}
                  disabled={submitting || roundLock.blocked || (duyetStatus === 'YeuCauSua' && !nhanXetGV.trim())}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {submitting && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                  <span>Lưu kết quả phê duyệt</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
