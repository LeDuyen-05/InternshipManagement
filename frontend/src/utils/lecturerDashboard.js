import { interviewInstant, vietnamDateTimeParts } from './interviewTime.js'
import { summarizeCompletedForms } from './diemGiangVien.js'

export function responseList(response) {
  const list = Array.isArray(response) ? response : (response?.data?.data ?? response?.data)
  if (!Array.isArray(list)) throw new Error('Dữ liệu thống kê không hợp lệ. Vui lòng tải lại.')
  return list
}

export function lecturerLoad(lecturer, assignedCount) {
  const raw = lecturer?.chiTieu ?? lecturer?.soLuongSVHD
  const quota = raw != null && raw !== '' && Number.isInteger(Number(raw)) && Number(raw) >= 0 ? Number(raw) : null
  const used = Number.isInteger(lecturer?.soLuongHienTai) ? lecturer.soLuongHienTai : assignedCount
  return { quota, used, percent: quota > 0 ? Math.round(used / quota * 1000) / 10 : null }
}

// Group by the calendar week of the original deadline, Monday–Sunday in Vietnam.
export function weeklyReports(reports) {
  const weeks = new Map()
  let invalidDates = 0
  for (const report of reports) {
    const date = vietnamDateTimeParts(report.mocThoiGian).date
    if (!date) { invalidDates++; continue }
    const day = new Date(`${date}T00:00:00Z`)
    day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7)
    const key = day.toISOString().slice(0, 10)
    const row = weeks.get(key) || { week: key, tuan: `${key.slice(8, 10)}/${key.slice(5, 7)}/${key.slice(0, 4)}`, nop: 0, tre: 0, chuaNop: 0, chuaRo: 0 }
    if (report.trangThaiDuyet === 'ChuaNop') row.chuaNop++
    else if (['DaNop', 'DaDuyet', 'YeuCauSua'].includes(report.trangThaiDuyet)) {
      const submitted = interviewInstant(report.ngayNop)
      if (typeof report.nopTre === 'boolean') row[report.nopTre ? 'tre' : 'nop']++
      else if (Number.isFinite(submitted)) row[submitted >= interviewInstant(date) + 86400000 ? 'tre' : 'nop']++
      else row.chuaRo++
    } else row.chuaRo++
    weeks.set(key, row)
  }
  return { rows: [...weeks.values()].sort((a, b) => a.week.localeCompare(b.week)), invalidDates }
}

export async function loadLecturerDashboard(maGV, maDot, { supervisors, progress, grades }) {
  if (!maGV || !maDot) throw new Error('Chọn giảng viên và đợt thực tập trước khi xem thống kê.')
  const [lecturerResponse, studentResponse, gradeResponse] = await Promise.all([
    supervisors.getGiangVienTai(maDot), supervisors.getSVTheoGiangVien(maGV, '', maDot),
    grades.getDanhSachByGiangVien(maGV, maDot),
  ])
  const lecturers = responseList(lecturerResponse)
  const students = [...new Map(responseList(studentResponse).filter(s => s.maDot === maDot && s.trangThai === 'DangHuongDan').map(s => [s.maSV, s])).values()]
  const studentIds = new Set(students.map(s => s.maSV))
  const forms = responseList(gradeResponse).filter(g => g.maDot === maDot && studentIds.has(g.maSV))
  const completed = summarizeCompletedForms(forms)
  const reports = []
  // Limit concurrency instead of issuing an unbounded request per student at once.
  let next = 0
  await Promise.all(Array.from({ length: Math.min(4, students.length) }, async () => {
    while (next < students.length) {
      const student = students[next++]
      const list = responseList(await progress.getTienDoBySinhVien(student.maSV, maDot))
      reports.push(...list.filter(r => r.maDot === maDot && r.maSV === student.maSV && !r.maPhanBoLuuTru))
    }
  }))
  const uniqueReports = [...new Map(reports.map(r => [r.maTienDo, r])).values()]
  return {
    lecturers, students, completed,
    pendingReports: uniqueReports.filter(r => r.trangThaiDuyet === 'DaNop').sort((a, b) => interviewInstant(b.ngayNop) - interviewInstant(a.ngayNop)),
    weekly: weeklyReports(uniqueReports),
  }
}
