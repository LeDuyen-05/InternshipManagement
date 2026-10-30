export function studentJourney({ profile, placement, registrations = [], reports = [] }) {
  const official = placement?.daDuocKhoaDuyet === true && ['DangThucTap', 'HoanThanh'].includes(placement.trangThai)
  const assigned = official && Boolean(placement.giangVienHD)
  return {
    profileReady: Boolean(profile && (registrations.length > 0 || official)),
    placementReady: assigned,
    reportsApproved: assigned && reports.length > 0 && reports.every(report => report.trangThaiDuyet === 'DaDuyet'),
    placementLabel: assigned ? 'Đã hoàn thành ✓' : official ? 'Chờ phân công GVHD' : placement ? 'Chờ xác nhận / Khoa chốt' : 'Chưa phân bổ',
  }
}
