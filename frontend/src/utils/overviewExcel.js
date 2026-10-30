import { vietnamDateTimeParts } from './interviewTime.js'

const col = (header, key, width) => ({ header, key, width, align: 'left' })
const actions = {
  ChuaDangKy: 'Liên hệ SV để xác định nhu cầu tìm nơi thực tập',
  DangUngTuyen: 'Theo dõi kết quả xét hồ sơ/phỏng vấn',
  ChuaCoNoiTiepNhan: 'Khoa hỗ trợ tìm nơi hoặc bố trí trực tiếp',
  ChoCongNhan: 'Rà soát và xác minh hồ sơ nơi tự tìm',
  ChoSVXacNhan: 'Theo dõi SV xác nhận; quá hạn Khoa rà soát',
  ChoKhoaChot: 'Rà soát hồ sơ để chốt phân bổ',
  CanXuLyLai: 'Khoa rà soát nơi thực tập và phương án bố trí lại',
  CanKiemTra: 'Khoa kiểm tra dữ liệu/hồ sơ trong đợt',
  ChuaXacMinhThoiGian: 'Xác minh ngày bắt đầu/kết thúc tại DN',
}
const dateText = value => value ? vietnamDateTimeParts(value).date || 'Chưa xác minh' : 'Chưa xác minh'

