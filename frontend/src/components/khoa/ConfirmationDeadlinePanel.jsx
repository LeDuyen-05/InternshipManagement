import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../common/Pagination'
import { interviewFormTimestamp, vietnamDateTimeParts } from '../../utils/interviewTime'

const base = '/khoa/xac-nhan-tiep-nhan'

const formatVNDateTime = (value) => {
  if (!value) return 'Chưa thiết lập'
  return new Date(value).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ConfirmationDeadlinePanel({ maDot, canEdit }) {
  const [policy, setPolicy] = useState(null)
  const [rows, setRows] = useState([])
  const [history, setHistory] = useState([])
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [review, setReview] = useState(null)
  const [reviewReason, setReviewReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [searchOverdue, setSearchOverdue] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const version = useRef(0)
  const operation = useRef(0)
  const current = useRef(maDot)
  current.current = maDot

  const load = useCallback(async () => {
    const request = ++version.current
    if (!maDot) return
    setLoading(true)
    setError('')
    try {
      const path = `${base}/${encodeURIComponent(maDot)}`
      const [p, r, h] = await Promise.all([
        apiClient.get(path),
        apiClient.get(`${path}/qua-han`),
        apiClient.get(`${path}/lich-su`),
      ])
      if (current.current !== maDot || request !== version.current) return
      setPolicy(p.data)
      setRows(r.data || [])
      setHistory(h.data || [])
      const parts = vietnamDateTimeParts(p.data.hanXacNhanSV ?? null)
      setDate(parts.date || '')
      setTime(parts.time || '')
    } catch (e) {
      if (current.current === maDot && request === version.current) {
        setPolicy(null)
        setRows([])
        setHistory([])
        setError(e.response?.data?.message || 'Không tải được cấu hình hạn xác nhận.')
      }
    } finally {
      if (current.current === maDot && request === version.current) setLoading(false)
    }
  }, [maDot])

  useEffect(() => {
    operation.current++
    setLoading(false)
    setPolicy(null)
    setRows([])
    setHistory([])
    setReason('')
    setReview(null)
    setReviewReason('')
    setDate('')
    setTime('')
    setMessage('')
    setError('')
    setBusy(false)
    setSearchOverdue('')
    load()
    const ref = version
    return () => {
      ref.current++
    }
  }, [load])

  const filteredRows = useMemo(() => {
    if (!searchOverdue.trim()) return rows
    const q = searchOverdue.toLowerCase().trim()
    return rows.filter(
      (r) =>
        (r.maSinhVien && r.maSinhVien.toLowerCase().includes(q)) ||
        (r.sinhVien && r.sinhVien.toLowerCase().includes(q)) ||
        (r.congTy && r.congTy.toLowerCase().includes(q)) ||
        (r.viTri && r.viTri.toLowerCase().includes(q))
    )
  }, [rows, searchOverdue])

  const pagination = usePagination(filteredRows, `${maDot}-${searchOverdue}`)
  const historyPages = usePagination(history, `${maDot}-history`)

  const isExpired = policy?.hanXacNhanSV && new Date(policy.hanXacNhanSV).getTime() <= Date.now()

  const formattedPreview = useMemo(() => {
    if (!date) return ''
    const parts = date.split('-')
    if (parts.length === 3) {
      const d = `${parts[2]}/${parts[1]}/${parts[0]}`
      return time ? `${time} ngày ${d}` : `Hết ngày ${d}`
    }
    return date
  }, [date, time])

  const mutate = async (event, kind) => {
    event.preventDefault()
    if (!canEdit || busy || loading || policy?.maDot !== maDot) return
    const evidence = (kind === 'save' ? reason : reviewReason).trim()
    if (!evidence || evidence.length > 1000) {
      setError('Cần nhập lý do / căn cứ học vụ (tối đa 1.000 ký tự).')
      return
    }
    const timestamp = interviewFormTimestamp(date, time)
    if (kind === 'save' && (!timestamp || new Date(timestamp).getTime() <= Date.now())) {
      setError('Thời hạn mới phải sau thời điểm hiện tại (theo giờ Việt Nam).')
      return
    }
    if (kind === 'review' && review?.maDot !== maDot) return
    const request = version.current
    const mutation = ++operation.current
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (kind === 'save') {
        await apiClient.put(`${base}/${encodeURIComponent(maDot)}`, {
          hanXacNhanSV: timestamp,
          phienBanXacNhan: policy.phienBanXacNhan,
          lyDo: evidence,
        })
      } else {
        await apiClient.post(`${base}/ho-so/${encodeURIComponent(review.maPhanBo)}/ra-soat`, {
          maDot,
          phienBanXacNhan: policy.phienBanXacNhan,
          lyDo: evidence,
        })
      }
      if (current.current !== maDot || request !== version.current) return
      setReason('')
      setReview(null)
      setReviewReason('')
      setMessage(
        kind === 'save'
          ? 'Đã cập nhật thời hạn xác nhận cho toàn đợt thành công!'
          : 'Đã ghi nhận biên bản rà soát học vụ; hồ sơ vẫn được giữ chỗ và bảo toàn dữ liệu.'
      )
      await load()
    } catch (e) {
      if (current.current === maDot && request === version.current) {
        setError(e.response?.data?.message || 'Không thể lưu thao tác. Dữ liệu có thể đã thay đổi.')
      }
    } finally {
      if (current.current === maDot && mutation === operation.current) setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. Header Box Cấu hình thời hạn xác nhận tiếp nhận */}
      <div className="bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white rounded-2xl border border-blue-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                <span className="material-symbols-outlined text-[13px]">schedule</span>
                QUY CHẾ TIẾP NHẬN
              </span>
              {policy?.hanXacNhanSV ? (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                    isExpired
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {isExpired ? 'history' : 'check_circle'}
                  </span>
                  {isExpired ? 'Đã hết hạn xác nhận' : 'Hạn đang có hiệu lực'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Chưa thiết lập hạn
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 m-0">
              Thời hạn Sinh viên xác nhận nhận việc & Rà soát quá hạn
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed m-0">
              Khung giờ Việt Nam (UTC+7). Quy định thời hạn để sinh viên trúng tuyển phỏng vấn hoàn tất xác nhận tiếp nhận. Quá hạn hệ thống <strong>không tự ý hủy đơn hoặc thu hồi chỉ tiêu</strong> nhằm bảo đảm quyền lợi sinh viên.
            </p>
          </div>

          <button
            type="button"
            disabled={!maDot || loading || busy}
            onClick={load}
            className="self-start sm:self-auto px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base text-slate-500 ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Làm mới hạn</span>
          </button>
        </div>

        {/* Thông báo tin nhắn phản hồi */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 shadow-xs">
            <span className="material-symbols-outlined text-rose-600 text-base">error</span>
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-xs">
            <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
            <span>{message}</span>
          </div>
        )}

        {/* Thẻ hiển thị Hạn hiện tại */}
        <div className="bg-white p-4 rounded-xl border border-blue-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Thời hạn xác nhận hiện tại
              </span>
              <strong className="text-sm sm:text-base font-black text-slate-900">
                {formatVNDateTime(policy?.hanXacNhanSV)}
              </strong>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 max-w-md">
            {policy?.hanXacNhanSV ? (
              <span>
                Áp dụng chung toàn bộ sinh viên trúng tuyển trong đợt. Phiên bản cấu hình: <strong>{policy.phienBanXacNhan}</strong>.
              </span>
            ) : (
              <span>Chưa cấu hình hạn thì giữ luồng xác nhận mở; sinh viên có thể xác nhận cho đến khi Khoa chốt phân bổ.</span>
            )}
          </div>
        </div>

        {/* Form thiết lập / điều chỉnh hạn */}
        <form onSubmit={(e) => mutate(e, 'save')} className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {/* Ngày hạn */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Ngày hết hạn <span className="text-rose-500">*</span>:
              </label>
              <input
                type="date"
                value={date}
                disabled={!canEdit || !policy || loading || busy}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-600 outline-none"
              />
            </div>

            {/* Giờ hạn */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Giờ hết hạn <span className="text-rose-500">*</span>:
              </label>
              <input
                type="time"
                value={time}
                disabled={!canEdit || !policy || loading || busy}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-600 outline-none"
              />
            </div>

            {/* Lý do / Căn cứ */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Lý do / Căn cứ ban hành hạn <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                maxLength={1000}
                value={reason}
                disabled={!canEdit || !policy || loading || busy}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Căn cứ kế hoạch tiếp nhận thực tập đợt 2 năm 2026..."
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:border-blue-600 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div className="text-[11px] text-slate-500">
              {formattedPreview ? (
                <span>
                  Thời hạn dự kiến thiết lập: <strong className="text-blue-700 font-bold">{formattedPreview}</strong>
                </span>
              ) : (
                <span>Lưu ý: Gia hạn sẽ mở lại hồ sơ đang chờ SV xác nhận; không ảnh hưởng hồ sơ đã xác nhận hoặc đã chốt.</span>
              )}
            </div>

            <button
              type="submit"
              disabled={!canEdit || !policy || loading || busy}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              <span>Lưu thời hạn xác nhận</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Danh sách sinh viên chờ xác nhận — đã quá hạn */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 m-0">
                Danh sách sinh viên chờ xác nhận — Đã quá hạn
              </h4>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {rows.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 m-0 mt-0.5">
              Khoa liên hệ xác minh trực tiếp và ghi biên bản rà soát. Hồ sơ vẫn giữ chỉ tiêu cho đến khi Khoa có quyết định chính thức.
            </p>
          </div>

          <div className="relative min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm MSSV, họ tên, doanh nghiệp..."
              value={searchOverdue}
              onChange={(e) => setSearchOverdue(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none font-medium"
            />
          </div>
        </div>

        {/* Bảng danh sách sinh viên quá hạn */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Mã SV</th>
                <th className="py-3 px-4">Sinh viên / Lớp</th>
                <th className="py-3 px-4">Doanh nghiệp / Vị trí</th>
                <th className="py-3 px-4">Hạn xác nhận</th>
                <th className="py-3 px-4 text-center">Thao tác xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagination.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    {loading ? 'Đang tải dữ liệu...' : 'Không có hồ sơ nào quá hạn xác nhận trong đợt.'}
                  </td>
                </tr>
              ) : (
                pagination.items.map((row) => (
                  <tr key={row.maPhanBo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{row.maSinhVien}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{row.sinhVien}</div>
                      {row.lop && <span className="text-[11px] text-slate-400 font-normal">{row.lop}</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{row.congTy}</div>
                      {row.viTri && <span className="text-[11px] text-slate-500 font-normal">{row.viTri}</span>}
                    </td>
                    <td className="py-3 px-4 text-amber-800 font-medium">
                      {formatVNDateTime(row.hanXacNhanSV)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={!canEdit || loading || busy || !policy}
                        onClick={() => {
                          setReview(row)
                          setReviewReason('')
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit_note</span>
                        <span>Ghi nhận rà soát</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination pagination={pagination} label="hồ sơ quá hạn" />
      </div>

      {/* Modal / Khối Ghi nhận rà soát hồ sơ quá hạn */}
      {review && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">fact_check</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 m-0">
                  Ghi nhận rà soát hồ sơ quá hạn xác nhận
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setReview(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div>
                Sinh viên: <strong>{review.sinhVien}</strong> ({review.maSinhVien})
              </div>
              <div>
                Doanh nghiệp tiếp nhận: <strong>{review.congTy}</strong> — {review.viTri || 'Vị trí thực tập'}
              </div>
              <div className="text-amber-800">
                Hạn xác nhận: {formatVNDateTime(review.hanXacNhanSV)}
              </div>
            </div>

            <form onSubmit={(e) => mutate(e, 'review')} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Căn cứ liên hệ / Biên bản xác minh <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  maxLength={1000}
                  placeholder="VD: Đã liên hệ sinh viên ngày 30/10/2026, SV trình bày gặp sự cố mạng, đồng ý nhận việc..."
                  required
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReview(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!canEdit || loading || busy}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Lưu biên bản rà soát</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Lịch sử thay đổi hạn & Nhật ký rà soát */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">history</span>
            <span className="text-xs font-bold text-slate-800">
              Nhật ký thiết lập hạn xác nhận & Biên bản rà soát ({history.length} bản ghi)
            </span>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-base">
            {showHistory ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {showHistory && (
          <div className="p-4 sm:p-5 border-t border-slate-100 space-y-3">
            {historyPages.items.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Chưa có bản ghi nhật ký nào.</p>
            ) : (
              <div className="space-y-2.5">
                {historyPages.items.map((row) => (
                  <div
                    key={row.maNhatKy}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{formatVNDateTime(row.thoiDiem)}</span>
                      <span className="font-semibold text-slate-700">Người thực hiện: {row.nguoiThucHien}</span>
                    </div>
                    <div className="font-medium text-slate-800">
                      <strong className="text-indigo-700">{row.loai}:</strong> {row.lyDo}
                    </div>
                  </div>
                ))}
                <Pagination pagination={historyPages} label="lịch sử xác nhận" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
