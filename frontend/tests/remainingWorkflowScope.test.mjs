import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { submissionBlock } from '../src/utils/reportDeadline.js'

// 04/11/2026: delayed lecturer report/deadline writes cannot alter a newly selected context.
function harness(path, component, identity = { maGV: 'GV', role: 'VT03' }, student = 'S') {
  const slots = [], requests = []
  let cursor = 0, effects = [], tree, dirty = true, writes = 0
  const queue = (method, url, payload) => new Promise((resolve, reject) => requests.push({ method, url, payload, resolve, reject }))
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    URLSearchParams, setTimeout() {}, console, submissionBlock,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { const next = typeof value === 'function' ? value(slots[i]) : value; if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; writes++ } }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useMemo(factory, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) slots[i] = { deps, value: factory() }; return slots[i].value },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i].deps[j])) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
    useDotThucTap: () => ({ selectedDot: { maDot: 'A', tenDot: 'Đợt A' }, roundLock: { blocked: false } }),
    useRoundLock: () => ({ blocked: false }), deadlineText: v => v || '',
    useIdentity: () => identity, useNavigate: () => () => {},
    useSearchParams: () => [new URLSearchParams(student ? `sv=${student}` : ''), () => {}],
    usePagination: items => ({ items }), Pagination: 'Pagination', Link: 'Link', DocumentAttachments: 'DocumentAttachments', RoundLockNotice: 'RoundLockNotice',
    toast: { error() { throw Error('Stale request emitted a global error') } },
    apiClient: { get: url => queue('GET', url), put: (url, payload) => queue('PUT', url, payload) },
    gvHuongDanService: { getSVTheoGiangVien: (...args) => queue('GET', 'students', args), getGiangVienTai: (...args) => queue('GET', 'lecturers', args) },
    tienDoThucTapService: { getTienDoBySinhVien: (...args) => queue('GET', 'reports', args) },
  }
  const source = readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace('export default function', 'function')
  const Component = new vm.Script(transformSync(source + `\n${component}`, { loader: 'jsx' }).code).runInNewContext(context)
  const render = () => { dirty = false; cursor = 0; effects = []; tree = Component({ rounds: [{ maSo: 'A', trangThai: 'DangDienRa' }, { maSo: 'B' }] }); effects.forEach(fn => fn()); return tree }
  return { requests, render, get tree() { return tree }, get writes() { return writes },
    async settle() { for (let i = 0; i < 12; i++) { if (dirty) render(); await new Promise(setImmediate) } assert.equal(dirty, false) },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) }, text: () => JSON.stringify(tree),
  }
}
function nodes(node) { if (Array.isArray(node)) return node.flatMap(nodes); return node && typeof node === 'object' ? [node, ...nodes(node.children)] : [] }
const dates = year => ({ moChamGV: `${year}-01-01T00:00:00+07:00`, hanChamGV: `${year}-02-01T00:00:00+07:00`, hanChamDN: `${year}-02-01T00:00:00+07:00`, phienBanThoiHan: 1 })

test('submission stays open through the due day and the exact approved extension deadline in Vietnam time', () => {
  const report = { mocThoiGian: '2026-11-04' }
  assert.equal(submissionBlock(report, Date.parse('2026-11-04T23:59:59+07:00')), null)
  assert.ok(submissionBlock(report, Date.parse('2026-11-05T00:00:00+07:00')))
  const reopened = { ...report, hanNopBoSung: '2026-11-05T12:00:00+07:00' }
  const end = Date.parse(reopened.hanNopBoSung)
  assert.equal(submissionBlock(reopened, end), null)
  assert.ok(submissionBlock(reopened, end + 1))
})

