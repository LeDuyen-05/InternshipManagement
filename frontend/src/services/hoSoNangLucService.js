import apiClient from './api.js'

export const hoSoNangLucService = {
  getBySinhVien: async (maSV) => {
    const res = await apiClient.get(`/HoSoNangLuc/sinhvien/${maSV}`)
    return res.data
  },

  update: async (maSV, data) => {
    const res = await apiClient.put(`/HoSoNangLuc/sinhvien/${maSV}`, data)
    return res.data
  },
}

export default hoSoNangLucService
