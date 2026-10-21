import { useState, useEffect } from 'react'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'

export default function QuanLyTinTuyenDungPage() {
  const { activeCompany } = useEnterprise()
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

  const fetchJobPosting = async () => {
    if (!activeCompany?.maCongTy) return
    try {
      setLoading(true)
      const res = await doanhNghiepService.getTinTuyenDung(activeCompany.maCongTy)
      setData(res)
      setForm({
        viTriTuyen: res.viTriTuyen || '',
        thoiGian: res.thoiGian || '',
        soLuongNhan: res.soLuongNhan || 0,
        yeuCau: res.yeuCau || '',
      })
    } catch (err) {
      console.error('Lỗi lấy tin tuyển dụng:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobPosting()
  }, [activeCompany?.maCongTy])

  // Trạng thái tuyển dụng do hệ thống tự xác định: Khoa duyệt công ty + còn/hết chỉ tiêu trong đợt
  const chiTieu = data?.chiTieu
  const trangThaiTuyen = chiTieu?.trangThaiTuyen
  const dangMo = trangThaiTuyen === 'DangTuyen'
  const nhanTrangThai = {
    DangTuyen: 'Đang mở nhận hồ sơ',
    DaDuChiTieu: 'Đã đủ chỉ tiêu – tự động đóng',
    ChuaDuocDuyet: 'Chờ Khoa phê duyệt',
    KhongCoDot: 'Chưa có đợt thực tập đang diễn ra',
  }[trangThaiTuyen] || '—'

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

  // Parse skill tags from yeuCau string
  const skillTags = data?.yeuCau
    ? data.yeuCau.split(/[,;.\n]+/).map((s) => s.trim()).filter((s) => s.length > 1)
    : []

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

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản lý Tin Tuyển Dụng Thực Tập</h1>
          <p className="text-xs text-slate-500 mt-1">
            Đăng ký và điều chỉnh chỉ tiêu tiếp nhận, tiêu chuẩn năng lực cho {data?.chiTieu?.tenDot || 'đợt thực tập tốt nghiệp đang diễn ra'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">edit_note</span>
          <span>Chỉnh sửa tin tuyển dụng</span>
        </button>
      </div>

      {/* 4 Bento Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chỉ tiêu tiếp nhận</div>
          <div className="text-2xl font-black text-indigo-700 mt-2">{data?.soLuongNhan != null ? data.soLuongNhan : 0} <span className="text-xs font-normal text-slate-500">TTS</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Được Khoa CNTT phê duyệt</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hồ sơ đã nộp</div>
          <div className="text-2xl font-black text-blue-700 mt-2">{data?.soUngVienDaNop || 0} <span className="text-xs font-normal text-slate-500">ứng viên</span></div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">Đang chờ và đã duyệt</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã tiếp nhận chính thức</div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{data?.soDaTiepNhan || 0} <span className="text-xs font-normal text-slate-500">sinh viên</span></div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Đã có quyết định phân bổ</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Trạng thái tuyển dụng</div>
          <div className="mt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              dangMo ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${dangMo ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              {nhanTrangThai}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            {chiTieu ? `Đã nhận ${chiTieu.daTiepNhan}/${chiTieu.soLuongNhan} — tự đóng khi đủ chỉ tiêu` : 'Hiển thị trên Cổng Sinh viên'}
          </div>
        </div>
      </div>

      {/* Main Job Card */}
      <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
              <span className="material-symbols-outlined text-[16px]">work</span>
              <span>Vị trí tuyển dụng chính thức</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">{data?.viTriTuyen || 'Chưa cập nhật'}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-slate-400">domain</span>
                {activeCompany?.tenCongTy}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_month</span>
                {data?.thoiGian || 'Chưa cập nhật'}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-slate-400">group</span>
                Chỉ tiêu: <strong className="text-slate-700 font-bold ml-0.5">{data?.soLuongNhan != null ? data.soLuongNhan : 0} sinh viên</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              Chỉnh sửa
            </button>
          </div>
        </div>

        {/* Requirements & Skills Tags */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Tiêu chuẩn & Yêu cầu kỹ năng năng lực</h3>
          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
            {data?.yeuCau || 'Chưa có yêu cầu chi tiết'}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
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

        {/* Benefits & Environment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">redeem</span>
              <span>Chế độ & Quyền lợi thực tập</span>
            </div>
            <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
              <li>Hỗ trợ phụ cấp thực tập hàng tháng theo quy định doanh nghiệp</li>
              <li>Được phân công Mentor Senior hướng dẫn 1-1 trong suốt kỳ thực tập</li>
              <li>Tham gia trực tiếp vào các dự án sản phẩm thực tế của công ty</li>
              <li>Cơ hội xét duyệt trở thành Nhân viên chính thức sau khi tốt nghiệp</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-indigo-600">contact_mail</span>
              <span>Thông tin Người phụ trách tiếp nhận</span>
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
              <h3 className="font-bold text-slate-800 text-sm">Cập nhật Tin Tuyển Dụng Thực Tập</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vị trí tuyển dụng *</label>
                <input
                  type="text"
                  required
                  value={form.viTriTuyen}
                  onChange={(e) => setForm({ ...form, viTriTuyen: e.target.value })}
                  placeholder="Ví dụ: Lập trình viên Web Fullstack, Kỹ sư AI..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chỉ tiêu nhận (SV) *</label>
                  <input
                    type="number"
                    min={Math.max(1, chiTieu?.daTiepNhan || 0)}
                    required
                    value={form.soLuongNhan}
                    onChange={(e) => setForm({ ...form, soLuongNhan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div className="text-[11px] text-slate-500 self-end pb-2">
                  Trạng thái nhận hồ sơ do hệ thống tự động đóng khi đã tiếp nhận đủ chỉ tiêu
                  {chiTieu ? ` (hiện đã nhận ${chiTieu.daTiepNhan}).` : '.'} Tăng chỉ tiêu sẽ mở lại đợt tuyển.
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thời gian thực tập</label>
                <input
                  type="text"
                  value={form.thoiGian}
                  onChange={(e) => setForm({ ...form, thoiGian: e.target.value })}
                  placeholder="Từ 14/09/2026 đến 25/12/2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu chuẩn & Yêu cầu kỹ năng *</label>
                <textarea
                  rows={3}
                  required
                  value={form.yeuCau}
                  onChange={(e) => setForm({ ...form, yeuCau: e.target.value })}
                  placeholder="Ví dụ: Biết React, Node.js, SQL Server, có kỹ năng làm việc nhóm, GPA >= 2.5..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold transition-all flex items-center gap-1.5"
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
