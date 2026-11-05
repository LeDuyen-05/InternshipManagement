import apiClient from './api'

export const rubricService = {
  /**
   * Lấy danh sách loại thực tập (TTNN, TTKS...)
   */
  async getLoaiThucTap() {
    const res = await apiClient.get('/loai-thuc-tap')
    return res.data || []
  },

  /**
   * Lấy danh sách bộ tiêu chí rubric (có thể lọc theo maLoaiThucTap)
   * @param {string} [maLoaiThucTap]
   */
  async getBoTieuChi(maLoaiThucTap) {
    const params = {}
    if (maLoaiThucTap && maLoaiThucTap !== 'ALL') {
      params.maLoaiThucTap = maLoaiThucTap
    }
    const res = await apiClient.get('/khoa/bo-tieu-chi', { params })
    return res.data || []
  },

  /**
   * Lấy chi tiết bộ tiêu chí rubric và các tiêu chí thành phần
   * @param {string} id
   */
  async getBoTieuChiDetail(id) {
    const res = await apiClient.get(`/khoa/bo-tieu-chi/${encodeURIComponent(id)}`)
    return res.data
  },

  /**
   * Tạo bộ tiêu chí mới (nháp hoặc sao chép)
   * @param {Object} payload { maRubric, tenBo, maLoaiThucTap, phienBan, saoChepTu }
   */
  async createBoTieuChi(payload) {
    const res = await apiClient.post('/khoa/bo-tieu-chi', payload)
    return res.data
  },

  /**
   * Phát hành bộ tiêu chí hợp lệ
   * @param {string} id
   * @param {number} phienBanCapNhat
   */
  async phatHanhBoTieuChi(id, phienBanCapNhat = 0) {
    const res = await apiClient.post(`/khoa/bo-tieu-chi/${encodeURIComponent(id)}/phat-hanh`, {
      phienBanCapNhat,
    })
    return res.data
  },

  /**
   * Ngừng áp dụng bộ tiêu chí đã phát hành
   * @param {string} id
   * @param {number} phienBanCapNhat
   */
  async ngungApDungBoTieuChi(id, phienBanCapNhat = 0) {
    const res = await apiClient.post(`/khoa/bo-tieu-chi/${encodeURIComponent(id)}/ngung-ap-dung`, {
      phienBanCapNhat,
    })
    return res.data
  },

  /**
   * Lưu hoặc cập nhật tiêu chí thuộc bộ nháp
   * @param {Object} payload
   */
  async saveTieuChi(payload, isUpdate = false) {
    if (isUpdate) {
      const res = await apiClient.put(`/khoa/tieu-chi/${encodeURIComponent(payload.maTieuChi)}`, payload)
      return res.data
    }
    const res = await apiClient.post('/khoa/tieu-chi', payload)
    return res.data
  },

  /**
   * Xóa tiêu chí thuộc bộ nháp
   * @param {string} maTieuChi
   */
  async deleteTieuChi(maTieuChi) {
    const res = await apiClient.delete(`/khoa/tieu-chi/${encodeURIComponent(maTieuChi)}`)
    return res.data
  },
}

export default rubricService
