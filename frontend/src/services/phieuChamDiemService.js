import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'

export const phieuChamDiemService = {
  getDanhSachTieuChi: () => {
    return apiClient.get(`${API_ROUTES.PHIEU_CHAM_DIEM}/tieu-chi`)
  },

  getPhieuChamBySinhVien: (maSV, maDot) => {
    return apiClient.get(`${API_ROUTES.PHIEU_CHAM_DIEM}/sinh-vien/${maSV}/dot/${maDot}`)
  },

  getDanhSachByGiangVien: (maGV, maDot) => {
    return apiClient.get(`${API_ROUTES.PHIEU_CHAM_DIEM}/giang-vien/${maGV}/dot/${maDot}`)
  },

  chamDiem: (data) => {
    return apiClient.post(`${API_ROUTES.PHIEU_CHAM_DIEM}/cham-diem`, data)
  },
}

export default phieuChamDiemService
