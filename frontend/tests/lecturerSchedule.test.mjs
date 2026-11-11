import test from 'node:test'
import assert from 'node:assert/strict'
import { scheduleDate, scheduleRoster } from '../src/utils/lecturerSchedule.js'

test('shows internship dates without midnight and grading deadlines in Vietnam time', () => {
  assert.equal(scheduleDate('2026-09-28T00:00:00'), '28/09/2026')
  assert.equal(scheduleDate('2026-12-14T17:00:00Z', true), '15/12/2026 · 00:00')
  assert.equal(scheduleDate('2027-01-30T23:59:59+07:00', true), '30/01/2027 · 23:59')
  assert.equal(scheduleDate(null), 'Chưa cấu hình')
  assert.equal(scheduleDate('invalid'), 'Chưa xác định')
})

test('counts only active supervised students and their pending current reports', () => {
  const student = { maSV: 'S', maDot: 'A', trangThai: 'DangHuongDan' }
  const report = { maTienDo: 'R', maSV: 'S', maDot: 'A', trangThaiDuyet: 'DaNop' }
  const result = scheduleRoster([
    student, student, { ...student, maSV: 'STOPPED', trangThai: 'DaKetThuc' }, { ...student, maSV: 'OTHER_ROUND', maDot: 'B' },
  ], [report, report, { ...report, maTienDo: 'GRADED', trangThaiDuyet: 'DaDuyet' },
    { ...report, maTienDo: 'OUTSIDE', maSV: 'OUTSIDE' }, { ...report, maTienDo: 'ARCHIVED', maPhanBoLuuTru: 'PB' },
    { ...report, maTienDo: 'B', maDot: 'B' }, { ...report, maTienDo: 'STOPPED', maSV: 'STOPPED' }], 'A')
  assert.deepEqual(result.students, [student])
  assert.deepEqual(result.reports, [report])
})
