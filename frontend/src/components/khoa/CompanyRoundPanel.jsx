import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../../services/api'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../common/Pagination'
import { deadlineText } from '../../hooks/useGradeDeadline'
import { recruitmentStatusLabel } from '../../utils/recruitmentStatus'

const local = value => value ? new Date(Date.parse(value) + 7 * 3600000).toISOString().slice(0, 16) : ''
const blank = { maCongTy: '', viTriTuyen: '', yeuCau: '', soLuongNhan: '', moDangKy: '', hanDangKy: '', hoatDong: true, phienBan: 0, lyDo: '', viTris: [{ maViTri: null, tenViTri: '', yeuCau: '', soLuongNhan: '', hoatDong: true }] }
const historyText = value => {
  try { const x = JSON.parse(value); if (x && 'MaGVGioiThieu' in x && !('SoLuongNhan' in x)) return `${x.companyId || ''} · GV đầu mối: ${x.MaGVGioiThieu || 'Không xác nhận GV'}` } catch { /* legacy audit uses text */ }
  try { const x = JSON.parse(value); return x ? `${x.companyId || ''} ${x.ViTriTuyen}; chỉ tiêu ${x.SoLuongNhan}; ${deadlineText(x.MoDangKy)} → ${deadlineText(x.HanDangKy)}; ${x.HoatDong ? 'nhận đơn theo lịch' : 'ngừng đơn mới'}` : 'Chưa có kế hoạch' }
  catch { return value }
}

