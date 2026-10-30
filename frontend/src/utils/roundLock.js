export function roundLockAccess(data, maDot, now = Date.now()) {
  if (!data || data.maDot !== maDot || !data.trangThai) return { status: null, blocked: true, structureBlocked: true }
  const expired = data.trangThai === 'MoLai' && (!data.hanMoLai || !Number.isFinite(Date.parse(data.hanMoLai)) || now >= Date.parse(data.hanMoLai))
  const status = expired ? 'ChoChotLai' : data.trangThai
  return { status, blocked: !['ChuaChot', 'MoLai'].includes(status), structureBlocked: status !== 'ChuaChot' }
}

export function roundReportLabel(data) {
  const state = data?.trangThaiChotDot || 'ChuaChot'
  const label = { ChuaChot: 'Chưa chốt đợt', DaChot: 'Đợt đã chốt', MoLai: 'Dữ liệu đang điều chỉnh — chưa chốt lại', ChoChotLai: 'Chờ Khoa chốt lại' }[state] || 'Chưa xác minh trạng thái chốt'
  return `${label}; phiên bản ${data?.phienBanChotDot ?? 0}. Dữ liệu hiện hành.`
}
