import test from 'node:test'
import assert from 'node:assert/strict'
import { weeklyReports, reportDeadlineLabel, reportReviewUrl, findReviewReport, reportsOutsideRound, reportWeekLabel, studentReportPeriod, academicReportEntries } from '../src/utils/lecturerDashboard.js'

test('counts all reports even when a student has several deadlines in the same week', () => {
  const reports = Array.from({ length: 8 }, (_, i) => ({
    maTienDo: `R${i}`, maSV: `S${i % 4}`, mocThoiGian: '2026-11-11',
    trangThaiDuyet: i < 3 ? 'DaNop' : i < 5 ? 'DaDuyet' : 'ChuaNop', nopTre: i >= 3,
  }))
  const { rows } = weeklyReports(reports)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].nop, 3)
  assert.equal(rows[0].tre, 2)
  assert.equal(rows[0].chuaNop, 3)
  assert.equal(Object.values(rows[0]).filter(Number.isInteger).reduce((a, b) => a + b, 0), 8)
})

test('groups deadlines by the calendar week in Vietnam and reports invalid dates', () => {
  const result = weeklyReports([
    { mocThoiGian: '2026-11-08T18:00:00Z', trangThaiDuyet: 'ChuaNop' }, // Thứ Hai giờ VN.
    { mocThoiGian: '2026-11-15T16:59:00Z', trangThaiDuyet: 'ChuaNop' },
    { mocThoiGian: '2026-11-15T17:00:00Z', trangThaiDuyet: 'ChuaNop' },
    { mocThoiGian: 'invalid', trangThaiDuyet: 'ChuaNop' },
  ])
  assert.deepEqual(result.rows.map(row => row.chuaNop), [2, 1])
  assert.equal(result.invalidDates, 1)
})

test('shows deadline instead of internal report ID', () => {
  assert.equal(reportDeadlineLabel({ maTienDo: 'TD_TEST_SV021_3', mocThoiGian: '2026-11-11' }), 'Hạn nộp: 11/11/2026')
  assert.equal(reportDeadlineLabel({ mocThoiGian: null }), 'Chưa có hạn nộp')
})

test('review link carries lecturer, student, round and report with URL encoding', () => {
  const report = { maSV: 'SV 01', maDot: 'DOT&2', maTienDo: 'TD/3' }
  const url = new URL(reportReviewUrl('GV+1', report), 'http://localhost')
  assert.equal(url.searchParams.get('gv'), 'GV+1')
  assert.equal(url.searchParams.get('sv'), 'SV 01')
  assert.equal(url.searchParams.get('dot'), 'DOT&2')
  assert.equal(url.searchParams.get('report'), 'TD/3')
})

test('only resolves the requested report for the selected student and round', () => {
  const report = { maTienDo: 'R', maSV: 'S', maDot: 'A' }
  assert.equal(findReviewReport([report], 'R', 'S', 'A'), report)
  assert.equal(findReviewReport([report], 'R', 'OTHER', 'A'), undefined)
  assert.equal(findReviewReport([report], 'R', 'S', 'B'), undefined)
  assert.equal(findReviewReport([report], 'MISSING', 'S', 'A'), undefined)
})

test('flags stored deadlines outside the round without changing or filling the report list', () => {
  const reports = [
    { maTienDo: 'EARLY', mocThoiGian: '2026-08-22' },
    { maTienDo: 'TD037', mocThoiGian: '2026-10-15' },
    { maTienDo: 'LATE', mocThoiGian: '2026-12-21' },
    { maTienDo: 'START', mocThoiGian: '2026-09-28' },
    { maTienDo: 'END', mocThoiGian: '2026-12-20' },
  ]
  const before = structuredClone(reports)
  const result = reportsOutsideRound(reports, { thoiGianBD: '2026-09-28', thoiGianKT: '2026-12-20' })
  assert.deepEqual(result.map(report => report.maTienDo), ['EARLY', 'LATE'])
  assert.deepEqual(reports, before)
  assert.deepEqual(reportsOutsideRound(reports, {}), [])
})

test('labels report weeks from stored dates using the backend weekly deadline convention', () => {
  const round = { thoiGianBD: '2026-09-28', thoiGianKT: '2026-12-20' }
  for (const [due, label] of [['2026-09-28', 'Tuần 1–2'], ['2026-10-12', 'Tuần 1–2'],
    ['2026-10-13', 'Tuần 3–4'], ['2026-10-15', 'Tuần 3–4'], ['2026-10-24', 'Tuần 3–4'],
    ['2026-12-20', 'Tuần 11–12'], ['2026-08-22', 'Ngoài lịch đợt'], ['2026-12-21', 'Ngoài lịch đợt']]) {
    assert.equal(reportWeekLabel({ maTienDo: 'TD037', mocThoiGian: due }, round), label)
  }
  assert.equal(reportWeekLabel({}, round), 'Chưa xác định tuần')
  assert.equal(reportWeekLabel({ mocThoiGian: 'invalid' }, round), 'Chưa xác định tuần')
  assert.equal(reportWeekLabel({ mocThoiGian: '2026-10-15' }, {}), 'Chưa xác định tuần')
})

test('prefers each students confirmed placement period and falls back to round dates', () => {
  const round = { thoiGianBD: '2026-09-28', thoiGianKT: '2026-12-20' }
  const period = studentReportPeriod({ ngayBatDauThucTap: '2026-10-01', ngayKetThucThucTap: '2027-01-15' }, round)
  assert.equal(reportWeekLabel({ mocThoiGian: '2026-10-15' }, period), 'Tuần 1–2')
  assert.equal(reportWeekLabel({ mocThoiGian: '2026-12-23' }, period), 'Tuần 11–12')
  assert.equal(reportWeekLabel({ mocThoiGian: '2027-01-15' }, period), 'Ngoài lịch đợt')
  assert.deepEqual(studentReportPeriod({}, round), round)
  assert.equal(reportWeekLabel({ mocThoiGian: '2026-12-20' }, studentReportPeriod({}, round)), 'Tuần 11–12')
})

test('shows six current reporting periods and keeps duplicate/old submissions in history', () => {
  const period = studentReportPeriod({ ngayBatDauThucTap: '2026-10-01', ngayKetThucThucTap: '2027-01-15' }, {})
  const reports = ['2026-10-15','2026-10-29','2026-11-12','2026-11-26','2026-12-10','2026-12-23']
    .map((date,i) => ({ maTienDo:`R${i}`,mocThoiGian:date,trangThaiDuyet:'ChuaNop' }))
  const extra = { maTienDo:'OLD',mocThoiGian:'2026-09-01',trangThaiDuyet:'DaDuyet' }
  const submitted = { maTienDo:'SUBMITTED',mocThoiGian:'2026-10-29',trangThaiDuyet:'DaNop',ngayNop:'2026-10-28' }
  const result = academicReportEntries([...reports, extra, submitted],period)
  assert.equal(result.current.length,6)
  assert.ok(result.current.includes(submitted))
  assert.equal(result.history.length,2)
  assert.ok(result.history.includes(extra))
})