export default function CompanyRoundPanel() {
  const { selectedDot, roundLock } = useDotThucTap()
  const round = selectedDot?.maDot || ''
  const current = useRef(round); current.current = round
  const [items, setItems] = useState([])
  const [history, setHistory] = useState([])
  const [companies, setCompanies] = useState([])
  const [teachers, setTeachers] = useState([])
  const [confirmation, setConfirmation] = useState(null)
  const [teacher, setTeacher] = useState('')
  const [teacherReason, setTeacherReason] = useState('')
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(false)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const version = useRef(0)
  const load = useCallback(async () => {
    if (!round) return
    const request = ++version.current
    setLoading(true)
    try {
      const [r, c, g] = await Promise.all([apiClient.get('/khoa/cong-ty-theo-dot', { params: { maDot: round } }), apiClient.get('/khoa/cong-ty'), apiClient.get('/khoa/giang-vien')])
      if (request !== version.current || current.current !== round) return
      setItems(r.data); setCompanies(c.data.filter(x => x.trangThai === 'DaDuyet' && !x.chiTiepNhanTuTim))
      setTeachers(g.data)
    } catch (error) { if (request === version.current && current.current === round) setMessage(error.response?.data?.message || 'Không tải được công ty theo đợt.') }
    finally { if (request === version.current && current.current === round) setLoading(false) }
  }, [round])
  useEffect(() => {
    setItems([]); setCompanies([]); setTeachers([]); setHistory([]); setConfirmation(null); setForm(blank); setEditing(false); setMessage(''); setBusy(false)
    load()
    const requestVersion = version
    return () => { requestVersion.current++ }
  }, [load])
  const filtered = items.filter(x => `${x.maCongTy} ${x.tenCongTy} ${x.viTriTuyen}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))
  const pagination = usePagination(filtered, `${round}|${search}`)
  const historyPagination = usePagination(history, round)
  const readOnly = selectedDot?.trangThai === 'DaKetThuc' || roundLock.structureBlocked
  const confirmTeacher = async e => {
    e.preventDefault()
    if (!confirmation || confirmation.maDot !== round || readOnly || busy || loading) return
    const request = version.current
    setBusy(true); setMessage('')
    try {
      const r = await apiClient.put(`/khoa/cong-ty-theo-dot/${encodeURIComponent(round)}/${encodeURIComponent(confirmation.maCongTy)}/gv-gioi-thieu`, {
        maGV: teacher || null, phienBan: confirmation.phienBan, lyDo: teacherReason,
      })
      if (current.current !== round || request !== version.current) return
      setMessage(r.data.message); setConfirmation(null); await load()
    } catch (error) { if (current.current === round && request === version.current) setMessage(error.response?.data?.message || 'Không xác nhận được GV. Dữ liệu nhập được giữ lại.') }
    finally { if (current.current === round) setBusy(false) }
  }
  const save = async e => {
    e.preventDefault()
    if (readOnly || busy || loading || !round) return
    const request = version.current
    setBusy(true); setMessage('')
    try {
      await apiClient.put(`/khoa/cong-ty-theo-dot/${encodeURIComponent(round)}/${encodeURIComponent(form.maCongTy)}`, {
        ...form, viTriTuyen: form.viTris[0].tenViTri, yeuCau: form.viTris[0].yeuCau,
        viTris: form.viTris.map(x => ({ ...x, soLuongNhan: Number(x.soLuongNhan) })), soLuongNhan: Number(form.soLuongNhan), moDangKy: `${form.moDangKy}:00+07:00`, hanDangKy: `${form.hanDangKy}:00+07:00`,
      })
      if (current.current !== round || request !== version.current) return
      setMessage('Đã lưu kế hoạch DN trong đúng đợt. Danh mục DN chung và các đợt khác được giữ nguyên.'); setForm(blank); setEditing(false)
      await load()
    } catch (error) { if (current.current === round && request === version.current) setMessage(error.response?.data?.message || 'Không lưu được. Tải lại nếu dữ liệu đã đổi.') }
    finally { if (current.current === round) setBusy(false) }
  }
  return <section className="info-card mb-6">
    <h2 className="text-lg font-bold">Công ty / vị trí giới thiệu theo đợt</h2>
    <p>Đợt: <strong>{selectedDot?.tenDot || 'Chưa chọn'}</strong>. Mỗi DN có nhiều vị trí, mỗi vị trí có JD và chỉ tiêu riêng; tổng chỉ tiêu DN là trần chung của đợt.</p>
    <p>Chỉ đưa DN đã duyệt vào danh sách này mới công khai cho SV đăng ký. Ngừng nhận/hết hạn chỉ khóa đơn mới; hồ sơ cũ vẫn được xử lý theo quy trình.</p>
    <p>SV nhận danh sách khi đợt ở trạng thái Đang diễn ra, đúng lịch và còn chỉ tiêu. Có thể thiết lập trước để chuẩn bị đợt; ngày mở đăng ký không phải ngày bắt đầu thực tập.</p>
    <p>Khoa xác nhận GV giới thiệu/đầu mối riêng từng DN–đợt. Không xác nhận thì phân công tự động xét chuyên môn/tải; không tự dùng GV của đợt cũ. GV đầu mối chỉ được ưu tiên khi còn chỉ tiêu, Khoa duyệt phân công cuối.</p>
    <div className="flex gap-2 my-3"><input aria-label="Tìm công ty theo đợt" placeholder="Công ty hoặc vị trí" value={search} onChange={e => setSearch(e.target.value)}/><button disabled={!round || busy || loading} onClick={load}>Làm mới</button><button disabled={!round || busy || loading || readOnly} onClick={() => { setForm(blank); setEditing(true) }}>Đưa DN vào đợt</button></div>
    <div className="table-wrap"><table><thead><tr><th>DN / vị trí</th><th>Chỉ tiêu / đã nhận</th><th>Thời hạn nhận hồ sơ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      {pagination.items.map(x => <tr key={x.maCongTy}><td>{x.tenCongTy}<div>{(x.viTris || []).map(v => <details key={v.maViTri}><summary>{v.tenViTri} — đã nhận {v.daTiepNhan}/{v.soLuongNhan} · {v.daTiepNhan >= v.soLuongNhan ? 'Đủ chỉ tiêu — đóng nhận mới' : !v.hoatDong ? 'Ngừng nhận mới' : 'Theo lịch DN'}</summary><p className="whitespace-pre-wrap">{v.yeuCau}</p></details>)}</div><small>GV đầu mối: {x.tenGVGioiThieu || 'Chưa được Khoa xác nhận'}</small></td><td>{x.soLuongNhan} / {x.daTiepNhan}</td><td>{deadlineText(x.moDangKy)} → {deadlineText(x.hanDangKy)}</td><td>{recruitmentStatusLabel(x.trangThaiTuyen)}</td><td><button disabled={readOnly || busy || loading} onClick={() => { setForm({ ...x, moDangKy: local(x.moDangKy), hanDangKy: local(x.hanDangKy), lyDo: '', viTris: x.viTris?.length ? x.viTris.map(v => ({ ...v })) : [{ maViTri: null, tenViTri: x.viTriTuyen || '', yeuCau: x.yeuCau || '', soLuongNhan: x.soLuongNhan, hoatDong: true }] }); setEditing(true); setMessage('') }}>Sửa / ngừng nhận</button><button disabled={readOnly || busy || loading} onClick={() => { setConfirmation(x); setTeacher(x.maGVGioiThieu || ''); setTeacherReason(''); setMessage('') }}>Xác nhận GV trong đợt</button></td></tr>)}
      {!filtered.length && <tr><td colSpan="5">{loading ? 'Đang tải…' : 'Chưa có công ty phù hợp trong đợt này. Không tự lấy toàn danh mục DN.'}</td></tr>}
    </tbody></table><Pagination pagination={pagination} label="công ty theo đợt"/></div>
    {confirmation?.maDot === round && !readOnly && <form onSubmit={confirmTeacher} className="space-y-3 mt-4">
      <h3>GV đầu mối — {confirmation.tenCongTy}, {selectedDot?.tenDot}</h3>
      <label className="block">GV được Khoa xác nhận <select aria-label="GV đầu mối trong đợt" disabled={busy} value={teacher} onChange={e => setTeacher(e.target.value)}><option value="">Không xác nhận GV ưu tiên</option>{teachers.map(x => <option key={x.maGV} value={x.maGV}>{x.hoTen} ({x.maGV})</option>)}</select></label>
      <label className="block">Lý do xác nhận/đổi/bỏ đầu mối <textarea required maxLength={1000} disabled={busy} value={teacherReason} onChange={e => setTeacherReason(e.target.value)}/></label>
      <p>Chỉ cập nhật nguồn ưu tiên; không mở lại tuyển dụng hoặc đổi GVHD đã phân công. Xem đề xuất và xác nhận phân công ở màn hình Phân công GVHD.</p>
      <button disabled={busy || loading} className="primary">Xác nhận GV đầu mối</button><button type="button" disabled={busy} onClick={() => setConfirmation(null)}>Đóng</button>
    </form>}
    <details onToggle={async e => {
      if (!e.currentTarget.open || !round) return
      try { const r = await apiClient.get('/khoa/cong-ty-theo-dot/lich-su', { params: { maDot: round } }); if (current.current === round) setHistory(r.data) }
      catch { if (current.current === round) setMessage('Không tải được lịch sử kế hoạch.') }
    }}><summary>Lịch sử kế hoạch trong đợt</summary>{historyPagination.items.map(x => <article key={x.maNhatKy}><p>{deadlineText(x.thoiDiem)} — {x.nguoiThucHien}: {x.lyDo}</p><p>Trước: {historyText(x.truoc)}</p><p>Sau: {historyText(x.sau)}</p></article>)}<Pagination pagination={historyPagination} label="lịch sử kế hoạch DN"/></details>
    {editing && !readOnly && <form onSubmit={save} className="space-y-3 mt-4">
      <label className="block">Doanh nghiệp <select required disabled={busy || form.phienBan > 0} value={form.maCongTy} onChange={e => setForm({ ...form, maCongTy: e.target.value })}><option value="">Chọn DN đã duyệt</option>{companies.map(x => <option key={x.maCongTy} value={x.maCongTy}>{x.tenCongTy}</option>)}</select></label>
      <h3 className="font-semibold">Các vị trí/JD trong đợt</h3>
      {form.viTris.map((v, index) => <fieldset key={v.maViTri || index} className="border rounded p-3 space-y-2">
        <legend>Vị trí {index + 1}</legend>
        <label className="block">Tên vị trí <input required maxLength={500} disabled={busy} value={v.tenViTri} onChange={e => setForm({ ...form, viTris: form.viTris.map((x, i) => i === index ? { ...x, tenViTri: e.target.value } : x) })}/></label>
        <label className="block">Yêu cầu / JD của vị trí <textarea required maxLength={20000} disabled={busy} value={v.yeuCau} onChange={e => setForm({ ...form, viTris: form.viTris.map((x, i) => i === index ? { ...x, yeuCau: e.target.value } : x) })}/></label>
        <label className="block">Chỉ tiêu vị trí <input type="number" min="1" required disabled={busy} value={v.soLuongNhan} onChange={e => setForm({ ...form, viTris: form.viTris.map((x, i) => i === index ? { ...x, soLuongNhan: e.target.value } : x) })}/></label>
        <label><input type="checkbox" disabled={busy} checked={v.hoatDong} onChange={e => setForm({ ...form, viTris: form.viTris.map((x, i) => i === index ? { ...x, hoatDong: e.target.checked } : x) })}/> Cho vị trí nhận đơn theo lịch DN</label>
        {!v.maViTri && form.viTris.length > 1 && <button type="button" disabled={busy} onClick={() => setForm({ ...form, viTris: form.viTris.filter((_, i) => i !== index) })}>Bỏ dòng chưa lưu</button>}
      </fieldset>)}
      <button type="button" disabled={busy || form.viTris.length >= 30} onClick={() => setForm({ ...form, viTris: [...form.viTris, { maViTri: null, tenViTri: '', yeuCau: '', soLuongNhan: '', hoatDong: true }] })}>Thêm vị trí / JD</button>
      <label className="block">Tổng chỉ tiêu DN trong đợt <input type="number" min="1" required disabled={busy} value={form.soLuongNhan} onChange={e => setForm({ ...form, soLuongNhan: e.target.value })}/></label>
      <label className="block">Mở nhận đăng ký <input type="datetime-local" required disabled={busy} value={form.moDangKy} onChange={e => setForm({ ...form, moDangKy: e.target.value })}/></label>
      <label className="block">Hạn nhận đăng ký <input type="datetime-local" required disabled={busy} value={form.hanDangKy} onChange={e => setForm({ ...form, hanDangKy: e.target.value })}/></label>
      <label className="block"><input type="checkbox" checked={form.hoatDong} disabled={busy} onChange={e => setForm({ ...form, hoatDong: e.target.checked })}/> Cho nhận đơn mới theo lịch</label>
      <label className="block">Lý do cập nhật <textarea required maxLength={1000} disabled={busy} value={form.lyDo} onChange={e => setForm({ ...form, lyDo: e.target.value })}/></label>
      <button disabled={busy || loading} className="primary">{busy ? 'Đang lưu…' : 'Lưu theo đợt'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Đóng</button>
    </form>}
    {message && <p role="status">{message}</p>}
  </section>
}
