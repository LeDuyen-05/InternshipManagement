import apiClient from './api';
import { API_ROUTES } from '../constants/apiRoutes';

export const tienDoThucTapService = {
  getTienDoBySinhVien: (maSV, maDot) => {
    return apiClient.get(`${API_ROUTES.TIEN_DO}/sinhvien/${maSV}`, {
      params: { maDot },
    });
  },

  getBaoCaoChoDuyet: (maGV) => {
    return apiClient.get(`${API_ROUTES.TIEN_DO}/giangvien/${maGV}/choduyet`);
  },

  getChiTietTienDo: (maTienDo) => {
    return apiClient.get(`${API_ROUTES.TIEN_DO}/${maTienDo}`);
  },

  duyetTienDo: (maTienDo, trangThaiDuyet, nhanXetGV = null) => {
    return apiClient.put(`${API_ROUTES.TIEN_DO}/${maTienDo}/duyet`, {
      trangThaiDuyet,
      nhanXetGV,
    });
  }
};

export default tienDoThucTapService;
