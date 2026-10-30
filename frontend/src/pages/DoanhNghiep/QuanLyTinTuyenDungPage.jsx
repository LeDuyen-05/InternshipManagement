import { useState, useEffect } from 'react'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'
import { recruitmentStatusLabel } from '../../utils/recruitmentStatus'

export default function QuanLyTinTuyenDungPage() {
  const { activeCompany, maDot, updateChiTieu } = useEnterprise()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  // Form edit state
  const [form, setForm] = useState({
    viTriTuyen: '',
    thoiGian: '',
    soLuongNhan: 0,
    yeuCau: '',
  })

  // Mở form từ dữ liệu đã lưu
  const moFormChinhSua = () => {
    setForm({
      viTriTuyen: data?.viTriTuyen || '',
      thoiGian: data?.thoiGian || '',
      soLuongNhan: data?.chiTieu?.soLuongNhan ?? data?.soLuongNhan ?? 0,
      yeuCau: data?.yeuCau || '',
    })
    setShowModal(true)
  }

  const fetchJobPosting = async () => {
    if (!activeCompany?.maCongTy) return
    try {
      setLoading(true)
      const res = await doanhNghiepService.getTinTuyenDung(activeCompany.maCongTy, maDot)
      updateChiTieu(res?.chiTieu)
      setData(res)
    } catch (err) {
      console.error('Lỗi lấy tin tuyển dụng:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobPosting()
  }, [activeCompany?.maCongTy, maDot])

  const chiTieu = data?.chiTieu
  const trangThaiTuyen = chiTieu?.trangThaiTuyen
  const dangMo = trangThaiTuyen === 'DangTuyen'
  const nhanTrangThai = recruitmentStatusLabel(trangThaiTuyen)

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await doanhNghiepService.luuTinTuyenDung({
        maCongTy: activeCompany.maCongTy,
        viTriTuyen: form.viTriTuyen,
        thoiGian: form.thoiGian,
        soLuongNhan: parseInt(form.soLuongNhan, 10),
        yeuCau: form.yeuCau,
      })
      await fetchJobPosting()
      setToast({ type: 'success', message: 'Cập nhật tin tuyển dụng thành công!' })
      setShowModal(false)
    } catch (err) {
      console.error('Lỗi lưu tin tuyển dụng:', err)
      setToast({ type: 'error', message: err.response?.data?.message || 'Không thể cập nhật tin tuyển dụng. Vui lòng thử lại.' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  // Tách yêu cầu thành thẻ kỹ năng
  const skillTags = data?.yeuCau
    ? data.yeuCau.split(/[,;\n]+|\.(?=\s|$)/).map((s) => s.trim()).filter((s) => s.length > 1)
    : []

  const fillPercent = chiTieu?.soLuongNhan > 0
    ? Math.min(100, Math.round(((chiTieu?.daTiepNhan || 0) / chiTieu.soLuongNhan) * 100))
    : 0

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between border shadow-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Header Bento Trang Tin Tuyển Dụng */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 lg:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <span className="material-symbols-outlined text-[16px] text-indigo-600">campaign</span>
              <span>Cổng Doanh nghiệp</span>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Tin tuyển dụng</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                Tin tuyển dụng & Vị trí thực tập
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                {activeCompany?.tenCongTy || 'Doanh nghiệp'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
                {chiTieu?.tenDot || 'Đợt thực tập hiện tại'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              Quản lý vị trí tuyển dụng, tiêu chuẩn tiếp nhận và yêu cầu kỹ năng (JD) của doanh nghiệp cho đợt thực tập. Sinh viên sẽ nộp hồ sơ trực tuyến dựa trên các thông tin này.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={moFormChinhSua}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>Cập nhật tin tuyển dụng</span>
            </button>
          </div>
        </div>

        {/* 4 Thẻ Bento KPI thông tin đợt */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Chỉ tiêu tiếp nhận</span>
              <span className="material-symbols-outlined text-[18px] text-indigo-600">group_add</span>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {chiTieu?.soLuongNhan ?? data?.soLuongNhan ?? 0} <span className="text-xs font-normal text-slate-500">sinh viên</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
              {chiTieu?.tenDot || 'Theo chỉ tiêu phân bổ đợt'}
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Đã tiếp nhận</span>
              <span className="material-symbols-outlined text-[18px] text-emerald-600">how_to_reg</span>
            </div>
            <div className="text-2xl font-black text-emerald-900">
              {chiTieu?.daTiepNhan ?? data?.soDaTiepNhan ?? 0} <span className="text-xs font-normal text-emerald-700">sinh viên</span>
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">
              Đạt {fillPercent}% chỉ tiêu phân bổ
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Hồ sơ ứng viên</span>
              <span className="material-symbols-outlined text-[18px] text-blue-600">assignment_ind</span>
            </div>
            <div className="text-2xl font-black text-blue-900">
              {data?.soUngVienDaNop || 0} <span className="text-xs font-normal text-blue-700">hồ sơ</span>
            </div>
            <div className="text-[10px] text-blue-700 mt-0.5">
              Đang chờ duyệt & phỏng vấn
            </div>
          </div>

          <div className="bg-indigo-50/50 border border-indigo-200/60 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-indigo-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Trạng thái nhận đơn</span>
              <span className="material-symbols-outlined text-[18px] text-indigo-600">verified</span>
            </div>
            <div className="mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                dangMo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dangMo ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                {nhanTrangThai}
              </span>
            </div>
            <div className="text-[10px] text-indigo-700 mt-1 truncate">
              {dangMo ? 'Đang mở nhận nguyện vọng SV' : 'Đã đóng nhận hồ sơ mới'}
            </div>
          </div>
        </div>
      </div>

      {/* Banner Nguyên tắc Phối hợp Học vụ */}
      <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/60 rounded-2xl border border-indigo-100 p-4 lg:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <span className="material-symbols-outlined text-[20px]">handshake</span>
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              Cơ chế phối hợp tiếp nhận giữa Doanh nghiệp và Khoa CNTT
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Doanh nghiệp chủ động cập nhật vị trí tuyển dụng, tiêu chuẩn tiếp nhận và yêu cầu kỹ năng (JD) cho sinh viên. Tổng chỉ tiêu tiếp nhận và khung thời hạn nộp hồ sơ do Khoa CNTT phê duyệt theo kế hoạch đào tạo của đợt thực tập.
            </p>
          </div>
        </div>
      </div>

      {/* Thẻ Chi tiết Vị trí Tuyển dụng & JD */}
      <div className="rounded-2xl bg-white p-6 lg:p-7 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
              <span className="material-symbols-outlined text-[16px]">work</span>
              <span>Vị trí tuyển dụng thực tập</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {data?.viTriTuyen || 'Chưa cập nhật vị trí'}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">corporate_fare</span>
                {activeCompany?.tenCongTy}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_month</span>
                Thời gian: <strong className="text-slate-700 font-semibold">{data?.thoiGian || 'Theo kế hoạch đợt'}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-400">group</span>
                Chỉ tiêu: <strong className="text-indigo-700 font-bold">{chiTieu?.soLuongNhan ?? data?.soLuongNhan ?? 0} sinh viên</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={moFormChinhSua}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Chỉnh sửa tin</span>
            </button>
          </div>
        </div>

        {/* Tiêu chuẩn & Yêu cầu kỹ năng năng lực */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-indigo-600">checklist</span>
            <span>Tiêu chuẩn & Yêu cầu kỹ năng năng lực (JD)</span>
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-xl border border-slate-200/70 whitespace-pre-line">
            {data?.yeuCau || 'Chưa có yêu cầu chi tiết'}
          </p>

          {skillTags.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Từ khóa kỹ năng:</div>
              <div className="flex flex-wrap gap-2">
                {skillTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100/80"
                  >
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Người phụ trách tiếp nhận */}
        <div className="pt-4 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
            <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-indigo-600">contact_mail</span>
              <span>Thông tin Người phụ trách tiếp nhận (Đại diện Doanh nghiệp)</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div>Đại diện HR: <strong className="text-slate-800">{activeCompany?.daiDienChinh?.hoTen || '—'}</strong></div>
              <div>Chức vụ: <span className="text-slate-700">{activeCompany?.daiDienChinh?.chucVu || '—'}</span></div>
              <div>Email liên hệ: <span className="text-indigo-600 font-medium">{activeCompany?.daiDienChinh?.email || '—'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal chỉnh sửa tin tuyển dụng */}
      {showModal && (
        <ModalOverlay onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Cập nhật Tin Tuyển Dụng Thực Tập</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vị trí tuyển dụng thực tập *</label>
                <input
                  type="text"
                  required
                  value={form.viTriTuyen}
                  onChange={(e) => setForm({ ...form, viTriTuyen: e.target.value })}
                  placeholder="Ví dụ: Lập trình viên Web Fullstack React/Node.js, Kỹ sư AI..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chỉ tiêu tiếp nhận đề xuất (SV) *</label>
                  <input
                    type="number"
                    min={Math.max(1, chiTieu?.daTiepNhan || 0)}
                    required
                    value={form.soLuongNhan}
                    onChange={(e) => setForm({ ...form, soLuongNhan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời gian thực tập dự kiến</label>
                  <input
                    type="text"
                    value={form.thoiGian}
                    onChange={(e) => setForm({ ...form, thoiGian: e.target.value })}
                    placeholder="Từ 14/09/2026 đến 25/12/2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu chuẩn & Yêu cầu kỹ năng năng lực (JD) *</label>
                <textarea
                  rows={4}
                  required
                  value={form.yeuCau}
                  onChange={(e) => setForm({ ...form, yeuCau: e.target.value })}
                  placeholder="Ví dụ: Nắm vững React, Node.js, SQL Server, có tinh thần làm việc nhóm, GPA >= 2.5..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                Lưu ý: Nội dung tin tuyển dụng và yêu cầu kỹ năng sau khi lưu sẽ được công khai ngay trên Cổng Sinh viên để các ứng viên đăng ký nguyện vọng.
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
