import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'
import { paginate } from '../src/utils/pagination.js'
import { enterprisePrintScore, enterpriseGradeComplete } from '../src/utils/enterprisePrintScore.js'

// 03/11/2026: mở/đóng và làm mới hộp chấm điểm không được tạo vòng lặp tải API.
test('opening grading modal does not continuously reload the roster', async () => {
  const slots = []
  let cursor = 0, effects = [], dirty = true, tree, requests = 0
  function memo(fn, deps) {
    const i = cursor++
    if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) slots[i] = { deps, value: fn() }
    return slots[i].value
  }
  const scope = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], value => {
        const next = typeof value === 'function' ? value(slots[i]) : value
        if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true }
      }]
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useMemo: memo,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useEffect(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) {
        slots[i]?.cleanup?.()
        effects.push(() => { slots[i] = { deps, cleanup: fn() } })
      }
    },
    useEnterprise: () => ({ activeCompany: { maCongTy: 'CT' }, maDot: 'ROUND', loading: false }),
    useGradeDeadline: () => ({ canGrade: true }),
    usePagination: items => ({ ...paginate(items), setPage() {}, setPageSize() {} }),
    doanhNghiepService: { async getThucTapSinh() {
      requests++
      return [{ maPhanBo: 'PB', maSinhVien: 'SV', hoTenSV: 'Sinh viên mẫu', chiTietDiemDN: [], daDanhGia: false }]
    } },
    enterprisePrintScore, enterpriseGradeComplete,
    Pagination: 'Pagination', GradeDeadlineNotice: 'GradeDeadlineNotice', ModalOverlay: 'ModalOverlay', DocumentAttachments: 'DocumentAttachments',
  }
  const source = readFileSync(new URL('../src/pages/DoanhNghiep/DanhGiaThucTapSinhPage.jsx', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export default function', 'function')
  const Page = new vm.Script(transformSync(source + '\nDanhGiaThucTapSinhPage', { loader: 'jsx' }).code).runInNewContext(scope)
  async function settle() {
    for (let i = 0; i < 10; i++) {
      if (dirty) {
        dirty = false; cursor = 0; effects = []
        tree = Page()
        effects.forEach(effect => effect())
      }
      await new Promise(setImmediate)
    }
    assert.equal(dirty, false, 'state must settle without repeated roster requests')
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(nodes)
    return [node, ...node.children.flatMap(nodes)]
  }
  const text = node => typeof node === 'string' ? node : node?.children?.map(text).join('') || ''
  await settle()
  assert.equal(requests, 1)
  const open = nodes(tree).find(node => node.type === 'button' && text(node).includes('Chấm điểm'))
  assert.ok(open)
  open.props.onClick()
  await settle()
  assert.equal(requests, 1, 'opening a modal must reuse the loaded roster')
  const modal = nodes(tree).find(node => typeof node.type === 'function' && node.props.onSaved)
  assert.ok(modal)
  await modal.props.onSaved()
  await settle()
  assert.equal(requests, 2, 'saving refreshes once and preserves the selected student')
})
