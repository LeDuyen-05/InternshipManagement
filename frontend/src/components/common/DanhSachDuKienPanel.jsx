import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from './Pagination'
import { interviewFormTimestamp, formatInterviewDate, formatInterviewTime } from '../../utils/interviewTime'
import { xuatBangHuitExcel } from '../../utils/exportHuitExcel'

const feedbackLabel = (item) =>
  !item
    ? 'Chưa phản hồi'
    : item.thongTinDung
    ? 'Xác nhận đúng'
    : item.xuLy
    ? item.xuLy.chapThuan
      ? 'Đã chấp thuận chỉnh sửa'
      : 'Đã từ chối yêu cầu'
    : 'Yêu cầu chỉnh sửa — chờ Khoa xử lý'

const statusLabel = (value) =>
  ({
    ChuaCongBo: 'Chưa công bố',
    DuKien: 'Dự kiến — đang đối chiếu phản hồi SV',
    ChinhThuc: 'Đã chốt danh sách chính thức',
  }[value] || 'Chưa công bố')

export default function DanhSachDuKienPanel({
  maDot,
  faculty = false,
  onChanged,
  onNavigateTab,
}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [choice, setChoice] = useState('')
  const [comment, setComment] = useState('')
  const [company, setCompany] = useState({
    tenCongTy: '',
    diaChi: '',
    maSoThue: '',
  })
  const [processing, setProcessing] = useState(null)
  const [finalReason, setFinalReason] = useState('')
  const [reviewed, setReviewed] = useState(false)
  const alive = useRef(true)
  const requests = useRef(0)
  const endpoint = faculty
    ? '/khoa/danh-sach-du-kien'
    : '/sinh-vien/danh-sach-du-kien'

  const load = useCallback(async () => {
    const version = ++requests.current
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.get(endpoint, { params: { maDot } })
      if (!alive.current || version !== requests.current) return
      if (response.data?.maDot !== maDot)
        throw new Error(
          'Thông tin công bố không đúng đợt. Tải lại để kiểm tra.'
        )
      setData(response.data)
    } catch (e) {
      if (alive.current && version === requests.current) {
        setData(null)
        setError(
          e.response?.data?.message ||
            e.message ||
            'Không tải được thông báo danh sách.'
        )
      }
    } finally {
      if (alive.current && version === requests.current) setLoading(false)
    }
  }, [maDot, endpoint])

  useEffect(() => {
    alive.current = true
    setData(null)
    setChoice('')
    setComment('')
    setNotice('')
    setCompany({ tenCongTy: '', diaChi: '', maSoThue: '' })
    setProcessing(null)
    setFinalReason('')
    setReviewed(false)
    load()
    const versionRef = requests
    return () => {
      alive.current = false
      versionRef.current++
    }
  }, [load])

  const published = data?.banCongBo

  const submit = async (action, successMessage) => {
    if (busy || loading) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      if (!alive.current) return
      setNotice(
        successMessage ||
          (faculty
            ? 'Đã công bố danh sách dự kiến và thông báo đến SV.'
            : 'Đã gửi phản hồi cho Khoa.')
      )
      setChoice('')
      setComment('')
      setProcessing(null)
      setFinalReason('')
      setReviewed(false)
      await load()
      if (alive.current) await onChanged?.()
    } catch (e) {
      if (alive.current)
        setError(
          e.response?.data?.message ||
            'Không lưu được. Nội dung nhập vẫn được giữ; tải lại nếu phiên bản đã thay đổi.'
        )
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const rows = published?.sinhViens || []
  const filtered = rows.filter(
    (row) =>
      (!filter ||
        (filter === 'sai'
          ? (row.lichSu || []).some((f) => !f.thongTinDung && !f.xuLy) ||
            (row.phanHoi && !row.phanHoi.thongTinDung && !row.phanHoi.xuLy)
          : !row.phanHoi)) &&
      `${row.thongTin.maSV} ${row.thongTin.hoTen} ${row.thongTin.lop || ''}`
        .toLocaleLowerCase('vi')
        .includes(search.toLocaleLowerCase('vi'))
  )
  const pages = usePagination(filtered, `${maDot}/${search}/${filter}`)
  const preview = usePagination(data?.xemTruoc || [], maDot)
  const official = data?.trangThai === 'ChinhThuc'

  const exportOfficial = async () => {
    if (!data?.banChinhThuc || busy || loading) return
    setBusy(true)
    setError('')
    try {
      if (!alive.current) return
      await xuatBangHuitExcel({
        reportType: 'internal',
        fileName: `DanhSach_ThucTap_ChinhThuc_${maDot.replace(
          /[^\w-]/g,
          '_'
        )}.xlsx`,
        sheetName: 'DanhSachChinhThuc',
        title: 'DANH SÁCH SINH VIÊN THỰC TẬP CHÍNH THỨC',
        subTitle: `Đợt ${maDot} — Chốt ${formatInterviewDate(
          data.banChinhThuc.ngayChot
        )} ${formatInterviewTime(
          data.banChinhThuc.ngayChot
        )} (VN) — Bản đã chốt`,
        columns: [
          { header: 'MSSV', key: 'maSV', width: 16 },
          { header: 'Họ và tên', key: 'hoTen', width: 26 },
          { header: 'Lớp', key: 'lop', width: 14 },
          { header: 'Tên công ty', key: 'tenCongTy', width: 36 },
          { header: 'Địa chỉ công ty', key: 'diaChiCongTy', width: 50 },
          { header: 'Mã số thuế', key: 'maSoThue', width: 20 },
          { header: 'Vị trí', key: 'viTri', width: 26 },
        ],
        rows: rows.map((r) => r.thongTin).filter((r) => r.coNoiThucTap),
      })
    } catch (e) {
      if (alive.current)
        setError(e.message || 'Không xuất được danh sách chính thức.')
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  if (!maDot) return null
  if (!faculty && data && !published && !official && !loading && !error)
    return null

  return (
    <section
      className="bg-white rounded-xl border border-slate-200 p-5 space-y-5"
      aria-label={
        faculty
          ? 'Công bố danh sách thực tập dự kiến'
          : 'Thông báo danh sách thực tập dự kiến'
      }
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 m-0">
              {official
                ? 'Danh sách thực tập chính thức'
                : faculty
                ? 'Công bố dự kiến & Chốt danh sách thực tập'
                : 'Kiểm tra thông tin nơi thực tập dự kiến'}
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                official
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : published
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {statusLabel(data?.trangThai)} — Đợt {maDot}
            </span>
          </div>

          {faculty && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {onNavigateTab && (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('ra-soat')}
                    className="text-blue-700 hover:underline font-medium cursor-pointer"
                  >
                    ← Rà soát trước chốt
                  </button>
                  <span className="text-slate-300">|</span>
                </>
              )}
              <Link
                to="/khoa/phan-cong"
                className="text-blue-700 hover:underline font-medium"
              >
                Phân công giảng viên hướng dẫn →
              </Link>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={busy || loading}
          onClick={load}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
        >
          Tải lại thông tin công bố
        </button>
      </div>

      {loading && (
        <p role="status" className="text-xs text-slate-500 py-3">
          Đang tải thông tin công bố…
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

      {/* GIAI ĐOẠN 1: CHƯA CÔNG BỐ DỰ KIẾN */}
      {data &&
        !published &&
        (faculty ? (
          <div className="space-y-4">
            {data.lyDoChuaCongBo && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                <span>
                  <strong>Điều kiện chưa đạt:</strong> {data.lyDoChuaCongBo}
                </span>
                <div className="flex items-center gap-2">
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('ra-soat')}
                      className="px-2.5 py-1 rounded bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 cursor-pointer"
                    >
                      Kiểm tra tại Bước 3 (Rà soát)
                    </button>
                  )}
                  <Link
                    to="/khoa/dang-ky"
                    className="px-2.5 py-1 rounded border border-amber-300 bg-white text-amber-900 hover:bg-amber-100 text-xs font-semibold"
                  >
                    Xét duyệt hồ sơ chờ
                  </Link>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Bản xem trước danh sách thực tập của đợt ({data.xemTruoc?.length ?? 0} sinh viên)
              </h4>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-28">MSSV</th>
                      <th className="p-2.5">Họ tên / Lớp</th>
                      <th className="p-2.5">Đơn vị tiếp nhận đã xác nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.items.map((s) => (
                      <tr key={s.maSV} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-semibold text-slate-900">
                          {s.maSV}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800">
                          {s.hoTen}{' '}
                          <span className="text-slate-400 font-mono">
                            — {s.lop}
                          </span>
                        </td>
                        <td className="p-2.5">
                          {s.coPhanBoChinhThuc ? (
                            <span className="font-medium text-emerald-700">
                              {s.tenCongTy}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Chưa có nơi trong danh sách
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!(data.xemTruoc || []).length && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-6 text-center text-slate-500"
                        >
                          Chưa có dữ liệu sinh viên trong đợt.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={preview} label="SV xem trước" />
            </div>

            <form
              className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const raw = String(formData.get('hanPhanHoi') || '').split('T')
                const deadline = interviewFormTimestamp(raw[0], raw[1])
                if (!deadline) {
                  setError('Nhập hạn phản hồi hợp lệ theo giờ Việt Nam.')
                  return
                }
                if (
                  !data.coTheCongBo ||
                  !window.confirm(
                    'Công bố danh sách dự kiến để SV kiểm tra? Các luồng bố trí thông thường sẽ dừng thay đổi danh sách.'
                  )
                )
                  return
                return submit(() =>
                  apiClient.post(
                    `${endpoint}/cong-bo`,
                    {
                      tieuDe: String(formData.get('tieuDe') || '').trim(),
                      noiDung: String(formData.get('noiDung') || '').trim(),
                      hanPhanHoi: deadline,
                    },
                    { params: { maDot } }
                  )
                )
              }}
            >
              <h4 className="text-sm font-bold text-slate-900">
                1. Phát hành thông báo công bố danh sách dự kiến
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-xs font-semibold text-slate-700">
                  Tiêu đề thông báo
                  <input
                    name="tieuDe"
                    aria-label="Tiêu đề công bố dự kiến"
                    required
                    maxLength={200}
                    defaultValue="Kiểm tra thông tin thực tập dự kiến"
                    disabled={!data.coTheCongBo || busy}
                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 disabled:bg-slate-100"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-700">
                  Hạn sinh viên gửi phản hồi (Giờ Việt Nam)
                  <input
                    type="datetime-local"
                    name="hanPhanHoi"
                    aria-label="Hạn phản hồi danh sách"
                    required
                    disabled={!data.coTheCongBo || busy}
                    className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 disabled:bg-slate-100"
                  />
                </label>
              </div>

              <label className="block text-xs font-semibold text-slate-700">
                Nội dung hướng dẫn sinh viên kiểm tra
                <textarea
                  name="noiDung"
                  aria-label="Nội dung công bố dự kiến"
                  required
                  rows={3}
                  maxLength={2000}
                  defaultValue="SV kiểm tra thông tin của mình. Nếu sai hoặc thiếu nơi thực tập, ghi rõ nội dung để Khoa đối chiếu trước khi chốt danh sách chính thức."
                  disabled={!data.coTheCongBo || busy}
                  className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 disabled:bg-slate-100"
                />
              </label>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-slate-500">
                  Hạn phản hồi phải trước hoặc bằng thời điểm bắt đầu đợt thực tập.
                </p>
                <button
                  type="submit"
                  disabled={!data.coTheCongBo || busy || loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  Công bố danh sách dự kiến
                </button>
              </div>
            </form>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Khoa chưa công bố danh sách thực tập dự kiến cho đợt này.
          </p>
        ))}

      {/* GIAI ĐOẠN 2: ĐÃ CÔNG BỐ DỰ KIẾN HOẶC ĐÃ CHỐT CHÍNH THỨC */}
      {published && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                {published.tieuDe}
              </h4>
              <span className="text-xs font-medium text-slate-600">
                Hạn phản hồi: {formatInterviewDate(published.hanPhanHoi)}{' '}
                {formatInterviewTime(published.hanPhanHoi)} (VN) · Phiên bản{' '}
                {published.phienBan}
              </span>
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-wrap">
              {published.noiDung}
            </p>
          </div>

          {faculty ? (
            <>
              {/* Thống kê phản hồi của SV */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-slate-500 block">Tổng SV trong bản công bố</span>
                  <strong className="text-base font-bold font-mono text-slate-900">
                    {rows.length}
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40">
                  <span className="text-emerald-700 block">Đã xác nhận đúng</span>
                  <strong className="text-base font-bold font-mono text-emerald-800">
                    {rows.filter((r) => r.phanHoi?.thongTinDung === true).length}
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/40">
                  <span className="text-rose-700 block">Gửi yêu cầu chỉnh sửa</span>
                  <strong className="text-base font-bold font-mono text-rose-800">
                    {rows.filter((r) => r.phanHoi?.thongTinDung === false).length}
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white">
                  <span className="text-slate-500 block">Chưa gửi phản hồi</span>
                  <strong className="text-base font-bold font-mono text-slate-800">
                    {rows.filter((r) => !r.phanHoi).length}
                  </strong>
                </div>
              </div>

              {/* Thanh lọc bảng phản hồi */}
              <div className="flex flex-wrap items-center gap-3">
                <input
                  aria-label="Tìm SV phản hồi"
                  placeholder="Tìm theo MSSV, họ tên, lớp..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-[220px] px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
                />
                <select
                  aria-label="Lọc phản hồi danh sách"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                >
                  <option value="">Tất cả sinh viên</option>
                  <option value="sai">Yêu cầu chờ xử lý</option>
                  <option value="chua">Chưa phản hồi</option>
                </select>
              </div>

              {/* Bảng phản hồi chi tiết */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Sinh viên / Lớp</th>
                      <th className="p-3">Thông tin nơi thực tập hiện tại</th>
                      <th className="p-3">Phản hồi / Yêu cầu đính chính</th>
                      <th className="p-3">Lịch sử</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pages.items.map((row) => (
                      <tr key={row.thongTin.maSV} className="hover:bg-slate-50">
                        <td className="p-3 align-top">
                          <span className="font-mono font-semibold text-slate-900">
                            {row.thongTin.maSV}
                          </span>{' '}
                          —{' '}
                          <span className="font-semibold text-slate-900">
                            {row.thongTin.hoTen}
                          </span>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {row.thongTin.lop}
                          </p>
                        </td>
                        <td className="p-3 align-top">
                          <PublishedInfo info={row.thongTin} />
                        </td>
                        <td className="p-3 align-top space-y-1.5">
                          <span className="font-semibold text-slate-800 block">
                            {feedbackLabel(row.phanHoi)}
                          </span>
                          <RequestDetails feedback={row.phanHoi} />
                          {(row.lichSu || [])
                            .filter((f) => !f.thongTinDung && !f.xuLy)
                            .map((f) => (
                              <button
                                key={f.maPhanHoi}
                                type="button"
                                disabled={!data.coTheXuLy || busy || loading}
                                onClick={() =>
                                  setProcessing({
                                    feedback: f,
                                    student: row.thongTin,
                                    decision: '',
                                    reason: '',
                                  })
                                }
                                className="px-2.5 py-1 rounded bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-40 cursor-pointer"
                              >
                                Xử lý yêu cầu {row.thongTin.maSV}
                              </button>
                            ))}
                        </td>
                        <td className="p-3 align-top">
                          <details className="text-xs text-slate-600">
                            <summary className="cursor-pointer font-medium">
                              {row.lichSu.length} lần gửi
                            </summary>
                            <div className="mt-1.5 space-y-2 pl-2 border-l-2 border-slate-200">
                              {row.lichSu.map((f) => (
                                <div key={f.maPhanHoi}>
                                  <p className="font-medium text-slate-700">
                                    {formatInterviewDate(f.ngayGui)}{' '}
                                    {formatInterviewTime(f.ngayGui)} —{' '}
                                    {feedbackLabel(f)}
                                  </p>
                                  <RequestDetails feedback={f} />
                                </div>
                              ))}
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={pages} label="SV phản hồi" />

              {/* Form xử lý yêu cầu đính chính thông tin công ty */}
              {processing && (
                <form
                  className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (
                      !data.coTheXuLy ||
                      !processing.decision ||
                      !processing.reason.trim()
                    )
                      return
                    if (
                      !window.confirm(
                        'Xác nhận xử lý yêu cầu? Khi chấp thuận, thông tin công ty mới SV gửi sẽ được cập nhật vào hồ sơ thực tập này.'
                      )
                    )
                      return
                    return submit(
                      () =>
                        apiClient.post(
                          `${endpoint}/yeu-cau/${processing.feedback.maPhanHoi}/xu-ly`,
                          {
                            maCongBo: published.maCongBo,
                            chapThuan: processing.decision === 'chap-thuan',
                            lyDo: processing.reason.trim(),
                            phienBanRaSoat: data.phienBanRaSoat,
                          },
                          { params: { maDot } }
                        ),
                      'Đã xử lý yêu cầu chỉnh sửa và lưu lịch sử.'
                    )
                  }}
                >
                  <h4 className="text-sm font-bold text-slate-900">
                    Xử lý yêu cầu đính chính — {processing.student.maSV} /{' '}
                    {processing.student.hoTen}
                  </h4>
                  <RequestDetails feedback={processing.feedback} />

                  <label className="block text-xs font-semibold text-slate-700">
                    Quyết định của Khoa
                    <select
                      aria-label="Quyết định xử lý yêu cầu"
                      required
                      disabled={busy}
                      value={processing.decision}
                      onChange={(e) =>
                        setProcessing({
                          ...processing,
                          decision: e.target.value,
                        })
                      }
                      className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    >
                      <option value="">Chọn quyết định</option>
                      <option
                        value="chap-thuan"
                        disabled={
                          !processing.feedback.thongTinMoi ||
                          !processing.student.coNoiThucTap
                        }
                      >
                        Chấp thuận thông tin mới SV gửi
                      </option>
                      <option value="tu-choi">
                        Từ chối, giữ thông tin hiện tại
                      </option>
                    </select>
                  </label>

                  {!processing.feedback.thongTinMoi && (
                    <p className="text-xs text-amber-800">
                      Yêu cầu này chưa kèm thông tin công ty mới; Khoa ghi rõ lý do hướng dẫn để sinh viên kiểm tra lại.
                    </p>
                  )}

                  <label className="block text-xs font-semibold text-slate-700">
                    Lý do / Kết quả xử lý
                    <textarea
                      aria-label="Lý do Khoa xử lý yêu cầu"
                      required
                      rows={2}
                      maxLength={2000}
                      disabled={busy}
                      value={processing.reason}
                      onChange={(e) =>
                        setProcessing({ ...processing, reason: e.target.value })
                      }
                      className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={
                        !data.coTheXuLy ||
                        busy ||
                        !processing.decision ||
                        !processing.reason.trim()
                      }
                      className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg cursor-pointer"
                    >
                      Lưu kết quả xử lý
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setProcessing(null)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Đóng xử lý
                    </button>
                  </div>
                </form>
              )}

              {/* Form Chốt danh sách thực tập chính thức */}
              {!official && (
                <form
                  className="p-4 rounded-xl border border-slate-300 bg-slate-50 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!data.coTheChot || !reviewed || !finalReason.trim())
                      return
                    if (
                      !window.confirm(
                        'Công bố danh sách chính thức? Sau công bố, danh sách sẽ được khóa chỉnh sửa.'
                      )
                    )
                      return
                    return submit(
                      () =>
                        apiClient.post(
                          `${endpoint}/chot-chinh-thuc`,
                          {
                            maCongBo: published.maCongBo,
                            phienBanRaSoat: data.phienBanRaSoat,
                            phienBanRaSoatNoi: data.phienBanRaSoatNoi || 0,
                            lyDo: finalReason.trim(),
                            daRaSoat: reviewed,
                          },
                          { params: { maDot } }
                        ),
                      'Đã chốt và công bố danh sách chính thức. Danh sách đã khóa chỉnh sửa.'
                    )
                  }}
                >
                  <h4 className="text-sm font-bold text-slate-900">
                    2. Chốt danh sách thực tập chính thức
                  </h4>
                  <p className="text-xs text-slate-600">
                    Thực hiện sau khi đã xử lý hết yêu cầu đính chính của sinh viên và hoàn tất Bước 3 (Rà soát trước chốt). Sau khi chốt, danh sách nơi thực tập được khóa bất biến để chuyển sang phân công giảng viên hướng dẫn.
                  </p>

                  {data.lyDoChuaChot && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                      <span>{data.lyDoChuaChot}</span>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('ra-soat')}
                          className="px-2.5 py-1 rounded bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 cursor-pointer"
                        >
                          Mở Bước 3: Rà soát trước chốt
                        </button>
                      )}
                    </div>
                  )}

                  <label className="block text-xs font-semibold text-slate-700">
                    Ghi nhận rà soát của Khoa
                    <textarea
                      aria-label="Ghi nhận chốt danh sách"
                      required
                      rows={2}
                      maxLength={2000}
                      disabled={busy}
                      value={finalReason}
                      onChange={(e) => setFinalReason(e.target.value)}
                      placeholder="Nhập ghi nhận rà soát trước khi khóa danh sách chính thức..."
                      className="mt-1 w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      aria-label="Đã rà soát danh sách chính thức"
                      checked={reviewed}
                      disabled={busy}
                      onChange={(e) => setReviewed(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-700"
                    />
                    <span>
                      Tôi đã rà soát thông tin, kết quả xử lý phản hồi và danh sách sinh viên có nơi thực tập.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={
                      !data.coTheChot ||
                      busy ||
                      loading ||
                      !reviewed ||
                      !finalReason.trim()
                    }
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    Chốt và công bố danh sách chính thức
                  </button>
                </form>
              )}

              {/* Khi đã chốt chính thức */}
              {official && data.banChinhThuc && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
                  <div>
                    <p className="font-bold">
                      Danh sách chính thức đã chốt lúc{' '}
                      {formatInterviewDate(data.banChinhThuc.ngayChot)}{' '}
                      {formatInterviewTime(data.banChinhThuc.ngayChot)} (VN)
                    </p>
                    <p className="mt-0.5">
                      Số sinh viên có nơi thực tập chính thức:{' '}
                      <strong>
                        {rows.filter((r) => r.thongTin.coNoiThucTap).length}
                      </strong>{' '}
                      sinh viên.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy || loading}
                      onClick={exportOfficial}
                      className="px-3.5 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
                    >
                      Xuất danh sách chính thức (.xlsx)
                    </button>
                    <Link
                      to="/khoa/phan-cong"
                      className="px-3.5 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-semibold hover:bg-emerald-100"
                    >
                      Phân công GVHD →
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Giao diện phía Sinh viên */
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1">
                <p className="font-bold text-slate-900">
                  {published.thongTin.maSV} — {published.thongTin.hoTen} —{' '}
                  {published.thongTin.lop}
                </p>
                <PublishedInfo info={published.thongTin} />
              </div>

              {official && (
                <p className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                  Danh sách chính thức đã chốt.{' '}
                  {published.thongTin.coNoiThucTap
                    ? 'Thông tin bên trên là bản chính thức của bạn.'
                    : published.thongTin.tinhTrang ||
                      'Bạn chưa có nơi trong danh sách thực tập chính thức; liên hệ Khoa để được giải thích kết quả.'}
                </p>
              )}

              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                <p className="font-semibold text-slate-800">
                  Phản hồi gần nhất: {feedbackLabel(published.phanHoi)}
                </p>
                <RequestDetails feedback={published.phanHoi} />
              </div>

              {published.coThePhanHoi ? (
                <form
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!choice || (choice === 'sai' && !comment.trim())) return
                    return submit(() =>
                      apiClient.post(
                        `${endpoint}/phan-hoi`,
                        {
                          maCongBo: published.maCongBo,
                          thongTinDung: choice === 'dung',
                          noiDung: comment.trim(),
                          phienBanPhanHoi: published.phanHoi?.lanPhanHoi || 0,
                          phienBanThongTin: published.phienBanThongTin || 0,
                          thongTinMoi:
                            choice === 'sai' &&
                            published.thongTin.coNoiThucTap
                              ? company
                              : null,
                        },
                        { params: { maDot } }
                      )
                    )
                  }}
                >
                  <label className="block font-semibold text-slate-700">
                    Thông tin nơi thực tập của bạn có chính xác không?
                    <select
                      aria-label="Xác nhận thông tin dự kiến"
                      required
                      disabled={busy}
                      value={choice}
                      onChange={(e) => {
                        setChoice(e.target.value)
                        setCompany({
                          tenCongTy: published.thongTin.tenCongTy || '',
                          diaChi: published.thongTin.diaChiCongTy || '',
                          maSoThue: published.thongTin.maSoThue || '',
                        })
                      }}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                    >
                      <option value="">Chọn phản hồi</option>
                      <option value="dung">Thông tin đúng</option>
                      <option value="sai">
                        Yêu cầu chỉnh sửa thông tin đã nộp
                      </option>
                    </select>
                  </label>

                  {choice === 'sai' && published.thongTin.coNoiThucTap && (
                    <fieldset
                      disabled={busy}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2.5"
                    >
                      <legend className="px-1 font-bold text-slate-800">
                        Thông tin công ty mới đề nghị đính chính
                      </legend>
                      <label className="block font-semibold text-slate-700">
                        Tên công ty
                        <input
                          aria-label="Tên công ty đề nghị"
                          required
                          maxLength={500}
                          value={company.tenCongTy}
                          onChange={(e) =>
                            setCompany({
                              ...company,
                              tenCongTy: e.target.value,
                            })
                          }
                          className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                      </label>
                      <label className="block font-semibold text-slate-700">
                        Địa chỉ
                        <input
                          aria-label="Địa chỉ công ty đề nghị"
                          maxLength={1000}
                          value={company.diaChi}
                          onChange={(e) =>
                            setCompany({ ...company, diaChi: e.target.value })
                          }
                          className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                      </label>
                      <label className="block font-semibold text-slate-700">
                        Mã số thuế
                        <input
                          aria-label="Mã số thuế công ty đề nghị"
                          maxLength={30}
                          value={company.maSoThue}
                          onChange={(e) =>
                            setCompany({
                              ...company,
                              maSoThue: e.target.value,
                            })
                          }
                          className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"
                        />
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Chỉ đính chính thông tin của cùng đơn vị đang thực tập. Khoa sẽ đối chiếu trước khi cập nhật.
                      </p>
                    </fieldset>
                  )}

                  <label className="block font-semibold text-slate-700">
                    {choice === 'sai'
                      ? 'Lý do nộp nhầm / yêu cầu chỉnh sửa (bắt buộc)'
                      : 'Ghi chú (nếu có)'}
                    <textarea
                      aria-label="Nội dung phản hồi dự kiến"
                      required={choice === 'sai'}
                      rows={2}
                      maxLength={2000}
                      value={comment}
                      disabled={busy}
                      onChange={(e) => setComment(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={
                      busy ||
                      loading ||
                      !choice ||
                      (choice === 'sai' && !comment.trim())
                    }
                    className="px-4 py-2 font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg cursor-pointer"
                  >
                    Gửi phản hồi cho Khoa
                  </button>
                </form>
              ) : (
                <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                  {published.yeuCauDangCho
                    ? 'Yêu cầu đang chờ Khoa xử lý. Bạn xem kết quả tại đây sau khi Khoa trả lời.'
                    : 'Đã đóng phản hồi hoặc danh sách đã chốt. Bạn vẫn xem được thông tin đã công bố.'}
                </p>
              )}

              <details className="text-slate-600">
                <summary className="cursor-pointer font-medium">
                  Lịch sử phản hồi của bạn ({published.lichSu.length})
                </summary>
                <div className="mt-2 space-y-2 pl-3 border-l-2 border-slate-200">
                  {published.lichSu.map((f) => (
                    <div key={f.maPhanHoi}>
                      <p className="font-medium text-slate-800">
                        {formatInterviewDate(f.ngayGui)}{' '}
                        {formatInterviewTime(f.ngayGui)} — {feedbackLabel(f)}
                      </p>
                      <RequestDetails feedback={f} />
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function PublishedInfo({ info }) {
  return info.coNoiThucTap ? (
    <div className="space-y-0.5 text-xs text-slate-700">
      <p className="font-semibold text-slate-900">
        Doanh nghiệp: {info.tenCongTy}
      </p>
      <p>Địa chỉ: {info.diaChiCongTy || 'Chưa cung cấp'}</p>
      <p>
        Mã số thuế: {info.maSoThue || 'Chưa cung cấp'} · Vị trí:{' '}
        {info.viTri || 'Chưa ghi vị trí'}
      </p>
      <p className="text-slate-500">
        Ngày tại DN:{' '}
        {info.ngayBatDau ? formatInterviewDate(info.ngayBatDau) : 'Chưa xác minh'}{' '}
        →{' '}
        {info.ngayKetThuc
          ? formatInterviewDate(info.ngayKetThuc)
          : 'Chưa xác minh'}
      </p>
    </div>
  ) : (
    <p className="text-xs text-slate-500">
      Chưa có nơi thực tập trong danh sách. Nếu đã được tiếp nhận, liên hệ Khoa để kiểm tra hồ sơ.
    </p>
  )
}

function RequestDetails({ feedback }) {
  if (!feedback) return null
  return (
    <div className="space-y-1.5 text-xs">
      <p className="text-slate-600 whitespace-pre-wrap">
        Lý do / nội dung: {feedback.noiDung || 'Không có ghi chú'}
      </p>
      {feedback.thongTinMoi && (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-1.5">Trường</th>
                <th className="p-1.5">Thông tin cũ lúc gửi</th>
                <th className="p-1.5">Thông tin mới SV đề nghị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-1.5 font-medium">Tên công ty</td>
                <td className="p-1.5 text-slate-500">
                  {feedback.thongTinCu?.tenCongTy || 'Chưa có'}
                </td>
                <td className="p-1.5 font-semibold text-blue-700">
                  {feedback.thongTinMoi.tenCongTy}
                </td>
              </tr>
              <tr>
                <td className="p-1.5 font-medium">Địa chỉ</td>
                <td className="p-1.5 text-slate-500">
                  {feedback.thongTinCu?.diaChiCongTy || 'Chưa có'}
                </td>
                <td className="p-1.5 font-semibold text-blue-700">
                  {feedback.thongTinMoi.diaChi || 'Chưa cung cấp'}
                </td>
              </tr>
              <tr>
                <td className="p-1.5 font-medium">Mã số thuế</td>
                <td className="p-1.5 text-slate-500">
                  {feedback.thongTinCu?.maSoThue || 'Chưa có'}
                </td>
                <td className="p-1.5 font-semibold text-blue-700">
                  {feedback.thongTinMoi.maSoThue || 'Chưa cung cấp'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {feedback.xuLy && (
        <p className="text-[11px] font-medium text-slate-700 whitespace-pre-wrap">
          Khoa {feedback.xuLy.chapThuan ? 'chấp thuận' : 'từ chối'}:{' '}
          {feedback.xuLy.lyDo} — {formatInterviewDate(feedback.xuLy.ngayXuLy)}{' '}
          {formatInterviewTime(feedback.xuLy.ngayXuLy)} (VN).
        </p>
      )}
    </div>
  )
}
