import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { transformSync } from 'esbuild'

function page() {
  const dots = ['A', 'B'].map(maDot => ({ maDot, tenDot: `Đợt ${maDot}`, namHoc: '2026-2027' }))
  let selectedDot = dots[0]
  const slots = [], effects = [], requests = [], exports = []
  let position = 0, pending = [], tree
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    useState(initial) {
      const i = position++
      if (!(i in slots)) slots[i] = initial
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next }]
    },
    useMemo: fn => fn(),
    useEffect(run, deps) {
      const i = position++
      if (!effects[i] || deps.some((value, index) => !Object.is(value, effects[i].deps[index]))) {
        pending.push(() => {
          effects[i]?.cleanup?.()
          effects[i] = { deps, cleanup: run() }
        })
      }
    },
    useDotThucTap: () => ({ selectedDot, danhSachNamHoc: [{ dots }], changeDot: dot => { selectedDot = dot } }),
    usePagination: items => ({ items }),
    apiClient: { get: (_url, options) => new Promise(resolve => requests.push({ scope: options.params.maDot, resolve })) },
    tachHoTen: hoTen => ({ hoLot: '', ten: hoTen, hoTen }),
    xuatBangHuitExcel: async data => { exports.push(data) },
    Layout: 'Layout', Pagination: 'Pagination',
  }
  const source = readFileSync(new URL('../src/pages/Khoa/ThongKeBaoCaoPage.jsx', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export default function', 'function')
  const Component = new vm.Script(transformSync(source + '\nThongKeBaoCaoPage', { loader: 'jsx' }).code).runInNewContext(context)
  function render() { position = 0; pending = []; tree = Component(); return tree }
  function commit() { for (const run of pending) run(); pending = [] }
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes)
    return node && typeof node === 'object' ? [node, ...nodes(node.children)] : []
  }
  return {
    requests, exports, render, commit,
    setRound: id => { selectedDot = dots.find(dot => dot.maDot === id) },
    select: value => nodes(tree).find(node => node.type === 'select').props.onChange({ target: { value } }),
    export: () => nodes(tree).find(node => node.type === 'button').props.onClick(),
    text: () => JSON.stringify(tree),
    settle: async () => { await new Promise(resolve => setImmediate(resolve)); render() },
  }
}

const report = (id, dot) => ({ maTienDo: id, maSinhVien: 'SV', sinhVien: id, maDot: dot, dot, trangThaiDuyet: 'DaNop' })

test('defaults to shared round, hides stale rows and ignores a late response after switching rounds', async () => {
  const app = page()
  app.render(); app.commit()
  assert.equal(app.requests[0].scope, 'A')
  app.setRound('B'); app.render(); app.commit()
  assert.equal(app.requests[1].scope, 'B')
  app.requests[1].resolve({ data: { reports: [report('B_ONLY', 'B')] } })
  await app.settle()
  assert.match(app.text(), /B_ONLY/)
  app.requests[0].resolve({ data: { reports: [report('A_STALE', 'A')] } })
  await app.settle()
  assert.doesNotMatch(app.text(), /A_STALE/)
  await app.export()
  assert.match(app.exports[0].subTitle, /Đợt B/)
  assert.equal(app.exports[0].rows[0].hoTen, 'B_ONLY')
  app.setRound('A'); app.render()
  assert.doesNotMatch(app.text(), /B_ONLY/)
})

test('all-round scope is explicit and a global round change restores the shared scope', async () => {
  const app = page()
  app.render(); app.commit(); app.render()
  app.select(''); app.render(); app.commit()
  assert.equal(app.requests[1].scope, undefined)
  app.requests[1].resolve({ data: { reports: [report('ALL_ONLY', 'A')] } })
  await app.settle()
  await app.export()
  assert.match(app.exports[0].subTitle, /Tất cả đợt/)
  app.setRound('B'); app.render()
  assert.doesNotMatch(app.text(), /ALL_ONLY/)
  app.commit()
  assert.equal(app.requests.at(-1).scope, 'B')
  app.render(); app.select('A'); app.render(); app.commit()
  assert.equal(app.requests.at(-1).scope, 'A')
})
