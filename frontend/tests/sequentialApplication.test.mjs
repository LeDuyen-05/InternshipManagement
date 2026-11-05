import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'

// 04/11/2026: exercise the actual student page with API fixtures; manual acceptance remains separate.
function page(applications = [], registrationInfo = null) {
  let cursor = 0, effects = [], pending = [], tree
  const slots = [], submissions = []
  const company = { maCongTy: 'B', tenCongTy: 'Công ty B', maDot: 'D', viTriTuyen: 'Dev', soLuongNhan: 10 }
  const scope = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useEffect(run, deps) { const i = cursor++; if (!effects[i] || deps.some((v, k) => v !== effects[i].deps[k])) pending.push(() => { effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: run() } }) },
    useIdentity: () => ({ maSV: 'SV' }), useDotThucTap: () => ({ selectedDot: { maDot: 'D', trangThai: 'DangDienRa' }, roundLock: { structureBlocked: false } }),
    useLocation: () => ({ pathname: '/dang-ky', state: null }), useNavigate: () => () => {}, useSearchParams: () => [new URLSearchParams(), () => {}], URLSearchParams,
    usePagination: items => ({ items }), formatTenDot: () => 'Đợt D', getLoaiThucTapInfo: () => ({ label: 'TTKS' }), gpaToiThieu: () => null, trangThaiNguyenVong: () => ({ label: 'Hồ sơ', tone: 'blue' }), TONE: {}, CONG_TY: {},
    Pagination: 'Pagination', ModalOverlay: 'ModalOverlay', NoLinkedAccount: 'NoLinkedAccount', ThucTapTuTimPanel: 'ThucTapTuTimPanel', SupportResponseCard: 'SupportResponseCard',
    dangKyThucTapService: {
      getDanhSachCongTy: async () => [company], getDangKyBySinhVien: async () => applications, getDeXuatCuaToi: async () => [],
      getDieuKien: async () => ({ duocDangKy: true }), getLanDangKy: async () => registrationInfo || ({ cacLanHoTro: [] }),
      dangKyThucTap: async body => { submissions.push(body) },
    },
    phongVanService: { getPhanBoThucTap: async () => null }, hoSoNangLucService: { getHoSoBySinhVien: async () => null }, studentSupportService: { getDanhSachHoTro: async () => null },
    console, setTimeout: () => 0,
  }
  const source = readFileSync(new URL('../src/pages/SinhVien/DangKyThucTapPage.jsx', import.meta.url), 'utf8').replace(/^import .*$/gm, '').replace('export default function', 'function')
  const Page = new vm.Script(transformSync(source + '\nDangKyThucTapPage', { loader: 'jsx' }).code).runInNewContext(scope)
  const render = () => { cursor = 0; pending = []; tree = Page(); const runs = pending; for (const run of runs) run(); return tree }
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.children)] : []
  return {
    submissions, render, nodes: () => nodes(tree), text: () => JSON.stringify(tree),
    async ready() { render(); await new Promise(setImmediate); render() },
    applyButton() { return nodes(tree).find(n => n.type === 'button' && JSON.stringify(n.children).includes('Nộp nguyện vọng')) },
  }
}
const application = (trangThai, company = 'A', dot = 'D') => ({ maDK: 'DK_' + company, maCongTy: company, tenCongTy: 'Công ty A', maDot: dot, trangThai, thuTuUuTien: 1 })

for (const status of ['ChoDuyet', 'DaDuyet']) test(`${status} blocks another company even when an older eligibility response says allowed`, async () => {
  const app = page([application(status)]); await app.ready()
  const button = app.nodes().find(n => n.type === 'button' && n.props.onClick && n.props.title?.includes('hồ sơ ứng tuyển'))
  assert.ok(button); assert.equal(button.props.disabled, true); assert.equal(app.submissions.length, 0)
  assert.match(app.text(), /Đang xử lý một hồ sơ/)
})

test('a rejected application allows a different company and shows the next attempt without priority ranking', async () => {
  const app = page([application('TuChoi')]); await app.ready()
  const button = app.applyButton(); assert.ok(button); assert.equal(button.props.disabled, false)
  await button.props.onClick(); app.render()
  assert.ok(app.nodes().some(n => n.type === 'input' && n.props.readOnly && n.props.value === 2))
  assert.doesNotMatch(app.text(), /Ưu tiên cao nhất|Hệ thống sẽ ưu tiên xét tuyển/)
  await app.nodes().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(app.submissions[0].maCongTy, 'B'); assert.equal(app.submissions[0].thuTuUuTien, 2)
})

test('pending applications from another round do not block the selected round', async () => {
  const app = page([application('ChoDuyet', 'A', 'OTHER')]); await app.ready()
  assert.equal(app.applyButton().props.disabled, false)
})

test('three ended attempts keep new application buttons disabled', async () => {
  const app = page(['A', 'C', 'E'].map(c => application('TuChoi', c))); await app.ready()
  const button = app.nodes().find(n => n.type === 'button' && n.props.title?.includes('hết lượt'))
  assert.ok(button); assert.equal(button.props.disabled, true); assert.equal(app.submissions.length, 0)
})

test('faculty grant enables attempt four and sends the approved support session', async () => {
  const apps = ['A', 'C', 'E'].map(c => application('TuChoi', c))
  const grant = { duocDangKy: true, coTheDangKyLanDau: false, cacLanHoTro: [{ maLan: 'SUPPORT', tenLan: 'Hỗ trợ bổ sung', phienBan: 2, soLuotConLai: 1, dangKyBoSung: { soLuot: 1, hanDangKy: '2030-01-20T12:00:00+07:00', lyDo: 'Khoa chấp thuận' } }] }
  const app = page(apps, grant); await app.ready(); assert.equal(app.applyButton().props.disabled, false)
  await app.applyButton().props.onClick(); app.render()
  await app.nodes().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(app.submissions[0].maLanHoTro, 'SUPPORT'); assert.equal(app.submissions[0].thuTuUuTien, 4)
})

test('an expired or exhausted faculty grant does not unlock attempt four', async () => {
  const app = page(['A', 'C', 'E'].map(c => application('TuChoi', c)), { duocDangKy: false, cacLanHoTro: [] })
  await app.ready()
  assert.ok(app.nodes().some(n => n.type === 'button' && n.props.disabled && n.props.title?.includes('hết lượt')))
  assert.equal(app.submissions.length, 0)
})
