import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../../services/api'
import Pagination from '../common/Pagination'
import { usePagination } from '../../hooks/usePagination'
import DocumentAttachments from '../common/DocumentAttachments'

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : 'Chưa thiết lập'
const localInput = (value) =>
  value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : ''
const kindName = (value) =>
  ({
    DatHan: 'Thiết lập/gia hạn',
    Huy: 'Hủy nơi thực tập',
    PhanBoLai: 'Phân bổ lại',
    CanXuLyRieng: 'Cần xử lý riêng',
  }[value] || value)

const placementStatusLabel = (value) =>
  ({
    DangThucTap: 'Đang thực tập',
    HoanThanh: 'Hoàn thành',
    Huy: 'Đã hủy',
    ChuaNhanViec: 'Chờ SV xác nhận',
    ChoKhoaDuyet: 'Chờ Khoa duyệt',
  }[value] || value || '—')

const placementStatusTone = (value) =>
  ({
    DangThucTap: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    HoanThanh: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Huy: 'bg-rose-50 text-rose-700 border-rose-200',
    ChuaNhanViec: 'bg-amber-50 text-amber-800 border-amber-200',
    ChoKhoaDuyet: 'bg-amber-50 text-amber-800 border-amber-200',
  }[value] || 'bg-slate-100 text-slate-700 border-slate-200')

const reprocessStatusLabel = (value) =>
  ({
    DaPhanBoLai: 'Đã phân bổ lại',
    ChoPhanBoLai: 'Chờ phân bổ lại',
    CanXuLyRieng: 'Cần xử lý riêng',
  }[value] || value || '')

