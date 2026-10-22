import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'
import * as XLSX from 'xlsx'

export const thongKeService = {
  // 1. Gọi API lấy dữ liệu thống kê tổng hợp & báo cáo CLO
  getBaoCaoThongKe: (maDot) => {
    return apiClient.get(`${API_ROUTES.THONG_KE}/bao-cao`, {
      params: { maDot },
    })
  },

  // 1b. Lấy danh sách đợt thực tập trực tiếp từ database
  getDanhSachDotThucTap: () => {
    return apiClient.get(`${API_ROUTES.THONG_KE}/dot-thuc-tap`)
  },

  // 2. Lấy link tải file CSV từ backend
  getExportCsvUrl: (maDot) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
    return `${baseUrl}${API_ROUTES.THONG_KE}/export-csv?maDot=${encodeURIComponent(maDot || '')}`
  },

  // 3. Xuất file Microsoft Excel (.xlsx) chuẩn hóa nhiều sheet trên Client
  exportExcel: (data, customFileName) => {
    if (!data) return

    const fileName =
      customFileName ||
      `BaoCao_ThongKe_CLO_${data.maDot || 'TongHop'}_${new Date().toISOString().slice(0, 10)}.xlsx`

    // Sheet 1: Bảng điểm CLO chi tiết
    const bangDiemRows = (data.danhSachBangDiem || []).map((sv, idx) => ({
      STT: idx + 1,
      'Mã sinh viên': sv.maSV,
      'Họ và tên': sv.hoTen,
      Lớp: sv.lop || '-',
      'Doanh nghiệp tiếp nhận': sv.tenCongTy || '-',
      'Giảng viên hướng dẫn': sv.tenGVHD || '-',
      'CLO 1 - Kiến thức (30%)': sv.diemCLO1 != null ? sv.diemCLO1.toFixed(2) : '-',
      'CLO 2 - Kỹ năng (35%)': sv.diemCLO2 != null ? sv.diemCLO2.toFixed(2) : '-',
      'CLO 3 - Tác phong (20%)': sv.diemCLO3 != null ? sv.diemCLO3.toFixed(2) : '-',
      'CLO 4 - Báo cáo (15%)': sv.diemCLO4 != null ? sv.diemCLO4.toFixed(2) : '-',
      'Điểm tổng kết': sv.tongDiem != null ? sv.tongDiem.toFixed(2) : '-',
      'Xếp loại': sv.xepLoai,
      'Kết quả': sv.ketQua,
    }))

    const wsBangDiem = XLSX.utils.json_to_sheet(bangDiemRows)

    // Tự động căn chỉnh độ rộng cột cho đẹp
    wsBangDiem['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 24 },
      { wch: 12 },
      { wch: 30 },
      { wch: 22 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 14 },
      { wch: 18 },
      { wch: 12 },
    ]

    // Sheet 2: Tổng hợp KPI & Phân bố điểm
    const tq = data.tongQuan || {}
    const tongHopRows = [
      { 'Chỉ số KPI': 'Đợt thực tập', 'Giá trị': `${data.tenDot} (${data.maDot})` },
      { 'Chỉ số KPI': 'Tổng số sinh viên', 'Giá trị': tq.tongSinhVien || 0 },
      { 'Chỉ số KPI': 'Đã phân công GVHD', 'Giá trị': `${tq.daPhanCongGVHD || 0} (${tq.tiLePhanCong || 0}%)` },
      { 'Chỉ số KPI': 'Chưa phân công GVHD', 'Giá trị': tq.chuaPhanCongGVHD || 0 },
      { 'Chỉ số KPI': 'Tiến độ: Đã duyệt / Tổng báo cáo', 'Giá trị': `${tq.tienDoDaDuyet || 0} / ${tq.tongBaoCaoTienDo || 0}` },
      { 'Chỉ số KPI': 'Tiến độ: Chờ duyệt', 'Giá trị': tq.tienDoChoDuyet || 0 },
      { 'Chỉ số KPI': 'Sinh viên đã chấm điểm CLO', 'Giá trị': tq.daChamCLO || 0 },
      { 'Chỉ số KPI': 'Sinh viên chưa chấm điểm', 'Giá trị': tq.chuaChamCLO || 0 },
      { 'Chỉ số KPI': 'Điểm trung bình CLO (thang 10)', 'Giá trị': tq.diemTrungBinhCLO || 0 },
      { 'Chỉ số KPI': 'Số sinh viên Đạt (>= 5.0)', 'Giá trị': `${tq.soLuongDat || 0} (${tq.tiLeDatCLO || 0}%)` },
      { 'Chỉ số KPI': 'Số sinh viên Không đạt (< 5.0)', 'Giá trị': tq.soLuongKhongDat || 0 },
    ]
    const wsTongHop = XLSX.utils.json_to_sheet(tongHopRows)
    wsTongHop['!cols'] = [{ wch: 35 }, { wch: 30 }]

    // Sheet 3: Tải giảng viên hướng dẫn
    const taiGvRows = (data.taiGiangVien || []).map((gv, idx) => ({
      STT: idx + 1,
      'Mã giảng viên': gv.maGV,
      'Họ và tên': gv.hoTen,
      'Chuyên môn': gv.chuyenMon || '-',
      'Đang hướng dẫn': gv.soLuongHienTai,
      'Chỉ tiêu tối đa': gv.soLuongSVHD,
      'Tỷ lệ tải (%)': `${gv.tiLeTai}%`,
      'Tình trạng': gv.tiLeTai >= 100 ? 'Đã đủ tải' : gv.tiLeTai >= 70 ? 'Bình thường' : 'Còn nhận thêm',
    }))
    const wsTaiGv = XLSX.utils.json_to_sheet(taiGvRows)
    wsTaiGv['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 24 }, { wch: 22 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }]

    // Tạo Workbook và gắn các sheet
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsBangDiem, 'Bảng điểm CLO')
    XLSX.utils.book_append_sheet(wb, wsTongHop, 'Tổng quan KPI')
    XLSX.utils.book_append_sheet(wb, wsTaiGv, 'Tải Giảng Viên')

    // Tải file trực tiếp về máy
    XLSX.writeFile(wb, fileName)
  },
}
