// Khớp InternshipDeadlinePolicy.SoNgayNopLai ở backend.
export const SO_NGAY_NOP_LAI = 3

const revisionEnd = (report) =>
  report?.trangThaiDuyet === 'YeuCauSua' && report.hanNopLai ? Date.parse(report.hanNopLai) : NaN

export function submissionBlock(report, now = Date.now()) {
  if (!report?.mocThoiGian) return 'Chưa xác định được hạn nộp. Liên hệ Khoa.'
  const normalEnd = Date.parse(`${report.mocThoiGian.slice(0, 10)}T00:00:00+07:00`) + 86400000
  if (!Number.isFinite(normalEnd)) return 'Hạn nộp không hợp lệ. Liên hệ Khoa.'
  const extraEnd = report.hanNopBoSung ? Date.parse(report.hanNopBoSung) : NaN
  if (now < normalEnd || now <= extraEnd || now <= revisionEnd(report)) return null
  return Number.isFinite(revisionEnd(report))
    ? 'Đã hết hạn nộp lại theo yêu cầu sửa của GVHD. Lên Khoa trình bày lý do; chỉ nộp khi được Khoa chấp thuận và mở hạn bổ sung.'
    : 'Đã khóa nộp quá hạn. Lên Khoa trình bày lý do; chỉ nộp khi được Khoa chấp thuận và mở hạn bổ sung.'
}

// Hạn nộp lại được lưu của báo cáo bị yêu cầu sửa (kể cả hạn đã qua).
export function revisionDeadline(report) {
  return Number.isFinite(revisionEnd(report)) ? report.hanNopLai : null
}

export function revisionWindowStatus(report, now = Date.now()) {
  const end = revisionEnd(report)
  return Number.isFinite(end) ? (now <= end ? 'open' : 'expired') : null
}
