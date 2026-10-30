import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../../services/api'
import Pagination from '../common/Pagination'
import { usePagination } from '../../hooks/usePagination'
import { formatInterviewDate, formatInterviewTime, hasInterviewStarted } from '../../utils/interviewTime'

export default function KhoaPhongVanPanel({ maDot, canEdit }) {
  const [items, setItems] = useState([])
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const roundRef = useRef(maDot)
  const version = useRef(0)
  roundRef.current = maDot

  const load = useCallback(async () => {
    if (!maDot) return
    const current = ++version.current
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.get('/khoa/phong-van', { params: { maDot } })
      if (roundRef.current === maDot && current === version.current) setItems(data)
    } catch (e) {
      if (roundRef.current === maDot && current === version.current)
        setError(e.response?.data?.message || 'Không tải được lịch và kết quả PV.')
    } finally {
      if (roundRef.current === maDot && current === version.current) setLoading(false)
    }
  }, [maDot])

  useEffect(() => {
    setItems([])
    setDrafts({})
    load()
    const requestVersion = version
    return () => {
      requestVersion.current++
    }
  }, [load])

  const pagination = usePagination(items, maDot)
  const updateDraft = (id, key, value) =>
    setDrafts((previous) => ({ ...previous, [id]: { ...previous[id], [key]: value } }))

  const save = async (event, item) => {
    event.preventDefault()
    const draft = drafts[item.maPV] || {}
    if (!canEdit || busy || !draft.lyDo?.trim()) return
    const maDK = item.maDK || draft.maDK
    if (!maDK) return setError('Chọn rõ nguyện vọng/đợt đã được Khoa đối chiếu cho lịch cũ.')
    if (!window.confirm('Ghi nhận kết quả theo nguồn đã xác minh? Lịch cũ chưa gắn đợt cần được đối chiếu chính xác.'))
      return

    setBusy(item.maPV)
    setError('')
    try {
      await apiClient.put(`/DoanhNghiep/phong-van/${encodeURIComponent(item.maPV)}/ket-qua`, {
        maDK,
        ketQua: draft.ketQua || 'KhongDat',
        nguon: draft.nguon || 'DNThongBao',
        lyDo: draft.lyDo.trim(),
      })
      if (roundRef.current === maDot) await load()
    } catch (e) {
      if (roundRef.current === maDot)
        setError(e.response?.data?.message || 'Không ghi được kết quả; căn cứ được giữ để thử lại.')
    } finally {
      setBusy('')
    }
  }

  const getKetQuaBadge = (kq) => {
    switch (kq) {
      case 'Dat':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-[14px]">check</span>
            Đạt — DN tiếp nhận
          </span>
        )
      case 'KhongDat':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="material-symbols-outlined text-[14px]">close</span>
            Không đạt
          </span>
        )
      case 'Vang':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="material-symbols-outlined text-[14px]">event_busy</span>
            Vắng / Bỏ PV
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Chờ kết quả
          </span>
        )
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h4 className="text-sm font-bold text-slate-800">
            Lịch & kết quả phỏng vấn của Doanh nghiệp ({items.length})
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Doanh nghiệp chủ động xếp lịch và đánh giá ứng viên. Khoa giám sát tiến độ và hỗ trợ đối chiếu, ghi nhận khi Doanh nghiệp có văn bản thông báo.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || !!busy}
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-center"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Danh sách thẻ kết quả PV */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-blue-600">
            progress_activity
          </span>
          <p className="text-xs">Đang tải lịch và kết quả phỏng vấn...</p>
        </div>
      ) : !items.length ? (
        <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">event_busy</span>
          <p className="text-xs font-medium">Chưa có lịch PV phù hợp.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagination.items.map((item) => {
            const draft = drafts[item.maPV] || {}
            return (
              <details
                key={item.maPV}
                className="group rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:border-slate-300 transition-all open:ring-1 open:ring-blue-100"
              >
                <summary className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer list-none select-none">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{item.hoTen}</span>
                        <span className="font-mono text-xs text-slate-500 font-medium">[{item.maSinhVien}]</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        Lịch PV: {formatInterviewDate(item.ngayPV)} lúc {formatInterviewTime(item.ngayPV)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {getKetQuaBadge(item.ketQua)}
                    <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform text-[18px]">
                      expand_more
                    </span>
                  </div>
                </summary>

                {/* Nội dung chi tiết & Form thao tác khi mở */}
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                    <div>
                      <span className="text-slate-400 font-medium">Mã nguyện vọng:</span>{' '}
                      <strong className="text-slate-800 font-mono">
                        {item.maDK || item.nguyenVongs?.[0]?.maDK || item.maPV}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Đơn vị phỏng vấn:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {item.nguyenVongs?.[0]?.tenCongTy || item.nguyenVongs?.map((n) => n.tenCongTy).join('; ') || '—'}
                      </span>
                    </div>
                    {item.daThayThe && (
                      <div className="col-span-full text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-lg">
                        Buổi phỏng vấn này đã được doanh nghiệp xếp lại thay thế.
                      </div>
                    )}
                    {item.maPVTruoc && (
                      <div className="col-span-full text-blue-700 font-medium">
                        Buổi này thay thế cho buổi trước: <strong>{item.maPVTruoc}</strong>
                      </div>
                    )}
                    {item.lyDoKetQua && (
                      <div className="col-span-full text-slate-700 pt-1 border-t border-slate-200/60">
                        <strong>Căn cứ:</strong> {item.lyDoKetQua}
                        {item.nguonKetQua && <> · <strong>Nguồn:</strong> {item.nguonKetQua === 'DNThongBao' ? 'Doanh nghiệp thông báo' : item.nguonKetQua}</>}
                        {item.nguoiGhiKetQua && <> · <strong>Người ghi:</strong> {item.nguoiGhiKetQua}</>}
                      </div>
                    )}
                  </div>

                  {(!item.ketQua || item.ketQua === 'ChuaCoKetQua') && (
                    <form onSubmit={(event) => save(event, item)} className="pt-2">
                      <fieldset
                        disabled={!canEdit || loading || !!busy || !hasInterviewStarted(item.ngayPV)}
                        className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3"
                      >
                        <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-blue-600 text-[18px]">edit_note</span>
                          Ghi nhận kết quả phỏng vấn theo nguồn xác minh:
                        </h5>

                        {!item.maDK && (
                          <label className="block text-slate-700 font-medium">
                            Nguyện vọng đã đối chiếu:
                            <select
                              required
                              value={draft.maDK || ''}
                              onChange={(e) => updateDraft(item.maPV, 'maDK', e.target.value)}
                              className="mt-1 w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                            >
                              <option value="">Chọn đúng nguyện vọng</option>
                              {item.nguyenVongs?.map((n) => (
                                <option key={n.maDK} value={n.maDK}>
                                  {n.maDK} — {n.maDot} — {n.trangThai}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="block text-slate-700 font-medium">
                            Kết quả:
                            <select
                              value={draft.ketQua || 'KhongDat'}
                              onChange={(e) => updateDraft(item.maPV, 'ketQua', e.target.value)}
                              className="mt-1 w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                            >
                              <option value="Dat">Đạt — DN tiếp nhận</option>
                              <option value="KhongDat">Phỏng vấn không đạt</option>
                              <option value="Vang" disabled={!item.choPhepGhiVang}>
                                Vắng / Bỏ phỏng vấn {item.choPhepGhiVang ? '' : '(quản trị tạm tắt)'}
                              </option>
                            </select>
                          </label>

                          <label className="block text-slate-700 font-medium">
                            Nguồn xác nhận:
                            <select
                              value={draft.nguon || 'DNThongBao'}
                              onChange={(e) => updateDraft(item.maPV, 'nguon', e.target.value)}
                              className="mt-1 w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                            >
                              <option value="DNThongBao">Doanh nghiệp gửi thông báo cho Khoa</option>
                              <option value="SVTrinhBay">Sinh viên trực tiếp trình bày (Khoa xác minh)</option>
                            </select>
                          </label>
                        </div>

                        <label className="block text-slate-700 font-medium">
                          Lý do / căn cứ ghi nhận:
                          <textarea
                            required
                            maxLength={1000}
                            rows={2}
                            placeholder="Nhập căn cứ văn bản/email/xác minh..."
                            value={draft.lyDo || ''}
                            onChange={(e) => updateDraft(item.maPV, 'lyDo', e.target.value)}
                            className="mt-1 w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                          />
                        </label>

                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
                        >
                          Lưu kết quả phỏng vấn
                        </button>
                      </fieldset>

                      {!hasInterviewStarted(item.ngayPV) && (
                        <p className="text-amber-700 text-xs mt-1 font-medium">
                          ⏳ Chưa đến giờ phỏng vấn theo lịch, hệ thống khóa ghi nhận kết quả sớm.
                        </p>
                      )}
                    </form>
                  )}
                </div>
              </details>
            )
          })}
        </div>
      )}

      <Pagination pagination={pagination} label="lịch/kết quả PV" />
    </div>
  )
}
