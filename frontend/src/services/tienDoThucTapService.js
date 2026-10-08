import apiClient from './api';
import { API_ROUTES } from '../constants/apiRoutes';

const tienDoThucTapService = {
  getTienDoBySinhVien: (maSV) => {
    return apiClient.get(`${API_ROUTES.TIEN_DO}/sinhvien/${maSV}`);
  },

  getBaoCaoChoDuyet: (maGV) => {
    return apiClient.get(`${API_ROUTES.TIEN_DO}/giangvien/${maGV}/choduyet`);
  },

  getChiTietTienDo: (maTienDo) => {
    return apiClient.get(`${API_ROUTES.TIEN_DO}/${maTienDo}`);
  },

  duyetTienDo: (maTienDo, trangThaiDuyet) => {
    return apiClient.put(`${API_ROUTES.TIEN_DO}/${maTienDo}/duyet`, {
      trangThaiDuyet: trangThaiDuyet
    });
  }
};

export default tienDoThucTapService;