export default function DieuChinhNoiThucTapPanel({ maDot, student, onClose, onChanged }) {
  const maSV = student?.maSV || ''
  const key = `${maDot}/${maSV}`
  const current = useRef(key)
  current.current = key
  const version = useRef(0)
  const [policy, setPolicy] = useState(null)
  const [history, setHistory] = useState(null)
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [action, setAction] = useState(null)
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [direct, setDirect] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [company, setCompany] = useState('')
  const [position, setPosition] = useState('')
  const [deadline, setDeadline] = useState('')
  const [, setTick] = useState(0)
  const offset = useRef(0)

  const load = useCallback(async () => {
    if (!maDot) return
    const request = ++version.current
    setLoading(true)
    setError('')
    try {
      const [p, h] = await Promise.all([
        apiClient.get('/khoa/phan-bo/dieu-chinh', { params: { maDot } }),
        maSV
          ? apiClient.get('/khoa/phan-bo/lich-su', { params: { maDot, maSV } })
          : Promise.resolve(null),
      ])
      if (current.current !== key || request !== version.current) return
      if (
        !p.data?.gioHienTai ||
        !Array.isArray(p.data.lichSuDatHan) ||
        (h && !Array.isArray(h.data?.phanBos))
      )
        throw new Error(
          'API điều chỉnh chưa đúng phiên bản. Hãy khởi động lại backend.'
        )
      offset.current = Date.parse(p.data.gioHienTai) - Date.now()
      setPolicy(p.data)
      setHistory(h?.data || null)
      setDeadline(localInput(p.data.hanDieuChinh))
    } catch (e) {
      if (current.current === key && request === version.current) {
        setPolicy(null)
        setHistory(null)
        setError(
          e.response?.data?.message ||
            e.message ||
            'Không tải được hồ sơ điều chỉnh.'
        )
      }
    } finally {
      if (current.current === key && request === version.current)
        setLoading(false)
    }
  }, [maDot, maSV, key])

  useEffect(() => {
    setPolicy(null)
    setHistory(null)
    setCompanies([])
    setAction(null)
    setNotice('')
    setError('')
    setBusy(false)
    load()
    const requestVersion = version
    return () => {
      requestVersion.current++
    }
  }, [load])

  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), 10000)
    return () => clearInterval(id)
  }, [])

  const ready =
    !!policy &&
    !policy.lyDoKhoa &&
    Date.now() + offset.current < Date.parse(policy.hanDieuChinh)

  const resetForm = (selected) => {
    setAction(selected)
    setReason('')
    setReference('')
    setDirect(false)
    setAccepted(false)
    setCompany('')
    setPosition('')
    setError('')
    setNotice('')
  }

  const beginReallocation = async (row) => {
    resetForm({ kind: 'phan-bo-lai', row })
    const request = version.current
    setLoading(true)
    try {
      const response = await apiClient.get(
        '/khoa/phan-bo/cong-ty-phan-bo-lai',
        { params: { maDot } }
      )
      if (current.current === key && version.current === request) {
        if (!Array.isArray(response.data))
          throw new Error('Danh sách DN không hợp lệ.')
        setCompanies(response.data)
      }
    } catch (e) {
      if (current.current === key && version.current === request)
        setError(
          e.response?.data?.message || e.message || 'Không tải được DN.'
        )
    } finally {
      if (current.current === key && version.current === request)
        setLoading(false)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (busy || loading || !action || !reason.trim() || !reference.trim()) return
    const kind = action.kind
    if (kind !== 'han' && !direct) return
    if (['huy', 'phan-bo-lai'].includes(kind) && !ready) return
    if (kind === 'phan-bo-lai' && (!company || !accepted)) return
    if (
      !window.confirm(
        kind === 'han'
          ? 'Lưu hạn điều chỉnh theo căn cứ Khoa đã nhập?'
          : `Xác nhận xử lý hồ sơ ${student?.hoTen || maSV} trong đợt đang chọn?`
      )
    )
      return
    const request = version.current
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        maDot,
        lyDo: reason.trim(),
        canCu: reference.trim(),
        daTiepNhanTrucTiep: direct,
      }
      const path =
        kind === 'han'
          ? '/khoa/phan-bo/dieu-chinh/han'
          : `/khoa/phan-bo/${encodeURIComponent(action.row.maPhanBo)}/${kind}`
      if (kind === 'han')
        Object.assign(payload, {
          hanCu: policy.hanDieuChinh || null,
          hanMoi: `${deadline}:00+07:00`,
        })
      if (kind === 'huy') payload.trangThaiHienTai = action.row.trangThai
      if (kind === 'phan-bo-lai')
        Object.assign(payload, {
          maCongTy: company,
          maViTri: position || null,
          daDuocDNTiepNhan: accepted,
        })
      await apiClient.post(path, payload)
      if (current.current !== key || version.current !== request) return
      setAction(null)
      setNotice(
        kind === 'xu-ly-rieng'
          ? 'Đã ghi nhận cần xử lý riêng; chưa đổi nơi hoặc điểm.'
          : 'Đã lưu kết quả xử lý và lịch sử.'
      )
      await load()
      if (current.current === key) await onChanged?.()
    } catch (e) {
      if (current.current === key && version.current === request)
        setError(
          e.response?.data?.message ||
            'Không lưu được. Dữ liệu nhập vẫn được giữ để kiểm tra.'
        )
    } finally {
      if (current.current === key && version.current <= request + 1)
        setBusy(false)
    }
  }

  const placementPage = usePagination(history?.phanBos || [], key)
  const auditPage = usePagination(history?.nhatKy || [], key)
  const deadlinePage = usePagination(policy?.lichSuDatHan || [], maDot)

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
    >
      <section
        className="info-card bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto"
        aria-label="Điều chỉnh nơi thực tập"
      >
        {/* Header */}
        <div className="page-head flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="material-symbols-outlined text-[13px]">published_with_changes</span>
              ĐIỀU CHỈNH NƠI THỰC TẬP
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              {student ? (
                <>
                  Hồ sơ nơi thực tập —{' '}
                  <span className="font-mono text-indigo-600 font-bold">{student.maSV}</span>{' '}
                  · {student.hoTen}
                </>
              ) : (
                'Cấu hình hạn điều chỉnh nơi thực tập'
              )}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || busy}
              onClick={load}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Làm mới</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                aria-label="Đóng"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="alert error p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-rose-600 text-base shrink-0">
              error
            </span>
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="alert p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-emerald-600 text-base shrink-0">
              check_circle
            </span>
            <span>{notice}</span>
          </div>
        )}

        {loading && (
          <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 animate-spin text-lg">
              progress_activity
            </span>
            <span>Đang tải hồ sơ điều chỉnh…</span>
          </div>
        )}

        {/* Thông tin Hạn điều chỉnh */}
        {policy && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-slate-900 font-bold">
                  Hạn điều chỉnh (giờ Việt Nam): {formatTime(policy.hanDieuChinh)}
                </strong>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    ready
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {policy.lyDoKhoa ||
                    (!ready
                      ? 'Đã hết hạn điều chỉnh'
                      : 'Đang trong hạn điều chỉnh')}
                </span>
              </div>
              <button
                type="button"
                disabled={!policy.coTheDatHan || busy || loading}
                onClick={() => resetForm({ kind: 'han' })}
                className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl disabled:opacity-40 transition-colors cursor-pointer shrink-0"
              >
                Thiết lập / gia hạn theo thông báo Khoa
              </button>
            </div>

            {policy.lichSuDatHan.length > 0 && (
              <details className="pt-1 text-[11px] text-slate-600">
                <summary className="cursor-pointer font-semibold text-slate-700 hover:text-indigo-600 select-none">
                  Lịch sử thiết lập hạn ({policy.lichSuDatHan.length})
                </summary>
                <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-slate-200">
                  {deadlinePage.items.map((item) => (
                    <p key={item.maNhatKy} className="text-slate-600">
                      {formatTime(item.thoiDiem)} — <strong>{item.nguoiThucHien}</strong>: {item.noiDung} Lý do: {item.lyDo}. Căn cứ: {item.canCu}
                    </p>
                  ))}
                  {policy.lichSuDatHan.length > 10 && (
                    <Pagination pagination={deadlinePage} label="lần thiết lập hạn" />
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Chi tiết sinh viên & lịch sử phân bổ */}
        {student && (
          <div className="space-y-3 pt-1">
            {history && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                    GVHD đã phân công: <strong>{history.giangViens.length}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                    Báo cáo tiến độ: <strong>{history.soBaoCao}</strong>
                  </span>
                </div>

                {history.coPhieuDiem && (
                  <div className="alert p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-base shrink-0">
                      warning
                    </span>
                    <span>
                      Đã có phiếu điểm: chỉ ghi nhận cần xử lý riêng, chưa được hủy hoặc đổi nơi trực tiếp.
                    </span>
                  </div>
                )}

                <div className="table-wrap overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                      <tr>
                        <th className="p-3">Đơn vị tiếp nhận</th>
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3">Thông tin hủy / đổi</th>
                        <th className="p-3 text-right">Thao tác xử lý</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {placementPage.items.map((row) => (
                        <tr key={row.maPhanBo} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-semibold text-slate-900">
                              {row.tenCongTy}
                            </span>
                            <div className="hint text-[11px] text-slate-400 font-mono mt-0.5">
                              Mã phân bổ: {row.maPhanBo}
                              {row.maPhanBoTruoc &&
                                ` (thay thế ${row.maPhanBoTruoc})`}
                            </div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${placementStatusTone(
                                row.trangThai
                              )}`}
                            >
                              {placementStatusLabel(row.trangThai)}
                            </span>
                            {row.trangThaiXuLyLai && (
                              <div className="text-[11px] text-slate-500 mt-1">
                                {reprocessStatusLabel(row.trangThaiXuLyLai)}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-[11px] text-slate-500">
                            {row.ngayHuy ? (
                              <>
                                <div>
                                  {formatTime(row.ngayHuy)} — {row.nguoiHuy}
                                </div>
                                <div className="text-slate-700 font-medium">
                                  {row.lyDoHuy}
                                </div>
                                <div className="text-slate-400">
                                  Căn cứ: {row.canCuHuy}
                                </div>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={
                                  !ready || !row.canHuy || busy || loading
                                }
                                onClick={() =>
                                  resetForm({ kind: 'huy', row })
                                }
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              >
                                Hủy nơi này
                              </button>
                              <button
                                type="button"
                                disabled={
                                  !ready || !row.canPhanBoLai || busy || loading
                                }
                                onClick={() => beginReallocation(row)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              >
                                Phân bổ lại
                              </button>
                              <button
                                type="button"
                                disabled={busy || loading}
                                onClick={() =>
                                  resetForm({ kind: 'xu-ly-rieng', row })
                                }
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 disabled:opacity-40 transition-colors cursor-pointer"
                              >
                                Ghi nhận cần xử lý riêng
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!history.phanBos.length && (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-4 text-center text-slate-500 italic"
                          >
                            Sinh viên chưa có phân bổ thực tập trong đợt.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={history.phanBos.length <= 10 ? 'sr-only' : ''}>
                  <Pagination pagination={placementPage} label="nơi thực tập" />
                </div>

                {history.nhatKy.length > 0 && (
                  <details open className="text-xs">
                    <summary className="font-bold text-slate-800 cursor-pointer select-none">
                      Nhật ký xử lý ({history.nhatKy.length})
                    </summary>
                    <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-200">
                      {auditPage.items.map((item) => (
                        <p key={item.maNhatKy} className="text-slate-600">
                          <strong className="text-slate-900 font-bold">
                            {kindName(item.loai)}
                          </strong>{' '}
                          — {formatTime(item.thoiDiem)} — {item.nguoiThucHien}
                          <br />
                          {item.noiDung}
                          <br />
                          <span className="text-slate-700 font-medium">
                            Lý do:
                          </span>{' '}
                          {item.lyDo}
                          <br />
                          <span className="text-slate-500 text-[11px]">
                            Đơn/minh chứng: {item.canCu}
                          </span>
                        </p>
                      ))}
                      {history.nhatKy.length > 10 && (
                        <Pagination pagination={auditPage} label="lần xử lý" />
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form thực hiện hành động (Hạn, Hủy, Phân bổ lại, Xử lý riêng) */}
        {action && (
          <form
            onSubmit={submit}
            aria-label="Hồ sơ xử lý trực tiếp"
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
          >
            <h4 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">
              {action.kind === 'han'
                ? 'Thiết lập hạn điều chỉnh'
                : action.kind === 'huy'
                ? 'Hủy nơi thực tập'
                : action.kind === 'phan-bo-lai'
                ? 'Phân bổ lại sau khi DN đồng ý'
                : 'Ghi nhận xử lý riêng'}
            </h4>

            {action.kind === 'han' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hạn điều chỉnh (giờ Việt Nam) <span className="text-rose-500">*</span>
                </label>
                <input
                  aria-label="Hạn điều chỉnh"
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  disabled={busy}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
                />
              </div>
            )}

            {action.kind === 'phan-bo-lai' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    DN mới <span className="text-rose-500">*</span>
                  </label>
                  <select
                    aria-label="DN mới"
                    required
                    value={company}
                    onChange={(e) => {
                      setCompany(e.target.value)
                      setPosition('')
                    }}
                    disabled={busy || loading}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
                  >
                    <option value="">Chọn DN đã được Khoa phê duyệt</option>
                    {companies.map((item) => (
                      <option
                        key={item.maCongTy}
                        value={item.maCongTy}
                        disabled={
                          item.soLuongNhan > 0 &&
                          item.daTiepNhan >= item.soLuongNhan
                        }
                      >
                        {item.tenCongTy} — {item.daTiepNhan}/
                        {item.soLuongNhan > 0 ? item.soLuongNhan : 'Chưa giới hạn'}{' '}
                        chỉ tiêu
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
                      disabled={busy}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-white"
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

                <label className="flex items-start gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    disabled={busy}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>
                    DN mới đã đồng ý tiếp nhận, Khoa đã kiểm tra sự phù hợp
                  </span>
                </label>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Lý do <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {reason.length}/1000
                </span>
              </div>
              <textarea
                aria-label="Lý do điều chỉnh"
                required
                maxLength={1000}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
                placeholder="VD: Sinh viên có nguyện vọng rút/đổi nơi thực tập do chuyển địa điểm..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 bg-white resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {action.kind === 'han'
                    ? 'Căn cứ thông báo/quyết định của Khoa'
                    : 'Đơn, minh chứng hoặc tham chiếu hồ sơ đã tiếp nhận'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {reference.length}/1000
                </span>
              </div>
              <textarea
                aria-label="Căn cứ điều chỉnh"
                required
                maxLength={1000}
                rows={2}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={busy}
                placeholder="Số đơn/phiếu, biên bản xác minh hoặc văn bản tham chiếu"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 text-slate-900 bg-white resize-none"
              />
            </div>

            {action.row && (
              <DocumentAttachments
                key={action.row.maPhanBo}
                kind="PlacementEvidence"
                resourceId={action.row.maPhanBo}
                title="Tệp minh chứng đính kèm (tùy chọn)"
                defer
              />
            )}

            {action.kind !== 'han' && (
              <label className="flex items-start gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={direct}
                  onChange={(e) => setDirect(e.target.checked)}
                  disabled={busy}
                  className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span>
                  Khoa đã tiếp nhận trực tiếp hồ sơ và kiểm tra lý do/minh chứng
                </span>
              </label>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={busy}
                onClick={() => setAction(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy thao tác
              </button>
              <button
                type="submit"
                disabled={
                  busy ||
                  loading ||
                  !reason.trim() ||
                  !reference.trim() ||
                  (action.kind !== 'han' && !direct) ||
                  (['huy', 'phan-bo-lai'].includes(action.kind) && !ready) ||
                  (action.kind === 'phan-bo-lai' && (!company || !accepted))
                }
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {busy ? 'Đang lưu…' : 'Xác nhận lưu'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
