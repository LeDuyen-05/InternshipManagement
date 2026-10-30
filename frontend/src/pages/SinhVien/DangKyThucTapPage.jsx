import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'
import { useIdentity } from '../../hooks/useIdentity'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import NoLinkedAccount from '../../components/common/NoLinkedAccount'
import ThucTapTuTimPanel from '../../components/sinh-vien/ThucTapTuTimPanel'
import { dangKyThucTapService } from '../../services/dangKyThucTapService'
import { hoSoNangLucService } from '../../services/hoSoNangLucService'
import { phongVanService } from '../../services/phongVanService'
import { CONG_TY, TONE, gpaToiThieu, trangThaiNguyenVong } from '../../utils/trangThai'

export default function DangKyThucTapPage() {
  const { maSV: currentMaSV } = useIdentity()
  const { selectedDot, roundLock } = useDotThucTap()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentMaDot = selectedDot?.maDot || ''
  const contextKey = `${currentMaSV}|${currentMaDot}`
  const activeContext = useRef(contextKey)
  activeContext.current = contextKey
  const requestVersion = useRef(0)

  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(() =>
    tabFromUrl === 'tu-tim' ? 'tu-tim' : tabFromUrl === 'my-applications' ? 'my-applications' : 'companies'
  )

  useEffect(() => {
    if (tabFromUrl === 'tu-tim' || tabFromUrl === 'my-applications' || tabFromUrl === 'companies') {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  const handleTabChange = (newTab) => {
    setActiveTab(newTab)
    const newParams = new URLSearchParams(searchParams)
    if (newTab === 'companies') {
      newParams.delete('tab')
    } else {
      newParams.set('tab', newTab)
    }
    setSearchParams(newParams, { replace: true })
  }

  const [companies, setCompanies] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [myProposals, setMyProposals] = useState([])
  const [placement, setPlacement] = useState(null)
  const [gpa, setGpa] = useState(null)
  const [dieuKien, setDieuKien] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)

  // Modal Đăng ký nguyện vọng
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [applyPriority, setApplyPriority] = useState(1)
  const [isSubmittingApply, setIsSubmittingApply] = useState(false)

  // Modal Đề xuất công ty mới
  const [proposalModalOpen, setProposalModalOpen] = useState(false)
  const [proposalForm, setProposalForm] = useState({
    tenCongTy: '',
    viTriTuyen: '',
    soLuongNhan: 2,
    thoiGian: '3 tháng',
    yeuCau: '',
  })
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), type === 'success' ? 4000 : 7000)
  }

  const fetchData = async () => {
    const request = ++requestVersion.current
    setLoading(true)
    try {
      const [compRes, appRes, propRes, pbRes, hsRes, dkRes] = await Promise.all([
        dangKyThucTapService.getDanhSachCongTy(currentMaDot),
        dangKyThucTapService.getDangKyBySinhVien(currentMaSV),
        dangKyThucTapService.getDeXuatCuaToi().catch(() => []),
        phongVanService.getPhanBoThucTap(currentMaSV, currentMaDot).catch(() => null),
        hoSoNangLucService.getHoSoBySinhVien(currentMaSV).catch(() => null),
        currentMaDot ? dangKyThucTapService.getDieuKien(currentMaDot).catch(() => null) : Promise.resolve(null),
      ])
      if (request !== requestVersion.current || activeContext.current !== contextKey) return
      setDieuKien(dkRes)
      setCompanies(compRes || [])
      // Giới hạn 3 nguyện vọng và thứ tự ưu tiên tính trong từng đợt
      setMyApplications((appRes || []).filter((a) => !currentMaDot || a.maDot === currentMaDot))
      setMyProposals(propRes || [])
      setPlacement(pbRes && (!currentMaDot || pbRes.maDot === currentMaDot) ? pbRes : null)
      setGpa(hsRes?.gpa ?? null)
    } catch (err) {
      if (request !== requestVersion.current || activeContext.current !== contextKey) return
      console.error('Lỗi khi tải dữ liệu thực tập:', err)
      showToast('Không thể kết nối đến máy chủ API', 'error')
    } finally {
      if (request === requestVersion.current && activeContext.current === contextKey) setLoading(false)
    }
  }

  useEffect(() => {
    setCompanies([])
    setMyApplications([])
    setPlacement(null)
    setApplyModalOpen(false)
    setSelectedCompany(null)
    setIsSubmittingApply(false)
    setDieuKien(null)
    fetchData()
  }, [currentMaSV, currentMaDot])

  // Chỉ đăng ký được khi đợt đang diễn ra và SV chưa được doanh nghiệp nào tiếp nhận
  const dotDangMo = selectedDot?.trangThai === 'DangDienRa'
  // Quy tắc "đã trúng tuyển / đã hoàn thành học phần" do backend quyết định (một nguồn duy nhất)
  const khongDuDieuKien = Boolean(dieuKien && !dieuKien.duocDangKy)
  const daCoNoiTiepNhan = Boolean(placement) || Boolean(khongDuDieuKien)
  const lyDoKhoa = !dotDangMo
    ? `Đợt "${selectedDot?.tenDot || ''}" ${selectedDot?.labelTrangThai?.toLowerCase() || 'không mở đăng ký'} — không thể đăng ký nguyện vọng.`
    : khongDuDieuKien
      ? dieuKien.lyDo
      : placement
        ? `Bạn đã trúng tuyển tại ${placement.tenCongTy} trong đợt này nên không thể đăng ký thêm nguyện vọng.`
        : null

  // Backend không cho đăng ký thêm khi đã có một nguyện vọng đạt vòng hồ sơ (đang chờ phỏng vấn/kết quả)
  const nvDangXet = myApplications.find((a) => a.trangThai === 'DaDuyet' && !a.daTiepNhan)
  const lyDoDangKy =
    lyDoKhoa ||
    (nvDangXet
      ? `Hồ sơ của bạn tại ${nvDangXet.tenCongTy} đã đạt vòng xét và đang chờ phỏng vấn/kết quả nên chưa thể đăng ký thêm nguyện vọng.`
      : null)

  // Mở modal đăng ký cho 1 công ty
  const kiemTraDieuKienMoi = async () => {
    if (!currentMaDot) return null
    try {
      const dk = await dangKyThucTapService.getDieuKien(currentMaDot)
      setDieuKien(dk)
      return dk && !dk.duocDangKy ? dk.lyDo : null
    } catch {
      return null
    }
  }

  // Lỗi nghiệp vụ (400/409): đóng form, báo lý do và tải lại để banner/khóa nút cập nhật ngay
  const xuLyLoiNghiepVu = (err, dongForm, tienTo) => {
    const status = err.response?.status
    const message = err.response?.data?.message || err.message
    showToast(`${tienTo}: ${message}`, 'error')
    if (status === 400 || status === 409) {
      dongForm()
      fetchData()
    }
  }

  const handleOpenApply = async (company) => {
    if (roundLock.structureBlocked)
      return showToast('Đợt đã chốt/khóa hoặc chưa xác minh trạng thái; không đăng ký mới.', 'error')
    if (loading) return
    const offered = companies.find(
      (x) => x.maCongTy === company.maCongTy && x.maViTri === company.maViTri && x.maDot === currentMaDot
    )
    if (!offered) {
      showToast(
        'DN chưa được mở nhận đăng ký hoặc đã hết hạn/đủ chỉ tiêu trong đợt đang chọn. Liên hệ Khoa nếu cần hỗ trợ.',
        'error'
      )
      return
    }
    if (lyDoDangKy) {
      showToast(lyDoDangKy, 'error')
      return
    }
    const lyDoMoi = await kiemTraDieuKienMoi()
    if (activeContext.current !== contextKey) return
    if (lyDoMoi) {
      showToast(lyDoMoi, 'error')
      return
    }
    if (myApplications.length >= 3) {
      showToast(
        'Bạn đã dùng đủ 3 lượt đăng ký trong đợt, kể cả lượt rút/rớt. Liên hệ Khoa để được hỗ trợ bố trí.',
        'warning'
      )
      return
    }
    setSelectedCompany(offered)
    // Tự động tìm thứ tự ưu tiên còn trống nhỏ nhất trong khoảng [1, 2, 3]
    const usedPriorities = myApplications.map((a) => a.thuTuUuTien)
    const nextPriority = [1, 2, 3].find((p) => !usedPriorities.includes(p)) || 1
    setApplyPriority(nextPriority)
    setApplyModalOpen(true)
  }

  // Submit đăng ký nguyện vọng
  const handleSubmitApply = async (e) => {
    e.preventDefault()
    if (roundLock.structureBlocked) return
    if (!selectedCompany || selectedCompany.maDot !== currentMaDot || loading) return

    const priorityNum = parseInt(applyPriority, 10)
    if (isNaN(priorityNum) || priorityNum < 1 || priorityNum > 3) {
      showToast('Thứ tự ưu tiên nguyện vọng phải từ 1 đến 3!', 'error')
      return
    }

    setIsSubmittingApply(true)
    try {
      await dangKyThucTapService.dangKyThucTap({
        maSV: currentMaSV,
        maCongTy: selectedCompany.maCongTy,
        maViTri: selectedCompany.maViTri,
        maDot: currentMaDot,
        thuTuUuTien: priorityNum,
      })
      if (activeContext.current !== contextKey) return
      showToast(`Đã nộp nguyện vọng vào "${selectedCompany.tenCongTy}" thành công!`)
      setApplyModalOpen(false)
      fetchData()
      handleTabChange('my-applications')
    } catch (err) {
      console.error(err)
      if (activeContext.current !== contextKey) return
      xuLyLoiNghiepVu(err, () => setApplyModalOpen(false), 'Không thể nộp nguyện vọng')
    } finally {
      if (activeContext.current === contextKey) setIsSubmittingApply(false)
    }
  }

  // Hủy nguyện vọng
  const handleCancelApplication = async (maDK, tenCongTy) => {
    if (roundLock.structureBlocked)
      return showToast('Đợt đã chốt/khóa, không rút nguyện vọng.', 'error')
    if (!window.confirm(`Bạn có chắc muốn hủy đăng ký vào "${tenCongTy}"?`)) return

    try {
      await dangKyThucTapService.huyDangKyThucTap(maDK)
      showToast(`Đã hủy đăng ký vào "${tenCongTy}" thành công!`)
      fetchData()
    } catch (err) {
      console.error(err)
      showToast('Lỗi khi hủy đăng ký: ' + (err.response?.data?.message || err.message), 'error')
    }
  }

  // Submit đề xuất công ty
  const handleSubmitProposal = async (e) => {
    e.preventDefault()
    if (!proposalForm.tenCongTy.trim()) {
      showToast('Vui lòng nhập tên công ty!', 'error')
      return
    }

    setIsSubmittingProposal(true)
    try {
      await dangKyThucTapService.deXuatCongTy({
        ...proposalForm,
        soLuongNhan: parseInt(proposalForm.soLuongNhan, 10) || 1,
        maSV: currentMaSV,
      })
      showToast('Đã gửi đề xuất doanh nghiệp thành công! Đang chờ Khoa duyệt.')
      setProposalModalOpen(false)
      setProposalForm({
        tenCongTy: '',
        viTriTuyen: '',
        soLuongNhan: 2,
        thoiGian: '3 tháng',
        yeuCau: '',
      })
      fetchData()
    } catch (err) {
      console.error(err)
      xuLyLoiNghiepVu(err, () => setProposalModalOpen(false), 'Không thể gửi đề xuất')
    } finally {
      setIsSubmittingProposal(false)
    }
  }

  // Đến từ trang Gợi ý AI: mở form nguyện vọng cho công ty đã chọn (vẫn qua đủ các bước kiểm tra)
  const maViTriChon = location.state?.maViTri
  const maCongTyChon = location.state?.maCongTy
  useEffect(() => {
    if (loading || !maCongTyChon) return
    navigate(location.pathname, { replace: true, state: null })
    if (location.state?.maDot && location.state.maDot !== currentMaDot) {
      showToast('Gợi ý thuộc đợt khác. Hãy chọn đúng đợt và cập nhật gợi ý trước khi đăng ký.', 'warning')
      return
    }
    const matching = companies.filter((c) => c.maCongTy === maCongTyChon)
    const ct = maViTriChon
      ? matching.find((c) => c.maViTri === maViTriChon)
      : matching.length === 1
        ? matching[0]
        : null
    if (!ct)
      showToast(
        !maViTriChon && matching.length > 1
          ? 'Công ty có nhiều vị trí. Hãy chọn đúng vị trí/JD bên dưới để đăng ký.'
          : 'Vị trí này hiện không còn nhận đăng ký trong đợt.',
        'warning'
      )
    else if (myApplications.some((a) => a.maCongTy === ct.maCongTy))
      showToast(`Bạn đã đăng ký nguyện vọng vào "${ct.tenCongTy}".`, 'warning')
    else if (ct.daDuChiTieu)
      showToast(`"${ct.tenCongTy}" đã đủ chỉ tiêu, đợt tuyển đã đóng.`, 'warning')
    else handleOpenApply(ct)
  }, [loading, maCongTyChon, maViTriChon])

  // Filter companies theo từ khóa
  const filteredCompanies = companies.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      c.tenCongTy?.toLowerCase().includes(q) ||
      c.viTriTuyen?.toLowerCase().includes(q) ||
      c.yeuCau?.toLowerCase().includes(q)
    )
  })

  const companyPagination = usePagination(
    filteredCompanies,
    JSON.stringify([currentMaSV, selectedDot?.maDot, searchQuery])
  )
  const proposalPagination = usePagination(
    myProposals,
    JSON.stringify([currentMaSV, selectedDot?.maDot])
  )

  // Kiểm tra công ty đã được SV đăng ký chưa
  const isAlreadyApplied = (maCongTy) => {
    return myApplications.some((a) => a.maCongTy === maCongTy)
  }

  if (!currentMaSV) {
    return <NoLinkedAccount type="sinh viên" />
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-[60] max-w-md flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[20px] shrink-0">
            {toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            HỌC VỤ &amp; ĐĂNG KÝ THỰC TẬP • {selectedDot?.tenDot || 'ĐANG MỞ ĐĂNG KÝ'}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
            Đăng ký Nguyện vọng Thực tập &amp; Khám phá Doanh nghiệp
          </h1>
          <p className="text-xs text-slate-500 mt-1 mb-0 leading-relaxed">
            Chọn doanh nghiệp phù hợp với định hướng nghề nghiệp hoặc khai báo đơn vị tiếp nhận bên ngoài để Khoa công nhận và phân công GVHD.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={async () => {
              const lyDoMoi = lyDoKhoa || (await kiemTraDieuKienMoi())
              if (lyDoMoi) {
                showToast(lyDoMoi, 'error')
                return
              }
              setProposalModalOpen(true)
            }}
            disabled={daCoNoiTiepNhan}
            title={
              lyDoDangKy ||
              (daCoNoiTiepNhan
                ? 'Không thể đề xuất do đã có nơi thực tập hoặc đã hoàn thành học phần'
                : 'Đề xuất doanh nghiệp ngoài danh sách')
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px] text-blue-700">add_business</span>
            <span>+ Đề xuất doanh nghiệp mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo điều kiện đăng ký */}
      {lyDoDangKy && (
        <div
          role="status"
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 shadow-2xs ${
            daCoNoiTiepNhan ? TONE.emerald : lyDoKhoa ? TONE.amber : TONE.blue
          }`}
        >
          <span className="material-symbols-outlined text-[22px] shrink-0">
            {daCoNoiTiepNhan ? 'verified' : 'info'}
          </span>
          <span className="leading-relaxed">{lyDoDangKy}</span>
        </div>
      )}

      {/* Bento Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Doanh nghiệp tuyển</span>
            <span className="material-symbols-outlined text-blue-700 text-[22px]">apartment</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">{companies.length}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              {companies.length === 0 ? (
                <span className="text-slate-400">Đang cập nhật chỉ tiêu đợt</span>
              ) : (
                <>
                  <span className="text-emerald-600 font-semibold">Đã kiểm duyệt</span> bởi Khoa CNTT
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Nguyện vọng đã nộp</span>
            <span className="material-symbols-outlined text-indigo-700 text-[22px]">playlist_add_check</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-indigo-900">{myApplications.length}</div>
            <div className="text-xs text-indigo-600 font-semibold mt-1">
              {khongDuDieuKien ? 'Đã khóa theo quy định học vụ' : 'Tối đa 3 nguyện vọng ưu tiên'}
            </div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tiếp nhận trúng tuyển</span>
            <span className="material-symbols-outlined text-emerald-700 text-[22px]">verified</span>
          </div>
          <div className="mt-3">
            <div className="text-base font-extrabold text-emerald-800 leading-snug">
              {placement
                ? placement.tenCongTy
                : khongDuDieuKien && dieuKien?.lyDo?.includes('đạt học phần')
                  ? 'Đã đạt học phần (Đợt trước)'
                  : '—'}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-1">
              {placement
                ? 'Đã có quyết định tiếp nhận'
                : khongDuDieuKien && dieuKien?.lyDo?.includes('đạt học phần')
                  ? 'Không cần tham gia xét tuyển đợt này'
                  : `${myApplications.filter((a) => a.trangThai === 'DaDuyet').length} hồ sơ đạt vòng xét, chờ phỏng vấn`}
            </div>
          </div>
        </div>

        <div className="p-5 bg-blue-50/70 rounded-2xl border border-blue-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">Đợt thực tập</span>
            <span className="material-symbols-outlined text-blue-800 text-[22px]">schedule</span>
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-blue-950">{selectedDot?.thoiGian || '—'}</div>
            <div className="text-xs text-blue-800 mt-1 font-medium">
              {selectedDot?.labelTrangThai || 'Chưa chọn đợt'}
              {dotDangMo ? (khongDuDieuKien ? ' • Không tham gia' : ' • Đang nhận nguyện vọng') : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Cảnh báo khi dùng hết 3 lượt */}
      {!placement &&
        myApplications.length >= 3 &&
        myApplications.every((a) => a.trangThai === 'TuChoi') && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
            <span>
              Bạn đã dùng đủ 3 lượt trong đợt và chưa có nơi tiếp nhận. Liên hệ Khoa CNTT để được hỗ trợ bố trí nơi thực tập; lịch sử các lượt được giữ nguyên.
            </span>
          </div>
        )}

      {/* Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange('companies')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'companies'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">apartment</span>
            <span>Doanh nghiệp tuyển dụng</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'companies' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {companies.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('tu-tim')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'tu-tim'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">domain_add</span>
            <span>Khai báo nơi tự tìm</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('my-applications')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'my-applications'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            <span>Nguyện vọng của tôi</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'my-applications' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {myApplications.length}
            </span>
          </button>
        </div>

        {activeTab === 'companies' && (
          <div className="relative min-w-[280px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên công ty, vị trí, công nghệ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all font-medium"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-slate-500 font-medium">Đang tải dữ liệu thực tập...</p>
        </div>
      ) : activeTab === 'companies' ? (
        /* Tab 1: Danh sách công ty (Trường hợp 1) */
        <div className="space-y-5">
          {/* Gợi ý chuyển luồng nếu SV đã có nơi tiếp nhận ngoài */}
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-700 text-[20px] shrink-0">info</span>
              <span>
                <strong>Bạn đã được doanh nghiệp tiếp nhận bên ngoài?</strong> Bạn không cần nộp nguyện vọng ở đây. Hãy khai báo trực tiếp để Khoa công nhận và phân công GVHD.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange('tu-tim')}
              className="shrink-0 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer text-xs"
            >
              Khai báo nơi tự tìm →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">


            {filteredCompanies.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs text-slate-500 space-y-2">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-3xl">
                    {searchQuery ? 'manage_search' : 'business_center'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-800 m-0">
                  {searchQuery
                    ? 'Không tìm thấy doanh nghiệp phù hợp'
                    : 'Chưa có doanh nghiệp tuyển dụng trong đợt này'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed m-0">
                  {searchQuery
                    ? `Không có kết quả nào khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm với từ khóa khác.`
                    : 'Khoa CNTT đang tiếp nhận và thẩm định chỉ tiêu từ các đối tác doanh nghiệp cho đợt này. Vui lòng theo dõi thông báo hoặc sử dụng luồng Khai báo nơi tự tìm nếu bạn đã có nơi tiếp nhận.'}
                </p>
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Xóa từ khóa tìm kiếm
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTabChange('tu-tim')}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">domain_add</span>
                    <span>Chuyển sang Khai báo nơi tự tìm</span>
                  </button>
                )}
              </div>
            ) : (
              companyPagination.items.map((c) => {
                const applied = isAlreadyApplied(c.maCongTy)
                const full = !!c.daDuChiTieu
                const blocked = full || myApplications.length >= 3 || Boolean(lyDoDangKy)
                const gpaYeuCau = gpaToiThieu(c.yeuCau)
                const chuaDatGpa = gpa != null && gpaYeuCau != null && Number(gpa) < gpaYeuCau
                return (
                  <div
                    key={c.maViTri || c.maCongTy}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    <div className="p-5 flex-1 flex flex-col">
                      {/* Header card */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0 font-bold">
                          {c.tenCongTy?.charAt(0) || 'C'}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              full
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {full ? 'Đủ chỉ tiêu — đóng nhận mới' : 'Đang nhận hồ sơ'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Chỉ tiêu: <strong className="text-slate-700">{c.soLuongNhan || 1}</strong> SV
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors m-0">
                        {c.tenCongTy}
                      </h3>
                      <div className="text-xs font-semibold text-blue-700 mt-1 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">work</span>
                        <span>{c.viTriTuyen || 'Thực tập sinh'}</span>
                      </div>

                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed flex-1 m-0">
                        {c.yeuCau || 'Chưa cập nhật mô tả chi tiết yêu cầu công việc.'}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[15px] text-slate-400">
                            schedule
                          </span>
                          <span>Thời gian: {c.thoiGian || '3 tháng'}</span>
                        </div>
                        {gpaYeuCau && (
                          <div
                            className={`flex items-center gap-1.5 font-medium ${
                              chuaDatGpa ? 'text-amber-600' : 'text-slate-600'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">school</span>
                            <span>
                              Yêu cầu GPA: tối thiểu {gpaYeuCau.toFixed(1)}
                              {chuaDatGpa ? ' (Bạn chưa đạt điều kiện)' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Card */}
                    <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">Mã: {c.maCongTy}</span>
                      {applied ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          Đã đăng ký
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenApply(c)}
                          disabled={blocked}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
                            blocked
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                          title={
                            full
                              ? 'Doanh nghiệp đã đủ chỉ tiêu, đợt tuyển đã đóng'
                              : lyDoDangKy ||
                                (myApplications.length >= 3
                                  ? 'Đã đạt tối đa 3 nguyện vọng trong đợt này'
                                  : 'Nộp nguyện vọng')
                          }
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {full || lyDoDangKy ? 'lock' : 'send'}
                          </span>
                          <span>
                            {full
                              ? 'Đã đóng tuyển'
                              : lyDoDangKy
                                ? 'Không thể đăng ký'
                                : myApplications.length >= 3
                                  ? 'Đủ 3 NV'
                                  : 'Nộp nguyện vọng'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
            <div className="col-span-full pt-4 border-t border-slate-100">
              <Pagination pagination={companyPagination} label="doanh nghiệp tuyển thực tập" />
            </div>
          </div>
        </div>
      ) : activeTab === 'my-applications' ? (
        /* Tab 2: Nguyện vọng của tôi */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">Danh sách Nguyện vọng Đã Nộp</h2>
              <p className="text-xs text-slate-500 mt-1 mb-0">
                Các nguyện vọng thực tập đã gửi đến Khoa và Doanh nghiệp xét duyệt.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {myApplications.length} nguyện vọng
            </span>
          </div>

          {myApplications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <span className="material-symbols-outlined text-[48px] text-slate-300">drafts</span>
              <p className="text-xs font-medium text-slate-600 m-0">
                Bạn chưa đăng ký nguyện vọng thực tập nào trong đợt này.
              </p>
              <button
                type="button"
                onClick={() => handleTabChange('companies')}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Khám phá doanh nghiệp ngay
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">Ưu tiên</th>
                    <th className="px-5 py-3.5">Doanh nghiệp &amp; Vị trí</th>
                    <th className="px-5 py-3.5">Đợt thực tập</th>
                    <th className="px-5 py-3.5">Ngày nộp</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myApplications.map((app) => {
                    const tt = trangThaiNguyenVong(app)
                    const statusBadge = (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${TONE[tt.tone]}`}
                      >
                        {tt.label}
                      </span>
                    )

                    return (
                      <tr key={app.maDK} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                            NV{app.thuTuUuTien}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{app.tenCongTy}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{app.viTriTuyen}</div>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-600">
                          {app.tenDot || selectedDot?.tenDot || '—'}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {app.ngayDangKy ? new Date(app.ngayDangKy).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="px-5 py-4">
                          {statusBadge}
                          {app.lyDoKetThuc && <p className="text-xs mt-1 text-slate-500">{app.lyDoKetThuc}</p>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {app.trangThai === 'ChoDuyet' && !app.ketQuaPhongVan ? (
                            <button
                              type="button"
                              onClick={() => handleCancelApplication(app.maDK, app.tenCongTy)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">cancel</span>
                              <span>Hủy nguyện vọng</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              {app.daTiepNhan ? 'Xem tại Lịch phỏng vấn & Phân bổ' : 'Đang trong quy trình xét tuyển'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-5 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 m-0">
              Doanh nghiệp tôi đã đề xuất
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-0">
              Sau khi Khoa duyệt, doanh nghiệp sẽ xuất hiện trong danh sách tuyển dụng để bạn đăng ký nguyện vọng.
            </p>

            {myProposals.length === 0 ? (
              <p className="text-xs text-slate-400 mt-3 italic">Chưa có đề xuất nào.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 p-0 m-0 list-none">
                {proposalPagination.items.map((p) => (
                  <li key={p.maCongTy} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{p.tenCongTy}</div>
                      <div className="text-xs text-slate-500">{p.viTriTuyen || '—'}</div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        p.trangThai === 'DaDuyet'
                          ? TONE.emerald
                          : p.trangThai === 'TuChoi'
                            ? TONE.rose
                            : TONE.amber
                      }`}
                    >
                      {CONG_TY[p.trangThai] || p.trangThai}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-3 border-t border-slate-100">
              <Pagination pagination={proposalPagination} label="doanh nghiệp sinh viên đề xuất" />
            </div>
          </div>
        </div>
      ) : (
        /* Tab 3: Khai báo nơi tự tìm (Trường hợp 2) */
        <ThucTapTuTimPanel
          key={`${currentMaSV}|${currentMaDot}`}
          maDot={currentMaDot}
          trangThaiDot={selectedDot?.trangThai}
          onApprovedRefresh={fetchData}
          disabled={daCoNoiTiepNhan || roundLock.structureBlocked}
          disabledReason={lyDoDangKy}
        />
      )}

      {/* Modal 1: Nộp nguyện vọng */}
      {applyModalOpen && selectedCompany && (
        <ModalOverlay onClose={() => setApplyModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base m-0">Đăng ký Nguyện vọng Thực tập</h3>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitApply} className="flex flex-col gap-4">
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  Doanh nghiệp tiếp nhận
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">{selectedCompany.tenCongTy}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Vị trí: <span className="font-semibold text-blue-700">{selectedCompany.viTriTuyen}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Thứ tự ưu tiên nguyện vọng
                </label>
                <select
                  value={applyPriority}
                  onChange={(e) => setApplyPriority(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white font-medium cursor-pointer"
                >
                  <option value={1} disabled={myApplications.some((a) => a.thuTuUuTien === 1)}>
                    Nguyện vọng 1 (Ưu tiên cao nhất) {myApplications.some((a) => a.thuTuUuTien === 1) ? '— Đã dùng' : ''}
                  </option>
                  <option value={2} disabled={myApplications.some((a) => a.thuTuUuTien === 2)}>
                    Nguyện vọng 2 {myApplications.some((a) => a.thuTuUuTien === 2) ? '— Đã dùng' : ''}
                  </option>
                  <option value={3} disabled={myApplications.some((a) => a.thuTuUuTien === 3)}>
                    Nguyện vọng 3 {myApplications.some((a) => a.thuTuUuTien === 3) ? '— Đã dùng' : ''}
                  </option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hệ thống sẽ ưu tiên xét tuyển theo thứ tự từ Nguyện vọng 1 trở đi.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-700 text-[18px] shrink-0 mt-0.5">
                  info
                </span>
                <span>
                  Hồ sơ năng lực hiện tại (CV, kỹ năng, dự án) của bạn sẽ được gửi trực tiếp kèm theo đơn ứng tuyển này đến hội đồng xét duyệt.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApply || roundLock.structureBlocked}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingApply ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">done</span>
                      <span>Xác nhận đăng ký</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Modal 2: Đề xuất công ty mới */}
      {proposalModalOpen && (
        <ModalOverlay onClose={() => setProposalModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">add_business</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base m-0">Đề xuất Doanh nghiệp Mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setProposalModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Doanh nghiệp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Công ty Cổ phần Công nghệ ABC"
                  value={proposalForm.tenCongTy}
                  onChange={(e) => setProposalForm({ ...proposalForm, tenCongTy: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vị trí thực tập
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Backend Developer"
                    value={proposalForm.viTriTuyen}
                    onChange={(e) => setProposalForm({ ...proposalForm, viTriTuyen: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chỉ tiêu tiếp nhận
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={proposalForm.soLuongNhan}
                    onChange={(e) => setProposalForm({ ...proposalForm, soLuongNhan: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Thời gian thực tập
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 3 tháng (15/09 - 15/12/2026)"
                  value={proposalForm.thoiGian}
                  onChange={(e) => setProposalForm({ ...proposalForm, thoiGian: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Yêu cầu kỹ năng &amp; Công nghệ
                </label>
                <textarea
                  rows="3"
                  placeholder="Mô tả kỹ năng, ngoại ngữ hoặc yêu cầu dự án..."
                  value={proposalForm.yeuCau}
                  onChange={(e) => setProposalForm({ ...proposalForm, yeuCau: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 focus:outline-none font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProposalModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingProposal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>Gửi đề xuất tới Khoa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
