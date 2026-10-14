import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'

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
}
