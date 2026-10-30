import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'
import { tachHoTen, xuatBangHuitExcel, xuatMultiSheetHuitExcel } from '../utils/exportHuitExcel'

export const gvHuongDanService = {
  // Giảng viên xem danh sách sinh viên mình hướng dẫn
  getSVTheoGiangVien: (maGV, keyword = '', maDot) =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/giang-vien/${maGV}/sinh-vien`, {
      params: { ...(keyword ? { keyword } : {}), ...(maDot ? { maDot } : {}) },
    }),

  // Khoa xem danh sách sinh viên chưa có GVHD
  getSVChuaPhanCong: (keyword = '', maDot) =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/khoa/sinh-vien-chua-phan-cong`, {
      params: { keyword, maDot },
    }),

  // Khoa xem tải công việc của các giảng viên
  getGiangVienTai: (maDot) =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/khoa/giang-vien-tai`, { params: { maDot } }),

  // Khoa: Lấy danh sách tất cả phân công hiện tại
  getTatCaPhanCong: (maDot) =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/khoa/tat-ca-phan-cong`, { params: { maDot } }),

  // Khoa phân công 1 sinh viên cho 1 giảng viên
  phanCongDonLe: (maGV, maSV, maDot) =>
    apiClient.post(`${API_ROUTES.GV_HUONG_DAN}/khoa/phan-cong`, { maGV, maSV, maDot }),

  // Khoa phân công hàng loạt sinh viên cho 1 giảng viên
  phanCongHangLoat: (maGV, danhSachMaSV, maDot) =>
    apiClient.post(`${API_ROUTES.GV_HUONG_DAN}/khoa/phan-cong-hang-loat`, { maGV, danhSachMaSV, maDot }),

  // Khoa đổi giảng viên hướng dẫn
  doiGiangVien: (maSo, maGVMoi, maDot) =>
    apiClient.put(`${API_ROUTES.GV_HUONG_DAN}/khoa/doi-gv`, { maSo, maGVMoi, maDot }),

  // Khoa hủy phân công
  huyPhanCong: (maSo, maDot) =>
    apiClient.delete(`${API_ROUTES.GV_HUONG_DAN}/khoa/huy/${maSo}`, { params: { maDot } }),

  // Khoa cập nhật chỉ tiêu số lượng sinh viên hướng dẫn của Giảng viên
  capNhatChiTieu: (maGV, soLuongMoi) =>
    apiClient.put(`${API_ROUTES.GV_HUONG_DAN}/khoa/giang-vien/${maGV}/chi-tieu`, { soLuongMoi }),

  // Giảng viên xem hồ sơ chuyên môn
  getProfile: (maGV) =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/giang-vien/${maGV}/profile`),

  // Giảng viên cập nhật hồ sơ chuyên môn
  updateProfile: (maGV, data) =>
    apiClient.put(`${API_ROUTES.GV_HUONG_DAN}/giang-vien/${maGV}/profile`, data),

  // Khoa: Lấy danh sách đề xuất phân công tự động (Smart Match & Cân bằng tải)
  deXuatPhanCongTuDong: (maDot, maSV) =>
    apiClient.get(`${API_ROUTES.GV_HUONG_DAN}/khoa/phan-cong/tu-dong-de-xuat`, {
      params: { maDot, ...(maSV ? { maSV } : {}) },
      paramsSerializer: { indexes: null },
    }),

  // Khoa: Xác nhận lưu kết quả phân công tự động vào Database
  xacNhanPhanCongTuDong: (danhSachPhanCong, maDot) =>
    apiClient.post(`${API_ROUTES.GV_HUONG_DAN}/khoa/phan-cong/tu-dong-xac-nhan`, { danhSachPhanCong, maDot }),

  // Khoa: Xuất danh sách phân công ra file Excel (.xlsx) chuẩn HUIT (chỉ 1 sheet DanhSachPhanCong, đã loại bỏ các cột không cần thiết)
  exportExcelPhanCong: async (danhSachPhanCong, danhSachGiangVien, customFileName, customSubTitle, preparedBy) => {
    if (!danhSachPhanCong || danhSachPhanCong.length === 0) return false

    const ngayXuat = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const fileName =
      customFileName ||
      ('QuyetDinh_PhanCong_GVHD_FIT_HUIT_' + ngayXuat + '.xlsx')

    // Danh sách chi tiết phân công GVHD (đã loại bỏ: Họ và, Tên, Hướng chuyên môn GV, Trạng thái)
    const phanCongColumns = [
      { header: 'STT', key: 'stt', width: 6, align: 'center' },
      { header: 'Mã SV', key: 'maSV', width: 14, align: 'center' },
      { header: 'Họ và tên', key: 'hoTen', width: 24, align: 'left' },
      { header: 'Lớp', key: 'lop', width: 12, align: 'center' },
      { header: 'Đơn vị thực tập tiếp nhận', key: 'tenCongTy', width: 32, align: 'left' },
      { header: 'Mã GVHD', key: 'maGV', width: 14, align: 'center' },
      { header: 'Cán bộ hướng dẫn (GVHD)', key: 'hoTenGV', width: 24, align: 'left' },
      { header: 'Ngày phân công', key: 'ngayPC', width: 14, align: 'center' },
    ]

    const phanCongRows = danhSachPhanCong.map((item, idx) => {
      const { hoLot, ten, hoTen } = tachHoTen(item.hoTenSV)
      return {
        stt: idx + 1,
        maSV: item.maSV,
        hoLot,
        ten,
        hoTen: hoTen || item.hoTenSV,
        lop: item.lop || '-',
        tenCongTy: item.tenCongTy || 'Chưa phân bổ',
        maGV: item.maGV,
        hoTenGV: item.hoTenGV,
        chuyenMonGV: item.chuyenMonGV || 'Chung',
        ngayPC: item.ngayPC ? new Date(item.ngayPC).toLocaleDateString('vi-VN') : '-',
        trangThai: item.trangThai === 'DangHuongDan' ? 'Đang hướng dẫn' : item.trangThai,
      }
    })

    return await xuatBangHuitExcel({
      fileName,
      sheetName: 'DanhSachPhanCong',
      reportType: 'official',
      title: 'DANH SÁCH PHÂN CÔNG GIẢNG VIÊN HƯỚNG DẪN THỰC TẬP TỐT NGHIỆP',
      subTitle: customSubTitle || 'Quyết định phân công cán bộ hướng dẫn thực tập',
      columns: phanCongColumns,
      rows: phanCongRows,
      preparedBy,
      signatures: [
        { title: 'NGƯỜI LẬP BẢNG', note: '(Ký, ghi rõ họ tên)', col: 3 },
        { title: 'TRƯỞNG KHOA', note: '(Ký, đóng dấu)', col: 8 },
      ],
    })
  },

}
