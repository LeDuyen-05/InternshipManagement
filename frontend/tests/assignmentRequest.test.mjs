import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { assignmentErrorMessage } from '../src/utils/phanCongResult.js'

function client() {
  const calls = []
  const source = readFileSync(new URL('../src/services/gvHuongDanService.js', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export const gvHuongDanService', 'const gvHuongDanService')
  const service = new vm.Script(source + '\ngvHuongDanService').runInNewContext({
    API_ROUTES: { GV_HUONG_DAN: '/GVHuongDan' },
    apiClient: { post(url, body) { calls.push({ url, body }); return Promise.resolve({ data: { success: true } }) } },
  })
  return { service, calls }
}

test('split assignments send the selected round on the envelope and every student row', async () => {
  const { service, calls } = client()
  const pairings = [{ maSV: 'SV019', maGV: 'G1' }, { maSV: 'SV020', maGV: 'G2' }, { maSV: 'SV021', maGV: 'G3' }]
  await service.xacNhanPhanCongTuDong(pairings, 'DOT02')
  assert.match(calls[0].url, /tu-dong-xac-nhan$/)
  assert.equal(calls[0].body.maDot, 'DOT02')
  assert.equal(calls[0].body.danhSachPhanCong.length, 3)
  calls[0].body.danhSachPhanCong.forEach((row, index) => {
    assert.equal(row.maDot, 'DOT02'); assert.equal(row.maSV, pairings[index].maSV); assert.equal(row.maGV, pairings[index].maGV)
  })
  assert.ok(pairings.every(row => !('maDot' in row)), 'do not mutate the preview')
})

test('explicit row round is retained so the backend can reject mismatched rounds', async () => {
  const { service, calls } = client()
  await service.xacNhanPhanCongTuDong([{ maSV: 'S', maGV: 'G', maDot: 'OTHER' }], 'DOT02')
  assert.equal(calls[0].body.danhSachPhanCong[0].maDot, 'OTHER')
  assert.equal(calls[0].body.maDot, 'DOT02')
})

test('assignment errors show backend business and validation reasons instead of HTTP status alone', () => {
  assert.equal(assignmentErrorMessage({ response: { data: { message: 'Đợt đã đóng.' } }, message: 'Request failed with status code 400' }), 'Đợt đã đóng.')
  assert.equal(assignmentErrorMessage({ response: { data: { errors: { 'DanhSachPhanCong[0].MaDot': ['The MaDot field is required.'] } } }, message: 'Request failed with status code 400' }), 'The MaDot field is required.')
  assert.equal(assignmentErrorMessage({ response: { data: { detail: 'Giảng viên đã đủ chỉ tiêu.' } } }), 'Giảng viên đã đủ chỉ tiêu.')
})
