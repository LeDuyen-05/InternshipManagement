import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { roundLockAccess } from '../src/utils/roundLock.js'

// 04/11/2026: đính chính phiếu DN chỉ trong đợt được mở lại và còn hạn chấm.
test('submitted grade correction requires the current round, an active reopening and grading window', () => {
  let lock, state
  const source = readFileSync(new URL('../src/hooks/useGradeDeadline.js', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/export /g, '')
  const hook = new vm.Script(source + '\nuseGradeDeadline').runInNewContext({
    useRoundLock: () => lock, useState: () => [state], useEffect() {},
  })
  const now = Date.parse('2029-01-21T00:00:00Z')
  const round = { maDot: 'ROUND', trangThai: 'MoLai', hanMoLai: '2029-01-22T00:00:00Z' }
  state = { maDot: 'ROUND', data: { lyDoKhoaDN: null } }
  lock = roundLockAccess(round, 'ROUND', now)
  assert.equal(hook('ROUND', 'DN').canCorrectSubmitted, true)
  for (const status of ['ChuaChot', 'DaChot', 'ChoChotLai']) {
    lock = roundLockAccess({ ...round, trangThai: status }, 'ROUND', now)
    assert.equal(hook('ROUND', 'DN').canCorrectSubmitted, false)
  }
  lock = roundLockAccess(round, 'ROUND', Date.parse(round.hanMoLai))
  assert.equal(hook('ROUND', 'DN').canCorrectSubmitted, false, 'the exact expiry is locked')
  lock = roundLockAccess(round, 'OTHER', now)
  assert.equal(hook('OTHER', 'DN').canCorrectSubmitted, false, 'old round state grants no access')
  lock = roundLockAccess(round, 'ROUND', now)
  state.data.lyDoKhoaDN = 'Đã hết hạn chấm điểm.'
  assert.equal(hook('ROUND', 'DN').canCorrectSubmitted, false)
})

test('enterprise modal edits a reopened official form and preserves official status when saving', async () => {
  const slots = [], saved = []
  let cursor = 0, effects = [], tree
  const criteria = [
    { maTieuChi: 'DN1', maCLO: 'CLO4.1', tenTieuChi: 'Kỷ luật', diemToiDa: 2 },
    { maTieuChi: 'DN2', maCLO: 'CLO4.2', tenTieuChi: 'Chuyên môn', diemToiDa: 3 },
  ]
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next }]
    },
    useEffect(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) {
        slots[i]?.cleanup?.()
        effects.push(() => { slots[i] = { deps, cleanup: fn() } })
      }
    },
    phieuChamDiemService: { async getDanhSachTieuChi() { return { data: { data: criteria } } } },
    doanhNghiepService: { async danhGia(body) { saved.push(body) } },
    ModalOverlay: 'ModalOverlay', DocumentAttachments: 'DocumentAttachments',
    GradeDeadlineNotice: 'GradeDeadlineNotice', setTimeout() { return 0 },
  }
  const source = readFileSync(new URL('../src/pages/DoanhNghiep/DanhGiaThucTapSinhPage.jsx', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export default function', 'function')
  const Modal = new vm.Script(transformSync(source + '\nGradeInternModal', { loader: 'jsx' }).code).runInNewContext(context)
  const props = {
    intern: { maPhanBo: 'PB', maDot: 'ROUND', hoTenSV: 'Sinh viên', daKhoaDiem: true,
      chiTietDiemDN: [{ maTieuChi: 'DN1', diemCham: 0 }, { maTieuChi: 'DN2', diemCham: 3 }] },
    drafts: { current: {} }, deadline: { canGrade: true, canCorrectSubmitted: true },
    onSaved: async () => {}, onClose() {}, currentIndex: 0, totalCount: 1,
  }
  async function render() {
    for (let i = 0; i < 3; i++) {
      cursor = 0; effects = []; tree = Modal(props)
      effects.forEach(fn => fn())
      await new Promise(setImmediate)
    }
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...node.children.flatMap(nodes)]
  }
  const text = node => typeof node === 'string' ? node : node?.children?.map(text).join('') || ''
  await render()
  let inputs = nodes(tree).filter(x => x.type === 'input' && x.props.type === 'number')
  assert.equal(inputs.length, 2)
  assert.equal(inputs[0].props.value, 0)
  assert.equal(inputs[1].props.disabled, false)
  inputs[1].props.onChange({ target: { value: '1.5' } })
  await render()
  await nodes(tree).find(x => x.type === 'button' && text(x).includes('Lưu đính chính')).props.onClick()
  assert.equal(saved.length, 1)
  assert.equal(saved[0].khoaChinhThuc, true, 'an official correction never becomes a draft')
  assert.equal(saved[0].chiTiets[0].diemCham, 0)
  assert.equal(saved[0].chiTiets[1].diemCham, 1.5)
  props.deadline = { canGrade: false, canCorrectSubmitted: false, block: 'Đã hết hạn mở lại.' }
  await render()
  inputs = nodes(tree).filter(x => x.type === 'input' && x.props.type === 'number')
  assert.ok(inputs.every(x => x.props.disabled))
  assert.equal(nodes(tree).some(x => x.type === 'button' && text(x).includes('Lưu đính chính')), false)
})
