import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'

const statusLabel = { ChoDuyet: 'Chờ duyệt', DaDuyet: 'Đã duyệt', TuChoi: 'Từ chối', DaNop: 'Đã nộp', ChuaNop: 'Chưa nộp', YeuCauSua: 'Yêu cầu sửa' }

export default function KhoaOperationsPage({ mode }) {
  const [data, setData] = useState(null)
  const [round, setRound] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [rounds, setRounds] = useState([])
  const load = async () => {
    try {
      const response = await apiClient.get(mode === 'registrations' ? '/khoa/dang-ky' : '/khoa/theo-doi', { params: round ? { maDot: round } : {} })
      setData(response.data)
      setError('')
    } catch (e) { setError(e.response?.data?.message || 'Không tải được dữ liệu.') }
  }
  useEffect(() => { load() }, [mode, round])
  useEffect(() => { apiClient.get('/khoa/dot-thuc-tap').then(r => setRounds(r.data || [])).catch(() => {}) }, [])
  const update = async (id, status) => {
    setBusy(id)
    try { await apiClient.put(`/khoa/dang-ky/${encodeURIComponent(id)}/duyet`, { trangThai: status }); await load() }
    catch (e) { setError(e.response?.data?.message || 'Không cập nhật được trạng thái.') }
    finally { setBusy('') }
  }
  const reviewReport = async (id,status) => { setBusy(id); try { await apiClient.put(`/khoa/theo-doi/${encodeURIComponent(id)}/duyet`,{trangThai:status}); await load() } catch(e) { setError(e.response?.data?.message||'Không cập nhật được trạng thái báo cáo.') } finally { setBusy('') } }
  const isRegistration = mode === 'registrations'
  const rows = isRegistration ? (Array.isArray(data) ? data : []) : (data?.reports || [])
  return <Layout><div className="page-head"><div><span className="eyebrow">GIÁO VỤ KHOA</span><h2>{isRegistration ? 'Đăng ký & xét duyệt' : 'Theo dõi tiến độ thực tập'}</h2><p>{isRegistration ? 'Rà soát nguyện vọng thực tập theo đợt, sinh viên và doanh nghiệp.' : 'Theo dõi hạn nộp, báo cáo và tình trạng duyệt của sinh viên.'}</p></div><Link className="primary" to="/khoa">Tổng quan</Link></div>
    {error && <div className="alert error">{error}</div>}
    <div className="tabbar"><label>Đợt thực tập <select value={round} onChange={e=>setRound(e.target.value)}><option value="">Tất cả đợt</option>{rounds.map(x=><option key={x.maSo} value={x.maSo}>{x.tenDot} · {x.namHoc}</option>)}</select></label></div>
    {!isRegistration && data && <div className="tabbar"><span className="badge">Tổng {data.total}</span><span className="badge">Đã duyệt {data.approved}</span><span className="badge">Chờ duyệt {data.pending}</span><span className="badge">Yêu cầu sửa {data.revision}</span><span className="badge">Chưa nộp {data.missing}</span></div>}
    <div className="info-card"><div className="page-head"><h3>{isRegistration ? 'Danh sách nguyện vọng' : 'Danh sách báo cáo'}</h3><button className="small" onClick={load}>Làm mới</button></div>
      <div className="table-wrap"><table><thead><tr>{isRegistration ? <><th>Mã SV</th><th>Sinh viên</th><th>Lớp</th><th>Doanh nghiệp</th><th>Đợt</th><th>Ngày đăng ký</th><th>Ưu tiên</th><th>Trạng thái</th><th>Thao tác</th></> : <><th>Mã SV</th><th>Sinh viên</th><th>Lớp</th><th>Đợt</th><th>Hạn báo cáo</th><th>Ngày nộp</th><th>Nội dung</th><th>Trạng thái</th></>}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={r.maDangKy || r.maTienDo || i}>{isRegistration ? <><td>{r.maSinhVien}</td><td>{r.sinhVien}</td><td>{r.lop}</td><td>{r.congTy}</td><td>{r.dot}</td><td>{String(r.ngayDangKy || '').slice(0,10)}</td><td>{r.thuTuUuTien}</td><td>{statusLabel[r.trangThai] || r.trangThai}</td><td>{r.trangThai === 'ChoDuyet' && <><button disabled={busy===r.maDangKy} className="small success-btn" onClick={()=>update(r.maDangKy,'DaDuyet')}>Duyệt</button>{' '}<button disabled={busy===r.maDangKy} className="small danger-btn" onClick={()=>update(r.maDangKy,'TuChoi')}>Từ chối</button></>}</td></> : <><td>{r.maSinhVien}</td><td>{r.sinhVien}</td><td>{r.lop}</td><td>{r.dot}</td><td>{String(r.mocThoiGian || '').slice(0,10)}</td><td>{r.ngayNop ? String(r.ngayNop).slice(0,10) : '—'}</td><td>{r.noiDungBaoCao || 'Chưa có nội dung'}</td><td>{statusLabel[r.trangThaiDuyet] || r.trangThaiDuyet}{r.trangThaiDuyet !== 'ChuaNop' && <div className="khoa-actions"><button disabled={busy===r.maTienDo} className="small success-btn" onClick={()=>reviewReport(r.maTienDo,'DaDuyet')}>Duyệt</button><button disabled={busy===r.maTienDo} className="small danger-btn" onClick={()=>reviewReport(r.maTienDo,'YeuCauSua')}>Yêu cầu sửa</button></div>}</td></>}</tr>)}{!rows.length && <tr><td colSpan={isRegistration ? 9 : 8}>Chưa có dữ liệu phù hợp.</td></tr>}</tbody></table></div>
    </div></Layout>
}
