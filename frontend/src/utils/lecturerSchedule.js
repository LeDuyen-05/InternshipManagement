import { vietnamDateTimeParts } from './interviewTime.js'

export function scheduleDate(value, includeTime = false) {
  if (!value) return 'Chưa cấu hình'
  const { date, time } = vietnamDateTimeParts(value)
  if (!date) return 'Chưa xác định'
  const label = `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`
  return includeTime ? `${label} · ${time}` : label
}

export function scheduleRoster(students, reports, round) {
  const roster = [...new Map(students.filter(student => student.maDot === round && student.trangThai === 'DangHuongDan')
    .map(student => [student.maSV, student])).values()]
  const studentIds = new Set(roster.map(student => student.maSV))
  const pending = [...new Map(reports.filter(report => report.maDot === round && studentIds.has(report.maSV)
    && report.trangThaiDuyet === 'DaNop' && !report.maPhanBoLuuTru).map(report => [report.maTienDo, report])).values()]
  return { students: roster, reports: pending }
}
