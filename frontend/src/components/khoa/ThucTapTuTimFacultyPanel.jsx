import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import DocumentAttachments from '../common/DocumentAttachments'
import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../../services/api'
import { thucTapTuTimService } from '../../services/thucTapTuTimService'

export default function ThucTapTuTimFacultyPanel({ maDot, canEdit = true }) {
  const [items, setItems] = useState([])
  const [companies, setCompanies] = useState([])
  const [choices, setChoices] = useState({})
  const [reasons, setReasons] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [loading, setLoading] = useState(false)
  const roundRef = useRef(maDot)
  const loadVersion = useRef(0)
  roundRef.current = maDot
  const pagination = usePagination(items, maDot)

  const load = useCallback(async () => {
    if (!maDot) return
    const version = ++loadVersion.current
    setLoading(true)
    setError('')
    try {
      const [data, companyRes] = await Promise.all([
        thucTapTuTimService.getForFaculty(maDot),
        apiClient.get('/khoa/cong-ty'),
      ])
      if (roundRef.current !== maDot || version !== loadVersion.current) return
      setItems(data || [])
      setCompanies((companyRes.data || []).filter((item) => item.trangThai === 'DaDuyet'))
    } catch (err) {
      if (roundRef.current === maDot && version === loadVersion.current)
        setError(err.response?.data?.message || 'Không tải được hồ sơ tự tìm.')
    } finally {
      if (roundRef.current === maDot && version === loadVersion.current) setLoading(false)
    }
  }, [maDot])

  useEffect(() => {
    const requestVersion = loadVersion
    setItems([])
    setChoices({})
    setReasons({})
    load()
    return () => {
      requestVersion.current++
    }
  }, [load])

  const review = async (item, status) => {
    if (busy || loading || !canEdit) return
    const reason = reasons[item.maHoSo] || ''
    if (status === 'TuChoi' && !reason.trim()) return setError('Cần nhập lý do từ chối cho sinh viên.')
    if (
      !window.confirm(
        status === 'DaDuyet'
          ? 'Công nhận nơi thực tập và tạo phân bổ cho đúng SV–đợt? Không tạo phỏng vấn hoặc nguyện vọng mới.'
          : 'Từ chối hồ sơ này?'
      )
    )
      return

    setBusy(item.maHoSo)
    setError('')
    try {
      await thucTapTuTimService.review(item.maHoSo, {
        trangThai: status,
        lyDo: reason,
        maCongTy: choices[item.maHoSo] || item.maCongTy || null,
      })
      if (roundRef.current === maDot) await load()
    } catch (err) {
      if (roundRef.current === maDot) setError(err.response?.data?.message || 'Không xử lý được hồ sơ.')
    } finally {
      setBusy('')
    }
  }

  const getTrangThaiBadge = (st) => {
    switch (st) {
      case 'DaDuyet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Đã công nhận
          </span>
        )
      case 'TuChoi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="material-symbols-outlined text-[14px]">cancel</span>
            Từ chối
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="material-symbols-outlined text-[14px]">pending_actions</span>
            Chờ duyệt
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
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs font-bold text-slate-700">
          Danh sách hồ sơ tự tìm trong đợt ({items.length})
        </span>
        <button
          type="button"
          disabled={!!busy || loading}
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
        >
          Làm mới hồ sơ tự tìm
        </button>
      </div>

      {/* Danh sách thẻ hồ sơ */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">
          <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-blue-600">
            progress_activity
          </span>
          <p className="text-xs">Đang tải hồ sơ tự tìm...</p>
        </div>
      ) : !items.length ? (
        <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">inbox</span>
          <p className="text-xs font-medium">Chưa có hồ sơ tự tìm nào trong bộ lọc đợt này.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pagination.items.map(({ hoSo: item, hoTen, soDaiDien, taiKhoanDNHoatDong }) => (
            <details
              key={item.maHoSo}
              className="group rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:border-slate-300 transition-all open:ring-1 open:ring-blue-100"
            >
              <summary className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer list-none select-none">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{hoTen}</span>
                      <span className="font-mono text-xs text-slate-500 font-medium">[{item.maSV}]</span>
                    </div>
                    <p className="text-xs text-blue-900 font-semibold mt-0.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-blue-600">business</span>
                      <span>{item.tenCongTy}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {getTrangThaiBadge(item.trangThai)}
                  <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform text-[18px]">
                    expand_more
                  </span>
                </div>
              </summary>

              {/* Chi tiết hồ sơ khi mở */}
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="text-slate-400 font-medium">Địa chỉ công ty:</span>{' '}
                    <span className="text-slate-800 font-medium">{item.diaChi || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Vị trí công việc:</span>{' '}
                    <strong className="text-slate-900">{item.viTri || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Người liên hệ:</span>{' '}
                    <span className="text-slate-800 font-medium">{item.nguoiLienHe} — {item.lienHe}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Thời gian dự kiến:</span>{' '}
                    <span className="font-mono text-slate-700 font-medium">
                      {String(item.ngayBatDau).slice(0, 10)} → {String(item.ngayKetThuc).slice(0, 10)}
                    </span>
                  </div>
                  {item.lyDo && (
                    <div className="col-span-full pt-1 border-t border-slate-200/60">
                      <span className="text-slate-400 font-medium">Ghi chú / lý do:</span>{' '}
                      <span className="text-slate-800 italic">{item.lyDo}</span>
                    </div>
                  )}
                  {item.maPhanBo && (
                    <div className="col-span-full text-emerald-700 font-medium">
                      Mã phân bổ đã tạo: <strong className="font-mono">{item.maPhanBo}</strong>
                    </div>
                  )}
                </div>

                {/* Tệp đính kèm / Minh chứng */}
                <div className="pt-1">
                  <DocumentAttachments
                    key={item.maHoSo}
                    kind="SelfPlacement"
                    resourceId={item.maHoSo}
                    title="Giấy tiếp nhận bên ngoài"
                    readOnly={!canEdit}
                    defer
                  />
                </div>

                {/* Thông báo phân quyền tài khoản khi đã duyệt */}
                {item.trangThai === 'DaDuyet' && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] space-y-1">
                    <p>
                      Mã DN đã công nhận: <strong className="font-mono">{item.maCongTy}</strong>.{' '}
                      {taiKhoanDNHoatDong > 0
                        ? 'DN đã có tài khoản hoạt động để truy cập cổng DN.'
                        : soDaiDien > 0
                        ? 'Đã có đại diện; cần phối hợp QTV cấp hoặc mở khóa tài khoản DN.'
                        : 'Chưa có đại diện; chuyển mã DN và đầu mối liên hệ cho QTV xác minh, tạo đại diện và cấp tài khoản.'}
                    </p>
                    <p className="text-emerald-700">
                      Khoa phân công GVHD theo đợt. DN cập nhật điểm phần DN; GVHD chỉ xem phần DN.
                    </p>
                  </div>
                )}

                {/* Form thao tác khi đang Chờ duyệt */}
                {item.trangThai === 'ChoDuyet' && (
                  <fieldset
                    disabled={!!busy || loading || !canEdit}
                    className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 space-y-3 mt-2"
                  >
                    <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-amber-600 text-[18px]">verified</span>
                      Thẩm định và công nhận hồ sơ tự tìm:
                    </h5>

                    <label className="block text-slate-700 font-medium">
                      Công ty đối tác ghi nhận vào danh bạ:
                      <select
                        value={choices[item.maHoSo] ?? item.maCongTy ?? ''}
                        onChange={(e) =>
                          setChoices((prev) => ({ ...prev, [item.maHoSo]: e.target.value }))
                        }
                        className="mt-1 w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">Tạo công ty mới theo hồ sơ (nếu chưa tồn tại)</option>
                        {companies.map((company) => (
                          <option key={company.maCongTy} value={company.maCongTy}>
                            {company.tenCongTy} ({company.maCongTy})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-slate-700 font-medium">
                      Ghi chú / Lý do (nếu từ chối):
                      <input
                        maxLength={1000}
                        placeholder="Nhập lý do thẩm định hoặc lý do từ chối cho SV..."
                        value={reasons[item.maHoSo] || ''}
                        onChange={(e) =>
                          setReasons((prev) => ({ ...prev, [item.maHoSo]: e.target.value }))
                        }
                        className="mt-1 w-full p-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600"
                      />
                    </label>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => review(item, 'DaDuyet')}
                        className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        <span>Duyệt & tạo phân bổ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => review(item, 'TuChoi')}
                        className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-semibold transition border border-slate-200 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        <span>Từ chối</span>
                      </button>
                    </div>
                  </fieldset>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      <Pagination pagination={pagination} label="hồ sơ thực tập tự tìm" />
    </div>
  )
}
