import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'

export default function KhoaDeadlinesPage() {
  const [rounds, setRounds] = useState([])
  const [round, setRound] = useState('')
  const [deadlines, setDeadlines] = useState([])
  const [dates, setDates] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')
  const load = async () => { try { const result = await apiClient.get('/khoa/han-bao-cao', { params: round ? { maDot: round } : {} }); setDeadlines(result.data); setError('') } catch (e) { setError(e.response?.data?.message || 'Không tải được lịch hạn báo cáo.') } }
  useEffect(() => { load() }, [round])
  useEffect(() => { apiClient.get('/khoa/dot-thuc-tap').then(r => setRounds(r.data || [])).catch(() => {}) }, [])
  const save = async (item) => { const next = dates[item.mocThoiGian] || item.mocThoiGian.slice(0,10); if (next === item.mocThoiGian.slice(0,10)) return; setSaving(item.mocThoiGian); try { await apiClient.put(`/khoa/han-bao-cao/${encodeURIComponent(item.maDot)}`, { hanCu: item.mocThoiGian, hanMoi: next }); await load() } catch(e) { setError(e.response?.data?.message || 'Không cập nhật được hạn báo cáo.') } finally { setSaving('') } }
  return <Layout><div className="page-head"><div><span className="eyebrow">GIÁO VỤ KHOA</span><h2>Lịch trình & quản lý deadline</h2><p>Chỉnh hạn báo cáo theo mốc cho cả đợt; việc thay đổi cập nhật đồng loạt sinh viên ở mốc đó.</p></div><button className="small" onClick={load}>Làm mới</button></div>{error&&<div className="alert error">{error}</div>}
    <div className="tabbar"><label>Đợt thực tập <select value={round} onChange={e=>setRound(e.target.value)}><option value="">Tất cả đợt</option>{rounds.map(r=><option key={r.maSo} value={r.maSo}>{r.tenDot} · {r.namHoc}</option>)}</select></label></div>
    <div className="info-card"><div className="table-wrap"><table><thead><tr><th>Đợt</th><th>Hạn hiện tại</th><th>Số báo cáo</th><th>Đã nộp</th><th>Đã duyệt</th><th>Chưa nộp quá hạn</th><th>Đổi hạn</th></tr></thead><tbody>{deadlines.map(x=><tr key={`${x.maDot}-${x.mocThoiGian}`}><td>{rounds.find(r=>r.maSo===x.maDot)?.tenDot || x.maDot}</td><td>{String(x.mocThoiGian).slice(0,10)}</td><td>{x.reportCount}</td><td>{x.submitted}</td><td>{x.approved}</td><td>{x.overdue}</td><td><input type="date" value={dates[x.mocThoiGian] ?? String(x.mocThoiGian).slice(0,10)} onChange={e=>setDates({...dates,[x.mocThoiGian]:e.target.value})}/>{' '}<button className="small primary" disabled={saving===x.mocThoiGian} onClick={()=>save(x)}>{saving===x.mocThoiGian?'Đang lưu…':'Cập nhật'}</button></td></tr>)}{!deadlines.length&&<tr><td colSpan="7">Chưa có mốc báo cáo để quản lý.</td></tr>}</tbody></table></div></div>
  </Layout>
}
