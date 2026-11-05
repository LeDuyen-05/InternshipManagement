import { useEffect, useRef, useState } from 'react'
import { ungTuyenHoTroService } from '../../../services/ungTuyenHoTroService'

export default function SupplementalRegistrationPanel({ maSV, maDot, sessions, student, onUpdated }) {
  const [sessionId, setSessionId] = useState(''), [quota, setQuota] = useState(1), [deadline, setDeadline] = useState(''), [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const chosen = sessions.find(s => s.maLan === sessionId)
  const eligible = student?.actions?.coTheHoTroTiep && student?.soLanUngTuyen >= 3
  const candidates = sessions.filter(s => !s.sinhVien?.dangKyBoSung && s.sinhVien?.ketQua === 'CanHoTro')
  async function submit(e) {
    e.preventDefault()
    if (busy || !chosen || !eligible) return
    setBusy(true); setMessage('')
    try {
      // datetime-local contains a Vietnam business time, independent of the browser's timezone.
      await ungTuyenHoTroService.moDangKyBoSung(maSV, sessionId, maDot, { phienBan: chosen.phienBan, soLuot: Number(quota), hanDangKy: `${deadline}:00+07:00`, lyDo: reason.trim() })
      if (!mounted.current) return
      setMessage('Đã mở lượt đăng ký bổ sung.'); setReason(''); await onUpdated?.()
    } catch (error) { if (mounted.current) setMessage(error.response?.data?.message || 'Không mở được lượt bổ sung. Tải lại để kiểm tra dữ liệu.') }
    finally { if (mounted.current) setBusy(false) }
  }
  return <section className="space-y-3 border border-blue-200 bg-blue-50/40 rounded-2xl p-4 text-xs">
    <h3 className="font-bold text-blue-950">Mở lượt đăng ký bổ sung cho sinh viên</h3>
    <p>Cấp thêm lượt ứng tuyển cho sinh viên chưa có nơi thực tập sau các đợt ứng tuyển chính thức.</p>
    {sessions.filter(s => s.sinhVien?.dangKyBoSung).map(s => {
      const grant = s.sinhVien.dangKyBoSung
      const used = Math.max(0, (student.ungTuyens || []).filter(a => a.maLanHoTro === s.maLan).length - (grant.soHoSoTruocKhiMo || 0))
      return <div key={s.maLan} className="bg-white border rounded-xl p-3"><strong>{s.tenLan}: {grant.soLuot} lượt bổ sung; đã dùng {used}</strong><p>Hạn: {new Date(grant.hanDangKy).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} • Người mở: {grant.nguoiMo}</p><p>Lý do: {grant.lyDo}</p></div>
    })}
    {eligible && candidates.length > 0 ? <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
      <label>Lần hỗ trợ<select required value={sessionId} disabled={busy} onChange={e => setSessionId(e.target.value)} className="block w-full border rounded-lg p-2"><option value="">Chọn lần hỗ trợ</option>{candidates.map(s => <option key={s.maLan} value={s.maLan}>{s.tenLan}</option>)}</select></label>
      <label>Số lượt bổ sung<input aria-label="Số lượt bổ sung" required type="number" min="1" max="3" value={quota} disabled={busy} onChange={e => setQuota(e.target.value)} className="block w-full border rounded-lg p-2" /></label>
      <label>Hạn đăng ký<input aria-label="Hạn đăng ký bổ sung" required type="datetime-local" value={deadline} disabled={busy} onChange={e => setDeadline(e.target.value)} className="block w-full border rounded-lg p-2" /></label>
      <label>Lý do mở bổ sung<textarea aria-label="Lý do mở đăng ký bổ sung" required maxLength={1000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} className="block w-full border rounded-lg p-2" /></label>
      <button type="submit" disabled={busy || !chosen || !reason.trim()} className="rounded-lg bg-blue-700 text-white px-3 py-2 disabled:opacity-50">{busy ? 'Đang lưu…' : 'Xác nhận mở lượt bổ sung'}</button>
    </form> : <p>{eligible ? sessions.length > 0 ? 'Chưa có phiên hỗ trợ nào cần mở đăng ký bổ sung. Vui lòng xác nhận kết quả hỗ trợ trước.' : 'Vui lòng tạo lần hỗ trợ tại tab "Tạo lần hỗ trợ tiếp" trước khi mở lượt bổ sung.' : 'Sinh viên hiện chưa thuộc diện mở bổ sung (chưa hết lượt hoặc đang chờ kết quả phỏng vấn).'}</p>}
    {message && <p role="status" className="font-semibold">{message}</p>}
  </section>
}
