import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import BoTriBanDauPanel from './BoTriBanDauPanel'
import Pagination from '../common/Pagination'
import { usePagination } from '../../hooks/usePagination'
import { vietnamDateTimeParts } from '../../utils/interviewTime'

const outcome = {
  ChuaGhiNhan: 'Chưa ghi kết quả',
  CanHoTro: 'Vẫn cần hỗ trợ',
  DaCoNoi: 'Đã có công ty',
}
const empty = () => ({ tenLan: '', ngayHoTro: '', maSinhViens: [], maLanTruoc: null })

export default function LanHoTroPanel({ maDot, onChanged, onNavigateTab }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [placement, setPlacement] = useState(null)
  const alive = useRef(true)
  const sequence = useRef(0)

  const load = useCallback(async () => {
    const version = ++sequence.current
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/khoa/lan-ho-tro', { params: { maDot } })
      if (!alive.current || version !== sequence.current) return
      if (
        response.data?.maDot !== maDot ||
        !Array.isArray(response.data.cacLan) ||
        !Array.isArray(response.data.ungViens)
      )
        throw new Error('Dữ liệu hỗ trợ không đúng đợt. Tải lại để kiểm tra.')
      setData(response.data)
    } catch (e) {
      if (alive.current && version === sequence.current) {
        setData(null)
        setError(
          e.response?.data?.message || e.message || 'Không tải được các lần hỗ trợ.'
        )
      }
    } finally {
      if (alive.current && version === sequence.current) setLoading(false)
    }
  }, [maDot])

  useEffect(() => {
    alive.current = true
    load()
    const requests = sequence
    return () => {
      alive.current = false
      requests.current++
    }
  }, [load])

  const writable = !!data?.coTheSua && !busy && !loading

  const run = async (action) => {
    if (!writable) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      if (!alive.current) return
      setForm(null)
      setSelected(null)
      setPlacement(null)
      setNotice('Đã lưu thay đổi.')
      await load()
      if (alive.current) await onChanged?.()
    } catch (e) {
      if (alive.current)
        setError(
          e.response?.data?.message ||
            'Không lưu được. Giữ nội dung nhập; nếu dữ liệu đã thay đổi hãy tải lại.'
        )
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const start = (item = null, follow = false) => {
    const available = new Set(data.ungViens.map((s) => s.maSV))
    setSearch('')
    setSelected(null)
    setForm(
      item
        ? {
            ...item,
            ngayHoTro: follow ? '' : item.ngayHoTro.slice(0, 10),
            maLan: follow ? null : item.maLan,
            tenLan: follow
              ? `Tiếp theo — ${item.tenLan}`.slice(0, 200)
              : item.tenLan,
            maLanTruoc: follow ? item.maLan : item.maLanTruoc,
            maSinhViens: item.sinhViens
              .filter(
                (s) => available.has(s.maSV) && (!follow || s.ketQua === 'CanHoTro')
              )
              .map((s) => s.maSV),
          }
        : empty()
    )
  }

  const prior = form?.maLanTruoc
    ? data?.cacLan.find((s) => s.maLan === form.maLanTruoc)
    : null
  const candidates = (data?.ungViens || []).filter(
    (s) =>
      (!prior ||
        prior.sinhViens.some(
          (m) => m.maSV === s.maSV && m.ketQua === 'CanHoTro'
        )) &&
      `${s.maSV} ${s.hoTen} ${s.lop || ''}`
        .toLocaleLowerCase('vi')
        .includes(search.toLocaleLowerCase('vi'))
  )
  const candidatePages = usePagination(
    candidates,
    `${maDot}/${search}/${form?.maLanTruoc || ''}`
  )
  const sessions = usePagination(data?.cacLan || [], maDot)
  const today = vietnamDateTimeParts().date

  return (
    <section
      className="bg-white rounded-xl border border-slate-200 p-5 space-y-5"
      aria-label="Các lần hỗ trợ bố trí thực tập"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            Hỗ trợ bố trí nơi thực tập
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Link
              to="/khoa/doanh-nghiep"
              className="text-blue-700 hover:underline font-medium"
            >
              Doanh nghiệp liên kết →
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to="/khoa/dang-ky"
              className="text-blue-700 hover:underline font-medium"
            >
              Xét duyệt hồ sơ thực tập →
            </Link>
            {onNavigateTab && (
              <>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('ra-soat')}
                  className="text-blue-700 hover:underline font-medium cursor-pointer"
                >
                  Rà soát trước chốt →
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={busy || loading}
            onClick={load}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-lg cursor-pointer"
          >
            Tải lại các lần hỗ trợ
          </button>
          <button
            type="button"
            disabled={!writable}
            onClick={() => start()}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg cursor-pointer"
          >
            Thêm lần hỗ trợ
          </button>
        </div>
      </div>

      {/* Chỉ số tóm tắt trạng thái hỗ trợ */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500">SV chưa có nơi cần hỗ trợ: </span>
            <strong className="font-mono text-sm text-slate-900">
              {data.ungViens?.length ?? 0}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Số đợt hỗ trợ đã lập: </span>
            <strong className="font-mono text-sm text-slate-900">
              {data.cacLan?.length ?? 0}
            </strong>
          </div>
          <div>
            <span className="text-slate-500">Trạng thái thao tác: </span>
            <strong
              className={
                data.coTheSua ? 'text-emerald-700' : 'text-amber-700'
              }
            >
              {data.coTheSua ? 'Đang mở lập & ghi nhận hỗ trợ' : 'Đã khóa chỉnh sửa'}
            </strong>
          </div>
        </div>
      )}

      {loading && (
        <p role="status" className="text-xs text-slate-500 py-3">
          Đang tải các lần hỗ trợ…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800"
        >
          {notice}
        </p>
      )}
      {data?.lyDoKhoa && (
        <p className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          {data.lyDoKhoa}
        </p>
      )}

      {/* Form Tạo / Sửa đợt hỗ trợ */}
      {form && (
        <form
          className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            return run(() =>
              apiClient[form.maLan ? 'put' : 'post'](
                `/khoa/lan-ho-tro${
                  form.maLan ? `/${encodeURIComponent(form.maLan)}` : ''
                }`,
                {
                  tenLan: form.tenLan.trim(),
                  ngayHoTro: `${form.ngayHoTro}T00:00:00`,
                  maSinhViens: form.maSinhViens,
                  maLanTruoc: form.maLanTruoc,
                  phienBan: form.phienBan || 0,
                },
                { params: { maDot } }
              )
            )
          }}
        >
          <h4 className="text-sm font-bold text-slate-900">
            {form.maLan ? 'Chỉnh sửa đợt hỗ trợ (Nháp)' : 'Tạo đợt hỗ trợ bố trí mới'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700">
              Tên đợt hỗ trợ
              <input
                aria-label="Tên lần hỗ trợ"
                required
                maxLength={200}
                placeholder="Ví dụ: Hỗ trợ bố trí đợt 1"
                value={form.tenLan}
                disabled={!writable}
                onChange={(e) => setForm({ ...form, tenLan: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-700">
              Ngày làm việc / hỗ trợ
              <input
                aria-label="Ngày hỗ trợ"
                type="date"
                required
                min={today}
                value={form.ngayHoTro}
                disabled={!writable}
                onChange={(e) => setForm({ ...form, ngayHoTro: e.target.value })}
                className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900"
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800">
                Chọn sinh viên chưa có nơi đưa vào đợt hỗ trợ (Đã chọn:{' '}
                <strong className="font-mono text-blue-700">
                  {form.maSinhViens.length}
                </strong>{' '}
                SV)
              </span>
              <input
                aria-label="Tìm SV hỗ trợ"
                placeholder="Tìm MSSV, họ tên, lớp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 min-w-[220px]"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {candidatePages.items.map((s) => (
                <label
                  key={s.maSV}
                  className="flex items-center gap-2.5 p-2.5 text-xs hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    disabled={!writable}
                    checked={form.maSinhViens.includes(s.maSV)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maSinhViens: e.target.checked
                          ? [...form.maSinhViens, s.maSV]
                          : form.maSinhViens.filter((id) => id !== s.maSV),
                      })
                    }
                    className="w-4 h-4 rounded text-blue-700"
                  />
                  <span className="font-mono font-semibold text-slate-900">
                    {s.maSV}
                  </span>
                  <span className="text-slate-800 font-medium">{s.hoTen}</span>
                  <span className="text-slate-500 font-mono">({s.lop || '—'})</span>
                  <span className="ml-auto text-[11px] text-slate-500">
                    {s.tenTrangThai}
                  </span>
                </label>
              ))}
              {!candidates.length && (
                <p className="p-4 text-center text-xs text-slate-500">
                  Không có sinh viên thuộc diện chưa có nơi thực tập (các hồ sơ đang chờ duyệt hoặc chờ xác nhận cần được xử lý tại trang Xét duyệt hồ sơ trước).
                </p>
              )}
            </div>

            <Pagination pagination={candidatePages} label="SV chưa có nơi" />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={!writable || !form.maSinhViens.length}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg cursor-pointer"
            >
              Lưu lần hỗ trợ
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setForm(null)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer"
            >
              Hủy nhập
            </button>
          </div>
        </form>
      )}

      {/* Danh sách các đợt hỗ trợ đã tạo */}
      <div className="space-y-4">
        {sessions.items.map((item) => (
          <article
            key={item.maLan}
            className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {item.tenLan} — Ngày {item.ngayHoTro.slice(0, 10)}
                </h4>
                <span
                  className={`inline-flex mt-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                    item.trangThai === 'Nhap'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {item.trangThai === 'Nhap' ? 'Bản nháp' : 'Đã triển khai'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {item.trangThai === 'Nhap' ? (
                  <>
                    <button
                      type="button"
                      disabled={!writable}
                      onClick={() => start(item)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      Sửa lần nháp
                    </button>
                    <button
                      type="button"
                      disabled={!writable}
                      onClick={() => {
                        if (window.confirm(`Xóa lần nháp “${item.tenLan}”?`))
                          run(() =>
                            apiClient.delete(`/khoa/lan-ho-tro/${item.maLan}`, {
                              params: { maDot, phienBan: item.phienBan },
                            })
                          )
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 rounded-lg cursor-pointer"
                    >
                      Xóa lần nháp
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={
                      !writable ||
                      !item.sinhViens.some(
                        (s) => s.ketQua === 'CanHoTro' && s.coTheBoTri
                      )
                    }
                    onClick={() => start(item, true)}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 rounded-lg cursor-pointer"
                  >
                    Tạo lần tiếp theo
                  </button>
                )}
              </div>
            </div>

            <SupportMembers
              item={item}
              writable={writable && item.ngayHoTro.slice(0, 10) <= today}
              onResult={(s) =>
                setSelected({
                  item,
                  student: s,
                  ketQua: s.ketQua === 'ChuaGhiNhan' ? 'CanHoTro' : s.ketQua,
                  ghiChu: s.ghiChu,
                })
              }
              onPlace={(s) =>
                setPlacement({
                  ...s,
                  maLanHoTro: item.maLan,
                  phienBanHoTro: item.phienBan,
                })
              }
            />

            <details className="text-xs text-slate-500 pt-1">
              <summary className="cursor-pointer font-medium hover:text-slate-800">
                Lịch sử thay đổi ({item.nhatKy.length})
              </summary>
              <div className="mt-2 space-y-1 pl-3 border-l-2 border-slate-200">
                {item.nhatKy.map((h, i) => (
                  <p key={i}>
                    {h.luc} — {h.nguoi} — {h.loai}
                  </p>
                ))}
              </div>
            </details>
          </article>
        ))}

        {data && !data.cacLan.length && (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 space-y-2">
            <p className="text-xs font-semibold text-slate-700">
              Chưa có lần hỗ trợ trong đợt này.
            </p>
            <p className="text-xs text-slate-500 max-w-xl mx-auto">
              {data.ungViens?.length > 0
                ? `Hiện có ${data.ungViens.length} sinh viên chưa có nơi thực tập. Bấm "Thêm lần hỗ trợ" ở góc trên để lập danh sách điều phối vào các doanh nghiệp đối tác.`
                : 'Tất cả sinh viên trong đợt hiện đã có nơi tiếp nhận hoặc đang trong quy trình xét duyệt hồ sơ, chưa phát sinh trường hợp cần lập đợt hỗ trợ.'}
            </p>
          </div>
        )}
      </div>

      <Pagination pagination={sessions} label="lần hỗ trợ" />

      {/* Form Ghi nhận kết quả hỗ trợ cho từng SV */}
      {selected && (
        <form
          className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            return run(() =>
              apiClient.put(
                `/khoa/lan-ho-tro/${selected.item.maLan}/sinh-vien/${encodeURIComponent(
                  selected.student.maSV
                )}`,
                {
                  ketQua: selected.ketQua,
                  ghiChu: selected.ghiChu.trim(),
                  phienBan: selected.item.phienBan,
                },
                { params: { maDot } }
              )
            )
          }}
        >
          <h4 className="text-sm font-bold text-slate-900">
            Ghi kết quả hỗ trợ — {selected.student.maSV} ({selected.student.hoTen})
          </h4>
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Kết quả sau hỗ trợ
              <select
                aria-label="Kết quả hỗ trợ"
                disabled={!writable}
                value={selected.ketQua}
                onChange={(e) =>
                  setSelected({ ...selected, ketQua: e.target.value })
                }
                className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="CanHoTro">Vẫn cần hỗ trợ</option>
                <option value="DaCoNoi">Đã có công ty được Khoa xác nhận</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Căn cứ / Ghi chú làm việc với doanh nghiệp
              <textarea
                aria-label="Căn cứ kết quả hỗ trợ"
                required
                rows={3}
                maxLength={1000}
                disabled={!writable}
                value={selected.ghiChu}
                onChange={(e) =>
                  setSelected({ ...selected, ghiChu: e.target.value })
                }
                className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!writable}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
            >
              Lưu kết quả hỗ trợ
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setSelected(null)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
            >
              Đóng kết quả
            </button>
          </div>
        </form>
      )}

      {placement && (
        <BoTriBanDauPanel
          key={`${maDot}/${placement.maSV}/${placement.maLanHoTro}`}
          maDot={maDot}
          student={placement}
          onClose={() => setPlacement(null)}
          onChanged={async () => {
            if (!alive.current) return
            await load()
            if (alive.current) await onChanged?.()
          }}
        />
      )}
    </section>
  )
}

function SupportMembers({ item, writable, onResult, onPlace }) {
  const pages = usePagination(item.sinhViens, `${item.maLan}/${item.phienBan}`)
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-2.5">MSSV / Họ tên</th>
              <th className="p-2.5">Kết quả đợt này</th>
              <th className="p-2.5">Tình trạng hiện tại</th>
              <th className="p-2.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pages.items.map((s) => (
              <tr key={s.maSV} className="hover:bg-slate-50">
                <td className="p-2.5">
                  <span className="font-mono font-semibold text-slate-900">
                    {s.maSV}
                  </span>{' '}
                  — <span className="font-medium text-slate-800">{s.hoTen}</span>
                  <p className="text-[11px] text-slate-500 font-mono">{s.lop}</p>
                </td>
                <td className="p-2.5">
                  <span className="font-medium text-slate-800">
                    {outcome[s.ketQua]}
                  </span>
                  {s.ghiChu && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.ghiChu}</p>
                  )}
                  {s.congTy && (
                    <p className="text-[11px] font-medium text-emerald-700">
                      {s.congTy}
                    </p>
                  )}
                </td>
                <td className="p-2.5 text-slate-600">
                  {s.hienTai || 'Cần rà danh sách đợt'}
                </td>
                <td className="p-2.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={!writable}
                      onClick={() => onResult(s)}
                      className="px-2.5 py-1 text-xs font-medium rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                    >
                      Ghi kết quả
                    </button>
                    <button
                      type="button"
                      disabled={!writable || !s.coTheBoTri || s.ketQua === 'DaCoNoi'}
                      onClick={() => onPlace(s)}
                      className="px-2.5 py-1 text-xs font-medium rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 cursor-pointer"
                    >
                      Bố trí công ty
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pages} label="SV trong lần hỗ trợ" />
    </>
  )
}
