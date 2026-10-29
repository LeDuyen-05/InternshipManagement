import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'

export const tienDoThucTapService = {
  // Lấy danh sách tiến độ các tuần của sinh viên (dùng cho cả SV & GVHD)
  getTienDoBySinhVien: async (maSV, maDot = null) => {
    const params = maDot ? { maDot } : {}
    const res = await apiClient.get(`${API_ROUTES.TIEN_DO}/sinhvien/${maSV}`, { params })
    return res.data
  },

  // Giảng viên lấy báo cáo chờ duyệt
  getBaoCaoChoDuyet: async (maGV) => {
    const res = await apiClient.get(`${API_ROUTES.TIEN_DO}/giangvien/${maGV}/choduyet`)
    return res.data
  },

  // Chi tiết tiến độ
  getChiTietTienDo: async (maTienDo) => {
    const res = await apiClient.get(`${API_ROUTES.TIEN_DO}/${maTienDo}`)
    return res.data
  },

  // Giảng viên duyệt tiến độ
  duyetTienDo: async (maTienDo, trangThaiDuyet, nhanXet = null) => {
    const res = await apiClient.put(`${API_ROUTES.TIEN_DO}/${maTienDo}/duyet`, {
      trangThaiDuyet,
      nhanXet,
      nhanXetGV: nhanXet,
    })
    return res.data
  },

  // Sinh viên nộp hoặc cập nhật báo cáo tuần
  nopBaoCao: async (payload) => {
    const res = await apiClient.post(`${API_ROUTES.TIEN_DO}/nop-bao-cao`, payload)
    return res.data
  },
}

export default tienDoThucTapService
