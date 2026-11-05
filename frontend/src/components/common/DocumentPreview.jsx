import { lazy, Suspense, useEffect, useState } from 'react'
import apiClient from '../../services/api'
import { documentPreviewType } from '../../utils/documentPreview'
import ModalOverlay from './ModalOverlay'

const PdfDocumentView = lazy(() => import('./PdfDocumentView'))

export default function DocumentPreview({ document: row, onClose, onDownload, downloadBusy, downloadError }) {
  const [view, setView] = useState(null)
  const type = documentPreviewType(row)
  useEffect(() => {
    const abort = new AbortController()
    let active = true, url
    const load = async () => {
      try {
        if (!type) throw new Error('Định dạng này chỉ hỗ trợ tải xuống.')
        const response = await apiClient.get(`/documents/${encodeURIComponent(row.id)}/preview`, {
          responseType: 'blob', signal: abort.signal,
        })
        if (!active) return
        if (response.data.type !== type) throw new Error('Định dạng tệp không phù hợp để xem trực tiếp.')
        url = URL.createObjectURL(response.data)
        setView({ id: row.id, url, blob: response.data })
      } catch (error) {
        if (active) setView({ id: row.id, error: error.response
          ? error.response.status === 404 ? 'Không tìm thấy nội dung tệp. Vui lòng liên hệ Khoa để kiểm tra bản lưu.'
            : error.response.status === 403 ? 'Bạn không có quyền xem tệp này.'
              : 'Không mở được tệp. Vui lòng thử lại sau.'
          : error.message || 'Không mở được tệp.' })
      }
    }
    load()
    return () => { active = false; abort.abort(); if (url) URL.revokeObjectURL(url) }
  }, [row.id, type])
  const current = view?.id === row.id ? view : null
  return (
    <ModalOverlay onClose={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Xem tệp ${row.fileName}`}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 truncate" title={row.fileName}>{row.fileName}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => onDownload(row)} disabled={downloadBusy}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50">Tải xuống</button>
            <button type="button" onClick={onClose}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm">Đóng</button>
          </div>
        </div>
        {downloadError && <p role="alert" className="text-sm text-red-700 px-4 py-2 border-b border-slate-200">{downloadError}</p>}
        <div className="flex-1 min-h-0 bg-slate-100 overflow-auto flex items-center justify-center p-2">
          {!current && <p role="status" className="text-sm text-slate-600">Đang mở tệp…</p>}
          {current?.error && <p role="alert" className="text-sm text-red-700 p-4">{current.error}</p>}
          {current?.url && !current.error && (type === 'application/pdf'
            ? <Suspense fallback={<p role="status" className="text-sm text-slate-600">Đang mở PDF…</p>}>
                <PdfDocumentView key={row.id} blob={current.blob} fileName={row.fileName} />
              </Suspense>
            : <img src={current.url} alt={row.fileName} className="max-w-full max-h-full object-contain"
                onError={() => setView({ id: row.id, error: 'Không hiển thị được ảnh. Bạn có thể tải tệp để kiểm tra.' })} />)}
        </div>
      </div>
    </ModalOverlay>
  )
}
