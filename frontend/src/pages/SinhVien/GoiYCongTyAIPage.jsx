import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'
import { goiYCongTyService } from '../../services/goiYCongTyService'
import { dangKyThucTapService } from '../../services/dangKyThucTapService'
import { useIdentity } from '../../hooks/useIdentity'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import NoLinkedAccount from '../../components/common/NoLinkedAccount.jsx'
import RecommendationScore from '../../components/common/RecommendationScore'
import { useRecruitmentAvailability } from '../../hooks/useRecruitmentAvailability'
import { currentOffer, refreshRecommendedOffers, closedOfferMessage } from '../../utils/recommendationAvailability'

function RecruitmentDetails({ item }) {
  return <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
    <span className="font-semibold text-emerald-700">Còn {item.conLai ?? '—'} chỗ · Chỉ tiêu: {item.soLuongNhan ?? '—'}</span>
    <span>Đã tiếp nhận: {item.daTiepNhan ?? '—'}</span>
    <span>Hạn đăng ký: {item.hanDangKy ? new Date(item.hanDangKy).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa cập nhật'}</span>
  </div>
}

export default function GoiYCongTyAIPage() {
  const { maSV: selectedMaSV } = useIdentity()
  const { selectedDot, roundLock } = useDotThucTap()
  const maDot = selectedDot?.maDot
  const navigate = useNavigate()
  const [topK, setTopK] = useState(5)
  const contextKey = JSON.stringify([selectedMaSV, maDot, topK])
  const current = useRef(contextKey); current.current = contextKey
  const requestVersion = useRef(0)
  const invalidateRequests = useCallback(() => { requestVersion.current++ }, [])
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editNdHoSo, setEditNdHoSo] = useState(''), [editKyNang, setEditKyNang] = useState('')
  const [editCongNghe, setEditCongNghe] = useState(''), [editDuAn, setEditDuAn] = useState('')
  const [submitting, setSubmitting] = useState(false), [selectedCompany, setSelectedCompany] = useState(null)
  const availability = useRecruitmentAvailability(selectedMaSV, maDot)
  const refreshAvailability = availability.refresh
  const [checkingRegistration, setCheckingRegistration] = useState(false)
  const registrationPending = useRef(false)
  // Dùng cùng điều kiện với trang đăng ký để khóa nút khi sinh viên không được đăng ký thêm.
  const [dieuKien, setDieuKien] = useState(null)
  const dieuKienKey = useRef('')
  useEffect(() => {
    const key = JSON.stringify([selectedMaSV, maDot])
    dieuKienKey.current = key
    setDieuKien(null)
    if (!selectedMaSV || !maDot) return
    dangKyThucTapService.getDieuKien(maDot)
      .then(res => { if (dieuKienKey.current === key) setDieuKien(res || null) })
      .catch(() => { if (dieuKienKey.current === key) setDieuKien({ duocDangKy: false, lyDo: 'Chưa kiểm tra được điều kiện đăng ký. Hãy mở trang Đăng ký để xem trạng thái.', loiTai: true }) })
  }, [selectedMaSV, maDot])
  const dotDangMo = selectedDot?.trangThai === 'DangDienRa'
  const lyDoKhongDangKy = !dotDangMo
    ? 'Đợt này chưa mở hoặc đã kết thúc nhận đăng ký.'
    : roundLock.structureBlocked
      ? 'Đợt này đã khóa đăng ký.'
      : dieuKien == null
        ? 'Đang kiểm tra điều kiện đăng ký…'
        : !dieuKien.duocDangKy
          ? dieuKien.lyDo
          : null
  const daCoNoiThucTap = Boolean(dieuKien && !dieuKien.duocDangKy && !dieuKien.loiTai)
  const showToast = msg => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000) }
  const dangKyNguyenVong = async item => {
    if (lyDoKhongDangKy || item.maDot !== maDot || data?.maDot !== maDot || loading || registrationPending.current) return
    const key = contextKey
    registrationPending.current = true
    setCheckingRegistration(true)
    try {
      const [offers, condition] = await Promise.all([availability.refresh(), dangKyThucTapService.getDieuKien(maDot)])
      if (current.current !== key) return
      setDieuKien(condition)
      if (!offers) return
      if (!currentOffer(item, offers)) {
        showToast(closedOfferMessage(item))
        setSelectedCompany(null)
        return
      }
      if (!condition?.duocDangKy) { showToast(condition?.lyDo || 'Hiện chưa đủ điều kiện đăng ký.'); return }
      navigate('/sinh-vien/dang-ky', { state: { maCongTy: item.maCongTy, maViTri: item.maViTri, maDot } })
    } catch {
      if (current.current === key) showToast('Không kiểm tra được điều kiện đăng ký. Vui lòng thử lại.')
    } finally {
      registrationPending.current = false
      setCheckingRegistration(false)
    }
  }

  const loadData = useCallback(async (student, k, recalculate = false) => {
    const key = JSON.stringify([student, maDot, k]), version = ++requestVersion.current
    setData(null); setError(null); setLoading(true)
    if (!student || !maDot) { setLoading(false); return false }
    try {
      const response = recalculate ? await goiYCongTyService.recalculate(student, k, maDot) : await goiYCongTyService.getTopK(student, k, maDot)
      if (version !== requestVersion.current || current.current !== key) return false
      const result = response.data?.success ? response.data.data : response.data
      if (result?.maDot !== maDot) throw new Error('Phản hồi gợi ý không thuộc đợt đang chọn. Hãy tải lại.')
      setData(result)
      return true
    } catch (e) {
      if (version === requestVersion.current && current.current === key) setError(e.response?.data?.message || e.message || 'Không tải được gợi ý.')
      return false
    } finally {
      if (version === requestVersion.current && current.current === key) setLoading(false)
    }
  }, [maDot])

  useEffect(() => {
    setSelectedCompany(null); setShowEditModal(false); setToastMsg('')
    loadData(selectedMaSV, topK)
    return invalidateRequests
  }, [selectedMaSV, topK, loadData, invalidateRequests])

  useEffect(() => {
    if (data?.maDot === maDot) refreshAvailability()
  }, [data, maDot, refreshAvailability])

  const handleRecalculate = async () => {
    const [loaded] = await Promise.all([loadData(selectedMaSV, topK, true), availability.refresh()])
    if (loaded) showToast('Đã cập nhật danh sách gợi ý.')
  }
  const handleOpenEdit = () => {
    if (!data || data.maDot !== maDot) return
    const student = data.sinhVien
    setEditNdHoSo(student?.ndHoSo || ''); setEditKyNang(student?.kyNang || '')
    setEditCongNghe(student?.congNghe || ''); setEditDuAn(student?.duAnDaThucHien || '')
    setShowEditModal(true)
  }
  const handleSaveHoSo = async () => {
    const key = contextKey, round = maDot, version = ++requestVersion.current
    if (!round || !selectedMaSV || submitting) return
    setSubmitting(true); setError(null)
    try {
      const response = await goiYCongTyService.capNhatHoSo(selectedMaSV, { ndHoSo: editNdHoSo, kyNang: editKyNang, congNghe: editCongNghe, duAnDaThucHien: editDuAn }, topK, round)
      if (current.current !== key || version !== requestVersion.current) return
      const result = response.data?.success ? response.data.data : response.data
      if (result?.maDot !== round) throw new Error('Phản hồi không thuộc đợt đang chọn.')
      setData(result); setShowEditModal(false); showToast('Đã cập nhật hồ sơ và gợi ý theo nội dung mới.')
    } catch (e) {
      if (current.current === key) setError(e.response?.data?.message || e.message || 'Không lưu được hồ sơ.')
    } finally { setSubmitting(false) }
  }

  const sv = data?.sinhVien
  const topList = refreshRecommendedOffers(data?.topKGoiY || [], availability.offers)
  const registrationDisabled = Boolean(lyDoKhongDangKy) || loading || checkingRegistration || availability.checking
    || !availability.offers || Boolean(availability.error)
  const modalCompany = selectedCompany && refreshRecommendedOffers([selectedCompany], availability.offers)[0]

  if (!selectedMaSV) return <NoLinkedAccount type="sinh viên" />

  return (
    <div className="space-y-6">
      {availability.error && <div role="alert" className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        {availability.error} <button type="button" onClick={availability.refresh} className="underline font-semibold">Thử lại</button>
      </div>}
      {selectedCompany && !modalCompany && <div role="status" className="p-3 bg-amber-50 rounded-xl text-sm text-amber-800">{closedOfferMessage(selectedCompany)}</div>}
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Tiêu đề và số lượng gợi ý */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <span className="material-symbols-outlined text-2xl">psychology</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Gợi ý doanh nghiệp thực tập phù hợp hồ sơ</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tìm nơi thực tập dựa trên kỹ năng, kinh nghiệm và yêu cầu tuyển dụng.
              </p>
            </div>
          </div>
        </div>

        {/* Gợi ý luôn áp dụng cho sinh viên đang đăng nhập. */}
        <div className="flex items-center gap-2.5 flex-wrap">


          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Số gợi ý:</span>
            <select
              value={topK}
              disabled={submitting}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleRecalculate}
            disabled={loading || submitting || !maDot}
            title="Cập nhật danh sách gợi ý theo hồ sơ mới nhất"
            className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>Cập nhật gợi ý</span>
          </button>
        </div>
      </div>

      <div role="status" className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-1.5 shadow-2xs">
        <div className="flex items-center gap-2 font-bold text-sm text-blue-950">
          <span className="material-symbols-outlined text-blue-700 text-[18px]">verified_user</span>
          <span>Đợt thực tập: {selectedDot?.tenDot || 'Chưa chọn đợt'}</span>
        </div>
        <p className="text-slate-600 m-0 leading-relaxed">
          Tham khảo các vị trí đã được Khoa phê duyệt, còn chỉ tiêu và phù hợp với hồ sơ năng lực của bạn.
        </p>
        <p className="text-slate-500 m-0 italic">
          Bạn có thể tham khảo danh sách này để chọn nơi thực tập và đăng ký trong thời hạn của đợt.
        </p>
      </div>
      {lyDoKhongDangKy && dieuKien != null && (
        <div role="alert" className={`p-4 rounded-xl border text-sm flex items-start gap-2 ${daCoNoiThucTap ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <span className="material-symbols-outlined text-base mt-0.5">{daCoNoiThucTap ? 'verified' : 'info'}</span>
          <div>
            <p className="font-semibold">{lyDoKhongDangKy}</p>
            <p className="text-xs mt-0.5">Bạn vẫn có thể xem thông tin doanh nghiệp nhưng chưa thể đăng ký thêm.</p>
          </div>
        </div>
      )}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Đang đối chiếu hồ sơ và yêu cầu tuyển dụng trong đợt...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-3">
          <span className="material-symbols-outlined text-rose-600 text-4xl">error_outline</span>
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button
            onClick={() => loadData(selectedMaSV, topK)}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          {/* Hồ sơ sinh viên */}
          {sv && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                    {sv.maSV.slice(-3)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">{sv.hoTen}</h2>
                    <p className="text-xs text-slate-500">
                      MSSV: <strong className="text-slate-700 font-mono">{sv.maSV}</strong> | Lớp: {sv.lop || '—'} | GPA: <strong className="text-emerald-600">{sv.gpa != null ? sv.gpa : '—'}</strong> | Chuyên ngành: {sv.chuyenNganh || '—'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-base">edit_document</span>
                  <span>Cập nhật CV / Kỹ năng</span>
                </button>
              </div>

              {/* Kỹ năng và công nghệ trong hồ sơ */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Kỹ năng cốt lõi</p>
                  <p className="font-semibold text-slate-800">{sv.kyNang || 'Chưa cập nhật'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Công cụ / phần mềm</p>
                  <p className="font-semibold text-slate-800">{sv.congNghe || 'Chưa cập nhật'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Dự án, đồ án, kinh nghiệm</p>
                  <p className="font-semibold text-slate-800 truncate" title={sv.duAnDaThucHien}>
                    {sv.duAnDaThucHien || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {/* Mô tả năng lực */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-start gap-2">
                <span className="material-symbols-outlined text-purple-600 text-base mt-0.5">dataset</span>
                <div>
                  <span className="font-bold">Tóm tắt mục tiêu & định hướng thực tập: </span>
                  <span className="text-slate-700 italic">{sv.ndHoSo}</span>
                </div>
              </div>
            </div>
          )}

          {/* Danh sách doanh nghiệp được gợi ý */}
          <div className="space-y-4">
            {topList.length > 0 && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Doanh nghiệp được gợi ý theo hồ sơ</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                      Khảo sát {data?.tongSoCongTyKhaoSat || 0} công ty
                    </span>
                  </h2>
                  <p className="text-xs font-medium text-slate-600 mt-1" role="status">
                    Các doanh nghiệp được sắp xếp theo mức độ phù hợp với hồ sơ của bạn.
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Điểm gợi ý dựa trên thông tin trong hồ sơ và mô tả công việc (JD), không phải xác suất trúng tuyển.
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                  <span>Nguồn: <strong>Kế hoạch thực tập được Khoa phê duyệt</strong></span>
                </div>
              </div>
            )}

            {topList.length === 0 ? (
              <div className="bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <span className="material-symbols-outlined text-3xl">domain_disabled</span>
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-base font-bold text-slate-900">Chưa có doanh nghiệp được gợi ý</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                    {availability.offers && data?.topKGoiY?.length > 0
                      ? 'Các vị trí trong danh sách đã ngừng nhận đăng ký. Bấm Tìm gợi ý mới để cập nhật danh sách.'
                      : data?.thongBao || 'Chưa có vị trí còn nhận đăng ký trong đợt này.'}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Danh sách gồm các vị trí được Khoa duyệt, còn hạn đăng ký và còn chỗ trong đợt này.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/sinh-vien/dang-ky')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">apartment</span>
                    <span>{daCoNoiThucTap ? 'Xem trạng thái đăng ký thực tập' : 'Xem danh sách doanh nghiệp hoặc khai báo tự tìm'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRecalculate}
                    disabled={loading || submitting || !maDot}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">sync</span>
                    <span>Tìm gợi ý mới</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {topList.map((item, index) => {
                  const isRank1 = index === 0

                  return (
                    <div
                      key={item.maViTri || item.maCongTy}
                      className={`bg-white rounded-2xl border transition-all p-5 shadow-sm hover:shadow-md ${
                        isRank1
                          ? 'border-purple-300 ring-2 ring-purple-100'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Cột 1: Thông tin doanh nghiệp */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                                isRank1
                                  ? 'bg-amber-400 text-slate-900 shadow-sm'
                                  : index === 1
                                  ? 'bg-slate-200 text-slate-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              #{index + 1}
                            </span>
                            <h3 className="text-base font-bold text-slate-900">{item.tenCongTy}</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {item.viTriTuyen || 'Thực tập sinh'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2">
                            <strong>Mô tả JD:</strong> {item.yeuCau || 'Chưa cập nhật chi tiết yêu cầu tuyển dụng.'}
                          </p>
                          <RecruitmentDetails item={item} />
                          <p className="text-xs text-slate-500 whitespace-pre-line">Địa chỉ: {item.diaChi || 'Chưa cập nhật địa chỉ'}</p>

                          {/* Từ khóa kỹ năng có trong hồ sơ và JD */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-purple-600">auto_awesome</span>
                              Kỹ năng phù hợp:
                            </span>
                            {(() => {
                              const stopWords = [
                                // Âm tiết từ ghép bị tách
                                'lập', 'trình', 'hệ', 'thống', 'phát', 'triển', 'kỹ', 'sư',
                                'quản', 'lý', 'viên', 'thuật', 'dụng', 'năng', 'nghề',
                                'công', 'nghệ', 'thông', 'tin', 'ứng', 'phần', 'mềm',
                                'kiến', 'trúc', 'giải', 'pháp', 'điều', 'hành', 'chức',
                                'thiết', 'kế', 'phân', 'tích', 'tích', 'hợp', 'xuất',
                                // Từ nối / giới từ
                                'và', 'các', 'cho', 'của', 'với', 'trong', 'theo', 'về',
                                'từ', 'để', 'có', 'là', 'được', 'trên', 'tại', 'hoặc',
                              ];
                              const meaningful = (item.kyNangPhuHop || []).filter(s => !stopWords.includes(s.toLowerCase()));
                              return meaningful.length > 0 ? (
                                meaningful.map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200"
                                  >
                                    ✓ {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Chưa có từ khóa kỹ năng trùng khớp</span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Điểm gợi ý */}
                        <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 gap-2 min-w-[200px]">
                          <RecommendationScore item={item} index={index} total={data?.tongSoCongTyKhaoSat} />

                          {/* Nút tác vụ */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCompany({ ...item, _index: index })}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              Xem JD
                            </button>
                            <button
                              type="button"
                              onClick={() => dangKyNguyenVong(item)}
                              disabled={registrationDisabled}
                              title={lyDoKhongDangKy || 'Mở form đăng ký nguyện vọng cho doanh nghiệp này'}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition-colors shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-purple-700"
                            >
                              Đăng ký
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Chỉnh sửa hồ sơ năng lực */}
      {showEditModal && (
        <ModalOverlay onClose={() => setShowEditModal(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-700">edit_note</span>
                <h3 className="text-base font-bold text-slate-900">Cập Nhật Hồ Sơ Năng Lực Sinh Viên</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Cập nhật kỹ năng, công nghệ và dự án thực tế để hệ thống đối chiếu lại danh sách doanh nghiệp phù hợp nhất.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  1. Kỹ năng cốt lõi:
                </label>
                <input
                  type="text"
                  value={editKyNang}
                  maxLength={500}
                  onChange={(e) => setEditKyNang(e.target.value)}
                  placeholder="VD: Hạch toán kế toán, Digital marketing, Lập trình web, Kiểm nghiệm vi sinh..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  2. Công cụ & phần mềm sử dụng thành thạo:
                </label>
                <input
                  type="text"
                  value={editCongNghe}
                  maxLength={500}
                  onChange={(e) => setEditCongNghe(e.target.value)}
                  placeholder="VD: Excel, MISA, Canva, Photoshop, SQL, ReactJS..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">3. Dự án, đồ án hoặc kinh nghiệm:</label>
                <textarea aria-label="Dự án, đồ án hoặc kinh nghiệm" maxLength={1000} rows={3} value={editDuAn} onChange={e => setEditDuAn(e.target.value)} placeholder="Mỗi dòng một dự án, đồ án hoặc công việc: tên – vai trò – kết quả..." className="w-full border rounded-xl p-2 text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  4. Văn bản mô tả năng lực:
                </label>
                <textarea
                  rows={4}
                  value={editNdHoSo}
                  maxLength={10000}
                  onChange={(e) => setEditNdHoSo(e.target.value)}
                  placeholder="Nhập mô tả quá trình học tập, đồ án đã hoàn thành, định hướng nghề nghiệp..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveHoSo}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {submitting && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                <span>Lưu hồ sơ và cập nhật gợi ý</span>
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* MODAL 2: Xem Chi Tiết JD Công Ty */}
      {modalCompany && (
        <ModalOverlay onClose={() => setSelectedCompany(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedCompany.tenCongTy}</h3>
                <p className="text-xs text-purple-700 font-semibold">{selectedCompany.viTriTuyen}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl flex justify-between items-center">
                <span>Điểm gợi ý:</span>
                <span className="text-base font-bold font-mono text-purple-800">
                  <RecommendationScore item={selectedCompany} index={selectedCompany._index} total={data?.tongSoCongTyKhaoSat} />
                </span>
              </div>

              <div>
                <p className="font-bold text-slate-700 uppercase tracking-wide text-[11px] mb-1">
                  Yêu cầu công việc (JD):
                </p>
                <div className="p-3 bg-slate-50 rounded-xl text-slate-800 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedCompany.yeuCau || 'Chưa cập nhật chi tiết yêu cầu.'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-400">Chỉ tiêu nhận:</span>{' '}
                  <strong className="text-slate-800">{selectedCompany.soLuongNhan ?? '—'} SV</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-400">Thời gian:</span>{' '}
                  <strong className="text-slate-800">{selectedCompany.thoiGian || '—'}</strong>
                </div>
              </div>
              <RecruitmentDetails item={modalCompany} />
              <p className="text-xs text-slate-600 whitespace-pre-line">Địa chỉ: {modalCompany.diaChi || 'Chưa cập nhật địa chỉ'}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCompany(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => dangKyNguyenVong(selectedCompany)}
                disabled={registrationDisabled}
                title={lyDoKhongDangKy || undefined}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Đăng ký nguyện vọng
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
