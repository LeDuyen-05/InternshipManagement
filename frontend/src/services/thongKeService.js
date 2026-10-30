import apiClient from './api'
import { API_ROUTES } from '../constants/apiRoutes'
import { tachHoTen, xuatMultiSheetHuitExcel } from '../utils/exportHuitExcel'
import { roundReportLabel } from '../utils/roundLock.js'

export const thongKeService = {
  // 1. Gọi API lấy dữ liệu thống kê tổng hợp & báo cáo CLO
  getBaoCaoThongKe: (maDot) => {
    return apiClient.get(`${API_ROUTES.THONG_KE}/bao-cao`, {
      params: { maDot },
    })
  },

  // 1b. Lấy danh sách đợt thực tập trực tiếp từ database
  getDanhSachDotThucTap: () => {
    return apiClient.get(`${API_ROUTES.THONG_KE}/dot-thuc-tap`)
  },

  // 2. Lấy link tải file CSV từ backend
  getExportCsvUrl: (maDot) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
    return `${baseUrl}${API_ROUTES.THONG_KE}/export-csv?maDot=${encodeURIComponent(maDot || '')}`
  },

  // 3. Xuất file Microsoft Excel (.xlsx) chuẩn hóa HUIT nhiều sheet trên Client
  exportExcel: async (data, customFileName, preparedBy) => {
    if (!data) return false

    const ngayXuat = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const maDotSafe = data.maDot || 'TongHop'
    const fileName =
      customFileName ||
      ('BaoCao_ThongKe_CLO_' + maDotSafe + '_' + ngayXuat + '.xlsx')

    // Sheet 1: Bảng điểm CLO chi tiết
    const bangDiemColumns = [
      { header: 'STT', key: 'stt', width: 6, align: 'center' },
      { header: 'Mã sinh viên', key: 'maSV', width: 14, align: 'center' },
      { header: 'Họ và', key: 'hoLot', width: 18, align: 'left' },
      { header: 'Tên', key: 'ten', width: 10, align: 'left' },
      { header: 'Họ và tên', key: 'hoTen', width: 24, align: 'left' },
      { header: 'Lớp', key: 'lop', width: 12, align: 'center' },
      { header: 'Doanh nghiệp tiếp nhận', key: 'tenCongTy', width: 32, align: 'left' },
      { header: 'Giảng viên hướng dẫn', key: 'tenGVHD', width: 24, align: 'left' },
      ...(data.diemTheoCLO || []).map(c => ({ header: c.maCLO + ' - ' + c.tenCLO + ' (/' + c.diemToiDa + ')', key: 'tc_' + c.maTieuChi, width: 20, align: 'center' })),
      { header: 'Điểm tạm tính', key: 'diemTamTinh', width: 16, align: 'center' },
      { header: 'Điểm tổng kết', key: 'tongDiem', width: 14, align: 'center' },
      { header: 'Xếp loại', key: 'xepLoai', width: 14, align: 'center' },
      { header: 'Kết quả', key: 'ketQua', width: 14, align: 'center' },
    ]

    const bangDiemRows = (data.danhSachBangDiem || []).map((sv, idx) => {
      const { hoLot, ten, hoTen } = tachHoTen(sv.hoTen)
      return {
        stt: idx + 1,
        maSV: sv.maSV,
        hoLot,
        ten,
        hoTen,
        lop: sv.lop || '-',
        tenCongTy: sv.tenCongTy || '-',
        tenGVHD: sv.tenGVHD || '-',
        ...Object.fromEntries((data.diemTheoCLO || []).map(c => {
          const score = sv.diemTheoTieuChi?.find(d => d.maTieuChi === c.maTieuChi)?.diemCham
          return ['tc_' + c.maTieuChi, score == null ? '' : score]
        })),
        diemTamTinh: sv.ketQua === 'Không hoàn tất đợt' ? '' : sv.diemTamTinh ?? '',
        tongDiem: sv.tongDiem != null ? sv.tongDiem.toFixed(2) : '-',
        xepLoai: sv.xepLoai,
        ketQua: sv.ketQua,
      }
    })

    // Sheet 2: Tổng hợp KPI & Phân bố điểm
    const tq = data.tongQuan || {}
    const tongHopColumns = [
      { header: 'STT', key: 'stt', width: 6, align: 'center' },
      { header: 'Chỉ số KPI học vụ & kiểm định CLO', key: 'chiSo', width: 44, align: 'left' },
      { header: 'Giá trị số liệu', key: 'giaTri', width: 30, align: 'center' },
    ]
    const tongHopRows = [
      { stt: 1, chiSo: 'Đợt thực tập', giaTri: (data.tenDot || '-') + ' (' + (data.maDot || '-') + ')' },
      { stt: 2, chiSo: 'Tổng số sinh viên', giaTri: tq.tongSinhVien || 0 },
      { stt: 3, chiSo: 'Đã phân công GVHD', giaTri: (tq.daPhanCongGVHD || 0) + ' (' + (tq.tiLePhanCong || 0) + '%)' },
      { stt: 4, chiSo: 'Chưa phân công GVHD', giaTri: tq.chuaPhanCongGVHD || 0 },
      { stt: 5, chiSo: 'Tiến độ: Đã duyệt / Tổng báo cáo', giaTri: (tq.tienDoDaDuyet || 0) + ' / ' + (tq.tongBaoCaoTienDo || 0) },
      { stt: 6, chiSo: 'Tiến độ: Chờ duyệt', giaTri: tq.tienDoChoDuyet || 0 },
      { stt: 7, chiSo: 'Sinh viên đủ điểm CLO', giaTri: tq.daChamCLO || 0 },
      { stt: 8, chiSo: 'Sinh viên chưa đủ điểm', giaTri: tq.chuaChamCLO || 0 },
      { stt: 9, chiSo: 'Điểm trung bình CLO (thang 10)', giaTri: tq.diemTrungBinhCLO || 0 },
      { stt: 10, chiSo: 'Số sinh viên Đạt (đủ điểm, làm tròn >= 4.0)', giaTri: (tq.soLuongDat || 0) + ' (' + (tq.tiLeDatCLO || 0) + '%)' },
      { stt: 11, chiSo: 'Số sinh viên Không đạt (đủ điểm, làm tròn < 4.0)', giaTri: tq.soLuongKhongDat || 0 },
    ]

    // Sheet 3: Tải giảng viên hướng dẫn
    const taiGvColumns = [
      { header: 'STT', key: 'stt', width: 6, align: 'center' },
      { header: 'Mã giảng viên', key: 'maGV', width: 15, align: 'center' },
      { header: 'Họ và tên giảng viên', key: 'hoTen', width: 26, align: 'left' },
      { header: 'Hướng chuyên môn', key: 'chuyenMon', width: 26, align: 'left' },
      { header: 'Đang hướng dẫn', key: 'soLuongHienTai', width: 16, align: 'center' },
      { header: 'Chỉ tiêu tối đa', key: 'soLuongSVHD', width: 16, align: 'center' },
      { header: 'Tỷ lệ tải (%)', key: 'tiLe', width: 14, align: 'center' },
      { header: 'Tình trạng', key: 'tinhTrang', width: 18, align: 'center' },
    ]
    const taiGvRows = (data.taiGiangVien || []).map((gv, idx) => ({
      stt: idx + 1,
      maGV: gv.maGV,
      hoTen: gv.hoTen,
      chuyenMon: gv.chuyenMon || '-',
      soLuongHienTai: gv.soLuongHienTai,
      soLuongSVHD: gv.soLuongSVHD,
      tiLe: gv.tiLeTai + '%',
      tinhTrang: gv.tiLeTai >= 100 ? 'Đã đủ tải' : gv.tiLeTai >= 70 ? 'Bình thường' : 'Còn nhận thêm',
    }))

    return await xuatMultiSheetHuitExcel({
      fileName,
      preparedBy,
      sheets: [
        {
          sheetName: 'BangDiemCLO',
          reportType: 'official',
          title: 'BẢNG TỔNG HỢP ĐIỂM ĐÁNH GIÁ CHUẨN ĐẦU RA (CLO) THỰC TẬP TỐT NGHIỆP',
          subTitle: 'Đợt: ' + (data.tenDot || '-') + ' (' + (data.maDot || '-') + ') — ' + roundReportLabel(data),
          columns: bangDiemColumns,
          rows: bangDiemRows,
          signatures: [
            { title: 'NGƯỜI LẬP BẢNG', note: '(Ký, ghi rõ họ tên)', col: 3 },
            { title: 'TRƯỞNG BỘ MÔN', note: '(Ký, ghi rõ họ tên)', col: 8 },
            { title: 'TRƯỞNG KHOA', note: '(Ký, đóng dấu)', col: 14 },
          ],
        },
        {
          sheetName: 'TongQuanKPI',
          reportType: 'internal',
          title: 'TỔNG HỢP CHỈ SỐ KPI & ĐÁNH GIÁ HỌC VỤ ĐỢT THỰC TẬP',
          subTitle: 'Đợt: ' + (data.tenDot || '-') + ' (' + (data.maDot || '-') + ')',
          columns: tongHopColumns,
          rows: tongHopRows,
          signatures: [
            { title: 'GIÁO VỤ KHOA', note: '(Ký, ghi rõ họ tên)', col: 2 },
            { title: 'TRƯỞNG KHOA', note: '(Ký, đóng dấu)', col: 3 },
          ],
        },
        {
          sheetName: 'TaiGiangVien',
          reportType: 'internal',
          title: 'BẢNG THỐNG KÊ TẢI CÔNG VIỆC GIẢNG VIÊN HƯỚNG DẪN',
          subTitle: 'Đợt: ' + (data.tenDot || '-') + ' (' + (data.maDot || '-') + ')',
          columns: taiGvColumns,
          rows: taiGvRows,
          signatures: [
            { title: 'NGƯỜI LẬP BẢNG', note: '(Ký, ghi rõ họ tên)', col: 3 },
            { title: 'TRƯỞNG KHOA', note: '(Ký, đóng dấu)', col: 8 },
          ],
        },
      ],
    })
  },
}
