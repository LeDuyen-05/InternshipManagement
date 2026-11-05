import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'

// 04/11/2026: delayed interview responses must not change another round's capacity.
function harness() {
  const slots = [], pending = [], updates = []
  let cursor = 0, effects = []
  function memo(fn, deps) {
    const i = cursor++
    if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { deps, value: fn() }
    return slots[i].value
  }
  const scope = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    Date, setInterval: () => 1, clearInterval() {}, setTimeout() {},
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useMemo: memo,
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
    useEnterprise: () => ({ activeCompany: { maCongTy: 'CT', daiDiens: [] }, maDot: 'ROUND', updateChiTieu: value => updates.push(value) }),
    usePagination: items => ({ items }), Pagination: 'Pagination', InterviewCorrectionPanel: 'InterviewCorrectionPanel', ModalOverlay: 'ModalOverlay',
    doanhNghiepService: Object.fromEntries(['getPhongVan', 'getUngVien', 'getTongQuan'].map(name => [name, () => new Promise(resolve => pending.push({ name, resolve }))])),
    vietnamDateTimeParts: () => ({ date: '2026-11-04' }), formatInterviewDate: () => '', formatInterviewTime: () => '', isFutureInterview: () => true, hasInterviewStarted: () => false,
  }
  const source = readFileSync(new URL('../src/pages/DoanhNghiep/LichPhongVanDNPage.jsx', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace('export default function', 'function')
  const Page = new vm.Script(transformSync(source + '\nInterviewRoundPage', { loader: 'jsx' }).code).runInNewContext(scope)
  return { pending, updates,
    render() { cursor = 0; effects = []; const tree = Page(); effects.forEach(fn => fn()); return tree },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
    async resolve(rows) { for (const p of pending) p.resolve(p.name === 'getPhongVan' ? rows : p.name === 'getUngVien' ? [] : { chiTieu: { tenDot: 'OLD', soLuongNhan: 2 } }); await new Promise(setImmediate) },
  }
}
function nodes(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(nodes)
  return [node, ...(node.children || []).flatMap(nodes)]
}

test('a response completing after switching round cannot update shared capacity', async () => {
  const h = harness(); h.render(); assert.equal(h.pending.length, 3)
  h.unmount(); await h.resolve([{ maPV: 'OLD' }])
  assert.equal(h.updates.length, 0)
})

test('interview search and status filters preserve only matching current interviews', async () => {
  const h = harness(); h.render()
  await h.resolve([
    { maPV: 'A', maSV: '00123', hoTenSV: 'Nguyễn An', ketQua: 'Dat' },
    { maPV: 'B', maSV: '00456', hoTenSV: 'Trần Bình', ketQua: 'Dat', daThayThe: true },
    { maPV: 'C', maSV: '00789', hoTenSV: 'Lê Chi', ketQua: 'ChuaCoKetQua' },
  ])
  let tree = h.render()
  const pagination = () => nodes(tree).find(n => n.type === 'Pagination').props.pagination.items
  assert.equal(pagination().length, 3)
  nodes(tree).find(n => n.props['aria-label'] === 'Tìm lịch phỏng vấn theo MSSV hoặc họ tên').props.onChange({ target: { value: '00123' } })
  tree = h.render(); assert.equal(pagination().length, 1); assert.equal(pagination()[0].maPV, 'A')
  nodes(tree).find(n => n.props['aria-label'] === 'Tìm lịch phỏng vấn theo MSSV hoặc họ tên').props.onChange({ target: { value: '' } })
  nodes(tree).find(n => n.props['aria-label'] === 'Lọc trạng thái phỏng vấn').props.onChange({ target: { value: 'Dat' } })
  tree = h.render(); assert.equal(pagination().length, 1); assert.equal(pagination()[0].maPV, 'A')
  h.unmount()
})
