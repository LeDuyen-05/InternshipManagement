import apiClient from './api'

export const thucTapTuTimService = {
  getMine: async maDot => (await apiClient.get('/ThucTapTuTim/cua-toi', { params: { maDot } })).data,
  submit: async payload => (await apiClient.post('/ThucTapTuTim', payload)).data,
  getForFaculty: async maDot => (await apiClient.get('/ThucTapTuTim/khoa', { params: maDot ? { maDot } : {} })).data,
  review: async (maHoSo, payload) => (await apiClient.put(`/ThucTapTuTim/${encodeURIComponent(maHoSo)}/duyet`, payload)).data,
}
