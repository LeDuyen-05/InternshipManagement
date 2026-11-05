import apiClient from './api'

export const failedInternshipService = {
  /**
   * Lấy danh sách kết quả sinh viên rớt thực tập (phân trang & lọc)
   * @param {Object} params { maDot, namHoc, maLoaiThucTap, lop, search, nguyenNhan, nguon, page, pageSize }
   */
  async getDanhSach(params = {}) {
    const cleanParams = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        cleanParams[k] = v
      }
    })
    const res = await apiClient.get('/khoa/ket-qua-thuc-tap/rot', { params: cleanParams })
    return res.data
  },

  /**
   * Lấy chi tiết hồ sơ rớt thực tập của sinh viên
   * @param {string} maSV
   * @param {string} maDot
   * @param {string} [nguon='TuDong']
   */
  async getChiTietHoSo(maSV, maDot, nguon = 'TuDong') {
    const res = await apiClient.get(`/khoa/ket-qua-thuc-tap/rot/${encodeURIComponent(maSV)}/ho-so`, {
      params: { maDot, nguon },
    })
    return res.data
  },

  /**
   * Xuất danh sách sinh viên rớt thực tập theo định dạng xlsx hoặc csv
   * @param {Object} params
   * @param {string} [format='xlsx']
   */
  async exportFile(params = {}, format = 'xlsx') {
    const cleanParams = { format }
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        cleanParams[k] = v
      }
    })
    const res = await apiClient.get('/khoa/ket-qua-thuc-tap/rot/export', {
      params: cleanParams,
      responseType: 'blob',
    })
    return res.data
  },
}

export default failedInternshipService
