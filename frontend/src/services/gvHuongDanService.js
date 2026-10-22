import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'
import * as XLSX from 'xlsx'

export const gvHuongDanService = {
  // Giảng viên xem danh sách sinh viên mình hướng dẫn
  getSVTheoGiangVien: (maGV, keyword = '') =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/giang-vien/${maGV}/sinh-vien`, {
      params: keyword ? { keyword } : {},
    }),

  // Khoa xem danh sách sinh viên chưa có GVHD
  getSVChuaPhanCong: (keyword = '') =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/khoa/sinh-vien-chua-phan-cong`, {
      params: keyword ? { keyword } : {},
    }),

  // Khoa xem tải công việc của các giảng viên
  getGiangVienTai: () =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/khoa/giang-vien-tai`),

  // Khoa: Lấy danh sách tất cả phân công hiện tại
  getTatCaPhanCong: () =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/khoa/tat-ca-phan-cong`),

  // Khoa phân công 1 sinh viên cho 1 giảng viên
  phanCongDonLe: (maGV, maSV) =>
    apiClient.post(`${API_ROUTES.GV_HUONG_DAN}/khoa/phan-cong`, { maGV, maSV }),

  // Khoa phân công hàng loạt sinh viên cho 1 giảng viên
  phanCongHangLoat: (maGV, danhSachMaSV) =>
    apiClient.post(`${API_ROUTES.GV_HUONG_DAN}/khoa/phan-cong-hang-loat`, { maGV, danhSachMaSV }),

  // Khoa đổi giảng viên hướng dẫn
  doiGiangVien: (maSo, maGVMoi) =>
    apiClient.put(`${API_ROUTES.GV_HUONG_DAN}/khoa/doi-gv`, { maSo, maGVMoi }),

  // Khoa hủy phân công
  huyPhanCong: (maSo) =>
    apiClient.delete(`${API_ROUTES.GV_HUONG_DAN}/khoa/huy/${maSo}`),

  // Khoa cập nhật chỉ tiêu số lượng sinh viên hướng dẫn của Giảng viên
  capNhatChiTieu: (maGV, soLuongMoi) =>
    apiClient.put(`${API_ROUTES.GV_HUONG_DAN}/khoa/giang-vien/${maGV}/chi-tieu`, { soLuongMoi }),

  // Giảng viên xem hồ sơ chuyên môn
  getProfile: (maGV) =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/giang-vien/${maGV}/profile`),

  // Giảng viên cập nhật hồ sơ chuyên môn
  updateProfile: (maGV, data) =>
    apiClient.put(`${API_ROUTES.GV_HUONG_DAN}/giang-vien/${maGV}/profile`, data),

  // Khoa: Lấy danh sách đề xuất phân công tự động (Smart Match & Cân bằng tải)
  deXuatPhanCongTuDong: () =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/khoa/phan-cong/tu-dong-de-xuat`),

  // Khoa: Xác nhận lưu kết quả phân công tự động vào Database
  xacNhanPhanCongTuDong: (danhSachPhanCong) =>
    apiClient.post(`${API_ROUTES.GV_HUONG_DAN}/khoa/phan-cong/tu-dong-xac-nhan`, { danhSachPhanCong }),

  // Khoa: Xuất danh sách phân công ra file Excel (.xlsx) chuẩn 2 sheets
  exportExcelPhanCong: (danhSachPhanCong, danhSachGiangVien, customFileName) => {
    if (!danhSachPhanCong || danhSachPhanCong.length === 0) return

    const fileName =
      customFileName ||
      `QuyetDinh_PhanCong_GVHD_FIT_HUIT_${new Date().toISOString().slice(0, 10)}.xlsx`

    // Sheet 1: Danh sách chi tiết phân công GVHD
    const phanCongRows = danhSachPhanCong.map((item, idx) => ({
      STT: idx + 1,
      'Mã SV': item.maSV,
      'Họ và tên sinh viên': item.hoTenSV,
      'Lớp': item.lop || '-',
      'Chuyên ngành': item.chuyenNganh || 'Công nghệ thông tin',
      'Điểm GPA': item.gpa != null ? Number(item.gpa).toFixed(2) : '-',
      'Đơn vị thực tập tiếp nhận': item.tenCongTy || 'Chưa phân bổ',
      'Mã GVHD': item.maGV,
      'Cán bộ hướng dẫn (GVHD)': item.hoTenGV,
      'Hướng chuyên môn GV': item.chuyenMonGV || 'Chung',
      'Ngày phân công': item.ngayPC ? new Date(item.ngayPC).toLocaleDateString('vi-VN') : '-',
      'Trạng thái': item.trangThai === 'DangHuongDan' ? 'Đang hướng dẫn' : item.trangThai,
    }))

    const wsPhanCong = XLSX.utils.json_to_sheet(phanCongRows)
    wsPhanCong['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
      { wch: 24 },
      { wch: 10 },
      { wch: 36 },
      { wch: 14 },
      { wch: 24 },
      { wch: 26 },
      { wch: 16 },
      { wch: 18 },
    ]

    // Sheet 2: Thống kê tải công việc từng Giảng viên
    const taiGvRows = (danhSachGiangVien || []).map((gv, idx) => {
      const soLuongHienTai = gv.soLuongHienTai || 0
      const soLuongSVHD = gv.soLuongSVHD || 0
      const tiLe = soLuongSVHD > 0 ? Math.round((soLuongHienTai / soLuongSVHD) * 100) : 0
      return {
        STT: idx + 1,
        'Mã giảng viên': gv.maGV,
        'Họ và tên giảng viên': gv.hoTen,
        'Hướng chuyên môn': gv.chuyenMon || '-',
        'Số lượng đang HD': soLuongHienTai,
        'Chỉ tiêu tối đa': soLuongSVHD,
        'Slot còn nhận': Math.max(0, soLuongSVHD - soLuongHienTai),
        'Tỷ lệ tải (%)': `${tiLe}%`,
        'Tình trạng': tiLe >= 100 ? 'Đã đủ tải' : tiLe >= 70 ? 'Gần tối đa' : 'Còn nhận thêm',
      }
    })

    const wsTaiGv = XLSX.utils.json_to_sheet(taiGvRows)
    wsTaiGv['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 25 },
      { wch: 25 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 15 },
      { wch: 18 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsPhanCong, 'Danh Sách Phân Công GVHD')
    XLSX.utils.book_append_sheet(wb, wsTaiGv, 'Thống Kê Tải Giảng Viên')

    XLSX.writeFile(wb, fileName)
  },
}
