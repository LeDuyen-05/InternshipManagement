import apiClient from './api'

export const dangKyThucTapService = {
  // Lấy danh sách công ty đã duyệt đang tuyển dụng
  getDanhSachCongTy: async () => {
    const res = await apiClient.get('/CongTy')
    return res.data
  },

  // Đề xuất công ty mới (sinh viên tự liên hệ)
  deXuatCongTy: async (payload) => {
    const res = await apiClient.post('/CongTy/de-xuat', payload)
    return res.data
  },

  // Các doanh nghiệp sinh viên đã tự đề xuất (kèm trạng thái Khoa thẩm định)
  getDeXuatCuaToi: async () => {
    const res = await apiClient.get('/CongTy/de-xuat/cua-toi')
    return res.data
  },

  // Điều kiện đăng ký nguyện vọng trong đợt (đã trúng tuyển / đã hoàn thành học phần thì không được)
  getDieuKien: async (maDot) => {
    const res = await apiClient.get('/DangKyThucTap/dieu-kien', { params: { maDot } })
    return res.data
  },

  // Lấy danh sách nguyện vọng của sinh viên
  getDangKyBySinhVien: async (maSV) => {
    const res = await apiClient.get(`/DangKyThucTap/sinhvien/${maSV}`)
    return res.data
  },

  // Nộp đơn đăng ký nguyện vọng
  dangKyThucTap: async (payload) => {
    const res = await apiClient.post('/DangKyThucTap', payload)
    return res.data
  },

  // Hủy đăng ký nguyện vọng
  huyDangKyThucTap: async (maDK) => {
    const res = await apiClient.delete(`/DangKyThucTap/${maDK}`)
    return res.data
  },
}
