import { useState } from 'react'
import apiClient from '../../services/api'
import { interviewFormTimestamp } from '../../utils/interviewTime'

export default function PlacementPeriodEditor({ maDot, student = {}, onClose, onChanged }) {
  const [start, setStart] = useState(student?.ngayBatDauThucTap?.slice(0, 10) || '')
  const [end, setEnd] = useState(student?.ngayKetThucThucTap?.slice(0, 10) || '')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    if (busy) return
    const fields = new FormData(e.currentTarget)
    const startDate = String(fields.get('ngayBatDau') || '')
    const endDate = String(fields.get('ngayKetThuc') || '')
    if (
      !interviewFormTimestamp(startDate, '00:00') ||
      !interviewFormTimestamp(endDate, '00:00') ||
      endDate < startDate
    ) {
      setError(
        'Chọn ngày bắt đầu và kết thúc hợp lệ; ngày kết thúc không trước ngày bắt đầu.'
      )
      return
    }
    setBusy(true)
    setError('')
    try {
      await apiClient.put(
        `/khoa/phan-bo/${encodeURIComponent(student?.maPhanBo || '')}/thoi-gian`,
        {
          maDot,
          ngayBatDau: startDate,
          ngayKetThuc: endDate,
          lyDo: reason,
          canCu: reference,
          phienBanThoiGian: student?.phienBanThoiGian,
        }
      )
      await onChanged?.()
      onClose?.()
    } catch (err) {
      setError(err.response?.data?.message || 'Không lưu được thời gian tại DN.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
    >
      <section
        className="info-card bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 my-8"
        aria-label="Xác minh thời gian tại DN"
      >
        {/* Header with Title & Close button */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="material-symbols-outlined text-[13px]">calendar_month</span>
              HỌC VỤ & DOANH NGHIỆP
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Điều chỉnh ngày thực tập riêng —{' '}
              <span className="font-mono text-indigo-600 font-bold">{student?.maSV}</span>{' '}
              · {student?.hoTen}
            </h3>
            <p className="text-xs font-semibold text-slate-700 line-clamp-1">
              {student?.tenCongTy || 'Doanh nghiệp tiếp nhận'}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bắt đầu tại DN <span className="text-rose-500">*</span>
              </label>
              <input
                name="ngayBatDau"
                type="date"
                required
                value={start}
                disabled={busy}
                onChange={(e) => setStart(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-semibold text-slate-900 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kết thúc tại DN <span className="text-rose-500">*</span>
              </label>
              <input
                name="ngayKetThuc"
                type="date"
                required
                min={start}
                value={end}
                disabled={busy}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-semibold text-slate-900 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Lý do ghi nhận/điều chỉnh <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {reason.length}/1000
              </span>
            </div>
            <textarea
              required
              maxLength={1000}
              rows={2}
              value={reason}
              disabled={busy}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Xác minh theo xác nhận tiếp nhận của doanh nghiệp..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 bg-slate-50 focus:bg-white resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                Căn cứ xác minh từ hồ sơ/DN <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {reference.length}/1000
              </span>
            </div>
            <textarea
              required
              maxLength={1000}
              rows={2}
              value={reference}
              disabled={busy}
              onChange={(e) => setReference(e.target.value)}
              placeholder="VD: Phiếu xác nhận tiếp nhận thực tập của DN số 45/XN..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 bg-slate-50 focus:bg-white resize-none"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-rose-600 text-base shrink-0">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={busy}
              className="primary small px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {busy ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">
                    progress_activity
                  </span>
                  <span>Đang lưu…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>Lưu thời gian đã xác minh</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
