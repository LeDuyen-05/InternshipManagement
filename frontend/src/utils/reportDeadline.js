export function submissionBlock(report, now = Date.now()) {
  if (!report?.mocThoiGian) return 'Chưa xác định được hạn nộp. Liên hệ Khoa.'
  const normalEnd = Date.parse(`${report.mocThoiGian.slice(0, 10)}T00:00:00+07:00`) + 86400000
  if (!Number.isFinite(normalEnd)) return 'Hạn nộp không hợp lệ. Liên hệ Khoa.'
  const extraEnd = report.hanNopBoSung ? Date.parse(report.hanNopBoSung) : NaN
  return now >= normalEnd && !(now <= extraEnd)
    ? 'Đã khóa nộp quá hạn. Lên Khoa trình bày lý do; chỉ nộp khi được Khoa chấp thuận và mở hạn bổ sung.' : null
}
