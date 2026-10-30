import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import { deadlineText } from '../../hooks/useGradeDeadline'
import { usePagination } from '../../hooks/usePagination'
import Pagination from './Pagination'
import { useRoundLock } from '../../hooks/useRoundLock'
import RoundLockNotice from './RoundLockNotice'
import { interviewFormTimestamp } from '../../utils/interviewTime'

const formatDateVN = (val) => {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val).slice(0, 10)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function ReportReopeningSettings({ rounds }) {
  const [round, setRound] = useState('')
  const [reports, setReports] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [deadline, setDeadline] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const maDot = round || rounds.find((x) => x.trangThai === 'DangDienRa')?.maSo || rounds[0]?.maSo || ''
  const lock = useRoundLock(maDot)

  const filtered = reports.filter((x) =>
    `${x.maSV} ${x.hoTen}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))
  )
  const pagination = usePagination(filtered, `${maDot}|${search}`)

  useEffect(() => {
    setReports([])
    setSelected(null)
    setMessage('')
    setErrorMsg('')
    setConfirmed(false)
    if (!maDot) return
    let active = true
    apiClient
      .get(`/thoi-han/${encodeURIComponent(maDot)}/bao-cao`)
      .then((r) => {
        if (active) setReports(r.data || [])
      })
      .catch((e) => {
        if (active) setErrorMsg(e.response?.data?.message || 'Không tải được danh sách mốc báo cáo.')
      })
    return () => {
      active = false
    }
  }, [maDot])

  const save = async (e) => {
    e.preventDefault()
    if (lock.blocked) return
    if (!selected || selected.maDot !== maDot || busy) return

    const input = String(new FormData(e.currentTarget).get('hanNopBoSung') || '')
    const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:00)?$/.test(input)
      ? interviewFormTimestamp(input.slice(0, 10), input.slice(11, 16))
      : ''

    if (!timestamp) {
      setErrorMsg('Vui lòng chọn ngày giờ hạn nộp bổ sung hợp lệ (giờ Việt Nam).')
      return
    }

    setBusy(true)
    setMessage('')
    setErrorMsg('')
    try {
      const r = await apiClient.put(
        `/thoi-han/bao-cao/${encodeURIComponent(selected.maTienDo)}/mo-lai`,
        {
          hanNopBoSung: timestamp,
          lyDo: reason,
          daTrinhBayTrucTiep: confirmed,
          hanNopBoSungCu: selected.hanNopBoSung || null,
        }
      )
      setMessage(r.data.message || 'Đã mở hạn nộp bổ sung thành công.')
      setSelected(null)
      setReason('')
      setConfirmed(false)
      setDeadline('')
      const list = await apiClient.get(`/thoi-han/${encodeURIComponent(maDot)}/bao-cao`)
      setReports(list.data || [])
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message ||
          (error.response?.data?.errors
            ? 'Ngày giờ hoặc dữ liệu mở hạn không hợp lệ. Kiểm tra lại các trường trước khi lưu.'
            : 'Không mở được hạn bổ sung. Vui lòng thử lại.')
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <RoundLockNotice lock={lock} />

      {/* Thông báo quy định học vụ */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
        <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">
          gavel
        </span>
        <div className="leading-relaxed">
          <strong className="font-bold block mb-0.5">Quy định nộp bổ sung báo cáo tiến độ:</strong>
          Hạn nộp báo cáo tính theo giờ Việt Nam (UTC+7). Khi quá hạn, hệ thống tự động khóa nộp. Sinh viên phải trực tiếp đến Văn phòng Khoa trình bày lý do; sau khi được cán bộ Khoa chấp thuận mới mở hạn bổ sung cho đúng sinh viên và đúng mốc báo cáo đó. Hết thời hạn bổ sung, hệ thống sẽ tự động khóa lại. Tuyệt đối không mở nộp đồng loạt cho cả đợt.
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

      {/* Bento Card: Danh sách & Bộ lọc */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 m-0">
              <span className="material-symbols-outlined text-indigo-600">lock_open</span>
              Mở nộp bổ sung cho sinh viên
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-0.5">
              Rà soát các mốc báo cáo chưa nộp hoặc yêu cầu sửa để giải quyết gia hạn cá biệt.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 shrink-0">Đợt:</label>
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

            <div className="relative min-w-[200px]">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-base">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm MSSV hoặc họ tên..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-hidden font-medium"
              />
            </div>
          </div>
        </div>

        {/* Bảng danh sách mốc cần mở nộp */}
        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Sinh viên</th>
                <th className="py-3 px-4">Hạn nộp gốc</th>
                <th className="py-3 px-4">Hạn bổ sung hiện hành (UTC+7)</th>
                <th className="py-3 px-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagination.items.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400 text-xs">
                    {reports.length === 0
                      ? 'Không có mốc báo cáo nào quá hạn hoặc yêu cầu sửa trong đợt này.'
                      : 'Không tìm thấy sinh viên nào phù hợp với từ khóa tìm kiếm.'}
                  </td>
                </tr>
              ) : (
                pagination.items.map((x) => (
                  <tr
                    key={x.maTienDo}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      selected?.maTienDo === x.maTienDo ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block">{x.hoTen}</strong>
                      <span className="font-mono text-slate-500 text-[11px]">{x.maSV}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {formatDateVN(x.mocThoiGian)}
                    </td>
                    <td className="py-3 px-4">
                      {x.hanNopBoSung ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          {deadlineText(x.hanNopBoSung)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa mở hạn bổ sung</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={busy || lock.blocked}
                        onClick={() => {
                          setSelected(x)
                          setReason('')
                          setConfirmed(false)
                          setDeadline('')
                          setMessage('')
                          setErrorMsg('')
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          selected?.maTienDo === x.maTienDo
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {selected?.maTienDo === x.maTienDo ? 'Đang chọn' : 'Xem xét mở nộp'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} label="mở nộp bổ sung" />
      </div>

      {/* Form Thực thi Mở nộp Bổ sung */}
      {selected?.maDot === maDot && (
        <div className="bg-white rounded-2xl border-2 border-indigo-500/80 p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-lg">person_add</span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 m-0">
                  Phê duyệt mở nộp bổ sung cho sinh viên: <span className="text-indigo-700">{selected.hoTen}</span> ({selected.maSV})
                </h4>
                <p className="text-xs text-slate-500 m-0 mt-0.5">
                  Mốc báo cáo: <strong>{formatDateVN(selected.mocThoiGian)}</strong> · Đợt: {selected.maDot}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thời hạn nộp bổ sung mới (Giờ Việt Nam) <span className="text-rose-500">*</span>
                </label>
                <input
                  name="hanNopBoSung"
                  required
                  type="datetime-local"
                  value={deadline}
                  disabled={busy}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                />
                <p className="text-[11px] text-slate-500 font-medium mt-1">
                  {deadline ? `Áp dụng đến: ${deadlineText(deadline)}` : 'Chưa thiết lập'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do Khoa chấp thuận mở hạn <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  maxLength={1000}
                  rows="2"
                  placeholder="Ghi rõ lý do tiếp nhận SV trình bày trực tiếp (ốm đau, sự cố kỹ thuật...)"
                  value={reason}
                  disabled={busy}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                required
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded text-indigo-600 w-4 h-4"
              />
              <span className="font-medium">
                Khoa xác nhận đã tiếp nhận sinh viên lên trình bày trực tiếp và đồng ý mở hạn nộp bù.
              </span>
            </label>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={busy || lock.blocked || !confirmed}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">check</span>
                <span>{busy ? 'Đang lưu…' : 'Chấp thuận & Mở nộp bổ sung'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
