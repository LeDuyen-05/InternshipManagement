import apiClient from './api'

export const phongVanService = {
  // Lấy lịch phỏng vấn của sinh viên
  getLichPhongVan: async (maSV) => {
    const res = await apiClient.get(`/PhongVan/sinhvien/${maSV}`)
    return res.data
  },

  // Lấy thông tin phân bổ thực tập & GVHD / Mentor
  getPhanBoThucTap: async (maSV) => {
    try {
      const res = await apiClient.get(`/PhongVan/phan-bo/sinhvien/${maSV}`)
      return res.data
    } catch (err) {
      if (err.response?.status === 404) return null
      throw err
    }
  },
}
