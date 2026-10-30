import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import { deadlineText } from '../../hooks/useGradeDeadline'
import { usePagination } from '../../hooks/usePagination'
import Pagination from './Pagination'
import { useRoundLock } from '../../hooks/useRoundLock'
import RoundLockNotice from './RoundLockNotice'

const localInput = (value) =>
  value ? new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16) : ''

const auditText = (value) => {
  try {
    const labels = {
      MoChamGV: 'Mở GV',
      HanChamGV: 'Hạn GV',
      HanChamDN: 'Hạn DN',
      HanNopBoSung: 'Hạn nộp bổ sung',
      MaTienDo: 'Mốc',
      MaSV: 'SV',
      DaTrinhBayTrucTiep: 'Đã trình bày trực tiếp',
    }
    return Object.entries(JSON.parse(value))
      .map(
        ([k, v]) =>
          `${labels[k] || k}: ${
            k.startsWith('Han') || k === 'MoChamGV'
              ? deadlineText(v)
              : typeof v === 'boolean'
              ? v
                ? 'Có'
                : 'Không'
              : v
          }`
      )
      .join('; ')
  } catch {
    return value
  }
}

export default function GradingDeadlineSettings({ rounds }) {
  const [round, setRound] = useState('')
  const [record, setRecord] = useState(null)
  const [history, setHistory] = useState([])
  const [form, setForm] = useState({})
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const maDot = round || rounds.find((x) => x.trangThai === 'DangDienRa')?.maSo || rounds[0]?.maSo || ''
  const lock = useRoundLock(maDot)
  const pagination = usePagination(history, round)

  useEffect(() => {
    setRecord(null)
    setHistory([])
    setMessage('')
    setErrorMsg('')
    setReason('')
    if (!maDot) return
    let active = true
    Promise.all([
      apiClient.get(`/thoi-han/${encodeURIComponent(maDot)}`),
      apiClient.get(`/thoi-han/${encodeURIComponent(maDot)}/lich-su`),
    ])
      .then(([r, h]) => {
        if (!active) return
        setRecord({ ...r.data, maDot })
        setHistory(h.data || [])
        setForm(
          Object.fromEntries(
            ['moChamGV', 'hanChamGV', 'hanChamDN'].map((k) => [k, localInput(r.data[k])])
          )
        )
      })
      .catch((e) => {
        if (active) setErrorMsg(e.response?.data?.message || 'Không tải được thời hạn/lịch sử chấm điểm.')
      })
    return () => {
      active = false
    }
  }, [maDot])

  const save = async (e) => {
    e.preventDefault()
    if (lock.blocked) return
    if (!record || record.maDot !== maDot || busy) return

    setBusy(true)
    setMessage('')
    setErrorMsg('')
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [
          k,
          v === localInput(record[k]) ? record[k] : `${v}:00+07:00`,
        ])
      )
      const response = await apiClient.put(`/thoi-han/${encodeURIComponent(maDot)}`, {
        ...payload,
        lyDo: reason,
        phienBanThoiHan: record.phienBanThoiHan,
      })
      setRecord({ ...response.data, maDot })
      setReason('')
      setMessage('Đã lưu cấu hình thời hạn chấm điểm và ghi nhật ký thành công.')
      const h = await apiClient.get(`/thoi-han/${encodeURIComponent(maDot)}/lich-su`)
      setHistory(h.data || [])
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message ||
          'Không lưu được thời hạn. Làm mới trang nếu dữ liệu đã bị thay đổi.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <RoundLockNotice lock={lock} />

      {/* Thông báo quy định học vụ */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-xs flex items-start gap-3 shadow-xs">
        <span className="material-symbols-outlined text-indigo-600 text-lg shrink-0 mt-0.5">
          timer
        </span>
        <div className="leading-relaxed">
          <strong className="font-bold block mb-0.5">Quy định thời hạn chấm điểm Chuẩn đầu ra (CLO):</strong>
          Doanh nghiệp tự động mở cổng chấm lúc 00:00 ngày kế tiếp ngày kết thúc thực tập. Giảng viên hướng dẫn có cửa sổ chấm điểm riêng, được kéo dài sau khi kết thúc thực tập để rà soát báo cáo và rubric. Khi hết hạn chấm, muốn mở lại phải được Văn phòng Khoa phê duyệt gia hạn kèm căn cứ/lý do rõ ràng.
        </div>
      </div>

      {message && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-xs"
        >
          <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 shadow-xs"
        >
          <span className="material-symbols-outlined text-rose-600 text-base">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bento Card: Cài đặt Thời hạn Chấm CLO */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 m-0">
              <span className="material-symbols-outlined text-indigo-600">event_available</span>
              Cấu hình thời hạn chấm CLO theo đợt
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Áp dụng cho Giảng viên hướng dẫn và Doanh nghiệp tiếp nhận trong đợt.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600 shrink-0">Chọn đợt:</label>
            <select
              value={maDot}
              disabled={busy}
              onChange={(e) => setRound(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:bg-white"
            >
              {rounds.map((x) => (
                <option key={x.maSo} value={x.maSo}>
                  {x.tenDot} ({x.namHoc})
                </option>
              ))}
            </select>
          </div>
        </div>

        {record?.maDot === maDot && (
          <form onSubmit={save} className="space-y-5">
            {/* Thẻ tự động tính của Doanh Nghiệp */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 text-base">domain</span>
                <span className="text-xs font-semibold text-slate-700">Cổng Doanh nghiệp mở chấm tự động lúc:</span>
              </div>
              <strong className="text-xs text-indigo-700 font-bold bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                {record.moChamDN ? deadlineText(record.moChamDN) : 'Chưa thiết lập'}
              </strong>
            </div>

            {/* Lưới 3 mốc thời hạn điều chỉnh */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mở chấm GVHD <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="datetime-local"
                  disabled={busy}
                  value={form['moChamGV'] || ''}
                  onChange={(e) => setForm({ ...form, moChamGV: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {form['moChamGV'] ? `Bắt đầu: ${deadlineText(form['moChamGV'])}` : 'Chưa thiết lập'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hạn chót GVHD chấm điểm <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="datetime-local"
                  disabled={busy}
                  value={form['hanChamGV'] || ''}
                  onChange={(e) => setForm({ ...form, hanChamGV: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {form['hanChamGV'] ? `Hạn chót: ${deadlineText(form['hanChamGV'])}` : 'Chưa thiết lập'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hạn chót Doanh nghiệp chấm <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="datetime-local"
                  disabled={busy}
                  value={form['hanChamDN'] || ''}
                  onChange={(e) => setForm({ ...form, hanChamDN: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {form['hanChamDN'] ? `Hạn chót: ${deadlineText(form['hanChamDN'])}` : 'Chưa thiết lập'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do cấu hình / Căn cứ gia hạn thời hạn chấm CLO <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                maxLength={1000}
                rows="2"
                disabled={busy}
                placeholder="VD: Gia hạn thời hạn chấm điểm đợt 2 theo thông báo số 45/TB-FIT ngày..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={busy || lock.blocked || !reason.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">save</span>
                <span>{busy ? 'Đang lưu…' : 'Lưu thời hạn chấm điểm'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Khối Lịch sử điều chỉnh hạn chấm CLO */}
        <div className="pt-4 border-t border-slate-100">
          <details className="group">
            <summary className="font-bold text-xs text-slate-700 cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-slate-500 text-base">history</span>
                <span>Nhật ký thay đổi thời hạn chấm điểm ({history.length} lần)</span>
              </div>
              <span className="text-xs text-indigo-600 group-open:rotate-180 transition-transform material-symbols-outlined">
                expand_more
              </span>
            </summary>

            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
              {pagination.items.length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có nhật ký thay đổi thời hạn nào.</p>
              ) : (
                pagination.items.map((x) => (
                  <div key={x.maNhatKy} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <strong className="text-slate-800">
                        {x.loai} — Người thực hiện: <span className="text-indigo-700">{x.nguoiThucHien}</span>
                      </strong>
                      <span className="text-[11px] text-slate-400">
                        {deadlineText(x.thoiDiem)}
                      </span>
                    </div>
                    <p className="text-slate-600 m-0">
                      <strong>Lý do:</strong> {x.lyDo}
                    </p>
                    <div className="text-[11px] text-slate-500 pt-0.5 space-y-0.5 border-t border-slate-200/60 mt-1">
                      <p className="m-0 break-all"><strong>Trước:</strong> {auditText(x.truoc)}</p>
                      <p className="m-0 break-all text-indigo-700 font-medium"><strong>Sau:</strong> {auditText(x.sau)}</p>
                    </div>
                  </div>
                ))
              )}
              <Pagination pagination={pagination} label="lịch sử thời hạn" />
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
