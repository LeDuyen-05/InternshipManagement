// Nhãn hiển thị cho các mã trạng thái nghiệp vụ (không hiển thị mã thô như "DangThucTap" cho người dùng).

export const PHAN_BO = {
  ChuaNhanViec: 'Chờ sinh viên xác nhận',
  DangThucTap: 'Đang thực tập',
  HoanThanh: 'Hoàn thành thực tập',
  Huy: 'Đã hủy',
}

export const BAO_CAO = {
  ChuaNop: 'Chưa nộp',
  DaNop: 'Chờ GVHD duyệt',
  DaDuyet: 'Đã duyệt',
  YeuCauSua: 'Cần chỉnh sửa',
}

export const CONG_TY = {
  ChoDuyet: 'Chờ Khoa thẩm định',
  DaDuyet: 'Đã được duyệt',
  TuChoi: 'Không được duyệt',
  DongBang: 'Tạm ngưng hợp tác',
}

/**
 * Trạng thái một nguyện vọng theo đúng quy trình:
 * nộp → DN xét hồ sơ → phỏng vấn → trúng tuyển (có quyết định tiếp nhận).
 * "DaDuyet" chỉ nghĩa là hồ sơ đạt vòng xét, CHƯA phải trúng tuyển.
 */
export function trangThaiNguyenVong(nv) {
  if (nv.daTiepNhan) return { label: 'Trúng tuyển', tone: 'emerald' }
  if (nv.trangThai === 'TuChoi') {
    return { label: nv.ketQuaPhongVan === 'KhongDat' ? 'Phỏng vấn không đạt' : 'Không được chọn', tone: 'rose' }
  }
  if (nv.trangThai === 'DaDuyet') {
    if (nv.ketQuaPhongVan === 'ChuaCoKetQua') return { label: 'Đã có lịch phỏng vấn', tone: 'blue' }
    return { label: 'Hồ sơ đạt – chờ phỏng vấn', tone: 'blue' }
  }
  if (nv.ketQuaPhongVan === 'ChuaCoKetQua') return { label: 'Đã có lịch phỏng vấn', tone: 'blue' }
  return { label: 'Chờ doanh nghiệp xét hồ sơ', tone: 'amber' }
}

/** Xếp loại học lực theo GPA thang 4 (quy chế đào tạo tín chỉ). */
export function xepLoaiGpa(gpa) {
  if (gpa == null || gpa === '') return null
  const g = Number(gpa)
  if (g >= 3.6) return 'Xuất sắc'
  if (g >= 3.2) return 'Giỏi'
  if (g >= 2.5) return 'Khá'
  if (g >= 2.0) return 'Trung bình'
  if (g >= 1.0) return 'Yếu'
  return 'Kém'
}

/** GPA tối thiểu doanh nghiệp yêu cầu, đọc từ mô tả kiểu "GPA >= 3.0". */
export function gpaToiThieu(yeuCau) {
  const m = /gpa\s*(?:>=|≥|>|từ)?\s*(\d+(?:[.,]\d+)?)/i.exec(yeuCau || '')
  return m ? Number(m[1].replace(',', '.')) : null
}

export const TONE = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
}
