import apiClient from './api'

export const studentSupportService = {
  /**
   * Lấy danh sách các lần hỗ trợ của sinh viên đang đăng nhập
   * @param {string} maDot
   */
  async getDanhSachHoTro(maDot) {
    const res = await apiClient.get('/sinh-vien/ho-tro', {
      params: { maDot },
    })
    return res.data
  },

  /**
   * Sinh viên gửi phản hồi nhận hoặc từ chối hỗ trợ
   * @param {string} maLan
   * @param {string} maDot
   * @param {Object} payload { phienBan, phanHoi, lyDo }
   */
  async guiPhanHoi(maLan, maDot, payload) {
    const res = await apiClient.put(
      `/sinh-vien/ho-tro/${encodeURIComponent(maLan)}/phan-hoi`,
      {
        ...payload,
        daTiepNhanTrucTiep: false,
      },
      { params: { maDot } }
    )
    return res.data
  },
}

export default studentSupportService
