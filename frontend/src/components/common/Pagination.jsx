import { PAGE_SIZES, paginationPages } from '../../utils/pagination'

export default function Pagination({ pagination, label = 'danh sách' }) {
  const { page, pageSize, totalItems, totalPages, start, end, setPage, setPageSize } = pagination
  if (!totalItems) return null

  return (
    <nav
      aria-label={`Phân trang ${label}`}
      className="flex flex-wrap items-center justify-between gap-y-2.5 gap-x-3 border-t border-slate-200/90 bg-white px-3.5 py-2.5 sm:px-4 text-xs text-slate-600 rounded-b-xl sm:rounded-b-2xl shadow-2xs"
    >
      {/* Thông tin số lượng & Chọn số dòng mỗi trang */}
      <div className="flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
        <span aria-live="polite" className="inline-flex items-center gap-1 font-normal text-slate-500 whitespace-nowrap">
          <span>Hiển thị</span>
          <span className="font-semibold text-slate-800 tabular-nums">{start}–{end}</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-800 tabular-nums">{totalItems}</span>
          <span className="text-slate-400">bản ghi</span>
        </span>

        <span className="hidden sm:inline-block w-px h-3.5 bg-slate-200 shrink-0" aria-hidden="true" />

        <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
          <span>Dòng/trang:</span>
          <div className="relative inline-flex items-center">
            <select
              aria-label={`${label}: số dòng mỗi trang`}
              value={pageSize}
              onChange={(event) => setPageSize(event.target.value)}
              className="appearance-none pl-2 pr-6 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-2xs"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <svg
              className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </label>
      </div>

      {/* Cụm nút điều hướng trang */}
      <div className="flex items-center gap-1 select-none shrink-0">
        {/* Nút Trang trước */}
        <button
          type="button"
          aria-label={`${label}: trang trước`}
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs shadow-2xs active:scale-95 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Trước</span>
        </button>

        {/* Danh sách các nút số trang */}
        <div className="flex items-center gap-1">
          {paginationPages(page, totalPages).map((number, index) =>
            number === '…' ? (
              <span
                key={`gap-${index}`}
                className="w-6 h-7 inline-flex items-center justify-center text-slate-400 font-bold select-none text-xs tracking-widest"
              >
                …
              </span>
            ) : (
              <button
                type="button"
                key={number}
                aria-label={`${label}: trang ${number}`}
                aria-current={number === page ? 'page' : undefined}
                onClick={() => setPage(number)}
                className={`min-w-[28px] h-7 px-1.5 inline-flex items-center justify-center rounded-lg text-xs font-semibold tabular-nums transition-all cursor-pointer ${
                  number === page
                    ? 'bg-indigo-600 text-white shadow-xs font-bold border border-indigo-600'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-2xs active:scale-95'
                }`}
              >
                {number}
              </button>
            )
          )}
        </div>

        {/* Nút Trang sau */}
        <button
          type="button"
          aria-label={`${label}: trang sau`}
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs shadow-2xs active:scale-95 cursor-pointer"
        >
          <span>Sau</span>
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  )
}
