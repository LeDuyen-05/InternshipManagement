const labels = {
  DangTuyen: 'Đang nhận đăng ký',
  DaDuChiTieu: 'Đủ chỉ tiêu — đóng nhận mới',
  ChuaDuocDuyet: 'DN chưa được duyệt — đóng nhận mới',
  KhongCoDot: 'Chưa có đợt tiếp nhận',
  ChuaCoKeHoach: 'Chưa có kế hoạch theo đợt — chưa nhận mới',
  NgungNhanMoi: 'Khoa ngừng nhận mới',
  DotChuaMo: 'Đợt chưa mở tiếp nhận',
  DotKetThuc: 'Đợt kết thúc — đóng nhận mới',
  DotDaKhoa: 'Đợt đã chốt hoặc mở lại điểm — đóng nhận mới',
  ChuaDenHan: 'Chưa đến giờ mở nhận đăng ký',
  HetHan: 'Hết hạn — đóng nhận mới',
}

export const recruitmentStatusLabel = code => (code ? (labels[code] || 'Chưa mở nhận hồ sơ') : 'Chưa có thông tin đợt')
