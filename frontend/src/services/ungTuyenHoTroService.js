import apiClient from './api'

export const ungTuyenHoTroService = {
  async moDangKyBoSung(maSV, maLan, maDot, payload) {
    await apiClient.post(`/khoa/lan-ho-tro/${encodeURIComponent(maLan)}/sinh-vien/${encodeURIComponent(maSV)}/mo-dang-ky`, payload, { params: { maDot } })
  },
  /**
   * Lấy danh sách tổng hợp ứng tuyển & hỗ trợ
   * @param {Object} params { maDot, search, lop, ketQua, tinhTrangNoi, canHoTro, page, pageSize }
   */
  async getDanhSach(params = {}) {
    const cleanParams = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && v !== 'ALL') {
        cleanParams[k] = v
      }
    })
    const res = await apiClient.get('/khoa/ung-tuyen-ho-tro', { params: cleanParams })
    return res.data
  },

  /**
   * Lấy chi tiết lịch sử ứng tuyển & hỗ trợ của một sinh viên trong đợt
   * @param {string} maSV
   * @param {string} maDot
   */
  async getChiTiet(maSV, maDot) {
    const res = await apiClient.get(`/khoa/ung-tuyen-ho-tro/${encodeURIComponent(maSV)}`, {
      params: { maDot },
    })
    return res.data
  },

  /**
   * Tạo lần hỗ trợ mới hoặc thêm sinh viên vào lần hỗ trợ
   * @param {string} maDot
   * @param {Object} payload { tenLan, ngayHoTro, maSinhViens, phienBan, maLanTruoc }
   */
  async taoLanHoTro(maDot, payload) {
    const res = await apiClient.post('/khoa/lan-ho-tro', payload, {
      params: { maDot },
    })
    return res.data
  },

  /**
   * Khoa ghi nhận trực tiếp phản hồi của sinh viên (nhận hoặc từ chối hỗ trợ)
   * @param {string} maSV
   * @param {string} maLan
   * @param {string} maDot
   * @param {Object} payload { phienBan, phanHoi, lyDo, daTiepNhanTrucTiep: true }
   */
  async ghiNhanPhanHoi(maSV, maLan, maDot, payload) {
    const res = await apiClient.put(
      `/khoa/ung-tuyen-ho-tro/${encodeURIComponent(maSV)}/lan-ho-tro/${encodeURIComponent(maLan)}/phan-hoi`,
      { ...payload, daTiepNhanTrucTiep: true },
      { params: { maDot } }
    )
    return res.data
  },

  /**
   * Ghi nhận công ty Khoa giới thiệu cho sinh viên trong lần hỗ trợ
   * @param {string} maSV
   * @param {string} maLan
   * @param {string} maDot
   * @param {Object} payload { phienBan, maCongTy, maViTri, ghiChu }
   */
  async gioiThieuCongTy(maSV, maLan, maDot, payload) {
    const res = await apiClient.post(
      `/khoa/ung-tuyen-ho-tro/${encodeURIComponent(maSV)}/lan-ho-tro/${encodeURIComponent(maLan)}/gioi-thieu-cong-ty`,
      payload,
      { params: { maDot } }
    )
    return res.data
  },

  /**
   * Khoa xác nhận rớt đợt do từ chối hỗ trợ
   * @param {string} maSV
   * @param {string} maDot
   * @param {Object} payload { phienBan, lyDo, canCu, daXacMinh: true, maLyDo: 'TuChoiHoTro', maLanHoTro, phienBanHoTro }
   */
  async xacNhanTuChoiHoTro(maSV, maDot, payload) {
    const res = await apiClient.post(
      `/khoa/ung-tuyen-ho-tro/${encodeURIComponent(maSV)}/tu-choi-ho-tro/xac-nhan`,
      {
        ...payload,
        daXacMinh: true,
        maLyDo: 'TuChoiHoTro',
      },
      { params: { maDot } }
    )
    return res.data
  },
}

export default ungTuyenHoTroService
