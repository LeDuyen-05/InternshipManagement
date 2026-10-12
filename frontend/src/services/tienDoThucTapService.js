import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'

export const tienDoThucTapService = {
  // Lấy danh sách tiến độ các tuần của sinh viên (dùng cho cả SV & GVHD)
  getTienDoBySinhVien: async (maSV) => {
    const res = await apiClient.get(`/TienDoThucTap/sinhvien/${maSV}`)
    return res.data || res
  },

  // Giảng viên lấy báo cáo chờ duyệt
  getBaoCaoChoDuyet: (maGV) => {
    return apiClient.get(`${API_ROUTES.TIEN_DO || '/TienDoThucTap'}/giangvien/${maGV}/choduyet`)
  },

  // Chi tiết tiến độ
  getChiTietTienDo: (maTienDo) => {
    return apiClient.get(`${API_ROUTES.TIEN_DO || '/TienDoThucTap'}/${maTienDo}`)
  },

  // Giảng viên duyệt tiến độ
  duyetTienDo: (maTienDo, trangThaiDuyet) => {
    return apiClient.put(`${API_ROUTES.TIEN_DO || '/TienDoThucTap'}/${maTienDo}/duyet`, {
      trangThaiDuyet: trangThaiDuyet
    })
  },

  // Sinh viên nộp hoặc cập nhật báo cáo tuần
  nopBaoCao: async (payload) => {
    const res = await apiClient.post('/TienDoThucTap/nop-bao-cao', payload)
    return res.data
  },
}

export default tienDoThucTapService

