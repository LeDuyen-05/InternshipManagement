import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'
import { tachHoTen, xuatBangHuitExcel } from '../../utils/exportHuitExcel'
import { useRoundLock } from '../../hooks/useRoundLock'
import RoundLockNotice from '../../components/common/RoundLockNotice'

export default function KhoaCommitteePage() {
  const [rounds, setRounds] = useState([])
  const [round, setRound] = useState('')
  const currentRound = useRef(round); currentRound.current = round
  const requestId = useRef(0)
  const [loadedRound, setLoadedRound] = useState(null)
  const [data, setData] = useState(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const lock = useRoundLock(selected?.maDot || round)
  const [scores, setScores] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const request = ++requestId.current
    setData(null); setLoadedRound(null); setSelected(null)
    try {
      const r = await apiClient.get('/khoa/clo', { params: round ? { maDot: round } : {} })
      if (request !== requestId.current || currentRound.current !== round) return
      setData(r.data); setLoadedRound(round); setError('')
    } catch (e) { if (request === requestId.current && currentRound.current === round) setError(e.response?.data?.message || 'Không tải được số liệu chấm điểm CLO.') }
  }, [round])
  useEffect(() => { apiClient.get('/khoa/dot-thuc-tap').then(r => setRounds(r.data || [])).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  const rows = useMemo(() => (data?.assessments || []).filter(x => !search || `${x.maSinhVien} ${x.sinhVien} ${x.lop} ${x.dot}`.toLowerCase().includes(search.toLowerCase())), [data, search])
  const pagination = usePagination(rows, JSON.stringify([round, search]))

  const exportExcel = async () => {
    if (!rows.length || loadedRound !== round) return
    const activeRoundObj = rounds.find(r => r.maSo === round)
    const maDotSafe = round || 'TatCa'
    const ngayXuat = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const fileName = 'ThongKe_CLO_HoiDong_' + maDotSafe + '_' + ngayXuat + '.xlsx'

    const columns = [
      { header: 'STT', key: 'stt', width: 6, align: 'center' },
      { header: 'Mã SV', key: 'maSV', width: 14, align: 'center' },
      { header: 'Họ và', key: 'hoLot', width: 18, align: 'left' },
      { header: 'Tên', key: 'ten', width: 10, align: 'left' },
      { header: 'Họ và tên', key: 'hoTen', width: 24, align: 'left' },
      { header: 'Lớp', key: 'lop', width: 12, align: 'center' },
      { header: 'Đợt thực tập', key: 'dot', width: 16, align: 'center' },
      { header: 'Điểm tổng kết', key: 'tongDiem', width: 14, align: 'center' },
      { header: 'Kết quả', key: 'ketQua', width: 20 },
      { header: 'Tạm tính', key: 'diemTamTinh', width: 14 },
      { header: 'Ngày chấm', key: 'ngayCham', width: 14, align: 'center' },
      { header: 'Xếp loại', key: 'xepLoai', width: 14, align: 'center' },
    ]

    const excelRows = rows.map((x, idx) => {
      const { hoLot, ten, hoTen } = tachHoTen(x.sinhVien)
      const diem = x.daDuDiem && x.tongDiem != null ? Number(x.tongDiem).toFixed(2) : x.ketQua || 'Chưa đủ điểm'
      const xepLoai = x.xepLoai || x.ketQua || 'Chưa đủ điểm'
      return {
        stt: idx + 1,
        maSV: x.maSinhVien,
        hoLot,
        ten,
        hoTen,
        lop: x.lop || '-',
        dot: x.dot || (activeRoundObj?.tenDot || '-'),
        tongDiem: diem, ketQua: x.ketQua, diemTamTinh: x.diemTamTinh,
        ngayCham: x.ngayCham ? String(x.ngayCham).slice(0, 10) : '—',
        xepLoai,
      }
    })

    await xuatBangHuitExcel({
      fileName,
      sheetName: 'ThongKeCLO',
      title: 'BẢNG THỐNG KÊ KẾT QUẢ ĐÁNH GIÁ CHUẨN ĐẦU RA (CLO / ABET)',
      subTitle: activeRoundObj
        ? ('Đợt thực tập: ' + activeRoundObj.tenDot + ' — Năm học: ' + activeRoundObj.namHoc)
        : 'Tổng hợp phiếu chấm thực tập tốt nghiệp toàn khoa',
      columns,
      rows: excelRows,
      signatures: [
        { title: 'NGƯỜI LẬP BẢNG', note: '(Ký, ghi rõ họ tên)', col: 3 },
        { title: 'TRƯỞNG KHOA', note: '(Ký, đóng dấu)', col: 9 },
      ],
    })
  }

  const beginEdit = item => { setSelected(item); setScores(Object.fromEntries((item.tieuChis || []).map(c => [c.maTieuChi, item.chiTiet?.find(x => x.maTieuChi === c.maTieuChi)?.diemCham ?? '']))) }
  const saveAssessment = async e => {
    if (lock.blocked) { e.preventDefault(); return }
    e.preventDefault(); setSaving(true); setError('')
    try {
      const chiTiet = (selected.tieuChis || []).filter(c => c.nhomDanhGia === 'GV' && scores[c.maTieuChi] !== '' && scores[c.maTieuChi] != null)
        .map(c => ({ maTieuChi: c.maTieuChi, diemCham: Number(scores[c.maTieuChi]) }))
      if (!chiTiet.length) { setError('Chưa nhập điểm GV; ô trống không được tự đổi thành 0.'); return }
      await apiClient.put('/khoa/clo/' + encodeURIComponent(selected.maPhieu), { chiTiet })
      setSelected(null); await load()
    } catch (e) { setError(e.response?.data?.message || 'Không lưu được phiếu chấm.') }
    finally { setSaving(false) }
  }
  return <Layout><div className="khoa-page-heading"><div><span className="eyebrow">HỘI ĐỒNG & ĐẢM BẢO CHẤT LƯỢNG</span><h1>Thống kê chuẩn đầu ra CLO / ABET</h1><p>Tổng hợp phiếu chấm thực tập và kết quả theo từng tiêu chí từ cơ sở dữ liệu.</p></div><div className="khoa-actions"><button className="primary" onClick={exportExcel} disabled={!rows.length}>Xuất báo cáo trình ký (.xlsx)</button><button className="small" onClick={() => window.print()}>In / Lưu PDF</button></div></div>
    {error && <div className="alert error">{error}</div>}
    <div className="khoa-filter-card"><label>Đợt thực tập<select value={round} onChange={e=>setRound(e.target.value)}><option value="">Tất cả các đợt</option>{rounds.map(x=><option key={x.maSo} value={x.maSo}>{x.tenDot} · {x.namHoc}</option>)}</select></label><input placeholder="Tìm sinh viên, MSSV, lớp..." value={search} onChange={e=>setSearch(e.target.value)}/><Link to="/khoa/tieu-chi" className="secondary-link">Cấu hình tiêu chí CLO →</Link></div>
    <div className="khoa-stat-grid four"><Stat label="Điểm trung bình" value={`${data?.averageScore ?? 0} / 10`} note="Chỉ phiếu đủ tiêu chí DN và GV"/><Stat label="Phiếu đánh giá" value={data?.total ?? 0} note="Sinh viên có phiếu trong đợt"/><Stat label="Đủ điểm" value={data?.complete ?? 0} note="Đủ hai phần theo rubric"/><Stat label="Chờ chấm" value={data?.pending ?? 0} note="Gồm chưa chấm và thiếu thành phần"/></div>
    <section className="khoa-panel"><div className="khoa-panel-head"><div><h2>Ma trận định lượng chuẩn đầu ra</h2><p>Điểm trung bình từng tiêu chí và mức tối đa được cấu hình.</p></div></div><div className="clo-matrix">{(data?.criteria || []).map((c,i)=><div className="clo-matrix-row" key={c.maTieuChi}><div className="clo-matrix-title"><span className="clo-code">{c.maTieuChi}</span><strong>{c.tenTieuChi}</strong><span>{c.average.toFixed(2)} / {c.diemToiDa}</span></div><div className="clo-track"><div style={{width:`${Math.min(100,c.average/c.diemToiDa*100)}%`,background:['#155eef','#2563eb','#075985','#6d5ce8'][i%4]}}/></div><small>{c.submissions} lượt đánh giá · đạt {c.diemToiDa ? Math.round(c.average/c.diemToiDa*100) : 0}% điểm tối đa</small></div>)}{!data?.criteria?.length&&<p className="empty-state">Chưa cấu hình tiêu chí. <Link to="/khoa/tieu-chi">Thêm tiêu chí CLO</Link></p>}</div></section>
    <div className="khoa-two-col"><section className="khoa-panel"><h2>Phổ điểm toàn khóa</h2><p>Phân bố điểm tổng hợp trên phiếu chấm.</p><div className="score-bars">{(data?.scoreDistribution||[]).map(x=><div className="score-bar-item" key={x.label}><div className="score-bar-value">{x.count}</div><div className="score-bar"><span style={{height:`${Math.max(5,(data?.complete ? x.count/data.complete*100 : 0))}%`}}/></div><small>{x.label}</small></div>)}</div></section><section className="khoa-panel"><h2>Quy trình đánh giá</h2><ol className="khoa-steps"><li><b>GVHD</b><span>Đánh giá tiêu chí và nộp phiếu cho giáo vụ</span></li><li><b>Doanh nghiệp</b><span>Ghi nhận nhận xét từ đơn vị tiếp nhận</span></li><li><b>Hội đồng</b><span>Đối chiếu minh chứng, tổng hợp kết quả</span></li><li><b>Giáo vụ</b><span>Xuất báo cáo phục vụ kiểm định CLO/ABET</span></li></ol></section></div>
    {selected&&<section className="khoa-panel"><RoundLockNotice lock={lock}/><div className="khoa-panel-head"><div><h2>Rà soát điểm CLO · {selected.sinhVien} ({selected.maSinhVien})</h2><p>Điểm tổng được tính từ các điểm thành phần và lưu vào phiếu chấm.</p></div><button className="small" onClick={()=>setSelected(null)}>Đóng</button></div><form className="score-edit-form" onSubmit={saveAssessment}>{(selected.tieuChis||[]).map(c=><label key={c.maTieuChi}><span>{c.maTieuChi} · {c.tenTieuChi}<small>tối đa {c.diemToiDa}</small></span><input type="number" min="0" max={c.diemToiDa} step="0.1" disabled={lock.blocked || c.nhomDanhGia === 'DN'} value={scores[c.maTieuChi]??''} onChange={e=>setScores({...scores,[c.maTieuChi]:e.target.value})}/></label>)}<div className="score-edit-total">Điểm tạm tính (chưa kết luận): <strong>{(selected.tieuChis||[]).reduce((sum,c)=>sum+Number(scores[c.maTieuChi]||0),0).toFixed(2)} / 10</strong></div><div className="khoa-actions"><button className="primary" disabled={saving || lock.blocked}>{saving?'Đang lưu…':'Lưu điểm CLO'}</button></div></form></section>}
    <section className="khoa-panel"><div className="khoa-panel-head"><div><h2>Danh sách phiếu đánh giá</h2><p>{rows.length} kết quả phù hợp bộ lọc.</p></div><Link to="/khoa/thong-ke" className="secondary-link">Xem thống kê tiến độ →</Link></div><div className="table-wrap"><table><thead><tr><th>MSSV</th><th>Sinh viên</th><th>Lớp</th><th>Đợt thực tập</th><th>Điểm tổng</th><th>Ngày chấm</th><th>Thao tác</th></tr></thead><tbody>{pagination.items.map(x=><tr key={x.maPhieu}><td>{x.maSinhVien}</td><td>{x.sinhVien}</td><td>{x.lop}</td><td>{x.dot}</td><td><strong>{x.daDuDiem ? x.tongDiem : x.ketQua || 'Chưa đủ điểm'}</strong></td><td>{x.ngayCham ? String(x.ngayCham).slice(0,10) : '—'}</td><td><button className="small" onClick={()=>beginEdit(x)}>{x.tongDiem==null?'Nhập điểm':'Rà soát điểm'}</button></td></tr>)}{!rows.length&&<tr><td colSpan="7">Chưa có phiếu chấm phù hợp.</td></tr>}</tbody></table></div><Pagination pagination={pagination} label="phiếu đánh giá"/></section>
  </Layout>
}
function Stat({label,value,note}) { return <div className="khoa-stat-card"><small>{label}</small><strong>{value}</strong><span>{note}</span></div> }
