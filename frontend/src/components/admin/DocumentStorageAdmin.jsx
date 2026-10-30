import { useCallback, useEffect, useState } from 'react'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../common/Pagination'

export default function DocumentStorageAdmin() {
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pagination = usePagination(rows, 'pending-files')

  const load = useCallback(async () => {
    try {
      setRows((await apiClient.get('/documents/operations/pending')).data)
    } catch (e) {
      setError(e.response?.data?.message || 'Không tải được tệp tạm.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const act = async (row) => {
    if (
      busy ||
      (row &&
        !window.confirm(
          `Dọn tệp tạm/lỗi ${row.fileName}? Tệp này chưa được gắn thành công vào hồ sơ.`
        ))
    )
      return
    setBusy(true)
    setError('')
    try {
      if (row) {
        await apiClient.post(`/documents/operations/${encodeURIComponent(row.id)}/cleanup`)
        await load()
      } else {
        const r = await apiClient.get('/documents/operations/manifest', { responseType: 'blob' })
        const url = URL.createObjectURL(r.data)
        const a = document.createElement('a')
        a.href = url
        a.download = 'r2-object-manifest.json'
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Không thực hiện được. Kiểm tra cấu hình kho lưu.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 mb-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 m-0">
              Kho lưu trữ tài liệu & Tệp đính kèm
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Quản lý lưu trữ tài liệu hệ thống và dọn dẹp các tệp tải lên chưa hoàn tất.
            </p>
          </div>
        </div>

        {/* Cụm nút thao tác */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={busy}
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Làm mới danh sách</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => act(null)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Xuất danh mục tệp</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi */}
      {error && (
        <div role="alert" className="my-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Danh sách tệp tạm */}
      <div className="mt-4">
        {pagination.items.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            Không có tệp tạm hoặc tệp tải lên dở dang cần dọn dẹp.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold text-left">
                    <th className="py-2.5 px-3">Loại tệp</th>
                    <th className="py-2.5 px-3">Mã hồ sơ</th>
                    <th className="py-2.5 px-3">Tên tệp</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {pagination.items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{row.kind}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{row.resourceId}</td>
                      <td className="py-2.5 px-3 text-slate-900 break-all">{row.fileName}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          {row.state}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(row)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          Dọn tệp tạm
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} label="tệp tạm" />
          </div>
        )}
      </div>
    </section>
  )
}
