import apiClient from './api'

export const roundStudentImportService = {
  /**
   * Lấy danh sách đợt thực tập hợp lệ để import
   */
  async getRounds() {
    const res = await apiClient.get('/nhap-sinh-vien/dot-thuc-tap')
    return res.data || []
  },

  /**
   * Tải file mẫu CSV
   */
  async downloadMauCsv() {
    const res = await apiClient.get('/nhap-sinh-vien/mau-csv', {
      responseType: 'blob',
    })
    return res.data
  },

  /**
   * Xem trước danh sách từ rows JSON (dùng cho XLSX đọc ở FE)
   * @param {Object} payload { maDot, cheDo, tenNguon, namHoc, maLoaiThucTap, rows }
   */
  async previewJson(payload) {
    const res = await apiClient.post('/nhap-sinh-vien/xem-truoc', payload)
    return res.data
  },

  /**
   * Xem trước từ file CSV upload
   * @param {FormData} formData Chứa maDot, cheDo, file
   */
  async previewCsv(formData) {
    const res = await apiClient.post('/nhap-sinh-vien/xem-truoc-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  /**
   * Lấy thông tin phiên xem trước
   * @param {string} id
   */
  async getSession(id) {
    const res = await apiClient.get(`/nhap-sinh-vien/${encodeURIComponent(id)}`)
    return res.data
  },

  /**
   * Xác nhận nhập dữ liệu phiên xem trước
   * @param {string} id
   * @param {number} phienBan
   */
  async commit(id, phienBan = 0) {
    const res = await apiClient.post(`/nhap-sinh-vien/${encodeURIComponent(id)}/xac-nhan`, {
      phienBan,
    })
    return res.data
  },

  /**
   * Lấy lịch sử import của người dùng
   * @param {string} maDot
   * @param {number} page
   */
  async getHistory(maDot, page = 1) {
    const params = { page }
    if (maDot) params.maDot = maDot
    const res = await apiClient.get('/nhap-sinh-vien/lich-su', { params })
    return res.data
  },
}

export default roundStudentImportService
