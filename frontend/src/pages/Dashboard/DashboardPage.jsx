import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import Layout from '../../components/Layout'
import { useAuth } from '../../contexts/AuthContext'

export default function DashboardPage(){
  const {user}=useAuth()
  const [data,setData]=useState({sv:0,ct:0,dot:0})
  const [notices,setNotices]=useState([])
  const [error,setError]=useState('')
  useEffect(()=>{
    if(user?.maVaiTro==='VT02') Promise.all([apiClient.get('/khoa/sinh-vien'),apiClient.get('/khoa/cong-ty'),apiClient.get('/khoa/dot-thuc-tap')]).then(([s,c,d])=>setData({sv:s.data.length,ct:c.data.length,dot:d.data.length})).catch(()=>setError('Không tải được thống kê.'))
    apiClient.get('/thong-bao').then(r=>setNotices(r.data||[])).catch(()=>{})
  },[user?.maVaiTro])
  return <Layout><div className="page-head"><div><span className="eyebrow">TỔNG QUAN</span><h2>Hệ thống quản lý thực tập</h2><p>Thông tin học vụ và thông báo mới nhất.</p></div></div>{error&&<div className="alert error">{error}</div>}{user?.maVaiTro==='VT02'&&<div className="stat-grid"><div className="stat-card"><span>Sinh viên</span><strong>{data.sv}</strong></div><div className="stat-card"><span>Công ty</span><strong>{data.ct}</strong></div><div className="stat-card"><span>Đợt thực tập</span><strong>{data.dot}</strong></div><div className="stat-card"><span>Mô hình AI</span><strong>TF-IDF</strong></div></div>}{user?.maVaiTro==='VT02'&&<div className="info-card"><h3>Luồng AI</h3><div className="flow"><span>Hồ sơ SV</span><b>→</b><span>TF-IDF</span><b>→</b><span>Cosine</span><b>→</b><span>Ranking Top-K</span><b>→</b><span>NDCG@K</span></div><Link to="/khoa" className="secondary-link">Mở tổng quan giáo vụ →</Link></div>}<section className="khoa-panel"><div className="khoa-panel-head"><div><h2>Thông báo toàn khoa</h2><p>Thông báo do giáo vụ khoa gửi đến người dùng trong cổng.</p></div></div>{notices.map(x=><article className="notice-item" key={x.maThongBao}><div><strong>{x.tieuDe}</strong><p>{x.noiDung}</p></div><time>{String(x.ngayTao).replace('T',' ').slice(0,16)}</time></article>)}{!notices.length&&<p className="empty-state">Chưa có thông báo.</p>}</section></Layout>
}
