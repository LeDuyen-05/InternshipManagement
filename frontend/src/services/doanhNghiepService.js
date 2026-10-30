import apiClient from './api.js'

export const doanhNghiepService = {
  // Lấy danh sách doanh nghiệp đối tác (để switch context)
  getDanhSachDoanhNghiep: async () => {
    const res = await apiClient.get('/DoanhNghiep/danh-sach')
    return res.data
  },

  // Lấy thông tin công ty theo mã đại diện
  getByDaiDien: async (maDaiDien) => {
    const res = await apiClient.get(`/DoanhNghiep/theo-dai-dien/${maDaiDien}`)
    return res.data
  },

  // Lấy dữ liệu Dashboard tổng quan của doanh nghiệp
  getTongQuan: async (maCongTy, maDot) => {
    if (!maDot) throw new Error('Chọn đợt thực tập trước khi tải dữ liệu doanh nghiệp.')
    const res = await apiClient.get(`/DoanhNghiep/tong-quan/${maCongTy}`, { params: { maDot } })
    return res.data
  },

  // Lấy danh sách tin tuyển dụng của công ty
  getTinTuyenDung: async (maCongTy, maDot) => {
    if (!maDot) throw new Error('Chọn đợt thực tập trước khi tải dữ liệu doanh nghiệp.')
    const res = await apiClient.get(`/DoanhNghiep/tin-tuyen-dung/${maCongTy}`, { params: { maDot } })
    return res.data
  },

  // Lưu/cập nhật tin tuyển dụng
  luuTinTuyenDung: async (data) => {
    const res = await apiClient.post('/DoanhNghiep/tin-tuyen-dung', data)
    return res.data
  },

  // Quản lý đa vị trí tuyển dụng theo đợt
  themViTri: async (data) => {
    const res = await apiClient.post('/DoanhNghiep/vi-tri', data)
    return res.data
  },

  capNhatViTri: async (data) => {
    const res = await apiClient.put('/DoanhNghiep/vi-tri', data)
    return res.data
  },

  toggleViTri: async (maViTri) => {
    const res = await apiClient.patch(`/DoanhNghiep/vi-tri/${maViTri}/toggle`)
    return res.data
  },

  xoaViTri: async (maViTri) => {
    const res = await apiClient.delete(`/DoanhNghiep/vi-tri/${maViTri}`)
    return res.data
  },

  // Lấy danh sách ứng viên nộp hồ sơ vào công ty
  getUngVien: async (maCongTy, maDot) => {
    if (!maDot) throw new Error('Chọn đợt thực tập trước khi tải dữ liệu doanh nghiệp.')
    const res = await apiClient.get(`/DoanhNghiep/ung-vien/${maCongTy}`, { params: { maDot } })
    return res.data
  },

  // Cập nhật trạng thái duyệt hồ sơ (DaDuyet, TuChoi)
  capNhatTrangThaiUngVien: async (maDK, trangThai) => {
    const res = await apiClient.put(`/DoanhNghiep/ung-vien/${maDK}/trang-thai`, { trangThai })
    return res.data
  },

  // Lấy danh sách lịch phỏng vấn
  getPhongVan: async (maCongTy, maDot) => {
    if (!maDot) throw new Error('Chọn đợt thực tập trước khi tải dữ liệu doanh nghiệp.')
    const res = await apiClient.get(`/DoanhNghiep/phong-van/${maCongTy}`, { params: { maDot } })
    return res.data
  },

  // Tạo lịch phỏng vấn mới
  taoLichPhongVan: async (data) => {
    const res = await apiClient.post('/DoanhNghiep/phong-van', data)
    return res.data
  },

  // Dời lịch / đổi người phỏng vấn / hình thức cho buổi chưa có kết quả
  doiLichPhongVan: async (maPV, data) => {
    const res = await apiClient.put(`/DoanhNghiep/phong-van/${maPV}`, data)
    return res.data
  },

  // Cập nhật kết quả phỏng vấn
  capNhatKetQuaPhongVan: async (maPV, data) => {
    const res = await apiClient.put(`/DoanhNghiep/phong-van/${maPV}/ket-qua`, data)
    return res.data
  },

  danhGia: async data => (await apiClient.post('/DoanhNghiep/danh-gia', data)).data,

  // Lấy danh sách sinh viên đang thực tập chính thức
  getThucTapSinh: async (maCongTy, maDot) => {
    if (!maDot) throw new Error('Chọn đợt thực tập trước khi tải dữ liệu doanh nghiệp.')
    const res = await apiClient.get(`/DoanhNghiep/thuc-tap-sinh/${maCongTy}`, { params: { maDot } })
    return res.data
  },

}

export default doanhNghiepService