export function buildOverviewWorkbook(round, roster, assignments, progress, now = Date.now()) {
  if (!round?.maDot || roster?.maDot !== round.maDot || !Array.isArray(roster.sinhViens)
    || !Array.isArray(roster.thongKe) || !Array.isArray(assignments?.students) || !Array.isArray(progress?.reports))
    throw new Error('Không đủ dữ liệu đúng đợt để xuất báo cáo. Vui lòng tải lại.')
  const students = roster.sinhViens
  const ids = new Set(students.map(s => s.maSV))
  if (ids.size !== students.length || students.some(s => !s.maSV)) throw new Error('Danh sách SV có mã thiếu/trùng; Khoa cần kiểm tra trước khi xuất.')
  const teachers = new Map()
  for (const item of assignments.students.filter(s => s.maDot === round.maDot && ids.has(s.maSV))) {
    if (teachers.has(item.maSV)) throw new Error('SV có nhiều dòng phân công/nơi thực tập; Khoa cần kiểm tra trước khi xuất.')
    teachers.set(item.maSV, item)
  }
  const official = students.filter(s => s.coPhanBoChinhThuc)
  const enriched = students.map(s => {
    const gv = teachers.get(s.maSV)
    const tasks = [actions[s.trangThai]]
    const active = s.coPhanBoChinhThuc && !['KhongHoanTat', 'HoanThanh'].includes(s.trangThai)
    if (active && (!s.ngayBatDauThucTap || !s.ngayKetThucThucTap) && !tasks[0]?.includes('Xác minh')) tasks.push('Xác minh ngày thực tập tại DN')
    if (active && !gv?.maGiangVien) tasks.push('Phân công GVHD')
    return { ...s, gv: gv?.giangVien || 'Chưa phân công', tasks: tasks.filter(Boolean) }
  })
  const support = enriched.filter(s => s.canHoTro || s.tasks.length > 0)
  const pending = [...new Map(progress.reports.filter(r => r.maDot === round.maDot && ids.has(r.maSinhVien)
    && !r.maPhanBoLuuTru && r.trangThaiDuyet === 'DaNop').map(r => [r.maTienDo, r])).values()]
  const todo = enriched.flatMap(s => s.tasks.map(task => ({ maSV: s.maSV, hoTen: s.hoTen, lop: s.lop,
    loai: s.tenTrangThai, viec: task, maHoSo: s.maPhanBo || '', han: 'Theo cấu hình/hồ sơ liên quan' })))
  todo.push(...pending.map(r => ({ maSV: r.maSinhVien, hoTen: r.sinhVien, lop: r.lop,
    loai: 'Báo cáo chờ GVHD duyệt', viec: `Theo dõi GVHD duyệt báo cáo; ${teachers.get(r.maSinhVien)?.giangVien || 'Khoa kiểm tra phân công'}`,
    maHoSo: r.maTienDo, han: dateText(r.mocThoiGian) })))
  const time = vietnamDateTimeParts(now)
  const subTitle = `${roster.tenDot || round.tenDot} (${round.maDot}) — Năm học: ${round.namHoc || 'Chưa xác định'} — Xuất ${time.date} ${time.time} (VN), dữ liệu hiện hành`
  const sheet = (sheetName, title, columns, rows) => ({ sheetName, title, subTitle, columns, rows, reportType: 'internal', freezeHeader: true, autoFilter: true, emptyMessage: 'Không có bản ghi trong đợt/bộ dữ liệu này.' })
  const summary = [
    { chiSo: 'SV tham gia đợt', giaTri: students.length },
    { chiSo: 'SV có nơi thực tập chính thức', giaTri: official.length },
    { chiSo: 'SV chính thức đã có GVHD', giaTri: official.filter(s => teachers.get(s.maSV)?.maGiangVien).length },
    { chiSo: 'SV chính thức chưa có GVHD', giaTri: official.filter(s => !teachers.get(s.maSV)?.maGiangVien).length },
    { chiSo: 'SV cần hỗ trợ/theo dõi', giaTri: support.length },
    { chiSo: 'Báo cáo hiện hành chờ GVHD duyệt', giaTri: pending.length },
    ...roster.thongKe.map(g => ({ chiSo: g.ten, giaTri: students.filter(s => s.trangThai === g.ma).length })),
  ].map((s, i) => ({ stt: i + 1, ...s }))
  return { reportType: 'internal', fileName: `BaoCao_TongQuan_HocVu_${round.maDot.replace(/[^\w-]/g, '_')}_${time.date.replaceAll('-', '')}.xlsx`, sheets: [
    sheet('TongHopDot', 'TỔNG HỢP TÌNH HÌNH THỰC TẬP THEO ĐỢT', [col('STT', 'stt', 7), col('Nội dung', 'chiSo', 65), col('Số lượng SV/báo cáo', 'giaTri', 18)], summary),
    sheet('SVCanHoTro', 'SINH VIÊN CẦN HỖ TRỢ VÀ THEO DÕI', [col('MSSV', 'maSV', 14), col('Họ và tên', 'hoTen', 24), col('Lớp', 'lop', 12), col('Doanh nghiệp', 'tenCongTy', 26), col('Tình trạng', 'tenTrangThai', 24), col('Lý do/căn cứ hiện có', 'lyDo', 36), col('Việc cần theo dõi', 'viec', 36)], support.map(s => ({ ...s, viec: s.tasks.join('; ') || s.lyDo }))),
    sheet('NoiThucTap', 'DANH SÁCH NƠI THỰC TẬP CHÍNH THỨC', [col('MSSV', 'maSV', 14), col('Họ và tên', 'hoTen', 24), col('Lớp', 'lop', 12), col('Doanh nghiệp', 'tenCongTy', 28), col('GVHD', 'gv', 24), col('Bắt đầu tại DN', 'batDau', 14), col('Kết thúc tại DN', 'ketThuc', 14), col('Tình trạng', 'tenTrangThai', 24)], enriched.filter(s => s.coPhanBoChinhThuc).map(s => ({ ...s, batDau: dateText(s.ngayBatDauThucTap), ketThuc: dateText(s.ngayKetThucThucTap) }))),
    sheet('ViecCanXuLy', 'DANH SÁCH VIỆC CẦN THEO DÕI', [col('MSSV', 'maSV', 14), col('Họ và tên', 'hoTen', 24), col('Lớp', 'lop', 12), col('Nhóm hồ sơ', 'loai', 25), col('Việc cần theo dõi', 'viec', 38), col('Mã hồ sơ/mốc', 'maHoSo', 20), col('Hạn gốc/tham chiếu', 'han', 26)], todo),
  ] }
}

export async function loadOverviewWorkbook(api, round, now) {
  if (!round?.maDot) throw new Error('Chọn đợt thực tập trước khi xuất.')
  const config = { params: { maDot: round.maDot }, timeout: 20000 }
  const [roster, assignments, progress] = await Promise.all([
    api.get('/khoa/sinh-vien-theo-dot', config), api.get('/khoa/phan-cong', config), api.get('/khoa/theo-doi', config),
  ])
  return buildOverviewWorkbook(round, roster.data, assignments.data, progress.data, now)
}
