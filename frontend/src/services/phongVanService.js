import apiClient from './api'

export const phongVanService = {
  // Lấy lịch phỏng vấn của sinh viên
  getLichPhongVan: async (maSV) => {
    const res = await apiClient.get(`/PhongVan/sinhvien/${maSV}`)
    return res.data
  },

  // Lấy thông tin phân bổ thực tập & GVHD / Mentor
  getPhanBoThucTap: async (maSV, maDot) => {
    try {
      const res = await apiClient.get(`/PhongVan/phan-bo/sinhvien/${maSV}`, { params: { maDot } })
      return res.data
    } catch (err) {
      if (err.response?.status === 404) return null
      throw err
    }
  },

  // SV xác nhận nơi nhận việc; nhánh đăng ký trên hệ thống mới tiếp tục chờ Khoa chốt.
  xacNhanTiepNhan: async (maPhanBo) => {
    const res = await apiClient.post(`/PhongVan/phan-bo/${maPhanBo}/xac-nhan`)
    return res.data
  },
}
