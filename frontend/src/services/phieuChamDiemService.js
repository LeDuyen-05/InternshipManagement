import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'

export const phieuChamDiemService = {
  // maDot: mã đợt thực tập, nhom: 'GV' | 'DN' | undefined
  getDanhSachTieuChi: (maDot, nhom) => {
    const params = {}
    if (maDot) params.maDot = maDot
    if (nhom) params.nhom = nhom
    return apiClient.get(`${API_ROUTES.PHIEU_CHAM_DIEM}/tieu-chi`, { params })
  },

  // Bảng điểm theo mẫu file chấm điểm của Khoa
  getBangDiem: (maDot, maGV) => {
    return apiClient.get(`${API_ROUTES.PHIEU_CHAM_DIEM}/bang-diem`, {
      params: { maDot, ...(maGV ? { maGV } : {}) },
    })
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
