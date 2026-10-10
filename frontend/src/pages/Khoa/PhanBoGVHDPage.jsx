import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'

export default function PhanBoGVHDPage() {
  const [data, setData] = useState({ students: [], lecturers: [], assigned: 0, unassigned: 0 })
  const [rounds, setRounds] = useState([])
  const [round, setRound] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [choices, setChoices] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState('')
  const load = async () => { try { const r = await apiClient.get('/khoa/phan-cong', { params: round ? { maDot: round } : {} }); setData(r.data); setError('') } catch (e) { setError(e.response?.data?.message || 'Không tải được danh sách phân công.') } }
  useEffect(() => { load() }, [round])
  useEffect(() => { apiClient.get('/khoa/dot-thuc-tap').then(r=>setRounds(r.data||[])).catch(()=>{}) }, [])
  const assign = async (student) => { const lecturer = choices[student.maSV] || student.maGiangVien; if (!lecturer) return setError('Hãy chọn giảng viên hướng dẫn trước khi lưu.'); setSaving(student.maSV); try { await apiClient.put(`/khoa/phan-cong/${encodeURIComponent(student.maSV)}`, { maGiangVien: lecturer }); await load() } catch(e) { setError(e.response?.data?.message || 'Không thể phân công giảng viên.') } finally { setSaving('') } }
  const autoAssign = async () => {
    const pending = rows.filter(x => !x.maGiangVien)
    if (!pending.length) return setError('Không có sinh viên chưa phân công trong bộ lọc hiện tại.')
    if (!window.confirm(`Tự phân công ${pending.length} sinh viên chưa có GVHD theo chuyên môn gần nhất và tải hướng dẫn còn trống?`)) return
    const loads = Object.fromEntries(data.lecturers.map(x => [x.maGV, Number(x.assignedCount)]))
    setError(''); setSaving('batch')
    try {
      for (const student of pending) {
        const keywords = String(student.chuyenNganh||'').toLocaleLowerCase('vi').split(/\W+/).filter(x=>x.length>2)
        const eligible = data.lecturers.filter(x => (loads[x.maGV]||0) < 15)
        if (!eligible.length) { setError('Đã hết giảng viên còn chỉ tiêu; một số sinh viên chưa được phân công.'); break }
        eligible.sort((a,b) => {
          const rank = item => { const spec=String(item.chuyenMon||'').toLocaleLowerCase('vi'); return keywords.reduce((n,k)=>n+(spec.includes(k)?1:0),0) }
          return rank(b)-rank(a) || (loads[a.maGV]||0)-(loads[b.maGV]||0)
        })
        const chosen=eligible[0]
        await apiClient.put(`/khoa/phan-cong/${encodeURIComponent(student.maSV)}`,{maGiangVien:chosen.maGV})
        loads[chosen.maGV]=(loads[chosen.maGV]||0)+1
      }
      await load()
    } catch(e) { setError(e.response?.data?.message || 'Phân công tự động dừng do lỗi API.') }
    finally { setSaving('') }
  }
  const exportDecision = () => { const values=[['MaSV','SinhVien','Lop','ChuyenNganh','DoanhNghiep','MaGVHD','GiangVien'],...rows.filter(x=>x.maGiangVien).map(x=>[x.maSV,x.hoTen,x.lop,x.chuyenNganh,x.congTy,x.maGiangVien,x.giangVien])]; const csv='\uFEFF'+values.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n'); const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='quyet-dinh-phan-cong-gvhd.csv';a.click();URL.revokeObjectURL(a.href) }
  const rows = data.students.filter(x => (!search || `${x.maSV} ${x.hoTen} ${x.congTy||''}`.toLowerCase().includes(search.toLowerCase())) && (status==='all' || (status==='unassigned' ? !x.maGiangVien : !!x.maGiangVien)))
  return <Layout><div className="page-head"><div><span className="eyebrow">GIÁO VỤ KHOA</span><h2>Phân bổ sinh viên & phân công GVHD</h2><p>Gán giảng viên theo chuyên môn và tải hướng dẫn; giới hạn tối đa 15 sinh viên trên mỗi giảng viên.</p></div><div className="khoa-actions"><button className="small" onClick={exportDecision}>Xuất quyết định CSV</button><button className="primary" disabled={saving==='batch'} onClick={autoAssign}>{saving==='batch'?'Đang phân công…':'Phân công tự động'}</button><button className="small" onClick={load}>Làm mới</button></div></div>{error&&<div className="alert error">{error}</div>}
    <div className="tabbar"><span className="badge">Đã phân công: {data.assigned}</span><span className="badge">Chưa phân công: {data.unassigned}</span><label>Đợt <select value={round} onChange={e=>setRound(e.target.value)}><option value="">Tất cả</option>{rounds.map(r=><option key={r.maSo} value={r.maSo}>{r.tenDot} · {r.namHoc}</option>)}</select></label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tất cả sinh viên</option><option value="unassigned">Chưa có GVHD</option><option value="assigned">Đã có GVHD</option></select><input placeholder="Tìm mã SV, tên hoặc công ty" value={search} onChange={e=>setSearch(e.target.value)} /></div>
    <div className="info-card"><div className="table-wrap"><table><thead><tr><th>Mã SV</th><th>Sinh viên / Lớp</th><th>Chuyên ngành</th><th>Doanh nghiệp</th><th>GV hướng dẫn</th><th>Tải GV</th><th>Thao tác</th></tr></thead><tbody>{rows.map(s=><tr key={s.maSV}><td>{s.maSV}</td><td>{s.hoTen}<div className="hint">{s.lop}</div></td><td>{s.chuyenNganh}</td><td>{s.congTy || 'Chưa được duyệt nơi thực tập'}</td><td><select value={choices[s.maSV] ?? s.maGiangVien ?? ''} onChange={e=>setChoices({...choices,[s.maSV]:e.target.value})}><option value="">-- Chọn GVHD --</option>{data.lecturers.map(g=><option key={g.maGV} value={g.maGV} disabled={g.assignedCount>=15 && g.maGV!==s.maGiangVien}>{g.hoTen} ({g.assignedCount}/15)</option>)}</select>{s.giangVien&&<div className="hint">Hiện tại: {s.giangVien}</div>}</td><td>{data.lecturers.find(g=>g.maGV===(choices[s.maSV]??s.maGiangVien))?.assignedCount ?? '—'}/15</td><td><button className="small primary" disabled={saving===s.maSV} onClick={()=>assign(s)}>{saving===s.maSV?'Đang lưu…':'Lưu phân công'}</button></td></tr>)}{!rows.length&&<tr><td colSpan="7">Không có sinh viên phù hợp.</td></tr>}</tbody></table></div></div></Layout>
}
