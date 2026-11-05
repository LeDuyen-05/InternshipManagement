import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export default function PdfDocumentView({ blob, fileName }) {
  const [document, setDocument] = useState(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [width, setWidth] = useState(800)
  const [error, setError] = useState('')
  const [rendered, setRendered] = useState(false)
  const container = useRef(null)
  const canvas = useRef(null)

  useEffect(() => {
    let active = true, task
    setDocument(null); setPage(1); setError('')
    const load = async () => {
      try {
        const data = new Uint8Array(await blob.arrayBuffer())
        if (!active) return
        task = pdfjs.getDocument({ data, isEvalSupported: false })
        const loaded = await task.promise
        if (active) setDocument(loaded)
      } catch {
        if (active) setError('Không đọc được PDF. Tệp có thể bị hỏng hoặc được bảo vệ bằng mật khẩu. Bạn có thể tải xuống để kiểm tra.')
      }
    }
    load()
    return () => { active = false; task?.destroy().catch(() => {}) }
  }, [blob])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, entry.contentRect.width - 32)))
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!document) return
    let active = true, task
    setRendered(false); setError('')
    const render = async () => {
      try {
        const pdfPage = await document.getPage(page)
        if (!active) return
        const original = pdfPage.getViewport({ scale: 1 })
        const scale = Math.min(width / original.width, 2) * zoom
        const viewport = pdfPage.getViewport({ scale })
        // Render only the selected page and cap the canvas size for large documents.
        const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(16000000 / (viewport.width * viewport.height)))
        const target = canvas.current
        target.width = Math.ceil(viewport.width * ratio)
        target.height = Math.ceil(viewport.height * ratio)
        target.style.width = `${viewport.width}px`; target.style.height = `${viewport.height}px`
        task = pdfPage.render({ canvasContext: target.getContext('2d'), viewport, transform: [ratio, 0, 0, ratio, 0, 0] })
        await task.promise
        if (active) setRendered(true)
      } catch (e) {
        if (active && e.name !== 'RenderingCancelledException') setError('Không hiển thị được trang PDF. Bạn có thể tải tệp xuống để kiểm tra.')
      }
    }
    render()
    return () => { active = false; task?.cancel() }
  }, [document, page, width, zoom])

  return <div ref={container} className="flex flex-col w-full h-full min-h-0">
    {document && <div className="flex flex-wrap justify-center items-center gap-3 py-2 text-sm text-slate-700 shrink-0">
      <button type="button" aria-label="PDF: trang trước" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-40">Trang trước</button>
      <span aria-live="polite">Trang {page} / {document.numPages}</span>
      <button type="button" aria-label="PDF: trang sau" disabled={page >= document.numPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded bg-white disabled:opacity-40">Trang sau</button>
      <label className="flex items-center gap-2">Thu phóng
        <select aria-label="Thu phóng PDF" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="border rounded bg-white px-2 py-1">
          <option value={1}>Vừa chiều rộng</option><option value={1.25}>125%</option><option value={1.5}>150%</option><option value={2}>200%</option>
        </select>
      </label>
    </div>}
    {error && <p role="alert" className="p-4 text-red-700 text-sm">{error}</p>}
    {!error && !rendered && <p role="status" className="text-center p-3 text-sm text-slate-600">Đang hiển thị PDF…</p>}
    <div className="flex-1 min-h-0 overflow-auto text-center">
      <canvas ref={canvas} role="img" aria-label={`${fileName} — Trang ${page}`} className={`inline-block bg-white shadow ${!rendered || error ? 'hidden' : ''}`} />
    </div>
  </div>
}
