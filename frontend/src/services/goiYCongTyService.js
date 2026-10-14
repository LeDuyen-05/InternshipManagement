import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'

export const goiYCongTyService = {
  // 1. Lấy danh sách Top-K công ty được AI gợi ý cho sinh viên
  getTopK: (maSV, topK = 5) => {
    return apiClient.get(`${API_ROUTES.GOI_Y_CONG_TY}/sinhvien/${maSV}`, {
      params: { topK },
    })
  },

  // 2. Kích hoạt tính toán lại độ tương đồng AI
  recalculate: (maSV, topK = 5) => {
    return apiClient.post(`${API_ROUTES.GOI_Y_CONG_TY}/sinhvien/${maSV}/recalculate`, null, {
      params: { topK },
    })
  },

  // 3. Cập nhật hồ sơ năng lực (kỹ năng, công nghệ, mô tả CV) và tính toán lại
  capNhatHoSo: (maSV, payload) => {
    return apiClient.put(`${API_ROUTES.GOI_Y_CONG_TY}/sinhvien/${maSV}/hoso`, payload)
  },
}
