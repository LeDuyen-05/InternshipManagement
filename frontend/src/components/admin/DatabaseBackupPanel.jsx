import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../../services/api'
import Pagination from '../common/Pagination'

const statuses = {
  Running: 'Đang sao lưu',
  Succeeded: 'Đã tạo và kiểm tra checksum',
  Failed: 'Thất bại / chưa hoàn tất',
}

const date = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—'

export default function DatabaseBackupPanel() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const generation = useRef(0)
  const requestInFlight = useRef(false)
  const mounted = useRef(false)

  const load = useCallback(async () => {
    const id = ++generation.current
    setLoading(true)
    try {
      const response = await apiClient.get('/admin/backups', { params: { page, pageSize } })
      if (id !== generation.current) return
      setData(response.data)
      setError('')
      if (response.data.page !== page) setPage(response.data.page)
    } catch (e) {
      if (id !== generation.current) return
      setData(null)
      setError(e.response?.data?.message || 'Không tải được nhật ký sao lưu. Chưa xác định kết quả tác vụ.')
    } finally {
      if (id === generation.current) setLoading(false)
    }
  }, [page, pageSize])
  const refresh = useRef(load)

  useEffect(() => {
    const counter = generation
    mounted.current = true
    refresh.current = load
    load()
    return () => {
      counter.current++
      mounted.current = false
    }
  }, [load])

  const running = data?.items?.some((item) => item.status === 'Running')
  useEffect(() => {
    if (!running && !creating) return
    const timer = setInterval(load, 4000)
    return () => clearInterval(timer)
  }, [running, creating, load])

  const create = async () => {
    if (requestInFlight.current) return
    requestInFlight.current = true
    setCreating(true)
    setMessage('')
    setError('')
    try {
      const result = await apiClient.post('/admin/backups')
      if (mounted.current) setMessage(`Tác vụ ${result.data.id}: ${result.data.message}`)
    } catch (e) {
      if (mounted.current)
        setMessage(
          e.response?.data?.message ||
            'Mất kết nối khi sao lưu. Hãy làm mới để kiểm tra trước khi tạo lại.'
        )
    } finally {
      requestInFlight.current = false
      if (mounted.current) {
        setCreating(false)
        setPage(1)
        await refresh.current()
      }
    }
  }

  const total = data?.totalItems || 0
  const pagination = {
    page,
    pageSize,
    totalItems: total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    start: total ? (page - 1) * pageSize + 1 : 0,
    end: Math.min(page * pageSize, total),
    setPage,
    setPageSize: (size) => {
      setPage(1)
      setPageSize(Number(size))
    },
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Succeeded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {statuses.Succeeded}
          </span>
        )
      case 'Running':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {statuses.Running}
          </span>
        )
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {statuses.Failed}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Chưa xác định
          </span>
        )
    }
  }

  return (
    <section
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 mb-6 transition-all"
      aria-labelledby="backup-title"
    >
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>
          <div>
            <h3 id="backup-title" className="text-base font-bold text-slate-900 m-0">
              Sao lưu CSDL
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tạo bản sao lưu và theo dõi lịch sử sao lưu cơ sở dữ liệu hệ thống.
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={load}
            disabled={loading}
          >
            <svg
              className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Làm mới sao lưu</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={create}
            disabled={!data?.enabled || creating || running || loading}
          >
            {creating ? (
              <>
                <svg
                  className="w-3.5 h-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Đang tạo bản sao…</span>
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Tạo bản sao lưu CSDL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thông báo lỗi & trạng thái */}
      {error && (
        <div
          role="alert"
          className="my-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="my-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{message}</span>
        </div>
      )}

      {/* Thẻ thông tin trạng thái CSDL */}
      {data && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 11h6" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Cơ sở dữ liệu
                </span>
                <span className="font-mono text-xs font-bold text-slate-800 truncate block">
                  {data.database}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Môi trường
                </span>
                <span className="text-xs font-bold text-slate-800">
                  {data.environment}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${data.enabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {data.enabled ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Trạng thái sao lưu
                </span>
                <span className={`text-xs font-bold ${data.enabled ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {data.enabled ? 'Sẵn sàng sao lưu' : 'Chưa bật sao lưu'}
                </span>
              </div>
            </div>
          </div>

          {/* Dòng mô tả chi tiết của hệ thống */}
          <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs text-slate-600 leading-relaxed">
            {data.message?.replace('Người kỹ thuật cần cấu hình thư mục riêng tư và quyền SQL.', 'Tính năng sao lưu hiện chưa được kích hoạt trên máy chủ.') || data.message}
          </div>

          {/* Khi đã bật nhưng chưa có bản ghi */}
          {data.enabled && !total && (
            <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              Chưa có bản sao lưu nào được ghi nhận trong hệ thống.
            </div>
          )}

          {/* Bảng nhật ký sao lưu */}
          {total > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-left">
                      <th className="py-2.5 px-3">Tác vụ / Tệp</th>
                      <th className="py-2.5 px-3">Nguồn / Người tạo</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Bắt đầu / Kết thúc</th>
                      <th className="py-2.5 px-3">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors align-top">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 break-all">{item.fileName}</div>
                          <div className="text-[11px] text-slate-400 font-mono break-all mt-0.5">
                            Mã: {item.id}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 space-y-0.5">
                          <div className="font-medium text-slate-800">{item.database}</div>
                          <div className="text-[11px] text-slate-500">{item.environment}</div>
                          <div className="text-[11px] text-slate-400">{item.createdBy}</div>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 text-[11px] space-y-1">
                          <div>
                            <span className="text-slate-400">Bắt đầu:</span> {date(item.startedAt)}
                          </div>
                          <div>
                            <span className="text-slate-400">Kết thúc:</span> {date(item.finishedAt)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 space-y-1">
                          <div>{getStatusBadge(item.status)}</div>
                          {item.message && (
                            <p className="text-xs text-slate-600 m-0">{item.message}</p>
                          )}
                          {item.sizeBytes != null && (
                            <span className="inline-block text-[11px] font-semibold text-slate-500">
                              Dung lượng: {(item.sizeBytes / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                          {item.sha256 && (
                            <details className="mt-1 cursor-pointer text-[11px] text-blue-600">
                              <summary className="hover:underline font-medium">Xem SHA-256 Checksum</summary>
                              <code className="block mt-1 p-1.5 rounded bg-slate-100 text-slate-700 font-mono break-all text-[10px]">
                                {item.sha256}
                              </code>
                            </details>
                          )}
                          <div className="text-[10px] text-slate-400 italic">Chưa ghi nhận thử phục hồi.</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination pagination={pagination} label="nhật ký sao lưu" />
            </div>
          )}
        </div>
      )}

      </section>
  )
}
