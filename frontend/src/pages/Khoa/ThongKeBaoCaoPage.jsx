import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'
import { tachHoTen, xuatBangHuitExcel } from '../../utils/exportHuitExcel'

const labels = { ChuaNop: 'Chưa nộp', DaNop: 'Chờ duyệt', DaDuyet: 'Đã duyệt', YeuCauSua: 'Yêu cầu sửa' }
export default function ThongKeBaoCaoPage() {
  const [reports, setReports] = useState([])
  const [rounds, setRounds] = useState([])
  const [round, setRound] = useState('')
  const [error, setError] = useState('')
  const [loadedRound, setLoadedRound] = useState(null)
  useEffect(() => { apiClient.get('/khoa/dot-thuc-tap').then(r => setRounds(r.data || [])).catch(() => {}) }, [])
  useEffect(() => {
    let active = true
    setReports([]); setLoadedRound(null)
    apiClient.get('/khoa/theo-doi', { params: round ? { maDot: round } : {} }).then(r => {
      if (!active) return
      setReports(r.data.reports || []); setLoadedRound(round); setError('')
    }).catch(e => { if (active) setError(e.response?.data?.message || 'Không tải được số liệu báo cáo.') })
    return () => { active = false }
  }, [round])
  const currentReports = useMemo(() => reports.filter(x => !x.maPhanBoLuuTru), [reports])
  const archivedCount = reports.length - currentReports.length
  const stats = useMemo(() => Object.keys(labels).map(key => ({ key, label: labels[key], count: currentReports.filter(x => x.trangThaiDuyet === key).length })), [currentReports])
  const deadlineRows = Object.entries(currentReports.reduce((acc,r)=>{const key=String(r.mocThoiGian||'').slice(0,10);acc[key]??={};acc[key][r.trangThaiDuyet]=(acc[key][r.trangThaiDuyet]||0)+1;return acc},{})).sort(([a],[b])=>a.localeCompare(b))
  const deadlinePagination = usePagination(deadlineRows, round)
  const reportPagination = usePagination(reports, round)

  const exportExcel = async () => {
    if (!reports.length || loadedRound !== round) return
    const activeRoundObj = rounds.find(r => r.maSo === round)
    const maDotSafe = round || 'TatCa'
    const ngayXuat = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const fileName = 'BaoCao_TienDo_ThucTap_' + maDotSafe + '_' + ngayXuat + '.xlsx'

    const columns = [
      { header: 'STT', key: 'stt', width: 6, align: 'center' },
      { header: 'Mã SV', key: 'maSV', width: 14, align: 'center' },
      { header: 'Họ và', key: 'hoLot', width: 18, align: 'left' },
      { header: 'Tên', key: 'ten', width: 10, align: 'left' },
      { header: 'Họ và tên', key: 'hoTen', width: 24, align: 'left' },
      { header: 'Lớp', key: 'lop', width: 12, align: 'center' },
      { header: 'Đợt', key: 'dot', width: 14, align: 'center' },
      { header: 'Hạn báo cáo', key: 'hanBaoCao', width: 14, align: 'center' },
      { header: 'Ngày nộp', key: 'ngayNop', width: 14, align: 'center' },
      { header: 'Nội dung tóm tắt', key: 'noiDung', width: 36, align: 'left' },
      { header: 'Trạng thái duyệt', key: 'trangThai', width: 16, align: 'center' },
      { header: 'Phạm vi báo cáo', key: 'phamVi', width: 24, align: 'left' },
    ]

    const excelRows = reports.map((x, idx) => {
      const { hoLot, ten, hoTen } = tachHoTen(x.sinhVien)
      return {
        stt: idx + 1,
        maSV: x.maSinhVien,
        hoLot,
        ten,
        hoTen,
        lop: x.lop || '-',
        dot: x.dot || (activeRoundObj?.tenDot || '-'),
        hanBaoCao: x.mocThoiGian ? String(x.mocThoiGian).slice(0, 10) : '-',
        ngayNop: x.ngayNop ? String(x.ngayNop).slice(0, 10) : '-',
        noiDung: x.noiDungBaoCao || '-',
        trangThai: labels[x.trangThaiDuyet] || x.trangThaiDuyet || 'Chưa nộp',
        phamVi: x.maPhanBoLuuTru ? 'Lịch sử trước đổi nơi' : 'Hiện hành',
      }
    })

    await xuatBangHuitExcel({
      fileName,
      sheetName: 'TienDoThucTap',
      reportType: 'internal',
      title: 'BÁO CÁO TIẾN ĐỘ THỰC TẬP SINH VIÊN TOÀN KHOA',
      subTitle: activeRoundObj
        ? ('Đợt thực tập: ' + activeRoundObj.tenDot + ' — Năm học: ' + activeRoundObj.namHoc)
        : 'Theo dõi tiến độ báo cáo tuần toàn khoa',
      columns,
      rows: excelRows,
      signatures: [
        { title: 'NGƯỜI LẬP BẢNG', note: '(Ký, ghi rõ họ tên)', col: 3 },
        { title: 'TRƯỞNG KHOA', note: '(Ký, đóng dấu)', col: 10 },
      ],
    })
  }

  return <Layout><div className="page-head"><div><span className="eyebrow">GIÁO VỤ KHOA</span><h2>Thống kê & báo cáo tiến độ</h2><p>Số liệu được tổng hợp trực tiếp từ các báo cáo sinh viên trong hệ thống.</p></div><button className="primary" onClick={exportExcel} disabled={!reports.length}>Xuất tiến độ nội bộ (.xlsx)</button></div>{error&&<div className="alert error">{error}</div>}
    <div className="tabbar"><label>Đợt thực tập <select value={round} onChange={e=>setRound(e.target.value)}><option value="">Tất cả đợt</option>{rounds.map(x=><option key={x.maSo} value={x.maSo}>{x.tenDot} · {x.namHoc}</option>)}</select></label><span className="badge">Tổng báo cáo hiện hành: {currentReports.length}</span>{archivedCount > 0 && <span className="badge">Lịch sử đổi nơi: {archivedCount}</span>}{stats.map(s=><span className="badge" key={s.key}>{s.label}: {s.count}</span>)}</div>
    <div className="info-card"><h3>Tình hình theo mốc báo cáo</h3><div className="table-wrap"><table><thead><tr><th>Hạn nộp</th><th>Số báo cáo</th><th>Đã duyệt</th><th>Chờ duyệt</th><th>Yêu cầu sửa</th><th>Chưa nộp</th><th>Tỷ lệ hoàn tất</th></tr></thead><tbody>{deadlinePagination.items.map(([date,counts])=>{const total=Object.values(counts).reduce((a,b)=>a+b,0);const complete=total-(counts.ChuaNop||0);return <tr key={date}><td>{date||'—'}</td><td>{total}</td><td>{counts.DaDuyet||0}</td><td>{counts.DaNop||0}</td><td>{counts.YeuCauSua||0}</td><td>{counts.ChuaNop||0}</td><td>{total?Math.round(complete/total*100):0}%</td></tr>})}{!reports.length&&<tr><td colSpan="7">Chưa có dữ liệu báo cáo.</td></tr>}</tbody></table></div><Pagination pagination={deadlinePagination} label="thống kê theo hạn báo cáo"/></div>
    <div className="info-card"><h3>Ma trận trạng thái theo sinh viên</h3><div className="table-wrap"><table><thead><tr><th>Sinh viên</th><th>Mã SV</th><th>Lớp</th><th>Đợt</th><th>Hạn báo cáo</th><th>Trạng thái</th></tr></thead><tbody>{reportPagination.items.map(x=><tr key={x.maTienDo}><td>{x.sinhVien}</td><td>{x.maSinhVien}</td><td>{x.lop}</td><td>{x.dot}</td><td>{String(x.mocThoiGian||'').slice(0,10)}</td><td>{labels[x.trangThaiDuyet]||x.trangThaiDuyet}{x.maPhanBoLuuTru && <div className="hint">Lịch sử trước khi đổi nơi — chỉ xem</div>}</td></tr>)}</tbody></table></div><Pagination pagination={reportPagination} label="ma trận tiến độ sinh viên"/></div>
  </Layout>
}
