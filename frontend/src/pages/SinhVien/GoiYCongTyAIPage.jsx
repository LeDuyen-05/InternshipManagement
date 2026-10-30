import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'
import { goiYCongTyService } from '../../services/goiYCongTyService'
import { dangKyThucTapService } from '../../services/dangKyThucTapService'
import { useIdentity } from '../../hooks/useIdentity'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import NoLinkedAccount from '../../components/common/NoLinkedAccount.jsx'
import RecommendationScore from '../../components/common/RecommendationScore'

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
  // Điều kiện đăng ký do backend quyết định (một nguồn duy nhất với trang Đăng ký):
  // đã trúng tuyển/đang thực tập/đã hoàn thành đạt thì AI chỉ còn là tham khảo, không mở đăng ký.
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
    ? 'Đợt đang chọn không mở đăng ký nguyện vọng; gợi ý chỉ để tham khảo.'
    : roundLock.structureBlocked
      ? 'Đợt đã khóa thay đổi đăng ký; gợi ý chỉ để tham khảo.'
      : dieuKien == null
        ? 'Đang kiểm tra điều kiện đăng ký…'
        : !dieuKien.duocDangKy
          ? dieuKien.lyDo
          : null
  const daCoNoiThucTap = Boolean(dieuKien && !dieuKien.duocDangKy && !dieuKien.loiTai)
  const showToast = msg => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000) }
  const dangKyNguyenVong = item => {
    if (lyDoKhongDangKy || item.maDot !== maDot || data?.maDot !== maDot || loading) return
    navigate('/sinh-vien/dang-ky', { state: { maCongTy: item.maCongTy, maViTri: item.maViTri, maDot } })
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

  const handleRecalculate = async () => {
    if (await loadData(selectedMaSV, topK, true)) showToast('Đã cập nhật gợi ý tham khảo từ hồ sơ và JD hiện tại.')
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
  const topList = data?.topKGoiY || []

  if (!selectedMaSV) return <NoLinkedAccount type="sinh viên" />

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* 1. Header Trang & Bộ chọn Sinh viên Test nhanh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <span className="material-symbols-outlined text-2xl">psychology</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Gợi ý doanh nghiệp thực tập theo hồ sơ (Top-K)</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                <strong>{data?.thuatToan || 'Gợi ý theo hồ sơ năng lực và JD'}</strong> để tham khảo khi tìm nơi thực tập.
              </p>
            </div>
          </div>
        </div>

        {/* Gợi ý luôn áp dụng cho sinh viên đang đăng nhập. */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-500 font-semibold">Tài khoản SV:</span>
            <span className="font-bold text-purple-800">{selectedMaSV}</span>
          </div>

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
            title="Kích hoạt tính toán lại ma trận tương đồng AI"
            className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>Cập nhật gợi ý</span>
          </button>
        </div>
      </div>

      <div role="status" className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
        <p>Đợt: <strong>{selectedDot?.tenDot || 'Hãy chọn đợt thực tập'}</strong>.</p>
        <p>{data?.thongBao || 'Gợi ý tham khảo từ hồ sơ năng lực và JD hợp lệ trong đợt.'}</p>
        <p>{data?.yNghiaDiem || 'Phần trăm là độ tương đồng nội dung, không phải xác suất trúng tuyển.'}</p>
      </div>
      {lyDoKhongDangKy && dieuKien != null && (
        <div role="alert" className={`p-4 rounded-xl border text-sm flex items-start gap-2 ${daCoNoiThucTap ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <span className="material-symbols-outlined text-base mt-0.5">{daCoNoiThucTap ? 'verified' : 'info'}</span>
          <div>
            <p className="font-semibold">{lyDoKhongDangKy}</p>
            <p className="text-xs mt-0.5">Nút “Đăng ký” trên các gợi ý đã được tắt. Danh sách bên dưới (nếu có) chỉ để tham khảo.</p>
          </div>
        </div>
      )}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Đang phân tích hồ sơ và các JD hợp lệ trong đợt...</p>
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
          {/* 2. Thẻ Thông Tin Hồ Sơ Năng Lực Hiện Tại */}
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

              {/* Chi tiết nội dung hồ sơ vector hóa */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Kỹ năng cốt lõi</p>
                  <p className="font-semibold text-slate-800">{sv.kyNang || 'Chưa cập nhật'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Công nghệ / Framework</p>
                  <p className="font-semibold text-slate-800">{sv.congNghe || 'Chưa cập nhật'}</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Dự án đã thực hiện</p>
                  <p className="font-semibold text-slate-800 truncate" title={sv.duAnDaThucHien}>
                    {sv.duAnDaThucHien || 'Chưa cập nhật'}
                  </p>
                </div>
              </div>

              {/* Văn bản hồ sơ trích xuất (NDHoSo) */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-start gap-2">
                <span className="material-symbols-outlined text-purple-600 text-base mt-0.5">dataset</span>
                <div>
                  <span className="font-bold">Dữ liệu nguồn AI xử lý (NDHoSo): </span>
                  <span className="text-slate-700 italic">{sv.ndHoSo}</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Danh sách Top-K Gợi ý Doanh Nghiệp */}
          <div className="space-y-4">
            {topList.length > 0 && (
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Bảng Xếp Hạng Top {topK} Doanh Nghiệp Phù Hợp Nhất</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                      Khảo sát {data?.tongSoCongTyKhaoSat || 0} công ty
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {data?.thuatToan}. {data?.yNghiaDiem}
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                  <span>Nguồn: <strong>{data?.nguonDuLieu}</strong></span>
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
                    {data?.thongBao || 'Chưa có công ty/JD hợp lệ còn nhận đăng ký trong đợt đang chọn.'}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Chỉ hiển thị các vị trí tuyển dụng đã được Khoa phê duyệt kế hoạch, đúng đợt thực tập và còn chỉ tiêu tiếp nhận.
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
                    <span>Thử tính lại</span>
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

                          {/* Explainable AI (XAI) - Kỹ năng trùng khớp */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-purple-600">auto_awesome</span>
                              Từ khóa chung:
                            </span>
                            {item.kyNangPhuHop && item.kyNangPhuHop.length > 0 ? (
                              item.kyNangPhuHop.map((skill) => (
                                <span
                                  key={skill}
                                  className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200"
                                >
                                  ✓ {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Chưa có từ khóa chung để hiển thị.</span>
                            )}
                          </div>
                        </div>

                        {/* Cột 2: Điểm tương đồng AI */}
                        <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 gap-2 min-w-[200px]">
                          <RecommendationScore item={item} />

                          {/* Nút tác vụ */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedCompany(item)}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                            >
                              Xem JD
                            </button>
                            <button
                              type="button"
                              onClick={() => dangKyNguyenVong(item)}
                              disabled={Boolean(lyDoKhongDangKy)}
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

      {/* MODAL 1: Chỉnh Sửa Hồ Sơ Năng Lực & Tái Huấn Luyện AI */}
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
              Thêm các từ khóa kỹ năng mới vào hồ sơ để thuật toán AI phân tích lại độ tương đồng với các JD công ty.
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
                  placeholder="Ví dụ: C#, SQL, OOP, RESTful API..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  2. Công nghệ & Framework:
                </label>
                <input
                  type="text"
                  value={editCongNghe}
                  maxLength={500}
                  onChange={(e) => setEditCongNghe(e.target.value)}
                  placeholder="Ví dụ: ASP.NET Core, ReactJS, Docker, AWS..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">3. Dự án đã thực hiện:</label>
                <textarea aria-label="Dự án đã thực hiện" maxLength={1000} rows={3} value={editDuAn} onChange={e => setEditDuAn(e.target.value)} className="w-full border rounded-xl p-2 text-xs" />
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
      {selectedCompany && (
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
                  <RecommendationScore item={selectedCompany} />
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
                disabled={Boolean(lyDoKhongDangKy)}
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
