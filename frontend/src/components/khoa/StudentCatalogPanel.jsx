import { useState, useEffect, useRef, useCallback } from 'react'
import apiClient from '../../services/api'
import { downloadExcelResponse, parseBlobError } from '../../utils/exportHuitExcel'

export default function StudentCatalogPanel({ onEdit, reloadKey = 0 }) {
  const [pagedData, setPagedData] = useState({
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    summary: { total: 0, soLop: 0 },
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [lopFilter, setLopFilter] = useState('')
  const [chuyenNganhFilter, setChuyenNganhFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const requestVersion = useRef(0)

  // Debounce tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  // Đổi bộ lọc đưa về trang 1
  useEffect(() => {
    setPage(1)
  }, [lopFilter, chuyenNganhFilter, pageSize])

  const loadData = useCallback(async () => {
    const v = ++requestVersion.current
    setLoading(true)
    setError('')
    try {
      const cleanParams = {
        page,
        pageSize,
      }
      if (debouncedSearch) cleanParams.search = debouncedSearch
      if (lopFilter) cleanParams.lop = lopFilter
      if (chuyenNganhFilter) cleanParams.chuyenNganh = chuyenNganhFilter

      const res = await apiClient.get('/khoa/sinh-vien/paged', { params: cleanParams })
      if (v === requestVersion.current) {
        setPagedData(res.data || { items: [], totalCount: 0, page, pageSize, summary: {} })
      }
    } catch (e) {
      if (v === requestVersion.current) {
        setError(e.response?.data?.message || 'Không tải được danh sách sinh viên.')
      }
    } finally {
      if (v === requestVersion.current) setLoading(false)
    }
  }, [page, pageSize, debouncedSearch, lopFilter, chuyenNganhFilter])

  useEffect(() => {
    loadData()
  }, [loadData, reloadKey])

  const handleExport = async () => {
    try {
      setExporting(true)
      setError('')
      const cleanParams = {}
      if (debouncedSearch) cleanParams.search = debouncedSearch
      if (lopFilter) cleanParams.lop = lopFilter
      if (chuyenNganhFilter) cleanParams.chuyenNganh = chuyenNganhFilter

      const res = await apiClient.get('/khoa/sinh-vien/export-xlsx', {
        params: cleanParams,
        responseType: 'blob',
      })
      await downloadExcelResponse(res, 'DanhSach_SinhVien.xlsx')
      setSuccessMsg('Đã xuất file Excel danh sách sinh viên!')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      const msg = await parseBlobError(err)
      setError(msg)
    } finally {
      setExporting(false)
    }
  }

  const totalItems = pagedData.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(page, totalPages)

  const summaryTotal = pagedData.summary?.total ?? totalItems
  const summaryLop = pagedData.summary?.soLop ?? 0

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">school</span>
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Tổng số sinh viên
            </span>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              {summaryTotal}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">class</span>
          </div>
          <div>
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Số lớp sinh hoạt
            </span>
            <span className="text-xl font-extrabold text-purple-700 tracking-tight">
              {summaryLop}
            </span>
          </div>
        </div>
      </div>

      {/* Thông báo */}
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {/* Thanh tìm kiếm, lọc và xuất Excel */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {/* Ô tìm kiếm */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <span className="material-symbols-outlined text-slate-400 text-base absolute left-3 top-1/2 -translate-y-1/2">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm MSSV, họ tên, lớp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-7 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Lọc Lớp */}
            <input
              type="text"
              placeholder="Lọc theo lớp..."
              value={lopFilter}
              onChange={(e) => setLopFilter(e.target.value.trim())}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white w-32 font-medium"
            />

            {/* Lọc Chuyên ngành */}
            <input
              type="text"
              placeholder="Chuyên ngành..."
              value={chuyenNganhFilter}
              onChange={(e) => setChuyenNganhFilter(e.target.value.trim())}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white w-36 font-medium"
            />

            {(search || lopFilter || chuyenNganhFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setLopFilter('')
                  setChuyenNganhFilter('')
                }}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold cursor-pointer"
              >
                Đặt lại
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={loadData}
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200 cursor-pointer"
              title="Làm mới"
            >
              <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin text-blue-600' : ''}`}>
                refresh
              </span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || loading || totalItems === 0}
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">table_chart</span>
              <span>{exporting ? 'Đang xuất…' : 'Xuất Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-3">Mã SV</th>
                <th className="py-2.5 px-3">Họ và tên</th>
                <th className="py-2.5 px-3">Lớp</th>
                <th className="py-2.5 px-3">Khóa</th>
                <th className="py-2.5 px-3 text-right">GPA</th>
                <th className="py-2.5 px-3">Chuyên ngành</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    Đang tải dữ liệu sinh viên...
                  </td>
                </tr>
              ) : pagedData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    Không tìm thấy sinh viên nào khớp bộ lọc.
                  </td>
                </tr>
              ) : (
                pagedData.items.map((sv) => (
                  <tr key={sv.maSV} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{sv.maSV}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{sv.hoTen}</td>
                    <td className="py-2.5 px-3 text-slate-600">{sv.lop || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500">{sv.khoaHoc || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {sv.gpa != null ? Number(sv.gpa).toFixed(2) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{sv.chuyenNganh || '—'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onEdit?.(sv)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang server */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-600">
            <div>
              Hiển thị{' '}
              <strong className="text-slate-900 font-semibold">
                {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalItems)}
              </strong>{' '}
              trên <strong className="text-slate-900 font-semibold">{totalItems}</strong> sinh viên
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Số dòng:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(1)}
                  className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
                  title="Trang đầu"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Trước
                </button>
                <span className="px-2 font-bold text-slate-700">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
                >
                  Sau
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
                  title="Trang cuối"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
