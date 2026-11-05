import test from 'node:test'
import assert from 'node:assert/strict'
import { enterprisePrintScore, enterpriseGradeComplete } from '../src/utils/enterprisePrintScore.js'

for (const rubric of ['TTNN_V1', 'TTKS_V1']) {
  test(`${rubric}: print maps internal IDs through maCLO and converts weighted scores once`, () => {
    const details = [
      { maTieuChi: `${rubric}_CLO4.1`, maCLO: 'CLO4.1', diemToiDa: 2, diemCham: 0 },
      { maTieuChi: `${rubric}_CLO4.2`, maCLO: 'CLO4.2', diemToiDa: 3, diemCham: 2.4 },
    ]
    assert.deepEqual(enterprisePrintScore(details, 'CLO4.1', 2), { score: 0, maximum: 2, scoreOutOfTen: '0.0' })
    assert.deepEqual(enterprisePrintScore(details, 'CLO4.2', 3), { score: 2.4, maximum: 3, scoreOutOfTen: '8.0' })
  })
}

test('legacy plain CLO IDs remain printable, missing grades stay blank', () => {
  assert.equal(enterprisePrintScore([{ maTieuChi: 'CLO4.1', diemCham: 2 }], 'CLO4.1', 2).scoreOutOfTen, '10.0')
  for (const details of [[], [{ maCLO: 'CLO4.1', diemCham: null }], [{ maCLO: 'CLO4.1', diemCham: '' }]]) {
    assert.equal(enterprisePrintScore(details, 'CLO4.1', 2).score, null)
    assert.equal(enterprisePrintScore(details, 'CLO4.1', 2).scoreOutOfTen, '')
  }
})

test('unknown internal IDs and invalid scores are not guessed or printed as zero', () => {
  for (const details of [
    [{ maTieuChi: 'OTHER_CLO4.1', diemCham: 2 }],
    [{ maCLO: 'CLO4.1', diemCham: 3, diemToiDa: 2 }],
    [{ maCLO: 'CLO4.1', diemCham: 'invalid' }],
  ]) assert.equal(enterprisePrintScore(details, 'CLO4.1', 2).scoreOutOfTen, '')
})

// 03/11/2026: khóa cũ không chứng minh đủ điểm theo rubric hiện hành; điểm 0 vẫn hợp lệ.
test('legacy locked records and partial or invalid grades do not count as completed grading', () => {
  const details = [{ diemCham: 0, diemToiDa: 2 }, { diemCham: 2.4, diemToiDa: 3 }]
  assert.equal(enterpriseGradeComplete({ daDanhGia: true, chiTietDiemDN: details }), true)
  assert.equal(enterpriseGradeComplete({ daKhoaDiem: true, chiTietDiemDN: [] }), false)
  assert.equal(enterpriseGradeComplete({ daDanhGia: false, chiTietDiemDN: details }), false)
  for (const raw of [null, '', undefined, -1, 3, 'invalid']) {
    assert.equal(enterpriseGradeComplete({ daDanhGia: true, chiTietDiemDN: [{ diemCham: raw, diemToiDa: 2 }, details[1]] }), false)
  }
})
