import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { documentPreviewType } from '../src/utils/documentPreview.js'

function harness(readOnly) {
  const slots = [], requests = []
  let cursor = 0, effects = [], tree, dirty = true
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    documentPreviewType, Pagination: 'Pagination', DocumentPreview: 'DocumentPreview',
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = initial
      return [slots[i], value => {
        const next = typeof value === 'function' ? value(slots[i]) : value
        if (!Object.is(slots[i], next)) { slots[i] = next; dirty = true }
      }]
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useCallback(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((v, j) => !Object.is(v, slots[i].deps[j]))) slots[i] = { deps, value: fn }
      return slots[i].value
    },
    useEffect(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((v, j) => !Object.is(v, slots[i].deps[j]))) effects.push(() => {
        slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }
      })
    },
    usePagination: rows => ({ items: rows, totalPages: 1 }),
    apiClient: { get: path => new Promise(resolve => requests.push({ path, resolve })) },
  }
  const source = readFileSync(new URL('../src/components/common/DocumentAttachments.jsx', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export default function', 'function')
  const Component = new vm.Script(transformSync(source + '\nDocumentAttachments', { loader: 'jsx' }).code).runInNewContext(context)
  const render = () => {
    dirty = false; cursor = 0; effects = []
    tree = Component({ kind: 'Progress', resourceId: 'REPORT', readOnly })
    effects.forEach(fn => fn())
  }
  return { requests, render, text: () => JSON.stringify(tree),
    async settle() { for (let i = 0; i < 8; i++) { if (dirty) render(); await new Promise(setImmediate) } },
  }
}

test('view-only attachments load independently of upload permission and keep file actions', async () => {
  const h = harness(true)
  h.render()
  assert.deepEqual(h.requests.map(r => r.path), ['/documents'])
  h.requests[0].resolve({ data: [{ id: 'FILE', fileName: 'BaoCao.pdf', contentType: 'application/pdf', size: 1024, createdAt: '2026-11-11' }] })
  await h.settle()
  assert.match(h.text(), /BaoCao.pdf/)
  assert.doesNotMatch(h.text(), /fieldset|quá hạn|đang khóa/)
})

test('an empty view-only attachment list does not imply the report is locked', async () => {
  const h = harness(true)
  h.render(); h.requests[0].resolve({ data: [] }); await h.settle()
  assert.match(h.text(), /Chưa có tệp đính kèm/)
  assert.doesNotMatch(h.text(), /quá hạn|đang khóa/)
})

test('editable attachments still check and show upload restrictions', async () => {
  const h = harness(false)
  h.render()
  h.requests.find(r => r.path === '/documents').resolve({ data: [] })
  h.requests.find(r => r.path === '/documents/permission').resolve({ data: { canUpload: false, reason: 'Đã hết hạn nộp.' } })
  await h.settle()
  assert.match(h.text(), /Đã hết hạn nộp/)
})
