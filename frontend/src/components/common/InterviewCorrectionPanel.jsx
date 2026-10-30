import { useEffect, useRef, useState } from 'react'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from './Pagination'
import { formatInterviewDate, formatInterviewTime, interviewFormTimestamp, isFutureInterview } from '../../utils/interviewTime'

const labels = { Dat: 'Đạt — tiếp nhận tạm', KhongDat: 'Không đạt', Vang: 'Vắng/bỏ PV', ChuaCoKetQua: 'Chờ kết quả' }
const snapshotText = (value) => {
  try {
    const p = JSON.parse(value)
    return `${p.MaPV} · ${formatInterviewDate(p.NgayPV)} ${formatInterviewTime(p.NgayPV)} · ${labels[p.KetQua] || p.KetQua} · ${p.HinhThuc || ''}`
  } catch {
    return ''
  }
}

export default function InterviewCorrectionPanel({
  interview,
  maDot,
  faculty = false,
  canEdit = true,
  onChanged,
  onClose,
}) {
  const [mode, setMode] = useState('history')
  const [history, setHistory] = useState([])
  const [reason, setReason] = useState('')
  const [source, setSource] = useState('DNThongBao')
  const [result, setResult] = useState('')
  const [application, setApplication] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [method, setMethod] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const key = `${interview.maPV}|${maDot}|${interview.phienBan}`
  const current = useRef(key)
  current.current = key
  const mounted = useRef(true)
  const pagination = usePagination(history, key)

  useEffect(() => {
    mounted.current = true
    let active = true
    setMode('history')
    setHistory([])
    setReason('')
    setError('')
    setBusy(false)
    setApplication(interview.maDK || '')
    setResult(interview.ketQua || '')
    setDate('')
    setTime('')
    setMethod(interview.hinhThuc || '')
    setLoading(true)
    apiClient
      .get(`/DoanhNghiep/phong-van/${encodeURIComponent(interview.maPV)}/lich-su`)
      .then((r) => {
        if (active) setHistory(r.data)
      })
      .catch((e) => {
        if (active) setError(e.response?.data?.message || 'Không tải được lịch sử. Đóng và mở lại để thử.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      mounted.current = false
    }
  }, [key, interview.maPV, interview.maDK, interview.ketQua, interview.hinhThuc])

  const blocked = !canEdit || interview.daThayThe || !maDot || !Number.isInteger(interview.phienBan)

  const submit = async (e) => {
    e.preventDefault()
    if (blocked || busy || loading) return
    if (!reason.trim() || !application) return setError('Cần lý do/căn cứ và đúng nguyện vọng.')
    if (mode === 'correct' && result === interview.ketQua) return setError('Chọn kết quả khác kết quả đang lưu.')
    const scheduled = interviewFormTimestamp(date, time)
    if (mode === 'retry' && !isFutureInterview(scheduled)) return setError('Ngày giờ buổi mới phải ở tương lai theo giờ Việt Nam.')
    if (
      !window.confirm(
        mode === 'correct'
          ? 'Xác nhận lưu đính chính kết quả và cập nhật lịch sử?'
          : 'Xác nhận xếp lại buổi phỏng vấn thay thế cho ứng viên?'
      )
    )
      return
    const requestKey = key
    setBusy(true)
    setError('')
    try {
      const payload = {
        maDot,
        maDK: application,
        phienBan: interview.phienBan,
        lyDo: reason.trim(),
        nguon: faculty ? source : undefined,
      }
      if (mode === 'correct') {
        await apiClient.put(`/DoanhNghiep/phong-van/${encodeURIComponent(interview.maPV)}/sua-ket-qua`, {
          ...payload,
          ketQua: result,
        })
      } else {
        await apiClient.post(`/DoanhNghiep/phong-van/${encodeURIComponent(interview.maPV)}/xep-lai`, {
          ...payload,
          ngayPV: scheduled,
          hinhThuc: method,
        })
      }
      if (!mounted.current || current.current !== requestKey) return
      await onChanged?.()
      if (mounted.current && current.current === requestKey) onClose?.()
    } catch (e) {
      if (mounted.current && current.current === requestKey)
        setError(e.response?.data?.message || 'Không lưu được; dữ liệu nhập được giữ. Nếu hồ sơ vừa thay đổi, đóng form và tải lại danh sách.')
    } finally {
      if (mounted.current && current.current === requestKey) setBusy(false)
    }
  }

  return (
    <section
      className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 my-4 shadow-sm space-y-4"
      aria-label="Điều chỉnh và lịch sử PV"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
              <span className="material-symbols-outlined text-[13px]">history_edu</span>
              {faculty ? 'KHOA THEO DÕI & ĐỐI CHIẾU' : 'DOANH NGHIỆP ĐIỀU CHỈNH'}
            </span>
            <span className="font-mono text-xs text-slate-400 font-semibold">{interview.maPV}</span>
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Điều chỉnh PV — {interview.hoTenSV || interview.hoTen || interview.maSinhVien} ({interview.maPV})
          </h3>
          <p className="text-xs text-slate-500">
            {faculty
              ? 'Khoa kiểm tra, đối chiếu biên bản xác nhận từ Doanh nghiệp và điều chỉnh kết quả theo đúng hồ sơ.'
              : 'Quản lý lịch phỏng vấn và kết quả đánh giá ứng viên.'}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer self-start sm:self-center"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
          <span>Đóng điều chỉnh PV</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Tabs chuyển chế độ */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => setMode('history')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
            mode === 'history'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Xem lịch sử
        </button>
        <button
          type="button"
          disabled={blocked || busy || loading}
          onClick={() => setMode('correct')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            mode === 'correct'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Sửa kết quả nhập nhầm
        </button>
        <button
          type="button"
          disabled={blocked || busy || loading}
          onClick={() => setMode('retry')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
            mode === 'retry'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Xếp buổi thay thế
        </button>
      </div>

      {blocked && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          Chỉ xem lịch sử: buổi chưa có kết quả/đã được thay thế, đợt đang khóa hoặc thông tin chưa tải đầy đủ. Đóng và tải lại danh sách khi cần.
        </div>
      )}

      {/* Form thực hiện Sửa kết quả hoặc Xếp buổi mới */}
      {mode !== 'history' && (
        <form onSubmit={submit} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4">
          <fieldset disabled={blocked || busy || loading} className="space-y-3.5">
            {faculty && !interview.maDK && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nguyện vọng đã đối chiếu <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={application}
                  onChange={(e) => setApplication(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
                >
                  <option value="">Chọn hồ sơ đúng đợt</option>
                  {(interview.nguyenVongs || []).map((x) => (
                    <option key={x.maDK} value={x.maDK}>
                      {x.maDK} — {x.tenCongTy} — {x.maDot}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === 'correct' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kết quả đúng <span className="text-rose-500">*</span>
                </label>
                <select
                  aria-label="Kết quả PV điều chỉnh"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
                >
                  <option value="Dat">Đạt — tiếp nhận tạm</option>
                  <option value="KhongDat">Không đạt</option>
                  <option value="Vang" disabled={interview.choPhepGhiVang === false}>
                    Vắng/bỏ PV
                  </option>
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày PV mới (UTC+7) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giờ PV mới <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức</label>
                  <input
                    maxLength={100}
                    value={method}
                    placeholder="Trực tiếp / Online (Google Meet, Zoom...)"
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 bg-white"
                  />
                </div>
              </div>
            )}

            {faculty && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nguồn xác minh <span className="text-rose-500">*</span>
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
                >
                  <option value="DNThongBao">DN thông báo cho Khoa</option>
                  <option value="SVTrinhBay">SV trình bày, Khoa xác minh</option>
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Lý do / Căn cứ điều chỉnh <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">{reason.length}/1000</span>
              </div>
              <textarea
                aria-label="Căn cứ điều chỉnh PV"
                required
                maxLength={1000}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Cập nhật theo biên bản làm việc hoặc email xác nhận của doanh nghiệp..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 bg-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="submit"
                disabled={!reason.trim() || !application || (mode === 'correct' && result === interview.ketQua)}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded-xl shadow-xs transition cursor-pointer"
              >
                {busy ? 'Đang lưu…' : 'Lưu điều chỉnh PV'}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {/* Tab Xem lịch sử */}
      {mode === 'history' && (
        <div className="space-y-3">
          {loading ? (
            <p className="text-xs text-slate-500 py-4 text-center">Đang tải lịch sử…</p>
          ) : !history.length ? (
            <p className="text-xs text-slate-400 italic py-3 text-center bg-slate-50 rounded-xl border border-slate-200/60">
              Chưa có sự kiện điều chỉnh được ghi nhận.
            </p>
          ) : (
            <div className="space-y-2">
              {pagination.items.map((x) => (
                <article
                  key={x.maNhatKy}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {({ SuaKetQua: 'Sửa kết quả', XepLai: 'Xếp buổi thay thế', KetQua: 'Ghi kết quả' })[x.loai] || x.loai}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatInterviewDate(x.thoiDiem)} {formatInterviewTime(x.thoiDiem)}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Người thực hiện: <strong>{x.nguoiThucHien}</strong> · Nguồn: <span className="font-medium">{x.nguon}</span>
                  </p>
                  <p className="font-medium text-blue-900">
                    {labels[x.ketQuaCu] || 'Chưa có'} → {labels[x.ketQuaMoi] || x.ketQuaMoi}
                    {x.maPVMoi && ` · Buổi mới: ${x.maPVMoi}`}
                  </p>
                  <p className="text-slate-700 italic">Lý do: {x.lyDo}</p>
                  {x.noiDungCu && <p className="text-[11px] text-slate-400">Trước: {snapshotText(x.noiDungCu)}</p>}
                  {x.noiDungMoi && <p className="text-[11px] text-slate-400">Sau: {snapshotText(x.noiDungMoi)}</p>}
                </article>
              ))}
            </div>
          )}
          <Pagination pagination={pagination} label="lịch sử PV" />
        </div>
      )}
    </section>
  )
}
