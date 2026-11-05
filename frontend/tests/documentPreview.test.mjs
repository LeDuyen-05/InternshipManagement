import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { transformSync } from 'esbuild'
import { documentPreviewType } from '../src/utils/documentPreview.js'

// 04/11/2026: mở tệp có xác thực, hủy khi đổi hồ sơ, thu hồi blob khi đóng.
function harness() {
  const slots = [], requests = [], revoked = [], created = []
  let cursor = 0, effects = []
  const scope = {
    AbortController, documentPreviewType, ModalOverlay: 'ModalOverlay', Suspense: 'Suspense', lazy: () => 'PdfDocumentView',
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = initial
      return [slots[i], value => { slots[i] = value }]
    },
    useEffect(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((x, j) => x !== slots[i].deps[j])) {
        slots[i]?.cleanup?.()
        effects.push(() => { slots[i] = { deps, cleanup: fn() } })
      }
    },
    apiClient: { get(path, options) { return new Promise((resolve, reject) => requests.push({ path, options, resolve, reject })) } },
    URL: { createObjectURL(value) { created.push(value); return `blob:test-${created.length}` }, revokeObjectURL(url) { revoked.push(url) } },
  }
  const source = readFileSync(new URL('../src/components/common/DocumentPreview.jsx', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace('export default function', 'function')
  const Preview = new vm.Script(transformSync(source + '\nDocumentPreview', { loader: 'jsx' }).code).runInNewContext(scope)
  return { requests, revoked, created,
    render(row) { cursor = 0; effects = []; const tree = Preview({ document: row, onClose() {}, onDownload() {} }); effects.forEach(fn => fn()); return tree },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}
function nodes(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(nodes)
  return [node, ...node.children.flatMap(nodes)]
}
const pdf = { id: 'ONE', fileName: 'Hồ sơ.pdf', contentType: 'application/pdf' }
const tick = () => new Promise(setImmediate)

test('only PDF and verified image metadata offer an inline preview', () => {
  assert.equal(documentPreviewType(pdf), 'application/pdf')
  assert.equal(documentPreviewType({ fileName: 'anh.PNG', contentType: 'image/png' }), 'image/png')
  assert.equal(documentPreviewType({ fileName: 'anh.jpeg', contentType: 'image/jpeg' }), 'image/jpeg')
  for (const row of [{ fileName: 'a.docx', contentType: 'application/pdf' }, { fileName: 'a.svg', contentType: 'image/svg+xml' }, {}])
    assert.equal(documentPreviewType(row), null)
})

test('preview uses the protected API and closing revokes its object URL', async () => {
  const h = harness(); h.render(pdf)
  assert.equal(h.requests[0].path, '/documents/ONE/preview')
  assert.equal(h.requests[0].options.responseType, 'blob')
  h.requests[0].resolve({ data: { type: 'application/pdf' } }); await tick()
  const frame = nodes(h.render(pdf)).find(x => x.type === 'PdfDocumentView')
  assert.equal(frame.props.blob.type, 'application/pdf')
  assert.equal(frame.props.fileName, pdf.fileName)
  h.unmount()
  assert.equal(h.requests[0].options.signal.aborted, true)
  assert.deepEqual(h.revoked, ['blob:test-1'])
})

test('switching documents rejects stale responses and MIME mismatches', async () => {
  const h = harness(); h.render(pdf)
  const image = { id: 'TWO', fileName: 'anh.png', contentType: 'image/png' }
  h.render(image)
  assert.equal(h.requests[0].options.signal.aborted, true)
  h.requests[0].resolve({ data: { type: 'application/pdf' } }); await tick()
  assert.equal(h.created.length, 0)
  h.requests[1].resolve({ data: { type: 'text/html' } }); await tick()
  assert.ok(nodes(h.render(image)).find(x => x.props.role === 'alert'))
  assert.equal(h.created.length, 0)
  h.unmount()
})

test('a denied preview shows an error without creating a public file URL', async () => {
  const h = harness(); h.render(pdf)
  h.requests[0].reject({ response: { status: 403 } }); await tick()
  assert.ok(nodes(h.render(pdf)).find(x => x.props.role === 'alert'))
  assert.equal(h.created.length, 0)
  h.unmount()
})
