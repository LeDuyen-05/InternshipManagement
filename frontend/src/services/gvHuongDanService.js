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
}
