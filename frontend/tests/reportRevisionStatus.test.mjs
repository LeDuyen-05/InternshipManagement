import test from 'node:test'
import assert from 'node:assert/strict'
import { revisionWindowStatus, submissionBlock } from '../src/utils/reportDeadline.js'

const report = { trangThaiDuyet: 'YeuCauSua', mocThoiGian: '2026-10-23', hanNopLai: '2026-11-12T23:59:59+07:00' }

test('an old original deadline does not close a valid revision window', () => {
  const now = Date.parse('2026-11-11T12:00:00+07:00')
  assert.equal(revisionWindowStatus(report, now), 'open')
  assert.equal(submissionBlock(report, now), null)
})

test('revision window includes the exact deadline and expires after it', () => {
  const end = Date.parse(report.hanNopLai)
  assert.equal(revisionWindowStatus(report, end), 'open')
  assert.equal(revisionWindowStatus(report, end + 1), 'expired')
  assert.match(submissionBlock(report, end + 1), /hết hạn nộp lại/)
})

test('missing, invalid and non-revision deadlines are not treated as open', () => {
  assert.equal(revisionWindowStatus({ ...report, hanNopLai: null }), null)
  assert.equal(revisionWindowStatus({ ...report, hanNopLai: 'invalid' }), null)
  assert.equal(revisionWindowStatus({ ...report, trangThaiDuyet: 'DaDuyet' }), null)
})
