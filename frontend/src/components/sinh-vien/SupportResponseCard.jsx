import { useState } from 'react'
import ModalOverlay from '../common/ModalOverlay'
import { studentSupportService } from '../../services/studentSupportService'

export default function SupportResponseCard({
  supportData,
  maDot,
  onUpdated,
  onApplyCompany,
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLan, setSelectedLan] = useState(null)
  const [form, setForm] = useState({
    phanHoi: 'NhanHoTro',
    lyDo: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const cacLanHoTro = supportData?.cacLanHoTro || []
  if (cacLanHoTro.length === 0) return null

  const openRespondModal = (lan) => {
    setSelectedLan(lan)
    const svInfo = lan.sinhVien || {}
    setForm({
      phanHoi: svInfo.phanHoi || 'NhanHoTro',
      lyDo: svInfo.lyDoPhanHoi || '',
    })
    setError('')
    setModalOpen(true)
  }

  const handleSubmitResponse = async (e) => {
    e.preventDefault()
    if (!selectedLan) return
    if (!form.lyDo.trim()) {
      setError('Vui lòng nhập lý do / nguyện vọng của bạn.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await studentSupportService.guiPhanHoi(selectedLan.maLan, maDot, {
        phienBan: selectedLan.phienBan ?? 0,
        phanHoi: form.phanHoi,
        lyDo: form.lyDo.trim(),
      })
      setModalOpen(false)
      onUpdated?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi phản hồi. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-linear-to-r from-purple-50 to-indigo-50/60 rounded-3xl border border-purple-200/80 p-5 shadow-xs mb-6 space-y-4">
      <div className="flex items-center justify-between border-b border-purple-200/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[20px]">support_agent</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-purple-950">
              Kế hoạch hỗ trợ tìm nơi thực tập từ Khoa
            </h3>
            <p className="text-[11px] text-purple-700">
              Khoa đồng hành giới thiệu doanh nghiệp đối tác và mở đợt đăng ký tiếp theo cho sinh viên.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {cacLanHoTro.map((lan) => {
          const svInfo = lan.sinhVien || {}
          const phanHoi = svInfo.phanHoi || lan.phanHoi
          const congTys = svInfo.congTyGioiThieu || lan.congTyGioiThieu || []

          return (
            <div
              key={lan.maLan}
              className="bg-white rounded-2xl p-4 border border-purple-100 shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{lan.tenLan}</h4>
                  <p className="text-[11px] text-slate-500">
                    Ngày hỗ trợ:{' '}
                    {lan.ngayHoTro ? new Date(lan.ngayHoTro).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {phanHoi === 'NhanHoTro' ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Đã đồng ý nhận hỗ trợ
                    </span>
                  ) : phanHoi === 'TuChoiHoTro' ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      ✕ Đã từ chối nhận hỗ trợ
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Chưa gửi phản hồi
                    </span>
                  )}

                  {lan.coThePhanHoi !== false && (
                    <button
                      type="button"
                      onClick={() => openRespondModal(lan)}
                      className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      {phanHoi ? 'Cập nhật phản hồi' : 'Gửi phản hồi cho Khoa'}
                    </button>
                  )}
                </div>
              </div>

              {svInfo.lyDoPhanHoi && (
                <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-700">
                  <span className="font-semibold text-slate-500">Ý kiến của bạn: </span>
                  <span>{svInfo.lyDoPhanHoi}</span>
                </div>
              )}

              {/* Danh sách công ty Khoa gợi ý */}
              {congTys.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-700 uppercase mb-2">
                    Doanh nghiệp Khoa đề xuất riêng cho bạn:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {congTys.map((c, idx) => (
                      <div
                        key={c.maGioiThieu || idx}
                        className="p-3 bg-purple-50/40 border border-purple-200/60 rounded-xl flex flex-col justify-between"
                      >
                        <div>
                          <p className="font-bold text-xs text-purple-950">{c.tenCongTy}</p>
                          {c.tenViTri && (
                            <p className="text-[11px] text-slate-600">Vị trí: {c.tenViTri}</p>
                          )}
                          {c.ghiChu && (
                            <p className="text-[11px] text-purple-800 italic mt-1">
                              Lời nhắn Khoa: {c.ghiChu}
                            </p>
                          )}
                        </div>
                        {onApplyCompany && (
                          <div className="mt-2.5 pt-2 border-t border-purple-100 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onApplyCompany(c, lan.maLan)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                            >
                              Đăng ký công ty này
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal gửi phản hồi */}
      <ModalOverlay isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl font-sans">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Phản hồi lần hỗ trợ: {selectedLan?.tenLan}
            </h3>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl mb-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitResponse} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-2">
                Ý kiến của bạn <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="phanHoi"
                    value="NhanHoTro"
                    checked={form.phanHoi === 'NhanHoTro'}
                    onChange={() => setForm({ ...form, phanHoi: 'NhanHoTro' })}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Đồng ý nhận hỗ trợ</span>
                    <span className="text-[11px] text-slate-500 block">
                      Mong muốn Khoa tiếp tục giới thiệu công ty hoặc hỗ trợ đăng ký nguyện vọng lượt tiếp theo.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="radio"
                    name="phanHoi"
                    value="TuChoiHoTro"
                    checked={form.phanHoi === 'TuChoiHoTro'}
                    onChange={() => setForm({ ...form, phanHoi: 'TuChoiHoTro' })}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-rose-700 block">Từ chối nhận hỗ trợ</span>
                    <span className="text-[11px] text-slate-500 block">
                      Không muốn Khoa tiếp tục giới thiệu doanh nghiệp trong đợt này.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Lý do / Nguyện vọng cụ thể <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                maxLength={1000}
                placeholder="VD: Em mong muốn tìm công ty mảng Web Developer / hoặc Em đã tự tìm được nơi thực tập..."
                value={form.lyDo}
                onChange={(e) => setForm({ ...form, lyDo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Đang gửi...' : 'Gửi phản hồi'}
              </button>
            </div>
          </form>
        </div>
      </ModalOverlay>
    </div>
  )
}
