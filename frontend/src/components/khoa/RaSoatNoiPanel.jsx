import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../common/Pagination'

function getReviewActionLink(student) {
  const statusText = String(student?.tinhTrang || '').toLowerCase()
  const code = encodeURIComponent(student?.maSV || '')
  if (statusText.includes('tự tìm') || statusText.includes('công nhận')) {
    return {
      to: `/khoa/dang-ky?loai=tu-tim&maSV=${code}`,
      label: 'Duyệt nơi tự tìm →',
    }
  }
  if (statusText.includes('chốt') || statusText.includes('xác nhận')) {
    return {
      to: `/khoa/dang-ky?loai=chot-phan-bo&maSV=${code}`,
      label: 'Chốt phân bổ →',
    }
  }
  return {
    to: `/khoa/dang-ky?maSV=${code}`,
    label: 'Xử lý hồ sơ đăng ký →',
  }
}

export default function RaSoatNoiPanel({ maDot, onChanged, onNavigateTab }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(null)
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [verified, setVerified] = useState(false)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const alive = useRef(true)
  const sequence = useRef(0)

  const load = useCallback(async () => {
    const request = ++sequence.current
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get('/khoa/ra-soat-noi', {
        params: { maDot },
      })
      if (!alive.current || request !== sequence.current) return
      if (
        response.data?.maDot !== maDot ||
        !Array.isArray(response.data.sinhViens)
      )
        throw new Error('Dữ liệu rà soát không đúng đợt.')
      setData(response.data)
    } catch (e) {
      if (alive.current && request === sequence.current) {
        setData(null)
        setError(
          e.response?.data?.message || e.message || 'Không tải được rà soát.'
        )
      }
    } finally {
      if (alive.current && request === sequence.current) setLoading(false)
    }
  }, [maDot])

  useEffect(() => {
    alive.current = true
    setData(null)
    setSelected(null)
    setReason('')
    setEvidence('')
    setVerified(false)
    setMessage('')
    load()
    const requests = sequence
    return () => {
      alive.current = false
      requests.current++
    }
  }, [load])

  const rows = (data?.sinhViens || []).filter(
    (s) =>
      (!filter || s.nhom === filter) &&
      `${s.maSV} ${s.hoTen} ${s.lop || ''}`
        .toLocaleLowerCase('vi')
        .includes(search.toLocaleLowerCase('vi'))
  )
  const pages = usePagination(rows, `${maDot}/${filter}/${search}`)
  const editable = data?.coTheSua && !busy && !loading

  const open = (student) => {
    setSelected(student)
    setReason('')
    setEvidence('')
    setVerified(false)
    setMessage('')
  }

  const save = async (e) => {
    e.preventDefault()
    if (
      !editable ||
      !selected ||
      !reason.trim() ||
      !evidence.trim() ||
      (!selected.coTheThuHoi && !verified)
    )
      return
    if (
      !window.confirm(
        selected.coTheThuHoi
          ? 'Thu hồi xác nhận chưa có nơi? Giữ lịch sử và đưa SV về rà soát.'
          : 'Xác nhận SV thực sự chưa có nơi sau khi rà hồ sơ/hỗ trợ? Ghi Không hoàn tất, không gán điểm 0.'
      )
    )
      return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const result = await apiClient.put(
        `/khoa/ra-soat-noi/${encodeURIComponent(selected.maSV)}`,
        {
          phienBan: data.phienBan,
          lyDo: reason.trim(),
          canCu: evidence.trim(),
          daXacMinh: verified,
          thuHoi: !!selected.coTheThuHoi,
        },
        { params: { maDot } }
      )
      if (!alive.current) return
      setMessage(result.data?.message || 'Đã lưu kết quả rà soát.')
      setSelected(null)
      await load()
      if (alive.current) await onChanged?.()
    } catch (e) {
      if (alive.current)
        setError(
          e.response?.data?.message ||
            'Không lưu được. Nội dung nhập vẫn được giữ; tải lại nếu phiên đã đổi.'
        )
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  return (
    <section
      className="bg-white rounded-xl border border-slate-200 p-5 space-y-5"
      aria-label="Rà soát trước chốt danh sách"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">
            Rà soát nơi thực tập trước chốt danh sách
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Link
              to="/khoa/dang-ky"
              className="text-blue-700 hover:underline font-medium"
            >
              Xét duyệt nguyện vọng & Chốt phân bổ →
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to="/khoa/dang-ky?loai=tu-tim"
              className="text-blue-700 hover:underline font-medium"
            >
              Công nhận nơi thực tập tự tìm →
            </Link>
            {onNavigateTab && (
              <>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onNavigateTab('cong-bo-chot')}
                  className="text-blue-700 hover:underline font-medium cursor-pointer"
                >
                  Công bố & Chốt danh sách →
                </button>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={busy || loading}
          onClick={load}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 rounded-lg shrink-0 cursor-pointer"
        >
          Tải lại rà soát
        </button>
      </div>

      {loading && (
        <p role="status" className="text-xs text-slate-500 py-3">
          Đang tải rà soát…
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
      {message && (
        <p
          role="status"
          className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800"
        >
          {message}
        </p>
      )}

      {data && (
        <>
          {/* 5 ô chỉ số rà soát rõ ràng */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="block text-[11px] text-slate-500">
                Tổng SV tham gia
              </span>
              <strong className="text-lg font-bold font-mono text-slate-900">
                {data.tongSV}
              </strong>
              <span className="sr-only">Tham gia: {data.tongSV}</span>
            </div>

            <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40">
              <span className="block text-[11px] text-emerald-700">
                Đã có nơi thực tập
              </span>
              <strong className="text-lg font-bold font-mono text-emerald-800">
                {data.daCoNoi}
              </strong>
              <span className="sr-only">Đã có nơi: {data.daCoNoi}</span>
            </div>

            <div className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/40">
              <span className="block text-[11px] text-amber-800">
                Chờ xử lý/xác minh
              </span>
              <strong className="text-lg font-bold font-mono text-amber-800">
                {data.choXuLy}
              </strong>
              <span className="sr-only">Chờ xử lý/xác minh: {data.choXuLy}</span>
            </div>

            <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50/40">
              <span className="block text-[11px] text-rose-700">
                Chưa có nơi cần hỗ trợ/rà
              </span>
              <strong className="text-lg font-bold font-mono text-rose-800">
                {data.chuaCoNoi}
              </strong>
              <span className="sr-only">
                Chưa có nơi cần hỗ trợ/rà: {data.chuaCoNoi}
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="block text-[11px] text-slate-600">
                Đã ghi Không hoàn tất
              </span>
              <strong className="text-lg font-bold font-mono text-slate-800">
                {data.daGhiNhanKhongHoanTat}
              </strong>
              <span className="sr-only">
                Đã ghi Không hoàn tất: {data.daGhiNhanKhongHoanTat}
              </span>
            </div>
          </div>

          {/* Thông báo kết luận điều kiện rà soát */}
          <div
            className={`p-3.5 rounded-lg border text-xs font-medium flex flex-wrap items-center justify-between gap-2 ${
              !data.coTheSua
                ? 'bg-slate-50 border-slate-200 text-slate-700'
                : data.daRaSoatHet
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <span>
              {!data.coTheSua
                ? 'Đã khóa rà soát: danh sách đã chốt, đến ngày bắt đầu hoặc đợt không cho ghi.'
                : data.daRaSoatHet
                ? 'Đã xử lý hết các trường hợp về nơi thực tập. Khoa có thể chuyển sang Bước 4 để công bố hoặc chốt danh sách chính thức.'
                : 'Còn trường hợp chờ xử lý hoặc chưa có nơi thực tập; cần giải quyết xong trước khi chốt danh sách chính thức.'}
            </span>
            {data.daRaSoatHet && onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('cong-bo-chot')}
                className="px-3 py-1 rounded bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 cursor-pointer"
              >
                Sang Bước 4: Công bố & Chốt →
              </button>
            )}
          </div>

          {/* Bộ lọc tìm kiếm & nhóm rà nơi */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              aria-label="Tìm SV rà nơi"
              placeholder="Tìm theo MSSV, họ tên hoặc lớp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[220px] px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-hidden focus:bg-white focus:border-blue-600"
            />
            <select
              aria-label="Nhóm rà nơi"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-hidden"
            >
              <option value="">Tất cả nhóm ({data.sinhViens.length})</option>
              <option value="DaCoNoi">Đã có nơi ({data.daCoNoi})</option>
              <option value="ChoXuLy">
                Chờ xử lý/xác minh ({data.choXuLy})
              </option>
              <option value="ChuaCoNoi">
                Chưa có nơi cần hỗ trợ/rà ({data.chuaCoNoi})
              </option>
              <option value="DaGhiNhan">
                Đã ghi Không hoàn tất ({data.daGhiNhanKhongHoanTat})
              </option>
            </select>
          </div>

          {/* Bảng danh sách rà soát */}
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Sinh viên / Lớp</th>
                  <th className="p-3">Phân nhóm & Tình trạng</th>
                  <th className="p-3">Chi tiết / Căn cứ xác minh</th>
                  <th className="p-3 text-right">Hướng xử lý / Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pages.items.map((s) => {
                  const actionLink =
                    s.nhom === 'ChoXuLy' ? getReviewActionLink(s) : null
                  return (
                    <tr key={s.maSV} className="hover:bg-slate-50">
                      <td className="p-3">
                        <span className="font-mono font-semibold text-slate-900">
                          {s.maSV}
                        </span>{' '}
                        —{' '}
                        <span className="font-semibold text-slate-900">
                          {s.hoTen}
                        </span>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {s.lop || '—'}
                        </p>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                            s.nhom === 'DaCoNoi'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.nhom === 'ChoXuLy'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : s.nhom === 'ChuaCoNoi'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.tinhTrang}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 whitespace-pre-wrap max-w-md">
                        {s.lyDo || '—'}
                        {s.canCu && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Căn cứ: {s.canCu}
                          </p>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {actionLink && (
                            <Link
                              to={actionLink.to}
                              className="px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-medium"
                            >
                              {actionLink.label}
                            </Link>
                          )}
                          {s.nhom === 'ChuaCoNoi' && onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('ho-tro')}
                              className="px-2.5 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium cursor-pointer"
                            >
                              Đưa vào đợt hỗ trợ
                            </button>
                          )}
                          {(s.coTheXacNhan || s.coTheThuHoi) && (
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => open(s)}
                              className={`px-2.5 py-1 rounded text-xs font-medium border disabled:opacity-40 cursor-pointer ${
                                s.coTheThuHoi
                                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              }`}
                            >
                              {s.coTheThuHoi
                                ? 'Thu hồi xác nhận'
                                : 'Ghi nhận chưa có nơi'}
                            </button>
                          )}
                          {s.nhom === 'DaCoNoi' && (
                            <span className="text-[11px] text-emerald-700 font-medium">
                              Đủ điều kiện
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500">
                      Không có sinh viên trong nhóm rà soát đang chọn.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination pagination={pages} label="SV rà nơi" />

          {/* Form xác nhận Không hoàn tất vì chưa có nơi / Thu hồi */}
          {selected && editable && (
            <form
              onSubmit={save}
              className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3"
            >
              <h4 className="text-sm font-bold text-slate-900">
                {selected.coTheThuHoi
                  ? 'Thu hồi xác nhận chưa có nơi'
                  : 'Xác nhận Không hoàn tất đợt do chưa có nơi thực tập'}{' '}
                — {selected.maSV} ({selected.hoTen})
              </h4>

              <label className="block text-xs font-semibold text-slate-700">
                Lý do ghi nhận
                <textarea
                  aria-label="Lý do rà chưa có nơi"
                  maxLength={1000}
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do cụ thể (ví dụ: Đã qua 2 đợt Khoa hỗ trợ nhưng sinh viên không tham gia phỏng vấn)..."
                  className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </label>

              <label className="block text-xs font-semibold text-slate-700">
                Căn cứ rà hồ sơ / biên bản các lần hỗ trợ
                <textarea
                  aria-label="Căn cứ rà chưa có nơi"
                  maxLength={1000}
                  rows={2}
                  required
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Nhập căn cứ xác minh (biên bản đợt hỗ trợ, email xác nhận của sinh viên)..."
                  className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </label>

              {!selected.coTheThuHoi && (
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    aria-label="Đã xác minh chưa có nơi"
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-700"
                  />
                  <span>
                    Đã xác minh sinh viên thực sự chưa có nơi thực tập và không còn hồ sơ chờ duyệt.
                  </span>
                </label>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={
                    !reason.trim() ||
                    !evidence.trim() ||
                    (!selected.coTheThuHoi && !verified)
                  }
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  Lưu rà soát
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  )
}
