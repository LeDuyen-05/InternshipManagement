import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from './Pagination'

export default function DocumentAttachments({ kind, resourceId, readOnly = false, defer = false, title }) {
  const [opened, setOpened] = useState(!defer)
  const [inputVersion, setInputVersion] = useState(0)
  const [rows, setRows] = useState([])
  const [permission, setPermission] = useState(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const version = useRef(0)
  const operation = useRef(0)
  const requestId = useRef('')
  const current = useRef('')
  const key = `${kind}|${resourceId}`
  current.current = key
  const pagination = usePagination(rows, key)

  const load = useCallback(async () => {
    const request = ++version.current
    if (!resourceId) return
    setLoading(true)
    setError('')
    try {
      const params = { kind, resourceId }
      const [list, p] = await Promise.all([
        apiClient.get('/documents', { params }),
        apiClient.get('/documents/permission', { params }),
      ])
      if (current.current !== key || request !== version.current) return
      setRows(list.data)
      setPermission(p.data)
    } catch (e) {
      if (current.current === key && request === version.current) {
        setRows([])
        setPermission(null)
        setError(e.response?.data?.message || 'Không tải được tệp hồ sơ.')
      }
    } finally {
      if (current.current === key && request === version.current) setLoading(false)
    }
  }, [kind, resourceId, key])

  useEffect(() => {
    operation.current++
    setRows([])
    setPermission(null)
    setFile(null)
    setInputVersion((v) => v + 1)
    setBusy(false)
    setLoading(false)
    setError('')
    setMessage('')
    requestId.current = ''
    if (opened) load()
    const ref = version
    return () => {
      ref.current++
    }
  }, [load, opened])

  const upload = async (event) => {
    event.preventDefault()
    if (!file || busy || loading || readOnly || !permission?.canUpload) return
    const limit = (permission.maxFileMb || (kind === 'CV' ? 5 : 10)) * 1024 * 1024
    if (!Number.isFinite(file.size) || file.size <= 0 || file.size > limit) {
      setError(`Tệp rỗng hoặc vượt giới hạn ${limit / 1024 / 1024} MB.`)
      return
    }
    const request = version.current,
      op = ++operation.current
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const body = new FormData()
      body.append('kind', kind)
      body.append('resourceId', resourceId)
      body.append('requestId', requestId.current)
      body.append('file', file)
      await apiClient.post('/documents', body, {
        headers: { 'Content-Type': undefined },
        timeout: 120000,
      })
      if (current.current !== key || request !== version.current) return
      setMessage(
        'Đã lưu tệp vào hồ sơ. Việc nộp báo cáo, công nhận hoặc chấm điểm thực hiện ở thao tác riêng.'
      )
      setFile(null)
      setInputVersion((v) => v + 1)
      requestId.current = ''
      await load()
    } catch (e) {
      if (current.current === key && request === version.current)
        setError(
          e.response?.data?.message ||
            'Chưa xác nhận lưu tệp thành công. Tải lại để kiểm tra trước khi thử lại.'
        )
    } finally {
      if (current.current === key && op === operation.current) setBusy(false)
    }
  }

  const download = async (row) => {
    if (busy || loading) return
    const request = version.current,
      op = ++operation.current
    setBusy(true)
    setError('')
    try {
      const response = await apiClient.get(`/documents/${encodeURIComponent(row.id)}/download`, {
        responseType: 'blob',
      })
      if (current.current !== key || request !== version.current) return
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = row.fileName
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      if (current.current === key && request === version.current)
        setError('Không tải được tệp. Quyền có thể đã thay đổi hoặc kho tệp chưa sẵn sàng.')
    } finally {
      if (current.current === key && op === operation.current) setBusy(false)
    }
  }

  if (!opened) {
    return (
      <button
        type="button"
        onClick={() => setOpened(true)}
        className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs border border-blue-200 transition-colors cursor-pointer"
      >
        {title || 'Xem tệp hồ sơ'}
      </button>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200/90 p-5 space-y-4 bg-white shadow-2xs">
      {/* Header component */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </div>
          <h3 className="font-bold text-sm text-slate-800 m-0">
            {title || (kind === 'CV' ? 'Tệp CV tải lên hệ thống' : 'Tệp đính kèm hồ sơ')}
          </h3>
        </div>

        <button
          type="button"
          disabled={!resourceId || busy || loading}
          onClick={load}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer disabled:opacity-40"
        >
          <svg className={`w-3 h-3 text-slate-400 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Làm mới tệp</span>
        </button>
      </div>

      {/* Thông báo lỗi & trạng thái */}
      {error && (
        <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div role="status" className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{message}</span>
        </div>
      )}

      {/* Form Upload tệp */}
      {!readOnly && (
        <form onSubmit={upload} className="space-y-3">
          <fieldset disabled={!permission?.canUpload || busy || loading} className="border-0 p-0 m-0 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700 space-y-1.5">
              <span className="text-slate-600">
                {kind === 'CV' && rows.length > 0
                  ? 'Tải tệp PDF mới để thay thế CV hiện tại (tối đa '
                  : `Chọn tệp ${kind === 'CV' ? 'PDF' : 'PDF, ảnh, DOCX hoặc XLSX'} (tối đa `}
                {permission?.maxFileMb || (kind === 'CV' ? 5 : 10)} MB)
              </span>
              <input
                key={inputVersion}
                aria-label="Tệp hồ sơ"
                type="file"
                accept={kind === 'CV' ? '.pdf' : '.pdf,.png,.jpg,.jpeg,.docx,.xlsx'}
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null)
                  requestId.current = crypto.randomUUID()
                }}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl bg-slate-50/70 p-1"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={!file}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? 'Đang xử lý…' : kind === 'CV' && rows.length > 0 ? 'Cập nhật CV mới' : 'Tải tệp lên'}
              </button>
            </div>
          </fieldset>
        </form>
      )}

      {/* Thông báo lý do permission */}
      {permission?.reason && (
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{permission.reason}</span>
        </div>
      )}

      {/* Hiển thị CV chuyên biệt hoặc Danh sách tệp thông thường */}
      {kind === 'CV' && rows.length > 0 ? (
        <div className="space-y-3">
          {/* Bản CV hiện hành duy nhất */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border border-blue-200/80 flex items-center justify-between gap-3 shadow-2xs">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider shrink-0">
                  CV hiện hành
                </span>
                <span className="text-xs font-bold text-slate-800 truncate block">
                  {rows[0].fileName}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 space-x-1.5">
                <span>{(rows[0].size / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span>
                  {new Date(rows[0].createdAt).toLocaleString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                  })}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || loading}
              onClick={() => download(rows[0])}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors cursor-pointer"
            >
              <span>Xem / Tải về</span>
            </button>
          </div>

          {/* Lịch sử các bản CV trước (thu gọn, giữ nguyên đối chiếu audit) */}
          {rows.length > 1 && (
            <details className="text-xs text-slate-600 border border-slate-200/70 rounded-xl p-3 bg-slate-50/50">
              <summary className="font-semibold text-slate-600 hover:text-slate-800 cursor-pointer select-none">
                Lịch sử các bản CV trước đó ({rows.length - 1} bản)
              </summary>
              <p className="text-[11px] text-slate-400 mt-1 mb-2.5 italic">
                Hệ thống bảo lưu vết lịch sử cho các đợt ứng tuyển trước. Doanh nghiệp và Khoa luôn nhận bản CV hiện hành ở trên.
              </p>
              <ul className="divide-y divide-slate-100 p-0 m-0 list-none space-y-1">
                {rows.slice(1).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 py-1.5">
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-slate-700 truncate block">{row.fileName}</span>
                      <span className="text-[10px] text-slate-400">
                        {(row.size / 1024).toFixed(1)} KB • {new Date(row.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={busy || loading}
                      onClick={() => download(row)}
                      className="shrink-0 px-2.5 py-0.5 text-[11px] font-semibold rounded-lg text-slate-600 hover:bg-slate-200 bg-white border border-slate-200 cursor-pointer"
                    >
                      Tải về
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 p-0 m-0 list-none space-y-1.5">
          {pagination.items.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/70 border border-slate-100 transition-colors"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-bold text-xs shrink-0">{row.fileName?.split('.').pop()?.toUpperCase() || 'TỆP'}</span>
                  <span className="text-xs font-semibold text-slate-800 truncate block">
                    {row.fileName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-x-1.5">
                  <span>{(row.size / 1024).toFixed(1)} KB</span>
                  <span>•</span>
                  <span>
                    {new Date(row.createdAt).toLocaleString('vi-VN', {
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={busy || loading}
                onClick={() => download(row)}
                className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                Tải về
              </button>
            </li>
          ))}
        </ul>
      )}

      {!rows.length && (
        <p className="text-center py-4 text-xs text-slate-400 italic m-0">
          {loading
            ? 'Đang tải…'
            : kind === 'Template' ? 'Chưa có biểu mẫu được đăng.' : 'Chưa có tệp đính kèm.'}
        </p>
      )}

      {(kind !== 'Template' || pagination.totalPages > 1) && <Pagination pagination={pagination} label="tệp" />}
    </section>
  )
}