for (const phase of ['save', 'history']) test(`late deadline ${phase} response cannot replace another round's form/history`, async () => {
  const h = harness('components/common/GradingDeadlineSettings.jsx', 'GradingDeadlineSettings')
  h.render(); h.requests[0].resolve({ data: dates(2029) }); h.requests[1].resolve({ data: [] }); await h.settle()
  const save = nodes(h.tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} })
  const put = h.requests.find(r => r.method === 'PUT')
  if (phase === 'history') { put.resolve({ data: dates(2029) }); await h.settle() }
  const lateHistory = h.requests.find((r, i) => i > 1 && r.method === 'GET' && r.url === '/thoi-han/A/lich-su')
  nodes(h.tree).find(n => n.type === 'select').props.onChange({ target: { value: 'B' } }); await h.settle()
  h.requests.find(r => r.url === '/thoi-han/B').resolve({ data: dates(2030) })
  h.requests.find(r => r.url === '/thoi-han/B/lich-su').resolve({ data: [{ lyDo: 'B_HISTORY', ngayThayDoi: '2030-01-01' }] }); await h.settle()
  if (phase === 'save') put.resolve({ data: dates(2029) })
  else lateHistory.resolve({ data: [{ lyDo: 'A_STALE' }] })
  await save; await h.settle()
  assert.match(h.text(), /2030-01-01/); assert.match(h.text(), /B_HISTORY/); assert.doesNotMatch(h.text(), /A_STALE|2029-01-01/)
  h.unmount()
})

test('lecturer missing an identity never loads GV001 as a fallback', async () => {
  const h = harness('pages/GiangVien/TienDoThucTapSVPage.jsx', 'ProgressStudentPage', { role: 'VT03' })
  await h.settle(); assert.equal(h.requests.length, 0); h.unmount()
})

test('a student outside the lecturer roster is not requested from the progress API', async () => {
  const h = harness('pages/GiangVien/TienDoThucTapSVPage.jsx', 'ProgressStudentPage', undefined, 'OTHER')
  h.render(); h.requests.find(r => r.url === 'students').resolve({ data: [{ maSV: 'S', hoTen: 'Sinh viên S' }] }); h.requests.find(r => r.url === 'lecturers').resolve({ data: { data: [] } })
  await h.settle(); assert.equal(h.requests.filter(r => r.url === 'reports').length, 0); h.unmount()
})

test('progress response after changing student/round cannot update the previous screen', async () => {
  const h = harness('pages/GiangVien/TienDoThucTapSVPage.jsx', 'ProgressStudentPage')
  h.render(); h.requests.find(r => r.url === 'students').resolve({ data: [{ maSV: 'S', hoTen: 'Sinh viên S' }] }); h.requests.find(r => r.url === 'lecturers').resolve({ data: { data: [] } })
  await h.settle(); const pending = h.requests.find(r => r.url === 'reports'); assert.ok(pending)
  h.unmount(); const before = h.writes; pending.resolve({ data: [{ maTienDo: 'STALE', maSV: 'S' }] })
  await new Promise(setImmediate); assert.equal(h.writes, before)
})

for (const [deadline, extra, expected] of [
  ['2000-01-01', '2099-01-01T12:00:00+07:00', 'Đang mở nộp bổ sung'],
  ['2000-01-01', '2001-01-01T12:00:00+07:00', 'Chưa nộp (Quá hạn)'],
  ['2099-01-01', null, 'Chưa nộp (còn hạn)'],
]) test(`lecturer progress displays the effective submission deadline: ${expected}`, async () => {
  const h = harness('pages/GiangVien/TienDoThucTapSVPage.jsx', 'ProgressStudentPage')
  h.render(); h.requests.find(r => r.url === 'students').resolve({ data: [{ maSV: 'S', hoTen: 'Sinh viên S' }] }); h.requests.find(r => r.url === 'lecturers').resolve({ data: { data: [] } })
  await h.settle(); h.requests.find(r => r.url === 'reports').resolve([{ maTienDo: 'R', maSV: 'S', mocThoiGian: deadline, hanNopBoSung: extra, trangThaiDuyet: 'ChuaNop' }])
  await h.settle(); assert.ok(h.text().includes(expected)); h.unmount()
})
