import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { thucTapTuTimService } from '../../services/thucTapTuTimService'
import DocumentAttachments from '../common/DocumentAttachments'

const emptyForm = {
  tenCongTy: '',
  diaChi: '',
  viTri: '',
  nguoiLienHe: '',
  lienHe: '',
  ngayBatDau: '',
  ngayKetThuc: '',
  daDuocTiepNhan: false,
}

const statusBadgeConfig = {
  ChoDuyet: {
    label: 'Chờ Khoa duyệt',
    tone: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: 'hourglass_empty',
  },
  DaDuyet: {
    label: 'Đã công nhận nơi thực tập',
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: 'verified',
  },
  TuChoi: {
    label: 'Từ chối',
    tone: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: 'cancel',
  },
}

export default function ThucTapTuTimPanel({
  maDot,
  trangThaiDot,
  onApprovedRefresh,
  disabled = false,
  disabledReason = '',
}) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const roundRef = useRef(maDot)
  roundRef.current = maDot

  const pagination = usePagination(items, maDot)
  const canSubmit =
    !disabled &&
    maDot &&
    trangThaiDot === 'DangDienRa' &&
    !items.some((item) => item.trangThai === 'ChoDuyet')

  useEffect(() => {
    let cancelled = false
    roundRef.current = maDot
    setItems([])
    setError('')
    setMessage('')
    setShowForm(false)
    setForm(emptyForm)
    if (!maDot) return
    setLoading(true)
    thucTapTuTimService
      .getMine(maDot)
      .then((data) => {
        if (!cancelled) setItems(data || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Không tải được hồ sơ tự tìm.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      roundRef.current = null
    }
  }, [maDot])

  const refresh = async () => {
    setError('')
    try {
      const data = await thucTapTuTimService.getMine(maDot)
      if (roundRef.current === maDot) {
        setItems(data || [])
        onApprovedRefresh?.()
      }
    } catch (err) {
      if (roundRef.current === maDot)
        setError(err.response?.data?.message || 'Không tải được hồ sơ.')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!canSubmit || busy || loading) return
    if (form.ngayKetThuc < form.ngayBatDau)
      return setError('Ngày kết thúc phải từ ngày bắt đầu trở đi.')
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const saved = await thucTapTuTimService.submit({ ...form, maDot, maCongTy: null })
      if (roundRef.current !== maDot) return
      setItems((previous) => [saved, ...previous])
      setShowForm(false)
      setForm(emptyForm)
      setMessage(
        'Đã gửi hồ sơ tự tìm thành công! Đang chờ Khoa công nhận; không cần đăng ký nguyện vọng hoặc phỏng vấn lại.'
      )
    } catch (err) {
      if (roundRef.current === maDot)
        setError(err.response?.data?.message || 'Không gửi được hồ sơ.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-700">
            <span className="material-symbols-outlined text-[20px]">domain_add</span>
            <span className="text-xs font-bold uppercase tracking-wider">
              Hồ sơ tự tìm • Tiếp nhận bên ngoài
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 m-0">
            Khai báo Nơi Thực tập Sinh viên Tự tìm (Tiếp nhận ngoài)
          </h2>
          <p className="text-xs text-slate-500 m-0 leading-relaxed max-w-2xl">
            Dành cho sinh viên đã chủ động liên hệ, phỏng vấn hoặc có thỏa thuận tiếp nhận bên ngoài hệ thống.
            Khoa CNTT sẽ thẩm định tính hợp lệ của doanh nghiệp để công nhận và phân công GVHD.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            disabled={!canSubmit || loading || busy}
            onClick={() => setShowForm(!showForm)}
            title={
              disabled
                ? disabledReason || 'Đã khóa chức năng khai báo'
                : items.some((item) => item.trangThai === 'ChoDuyet')
                  ? 'Đang có hồ sơ chờ duyệt, không thể nộp thêm'
                  : 'Mở form khai báo thông tin nơi thực tập tự tìm'
            }
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer ${
              showForm
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {showForm ? 'close' : 'add_circle'}
            </span>
            <span>{showForm ? 'Đóng biểu mẫu' : 'Khai báo nơi thực tập tự tìm'}</span>
          </button>

          <button
            type="button"
            disabled={!maDot || busy}
            onClick={refresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer disabled:opacity-40"
          >
            <span className={`material-symbols-outlined text-[16px] text-slate-400 ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {/* Thông báo khóa do điều kiện học vụ hoặc đã có nơi */}
      {disabled && disabledReason && (
        <div role="status" className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2.5">
          <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0">
            lock_person
          </span>
          <span>{disabledReason}</span>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-500 text-[18px] shrink-0">error</span>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {/* Form khai báo nơi thực tập tự tìm */}
      {showForm && (
        <form onSubmit={submit} className="bg-slate-50/80 rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
            <span className="material-symbols-outlined text-blue-700 text-[20px]">edit_note</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 m-0">
              Thông tin đơn vị tiếp nhận bên ngoài
            </h3>
          </div>

          <fieldset disabled={busy} className="grid md:grid-cols-2 gap-4 border-0 p-0 m-0">
            <label className="block text-xs font-bold text-slate-700 space-y-1">
              <span>Tên doanh nghiệp / Đơn vị tiếp nhận <span className="text-rose-500">*</span></span>
              <input
                required
                maxLength={200}
                placeholder="Ví dụ: Công ty Cổ phần Công nghệ ABC"
                value={form.tenCongTy}
                onChange={(event) => setForm((prev) => ({ ...prev, tenCongTy: event.target.value }))}
                className="block w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700 space-y-1">
              <span>Vị trí công việc được tiếp nhận <span className="text-rose-500">*</span></span>
              <input
                required
                maxLength={200}
                placeholder="Ví dụ: Thực tập sinh Web Frontend / Backend"
                value={form.viTri}
                onChange={(event) => setForm((prev) => ({ ...prev, viTri: event.target.value }))}
                className="block w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700 space-y-1 md:col-span-2">
              <span>Địa chỉ nơi thực tập <span className="text-rose-500">*</span></span>
              <input
                required
                maxLength={500}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                value={form.diaChi}
                onChange={(event) => setForm((prev) => ({ ...prev, diaChi: event.target.value }))}
                className="block w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700 space-y-1">
              <span>Người liên hệ / Cán bộ hướng dẫn tại DN <span className="text-rose-500">*</span></span>
              <input
                required
                maxLength={200}
                placeholder="Họ tên người phụ trách hướng dẫn hoặc HR"
                value={form.nguoiLienHe}
                onChange={(event) => setForm((prev) => ({ ...prev, nguoiLienHe: event.target.value }))}
                className="block w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700 space-y-1">
              <span>Email / Số điện thoại liên hệ DN <span className="text-rose-500">*</span></span>
              <input
                required
                maxLength={200}
                placeholder="email@company.com hoặc số điện thoại liên hệ"
                value={form.lienHe}
                onChange={(event) => setForm((prev) => ({ ...prev, lienHe: event.target.value }))}
                className="block w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700 space-y-1">
              <span>Ngày dự kiến bắt đầu <span className="text-rose-500">*</span></span>
              <input
                type="date"
                required
                value={form.ngayBatDau}
                onChange={(event) => setForm((prev) => ({ ...prev, ngayBatDau: event.target.value }))}
                className="block w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </label>

            <label className="block text-xs font-bold text-slate-700 space-y-1">
              <span>Ngày dự kiến kết thúc <span className="text-rose-500">*</span></span>
              <input
                type="date"
                required
                value={form.ngayKetThuc}
                onChange={(event) => setForm((prev) => ({ ...prev, ngayKetThuc: event.target.value }))}
                className="block w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
              />
            </label>

            <div className="md:col-span-2 pt-2">
              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={form.daDuocTiepNhan}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, daDuocTiepNhan: event.target.checked }))
                  }
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <span className="leading-relaxed">
                  Tôi cam kết đã được doanh nghiệp trên tiếp nhận thực tập chính thức ngoài hệ thống; mọi thông tin khai báo là hoàn toàn chính xác.
                </span>
              </label>
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Đang gửi hồ sơ…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>Gửi Khoa xét duyệt</span>
                  </>
                )}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {/* Danh sách hồ sơ tự tìm đã gửi */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 m-0">
            Hồ sơ tự tìm đã gửi trong đợt ({items.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-slate-100 text-slate-500 text-xs">
            <span className="material-symbols-outlined text-2xl animate-spin text-blue-600 mb-1">
              progress_activity
            </span>
            <p className="m-0">Đang tải danh sách hồ sơ tự tìm…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-slate-100 text-slate-400 space-y-1">
            <span className="material-symbols-outlined text-3xl text-slate-300">folder_off</span>
            <p className="text-xs font-medium text-slate-500 m-0">
              Chưa có hồ sơ tự tìm nào được khai báo trong đợt này.
            </p>
            <p className="text-[11px] text-slate-400 m-0">
              Nếu bạn đã có thỏa thuận thực tập ngoài, hãy bấm &quot;Khai báo nơi thực tập tự tìm&quot; ở trên.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="p-0 m-0 list-none space-y-3">
              {pagination.items.map((item) => {
                const badge = statusBadgeConfig[item.trangThai] || {
                  label: item.trangThai,
                  tone: 'bg-slate-100 text-slate-700 border-slate-200',
                  icon: 'info',
                }
                return (
                  <li
                    key={item.maHoSo}
                    className="p-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/50 transition-colors space-y-3 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {item.tenCongTy}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold">
                            {item.viTri}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 m-0 flex items-center gap-1.5 flex-wrap">
                          <span>Địa chỉ: {item.diaChi}</span>
                          <span>•</span>
                          <span>Liên hệ: {item.nguoiLienHe} ({item.lienHe})</span>
                        </p>
                        <p className="text-[11px] text-slate-400 m-0">
                          Thời gian: {item.ngayBatDau} đến {item.ngayKetThuc}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.tone}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>

                    <DocumentAttachments key={item.maHoSo} kind="SelfPlacement" resourceId={item.maHoSo} title="Giấy tiếp nhận bên ngoài" defer />
                    {item.lyDo && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600">
                        <strong>Lý do / Phản hồi từ Khoa:</strong> {item.lyDo}
                      </div>
                    )}

                    {item.maPhanBo && (
                      <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-700 text-[18px]">
                            task_alt
                          </span>
                          <span>
                            Mã phân bổ: <strong>{item.maPhanBo}</strong>. Đã đủ điều kiện để Khoa phân công GVHD.
                          </span>
                        </div>
                        <Link
                          to="/sinh-vien/lich-phong-van"
                          className="shrink-0 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors"
                        >
                          Xác nhận nhận việc →
                        </Link>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <Pagination pagination={pagination} label="hồ sơ tự tìm của sinh viên" />
          </div>
        )}
      </div>
    </section>
  )
}
