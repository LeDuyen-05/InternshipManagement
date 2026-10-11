import apiClient from './api'

export const tienDoThucTapService = {
  // Lấy danh sách tiến độ các tuần của sinh viên
  getTienDoBySinhVien: async (maSV) => {
    const res = await apiClient.get(`/TienDoThucTap/sinhvien/${maSV}`)
    return res.data
  },

  // Nộp hoặc cập nhật báo cáo tuần
  nopBaoCao: async (payload) => {
    const res = await apiClient.post('/TienDoThucTap/nop-bao-cao', payload)
    return res.data
  },
}
