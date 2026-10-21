import { useState, useEffect } from 'react'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'
import { goiYCongTyService } from '../../services/goiYCongTyService'
import { useIdentity } from '../../hooks/useIdentity'
import NoLinkedAccount from '../../components/common/NoLinkedAccount.jsx'

export default function GoiYCongTyAIPage() {
  const { maSV: selectedMaSV } = useIdentity()
  const [topK, setTopK] = useState(5)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastMsg, setToastMsg] = useState('')

  // State Modal chỉnh sửa hồ sơ năng lực
  const [showEditModal, setShowEditModal] = useState(false)
  const [editNdHoSo, setEditNdHoSo] = useState('')
  const [editKyNang, setEditKyNang] = useState('')
  const [editCongNghe, setEditCongNghe] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // State Modal xem chi tiết JD công ty
  const [selectedCompany, setSelectedCompany] = useState(null)

  const loadData = async (svId = selectedMaSV, k = topK) => {
    try {
      setLoading(true)
      setError(null)
      const res = await goiYCongTyService.getTopK(svId, k)
      if (res.data?.success) {
        setData(res.data.data)
      } else {
        setData(res.data)
      }
    } catch (err) {
      console.error('Lỗi lấy gợi ý công ty:', err)
      setError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu gợi ý AI')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedMaSV) loadData(selectedMaSV, topK)
  }, [selectedMaSV, topK])

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  // Kích hoạt tính toán lại AI
  const handleRecalculate = async () => {
    try {
      setLoading(true)
      const res = await goiYCongTyService.recalculate(selectedMaSV, topK)
      if (res.data?.success) {
        setData(res.data.data)
      }
      showToast('Đã tính toán lại độ tương đồng AI thành công!')
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi tính toán lại AI')
    } finally {
      setLoading(false)
    }
  }

  // Mở modal sửa hồ sơ
  const handleOpenEdit = () => {
    const sv = data?.sinhVien
    setEditNdHoSo(sv?.ndHoSo || '')
    setEditKyNang(sv?.kyNang || '')
    setEditCongNghe(sv?.congNghe || '')
    setShowEditModal(true)
  }

  // Lưu hồ sơ mới và cập nhật điểm AI
  const handleSaveHoSo = async () => {
    try {
      setSubmitting(true)
      const res = await goiYCongTyService.capNhatHoSo(selectedMaSV, {
        ndHoSo: editNdHoSo,
        kyNang: editKyNang,
        congNghe: editCongNghe,
      })
      if (res.data?.success) {
        setData(res.data.data)
      }
      setShowEditModal(false)
      showToast('Đã cập nhật hồ sơ và tính toán lại gợi ý AI theo kỹ năng mới!')
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật hồ sơ')
    } finally {
      setSubmitting(false)
    }
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
              <h1 className="text-xl font-bold text-slate-900">Cố Vấn AI — Gợi Ý Doanh Nghiệp Thực Tập (Top-K)</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Mô hình xử lý ngôn ngữ tự nhiên <strong>TF-IDF & Cosine Similarity</strong> đối sánh hồ sơ năng lực với yêu cầu tuyển dụng
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
            disabled={loading}
            title="Kích hoạt tính toán lại ma trận tương đồng AI"
            className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>Tính lại AI</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Đang chạy thuật toán phân tích TF-IDF và vector hóa hồ sơ...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-3">
          <span className="material-symbols-outlined text-rose-600 text-4xl">error_outline</span>
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button
            onClick={() => loadData()}
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Bảng Xếp Hạng Top {topK} Doanh Nghiệp Phù Hợp Nhất</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                    Khảo sát {data?.tongSoCongTyKhaoSat || 0} công ty
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Xếp hạng theo điểm độ tương đồng Cosine giữa vector hồ sơ và vector JD tuyển dụng
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                <span>Nguồn: <strong>{data?.nguonDuLieu}</strong></span>
              </div>
            </div>

            {topList.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
                <span className="material-symbols-outlined text-slate-300 text-4xl">domain_disabled</span>
                <p className="text-sm font-semibold text-slate-600">Hiện chưa có công ty nào được duyệt trong hệ thống để so khớp.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {topList.map((item, index) => {
                  const isRank1 = index === 0
                  const isHighMatch = item.tiLeTuongThich >= 75

                  return (
                    <div
                      key={item.maCongTy}
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
                              Kỹ năng khớp:
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
                              <span className="text-[11px] text-slate-400 italic">Khớp theo định hướng chuyên môn tổng quát</span>
                            )}
                          </div>
                        </div>

                        {/* Cột 2: Điểm tương đồng AI */}
                        <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 gap-2 min-w-[200px]">
                          <div className="text-left lg:text-right">
                            <div className="flex items-baseline gap-1 lg:justify-end">
                              <span
                                className={`text-2xl font-black font-mono ${
                                  isHighMatch ? 'text-purple-700' : 'text-slate-700'
                                }`}
                              >
                                {item.tiLeTuongThich}%
                              </span>
                              <span className="text-xs text-slate-400 font-semibold">Tương thích</span>
                            </div>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                                item.tiLeTuongThich >= 80
                                  ? 'bg-purple-100 text-purple-700'
                                  : item.tiLeTuongThich >= 65
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.danhGiaDoTuongThich}
                            </span>
                          </div>

                          {/* Thanh tiến độ */}
                          <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden hidden lg:block">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isHighMatch ? 'bg-purple-600' : 'bg-blue-600'
                              }`}
                              style={{ width: `${item.tiLeTuongThich}%` }}
                            ></div>
                          </div>

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
                              onClick={() =>
                                showToast(`Đã lưu nguyện vọng ứng tuyển vào ${item.tenCongTy}!`)
                              }
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition-colors shadow-sm cursor-pointer"
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
                  onChange={(e) => setEditCongNghe(e.target.value)}
                  placeholder="Ví dụ: ASP.NET Core, ReactJS, Docker, AWS..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  3. Văn bản hồ sơ đầy đủ (NDHoSo cho mô hình TF-IDF):
                </label>
                <textarea
                  rows={4}
                  value={editNdHoSo}
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
                <span>Lưu & Tính Lại Điểm AI</span>
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
                <span>Điểm tương thích hồ sơ:</span>
                <span className="text-base font-bold font-mono text-purple-800">
                  {selectedCompany.tiLeTuongThich}% ({selectedCompany.danhGiaDoTuongThich})
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
                onClick={() => {
                  showToast(`Đã lưu nguyện vọng ứng tuyển vào ${selectedCompany.tenCongTy}!`)
                  setSelectedCompany(null)
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-sm"
              >
                Ứng tuyển ngay
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
