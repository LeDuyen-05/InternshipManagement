import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'

// 04/11/2026: phản hồi đến chậm không đổi dữ liệu đợt đang xem.
function harness(file, component) {
  const slots = [], requests = []
  let cursor = 0, effects = [], tree, round = 'A', mode = 'progress'
  function memo(factory, deps) {
    const i = cursor++
    if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) slots[i] = { deps, value: factory() }
    return slots[i].value
  }
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = initial
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next }]
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useCallback: (fn, deps) => memo(() => fn, deps),
    useEffect(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) {
        slots[i]?.cleanup?.()
        effects.push(() => { slots[i] = { deps, cleanup: fn() } })
      }
    },
    useDotThucTap: () => ({ selectedDot: { maDot: round, trangThai: 'DangDienRa' }, roundLock: { blocked: false, structureBlocked: false } }),
    useSearchParams: () => [new URLSearchParams()],
    usePagination: items => ({ items, totalPages: 1 }),
    apiClient: { get(path, options) { return new Promise((resolve, reject) => requests.push({ path, ...options, resolve, reject })) } },
    Layout: 'Layout', Link: 'Link', Pagination: 'Pagination', DocumentAttachments: 'DocumentAttachments',
    ThucTapTuTimFacultyPanel: 'ThucTapTuTimFacultyPanel', KhoaChotPhanBoPanel: 'KhoaChotPhanBoPanel', KhoaPhongVanPanel: 'KhoaPhongVanPanel',
    GradingDeadlineSettings: 'GradingDeadlineSettings', ReportReopeningSettings: 'ReportReopeningSettings',
    setTimeout() { return 0 }, clearTimeout() {},
  }
  const source = readFileSync(new URL(`../src/pages/Khoa/${file}`, import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export default function', 'function')
  const Page = new vm.Script(transformSync(source + `\n${component}`, { loader: 'jsx' }).code).runInNewContext(context)
  return { requests,
    render() { cursor = 0; effects = []; tree = Page({ mode }); effects.forEach(fn => fn()); return tree },
    setRound(value) { round = value }, setMode(value) { mode = value },
    text: () => JSON.stringify(tree),
    chooseRound(value) { nodes(tree).filter(x => x.type === 'select')[1].props.onChange({ target: { value } }) },
  }
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes)
  return node && typeof node === 'object' ? [node, ...nodes(node.children)] : []
}
const tick = () => new Promise(setImmediate)

test('faculty progress list rejects responses from another round or mode', async () => {
  const h = harness('KhoaOperationsPage.jsx', 'KhoaOperationsPage')
  h.render(); h.setRound('B'); h.render()
  h.requests[1].resolve({ data: { items: [{ maTienDo: 'B_ONLY', maSinhVien: 'SV', sinhVien: 'B_ONLY', ngayNop: '2029-01-01' }], totalCount: 1 } })
  await tick(); h.render()
  assert.match(h.text(), /B_ONLY/)
  h.requests[0].resolve({ data: { items: [{ sinhVien: 'A_STALE' }], totalCount: 1 } })
  await tick(); h.render()
  assert.match(h.text(), /B_ONLY/); assert.doesNotMatch(h.text(), /A_STALE/)
  h.setMode('registrations'); h.render()
  assert.doesNotMatch(h.text(), /B_ONLY/)
})

test('faculty deadlines hide previous rows immediately and ignore a late response', async () => {
  const h = harness('KhoaDeadlinesPage.jsx', 'KhoaDeadlinesPage')
  h.render()
  h.chooseRound('A'); h.render()
  const a = h.requests.find(x => x.params?.maDot === 'A')
  h.chooseRound('B'); h.render()
  const b = h.requests.find(x => x.params?.maDot === 'B')
  b.resolve({ data: [{ maDot: 'B_ONLY', mocThoiGian: '2029-01-01', reportCount: 1 }] })
  await tick(); h.render(); assert.match(h.text(), /B_ONLY/)
  a.resolve({ data: [{ maDot: 'A_STALE', mocThoiGian: '2029-01-01' }] })
  await tick(); h.render()
  assert.match(h.text(), /B_ONLY/); assert.doesNotMatch(h.text(), /A_STALE/)
})
