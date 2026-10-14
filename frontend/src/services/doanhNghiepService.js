import apiClient from './api.js'

export const doanhNghiepService = {
  // Lấy danh sách doanh nghiệp đối tác (để switch context)
  getDanhSachDoanhNghiep: async () => {
    const res = await apiClient.get('/DoanhNghiep/danh-sach')
    return res.data
  },

  // Lấy dữ liệu Dashboard tổng quan của doanh nghiệp
  getTongQuan: async (maCongTy) => {
    const res = await apiClient.get(`/DoanhNghiep/tong-quan/${maCongTy}`)
    return res.data
  },

  // Lấy danh sách tin tuyển dụng của công ty
  getTinTuyenDung: async (maCongTy) => {
    const res = await apiClient.get(`/DoanhNghiep/tin-tuyen-dung/${maCongTy}`)
    return res.data
  },

  // Lưu/cập nhật tin tuyển dụng
  luuTinTuyenDung: async (data) => {
    const res = await apiClient.post('/DoanhNghiep/tin-tuyen-dung', data)
    return res.data
  },

  // Lấy danh sách ứng viên nộp hồ sơ vào công ty
  getUngVien: async (maCongTy) => {
    const res = await apiClient.get(`/DoanhNghiep/ung-vien/${maCongTy}`)
    return res.data
  },

  // Cập nhật trạng thái duyệt hồ sơ (DaDuyet, TuChoi)
  capNhatTrangThaiUngVien: async (maDK, trangThai) => {
    const res = await apiClient.put(`/DoanhNghiep/ung-vien/${maDK}/trang-thai`, { trangThai })
    return res.data
  },

  // Lấy danh sách lịch phỏng vấn
  getPhongVan: async (maCongTy) => {
    const res = await apiClient.get(`/DoanhNghiep/phong-van/${maCongTy}`)
    return res.data
  },

  // Tạo lịch phỏng vấn mới
  taoLichPhongVan: async (data) => {
    const res = await apiClient.post('/DoanhNghiep/phong-van', data)
    return res.data
  },

  // Cập nhật kết quả phỏng vấn
  capNhatKetQuaPhongVan: async (maPV, data) => {
    const res = await apiClient.put(`/DoanhNghiep/phong-van/${maPV}/ket-qua`, data)
    return res.data
  },

  // Lấy danh sách sinh viên đang thực tập chính thức
  getThucTapSinh: async (maCongTy) => {
    const res = await apiClient.get(`/DoanhNghiep/thuc-tap-sinh/${maCongTy}`)
    return res.data
  },

  // Đánh giá / Chấm điểm thực tập sinh
  danhGiaThucTapSinh: async (data) => {
    const res = await apiClient.post('/DoanhNghiep/danh-gia', data)
    return res.data
  },
}

export default doanhNghiepService
