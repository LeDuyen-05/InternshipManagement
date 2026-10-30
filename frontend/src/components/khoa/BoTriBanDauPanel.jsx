import { useEffect, useState } from 'react'
import apiClient from '../../services/api'

export default function BoTriBanDauPanel({ maDot, student, onClose, onChanged }) {
  const [companies, setCompanies] = useState([])
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [direct, setDirect] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setCompanies([])
    setCompany('')
    setPosition('')
    setReason('')
    setReference('')
    setDirect(false)
    setAccepted(false)
    setError('')
    if (!student?.maSV || !maDot) return () => { active = false }
    setLoading(true)
    apiClient
      .get('/khoa/sinh-vien-theo-dot/cong-ty-bo-tri', { params: { maDot } })
      .then((response) => {
        if (active && Array.isArray(response.data)) setCompanies(response.data)
        else if (active) setError('Danh sách DN không hợp lệ.')
      })
      .catch((e) => {
        if (active)
          setError(
            e.response?.data?.message || 'Không tải được danh sách DN để bố trí.'
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [maDot, student?.maSV])

  const submit = async (event) => {
    event.preventDefault()
    if (
      saving ||
      loading ||
      !company ||
      !reason.trim() ||
      !reference.trim() ||
      !direct ||
      !accepted
    )
      return
    if (
      !window.confirm(
        `Xác nhận Khoa bố trí ${student.hoTen} vào DN đã chọn?`
      )
    )
      return
    setSaving(true)
    setError('')
    try {
      await apiClient.post(
        `/khoa/sinh-vien-theo-dot/${encodeURIComponent(student.maSV)}/bo-tri`,
        {
          maDot,
          maCongTy: company,
          maViTri: position || null,
          lyDo: reason.trim(),
          canCu: reference.trim(),
          daTiepNhanTrucTiep: direct,
          daDuocDNTiepNhan: accepted,
          ...(student.maLanHoTro
            ? {
                maLanHoTro: student.maLanHoTro,
                phienBanHoTro: student.phienBanHoTro,
              }
            : {}),
        }
      )
      await onChanged?.()
      onClose?.()
    } catch (e) {
      setError(
        e.response?.data?.message ||
          'Không thể bố trí nơi thực tập. Dữ liệu nhập vẫn được giữ.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!student) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
    >
      <section
        className="info-card bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 my-8"
        aria-label="Bố trí nơi thực tập ban đầu"
      >
        {/* Header */}
        <div className="page-head flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="material-symbols-outlined text-[13px]">add_business</span>
              HỖ TRỢ BỐ TRÍ
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Bố trí nơi thực tập ban đầu
            </h3>
            <p className="text-xs text-slate-600">
              Sinh viên:{' '}
              <strong className="text-slate-900 font-bold">{student.hoTen}</strong>{' '}
              (<span className="font-mono text-indigo-600 font-bold">{student.maSV}</span>)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {error && (
          <div
            className="alert error p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center gap-2"
            role="alert"
          >
            <span className="material-symbols-outlined text-rose-600 text-base shrink-0">
              error
            </span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 animate-spin text-2xl">
              progress_activity
            </span>
            <p>Đang tải DN đã được Khoa duyệt…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                DN tiếp nhận <span className="text-rose-500">*</span>
              </label>
              <select
                aria-label="DN bố trí ban đầu"
                value={company}
                required
                disabled={saving}
                onChange={(e) => {
                  setCompany(e.target.value)
                  setPosition('')
                }}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-semibold text-slate-900 bg-slate-50 focus:bg-white"
              >
                <option value="">Chọn DN đã được Khoa duyệt</option>
                {companies.map((item) => (
                  <option
                    key={item.maCongTy}
                    value={item.maCongTy}
                    disabled={
                      item.soLuongNhan > 0 && item.daTiepNhan >= item.soLuongNhan
                    }
                  >
                    {item.tenCongTy}
                    {item.viTriTuyen ? ` — ${item.viTriTuyen}` : ''} (
                    {item.daTiepNhan}/
                    {item.soLuongNhan > 0 ? item.soLuongNhan : 'chưa giới hạn'})
                  </option>
                ))}
              </select>
            </div>

            {(companies.find((x) => x.maCongTy === company)?.viTris || [])
              .length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vị trí tiếp nhận
                </label>
                <select
                  required
                  value={position}
                  disabled={saving}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-semibold text-slate-900 bg-slate-50 focus:bg-white"
                >
                  <option value="">Chọn vị trí đã được DN đồng ý</option>
                  {companies
                    .find((x) => x.maCongTy === company)
                    .viTris.map((v) => (
                      <option
                        key={v.maViTri}
                        value={v.maViTri}
                        disabled={
                          !v.hoatDong || v.daTiepNhan >= v.soLuongNhan
                        }
                      >
                        {v.tenViTri} ({v.daTiepNhan}/{v.soLuongNhan})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Lý do bố trí <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {reason.length}/1000
                </span>
              </div>
              <textarea
                aria-label="Lý do bố trí ban đầu"
                required
                maxLength={1000}
                rows={2}
                disabled={saving}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Sinh viên chưa có nơi tiếp nhận, Khoa liên hệ bố trí vào DN đối tác..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 bg-slate-50 focus:bg-white resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Căn cứ tiếp nhận của DN <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {reference.length}/1000
                </span>
              </div>
              <textarea
                aria-label="Căn cứ bố trí ban đầu"
                required
                maxLength={1000}
                rows={2}
                disabled={saving}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Số văn bản tiếp nhận, người xác nhận của DN hoặc tham chiếu hồ sơ"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 bg-slate-50 focus:bg-white resize-none"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
              <label className="flex items-start gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={accepted}
                  disabled={saving}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>
                  DN đã đồng ý tiếp nhận và Khoa đã kiểm tra chỉ tiêu/sự phù hợp
                </span>
              </label>

              <label className="flex items-start gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={direct}
                  disabled={saving}
                  onChange={(e) => setDirect(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>
                  Khoa đã tiếp nhận trực tiếp thông tin, lý do và minh chứng
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                className="primary px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer"
                type="submit"
                disabled={
                  saving ||
                  !company ||
                  !reason.trim() ||
                  !reference.trim() ||
                  !direct ||
                  !accepted
                }
              >
                {saving ? 'Đang bố trí…' : 'Xác nhận bố trí ban đầu'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
