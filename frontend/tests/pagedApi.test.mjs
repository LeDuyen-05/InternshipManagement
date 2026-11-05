import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

// 04/11/2026: đổi đợt/bộ lọc phải hủy yêu cầu cũ, về trang đầu và không để kết quả cũ ghi đè.
function harness() {
  const slots = [], requests = []
  let index = 0, effects = [], value
  function memo(factory, deps) {
    const i = index++
    if (!slots[i] || deps.some((x, n) => x !== slots[i].deps[n])) slots[i] = { deps, value: factory() }
    return slots[i].value
  }
  const context = {
    AbortController,
    useCallback: (fn, deps) => memo(() => fn, deps),
    useState(initial) {
      const i = index++
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next }]
    },
    useRef(initial) { const i = index++; return slots[i] ??= { current: initial } },
    useEffect(fn, deps) {
      const i = index++
      if (!slots[i] || deps.some((x, n) => x !== slots[i].deps[n])) {
        slots[i]?.cleanup?.()
        effects.push(() => { slots[i] = { deps, cleanup: fn() } })
      }
    },
    apiClient: { get(path, options) {
      return new Promise((resolve, reject) => requests.push({ path, ...options, resolve, reject }))
    } },
  }
  const source = readFileSync(new URL('../src/hooks/usePagedApi.js', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/export function /g, 'function ')
  const hook = new vm.Script(source + '\nusePagedApi').runInNewContext(context)
  return {
    requests,
    render(filters, options = {}) {
      index = 0; effects = []
      value = hook('/roster', filters, options)
      effects.forEach(fn => fn())
      return value
    },
  }
}
const tick = () => new Promise(setImmediate)

test('paging and new filters send bounded requests and reset the page synchronously', async () => {
  const h = harness(), filters = { maDot: 'A' }
  h.render(filters)
  h.requests[0].resolve({ data: { maDot: 'A', items: [{ maSV: 'ONE' }], totalCount: 51, page: 1 } })
  await tick()
  let value = h.render(filters)
  value.pagination.setPage(3)
  h.render(filters)
  assert.equal(h.requests[1].params.page, 3)
  assert.equal(h.requests[1].params.pageSize, 10)
  const changed = h.render({ maDot: 'A', search: 'Hai' })
  assert.equal(changed.pagination.page, 1)
  assert.equal(changed.pagination.items.length, 0)
  assert.equal(h.requests[2].params.page, 1)
  assert.equal(h.requests[1].signal.aborted, true)
})

test('late responses and callbacks cannot overwrite or cancel a different round', async () => {
  const h = harness()
  const first = h.render({ maDot: 'A' })
  const next = h.render({ maDot: 'B' })
  assert.equal(next.data, null)
  await first.load()
  assert.equal(h.requests.length, 2)
  assert.equal(h.requests[1].signal.aborted, false)
  h.requests[1].resolve({ data: { maDot: 'B', items: [{ maSV: 'B1' }], totalCount: 1, page: 1 } })
  await tick()
  h.requests[0].resolve({ data: { maDot: 'A', items: [{ maSV: 'A1' }], totalCount: 1, page: 1 } })
  await tick()
  const current = h.render({ maDot: 'B' })
  assert.equal(current.data.maDot, 'B')
  assert.equal(current.pagination.items[0].maSV, 'B1')
  assert.equal(current.loading, false)
  assert.equal(h.requests.length, 2, 'successful results do not create a fetch loop')
})

test('disabled catalog makes no request and a failed request exposes no stale rows', async () => {
  const h = harness()
  h.render({ maDot: 'A' }, { enabled: false })
  assert.equal(h.requests.length, 0)
  h.render({ maDot: 'A' })
  h.requests[0].reject(new Error('offline'))
  await tick()
  const current = h.render({ maDot: 'A' })
  assert.ok(current.error)
  assert.equal(current.data, null)
  assert.equal(current.pagination.items.length, 0)
  assert.equal(current.loading, false)
})
