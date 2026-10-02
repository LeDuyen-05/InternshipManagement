import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'

// Service mẫu — dùng làm khuôn mẫu cho các module khác.
export const sinhVienService = {
  getAll: () => apiClient.get(API_ROUTES.SINH_VIEN),
  getById: (maSV) => apiClient.get(`${API_ROUTES.SINH_VIEN}/${maSV}`),
  create: (data) => apiClient.post(API_ROUTES.SINH_VIEN, data),
  update: (maSV, data) => apiClient.put(`${API_ROUTES.SINH_VIEN}/${maSV}`, data),
}
