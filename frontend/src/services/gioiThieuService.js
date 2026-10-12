import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'

export const gioiThieuService = {
  // Lấy toàn bộ danh sách giới thiệu (Dành cho Khoa hoặc tổng quan)
  getAll: () => apiClient.get(API_ROUTES.GIOI_THIEU),

  // Lấy danh sách công ty do 1 giảng viên cụ thể giới thiệu
  getByGiangVien: (maGV) => apiClient.get(`${API_ROUTES.GIOI_THIEU}/giang-vien/${maGV}`),

  // Lấy chi tiết 1 bản ghi
  getById: (id) => apiClient.get(`${API_ROUTES.GIOI_THIEU}/${id}`),

  // Giảng viên gửi giới thiệu công ty mới
  create: (data) => apiClient.post(API_ROUTES.GIOI_THIEU, data),

  // Giảng viên đề xuất công ty hoàn toàn mới (nhập tay hoặc từ JD - UC-01)
  deXuatMoi: (data) => apiClient.post(`${API_ROUTES.GIOI_THIEU}/de-xuat`, data),

  // Khoa cập nhật trạng thái kết nối (DangXem / DaDuyet / TuChoi)
  updateTrangThai: (id, trangThaiKetNoi) =>
    apiClient.put(`${API_ROUTES.GIOI_THIEU}/${id}/trang-thai`, { trangThaiKetNoi }),

  // Xóa bản ghi giới thiệu
  delete: (id) => apiClient.delete(`${API_ROUTES.GIOI_THIEU}/${id}`),
}
