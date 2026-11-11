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

export function reportDeadlineLabel(report) {
  const date = vietnamDateTimeParts(report.mocThoiGian).date
  return date ? `Hạn nộp: ${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : 'Chưa có hạn nộp'
}

export function reportReviewUrl(lecturer, report) {
  const params = new URLSearchParams({ gv: lecturer, sv: report.maSV, dot: report.maDot, report: report.maTienDo })
  return `/giang-vien/tien-do?${params}`
}

export function findReviewReport(reports, id, student, round) {
  return reports.find(report => report.maTienDo === id && report.maSV === student && report.maDot === round)
}

export function reportWeekLabel(report, round) {
  if (!round?.thoiGianBD || !report?.mocThoiGian) return 'Chưa xác định tuần'
  const start = vietnamDateTimeParts(round.thoiGianBD).date
  const due = vietnamDateTimeParts(report.mocThoiGian).date
  const end = round.thoiGianKT && vietnamDateTimeParts(round.thoiGianKT).date
  if (!start || !due) return 'Chưa xác định tuần'
  if (due < start || (end && due > end)) return 'Ngoài lịch đợt'
  const days = (Date.parse(`${due}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000
  const period = Math.max(1, Math.ceil(days / 14))
  return period <= 6 ? `Tuần ${period * 2 - 1}–${period * 2}` : 'Ngoài lịch đợt'
}

export function studentReportPeriod(student, round) {
  const start = student?.ngayBatDauThucTap || round?.thoiGianBD
  const end = student?.ngayKetThucThucTap || round?.thoiGianKT
  if (!start) return { thoiGianBD: start, thoiGianKT: end }
  const date = vietnamDateTimeParts(start).date
  if (!date) return { thoiGianBD: start, thoiGianKT: end }
  const cap = new Date(Date.parse(`${date}T00:00:00Z`) + 83 * 86400000).toISOString().slice(0, 10)
  const endDate = end && vietnamDateTimeParts(end).date
  return { thoiGianBD: start, thoiGianKT: endDate && endDate < cap ? end : cap }
}

export function academicReportEntries(reports, period) {
  const groups = new Map()
  const eligible = reports.filter(report => !report.maPhanBoLuuTru && reportWeekLabel(report, period).startsWith('Tuần '))
  for (const report of [...eligible].sort((a, b) => {
    const submitted = item => item.trangThaiDuyet !== 'ChuaNop' || Boolean(item.ngayNop)
    return Number(submitted(b)) - Number(submitted(a))
      || (interviewInstant(b.ngayNop) || 0) - (interviewInstant(a.ngayNop) || 0)
      || String(a.maTienDo).localeCompare(String(b.maTienDo))
  })) {
    const key = reportWeekLabel(report, period)
    if (!groups.has(key)) groups.set(key, report)
  }
  const current = [...groups.values()].sort((a, b) => interviewInstant(a.mocThoiGian) - interviewInstant(b.mocThoiGian))
  const ids = new Set(current.map(report => report.maTienDo))
  return { current, history: reports.filter(report => !ids.has(report.maTienDo)) }
}

export function reportsOutsideRound(reports, round) {
  const start = vietnamDateTimeParts(round?.thoiGianBD).date
  const end = vietnamDateTimeParts(round?.thoiGianKT).date
  if (!round?.thoiGianBD || !round?.thoiGianKT || !start || !end) return []
  return reports.filter(report => {
    const date = report.mocThoiGian && vietnamDateTimeParts(report.mocThoiGian).date
    return date && (date < start || date > end)
  })
}

// Đếm báo cáo theo tuần có hạn nộp, từ thứ Hai đến Chủ nhật theo giờ Việt Nam.
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
  const gvGradedCount = forms.filter(f => f.daChamGV === true || (f.diemGV != null && Number(f.diemGV) > 0)).length
  const dnGradedCount = forms.filter(f => f.daChamDN === true || (f.diemDN != null && Number(f.diemDN) > 0)).length
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
    lecturers, students, completed, forms,
    gvGradedCount, dnGradedCount,
    pendingReports: uniqueReports.filter(r => r.trangThaiDuyet === 'DaNop').sort((a, b) => interviewInstant(b.ngayNop) - interviewInstant(a.ngayNop)),
    weekly: weeklyReports(uniqueReports),
  }
}
