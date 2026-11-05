import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'

// 03/11/2026: không dùng đợt mẫu khi API trống/lỗi; giữ đúng danh mục và ngày thực tế.
function contextHarness(load) {
  const slots = [], storage = new Map()
  let index = 0, effects = [], tree, account = 'ACCOUNT'
  const source = readFileSync(new URL('../src/contexts/DotThucTapContext.jsx', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/export function /g, 'function ')
  const context = {
    React: { createElement: (type, props) => ({ type, props }) },
    createContext: () => ({ Provider: 'Provider' }),
    useState(initial) {
      const position = index++
      if (!(position in slots)) slots[position] = typeof initial === 'function' ? initial() : initial
      return [slots[position], value => { slots[position] = typeof value === 'function' ? value(slots[position]) : value }]
    },
    useRef(initial) { const position = index++; return slots[position] ??= { current: initial } },
    useEffect(effect, deps) {
      const position = index++
      if (!slots[position] || deps.some((value, i) => value !== slots[position].deps[i])) {
        slots[position]?.cleanup?.()
        effects.push(() => { slots[position] = { deps, cleanup: effect() } })
      }
    },
    useAuth: () => ({ user: { maTaiKhoan: account } }),
    useRoundLock: maDot => ({ structureBlocked: !maDot }),
    formatTenDot: dot => dot.tenDot,
    thongKeService: { getDanhSachDotThucTap: load },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  }
  const Provider = new vm.Script(transformSync(source + '\nDotThucTapProvider', { loader: 'jsx' }).code).runInNewContext(context)
  return {
    storage,
    setAccount(value) { account = value },
    render() {
      index = 0; effects = []
      tree = Provider({ children: null })
      for (const effect of effects) effect()
      return tree.props.value
    },
  }
}

test('empty round catalog does not substitute a sample round or preserve a stale selected ID', async () => {
  const harness = contextHarness(async () => ({ data: { data: [] } }))
  harness.storage.set('selected_dot_thuc_tap', 'OLD')
  assert.equal(harness.render().selectedDot, null)
  await new Promise(setImmediate)
  const current = harness.render()
  assert.equal(current.selectedDot, null)
  assert.equal(current.danhSachNamHoc.length, 0)
  assert.equal(current.isReadOnly, true)
  assert.equal(harness.storage.has('selected_dot_thuc_tap'), false)
})

test('round API failure stays read only and reports an error', async () => {
  const harness = contextHarness(async () => { throw new Error('offline') })
  harness.render(); await new Promise(setImmediate)
  const current = harness.render()
  assert.equal(current.selectedDot, null)
  assert.equal(current.isReadOnly, true)
  assert.ok(current.error)
})

test('selected round retains the actual type, rubric and dates and rejects unknown round IDs', async () => {
  const dot = { maDot: 'NEW', tenDot: 'Đợt mới', namHoc: '2029-2030', maLoaiThucTap: 'TTNN', maRubric: 'CUSTOM',
    trangThai: 'DangDienRa', thoiGianBD: '2029-02-01', thoiGianKT: '2029-05-01' }
  const harness = contextHarness(async () => ({ data: { data: [dot] } }))
  harness.render(); await new Promise(setImmediate)
  const current = harness.render()
  assert.equal(current.selectedDot.maDot, dot.maDot)
  assert.equal(current.selectedDot.maLoaiThucTap, dot.maLoaiThucTap)
  assert.equal(current.selectedDot.maRubric, dot.maRubric)
  assert.equal(current.selectedDot.thoiGianBD, dot.thoiGianBD)
  assert.equal(current.selectedDot.thoiGianKT, dot.thoiGianKT)
  current.changeDot({ maDot: 'UNKNOWN' })
  assert.equal(harness.render().selectedDot.maDot, 'NEW')
})

// 04/11/2026: không kế thừa lựa chọn đợt của tài khoản khác trên cùng trình duyệt.
test('round preference is isolated per account and ignores legacy shared storage', async () => {
  const dots = [{ maDot: 'ACTIVE', tenDot: 'Đợt hiện hành', trangThai: 'DangDienRa' },
    { maDot: 'OLD', tenDot: 'Đợt cũ', trangThai: 'DaKetThuc' }]
  const h = contextHarness(async () => ({ data: { data: dots } }))
  h.storage.set('selected_dot_thuc_tap', 'OLD')
  h.render(); await new Promise(setImmediate)
  assert.equal(h.render().selectedDot.maDot, 'ACTIVE')
  h.render().changeDot(dots[1])
  assert.equal(h.storage.get('selected_dot_thuc_tap:ACCOUNT'), 'OLD')
  h.setAccount('OTHER'); h.render(); await new Promise(setImmediate)
  assert.equal(h.render().selectedDot.maDot, 'ACTIVE')
  h.setAccount('ACCOUNT'); h.render(); await new Promise(setImmediate)
  assert.equal(h.render().selectedDot.maDot, 'OLD')
})
