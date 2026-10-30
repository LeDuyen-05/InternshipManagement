export function summarizeAssignmentResult(result) {
  if (!Array.isArray(result?.thanhCong) || !Array.isArray(result?.khongThanhCong)) {
    throw new Error('Phản hồi phân công không hợp lệ. Vui lòng tải lại danh sách để kiểm tra kết quả.')
  }

  const successCount = result.thanhCong.length
  const failureCount = result.khongThanhCong.length
  if (successCount + failureCount === 0) {
    throw new Error('Không có kết quả phân công sinh viên. Vui lòng tải lại danh sách để kiểm tra.')
  }

  const failedStudentIds = [...new Set(
    result.khongThanhCong.map((item) => item.maSV).filter(Boolean)
  )]
  const failureDetails = result.khongThanhCong
    .map((item) => `${item.maSV || 'Không có mã SV'} (${item.lyDo || 'Chưa phân công được'})`)
    .join('; ')

  return {
    successCount,
    failureCount,
    failedStudentIds,
    successMessage: successCount > 0 ? `Đã phân công thành công ${successCount} sinh viên.` : '',
    failureMessage: failureCount > 0 ? `Không phân công được ${failureCount} sinh viên: ${failureDetails}` : null,
  }
}
