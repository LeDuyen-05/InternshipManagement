import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'

const labels = { ChuaNop: 'Chưa nộp', DaNop: 'Chờ duyệt', DaDuyet: 'Đã duyệt', YeuCauSua: 'Yêu cầu sửa' }
export default function ThongKeBaoCaoPage() {
  const [reports, setReports] = useState([])
  const [rounds, setRounds] = useState([])
  const [round, setRound] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { apiClient.get('/khoa/dot-thuc-tap').then(r => setRounds(r.data || [])).catch(() => {}) }, [])
  useEffect(() => { apiClient.get('/khoa/theo-doi', { params: round ? { maDot: round } : {} }).then(r => { setReports(r.data.reports || []); setError('') }).catch(e => setError(e.response?.data?.message || 'Không tải được số liệu báo cáo.')) }, [round])
  const stats = useMemo(() => Object.keys(labels).map(key => ({ key, label: labels[key], count: reports.filter(x => x.trangThaiDuyet === key).length })), [reports])
  const exportCsv = () => {
    const rows = [['Mã sinh viên','Sinh viên','Lớp','Đợt','Hạn báo cáo','Ngày nộp','Nội dung','Trạng thái'], ...reports.map(x => [x.maSinhVien,x.sinhVien,x.lop,x.dot,String(x.mocThoiGian||'').slice(0,10),String(x.ngayNop||'').slice(0,10),x.noiDungBaoCao||'',labels[x.trangThaiDuyet]||x.trangThaiDuyet])]
    const csv = '\uFEFF' + rows.map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(',')).join('\r\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = 'bao-cao-tien-do-thuc-tap.csv'; link.click(); URL.revokeObjectURL(link.href)
  }
  return <Layout><div className="page-head"><div><span className="eyebrow">GIÁO VỤ KHOA</span><h2>Thống kê & báo cáo tiến độ</h2><p>Số liệu được tổng hợp trực tiếp từ các báo cáo sinh viên trong hệ thống.</p></div><button className="primary" onClick={exportCsv} disabled={!reports.length}>Xuất CSV</button></div>{error&&<div className="alert error">{error}</div>}
    <div className="tabbar"><label>Đợt thực tập <select value={round} onChange={e=>setRound(e.target.value)}><option value="">Tất cả đợt</option>{rounds.map(x=><option key={x.maSo} value={x.maSo}>{x.tenDot} · {x.namHoc}</option>)}</select></label><span className="badge">Tổng báo cáo: {reports.length}</span>{stats.map(s=><span className="badge" key={s.key}>{s.label}: {s.count}</span>)}</div>
    <div className="info-card"><h3>Tình hình theo mốc báo cáo</h3><div className="table-wrap"><table><thead><tr><th>Hạn nộp</th><th>Số báo cáo</th><th>Đã duyệt</th><th>Chờ duyệt</th><th>Yêu cầu sửa</th><th>Chưa nộp</th><th>Tỷ lệ hoàn tất</th></tr></thead><tbody>{Object.entries(reports.reduce((acc,r)=>{const key=String(r.mocThoiGian||'').slice(0,10);acc[key]??={};acc[key][r.trangThaiDuyet]=(acc[key][r.trangThaiDuyet]||0)+1;return acc},{})).sort(([a],[b])=>a.localeCompare(b)).map(([date,counts])=>{const total=Object.values(counts).reduce((a,b)=>a+b,0);const complete=total-(counts.ChuaNop||0);return <tr key={date}><td>{date||'—'}</td><td>{total}</td><td>{counts.DaDuyet||0}</td><td>{counts.DaNop||0}</td><td>{counts.YeuCauSua||0}</td><td>{counts.ChuaNop||0}</td><td>{total?Math.round(complete/total*100):0}%</td></tr>})}{!reports.length&&<tr><td colSpan="7">Chưa có dữ liệu báo cáo.</td></tr>}</tbody></table></div></div>
    <div className="info-card"><h3>Ma trận trạng thái theo sinh viên</h3><div className="table-wrap"><table><thead><tr><th>Sinh viên</th><th>Mã SV</th><th>Lớp</th><th>Đợt</th><th>Hạn báo cáo</th><th>Trạng thái</th></tr></thead><tbody>{reports.map(x=><tr key={x.maTienDo}><td>{x.sinhVien}</td><td>{x.maSinhVien}</td><td>{x.lop}</td><td>{x.dot}</td><td>{String(x.mocThoiGian||'').slice(0,10)}</td><td>{labels[x.trangThaiDuyet]||x.trangThaiDuyet}</td></tr>)}</tbody></table></div></div>
  </Layout>
}
