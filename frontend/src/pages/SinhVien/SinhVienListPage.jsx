import { useEffect, useState } from 'react'
import { sinhVienService } from '../../services/sinhVienService'

function SinhVienListPage() {
  const [sinhViens, setSinhViens] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    sinhVienService
      .getAll()
      .then((res) => {
        const data = res.data?.data || res.data || []
        setSinhViens(Array.isArray(data) ? data : [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = sinhViens.filter((sv) => {
    if (!keyword.trim()) return true
    const kw = keyword.toLowerCase()
    return (
      sv.maSV?.toLowerCase().includes(kw) ||
      sv.hoTen?.toLowerCase().includes(kw) ||
      sv.lop?.toLowerCase().includes(kw) ||
      sv.chuyenNganh?.toLowerCase().includes(kw)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">group</span>
            Danh Sách Sinh Viên Thực Tập
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tra cứu thông tin học vụ và danh sách sinh viên tham gia thực tập tốt nghiệp.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo MSSV, họ tên, lớp..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Đang tải dữ liệu sinh viên...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <span className="material-symbols-outlined text-3xl mb-2 text-slate-300 block">search_off</span>
            Không tìm thấy sinh viên nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-28">Mã SV</th>
                  <th className="py-3 px-4 min-w-[180px]">Họ và tên</th>
                  <th className="py-3 px-4 w-28">Lớp</th>
                  <th className="py-3 px-4 min-w-[160px]">Chuyên ngành</th>
                  <th className="py-3 px-4 w-24 text-center">GPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((sv) => (
                  <tr key={sv.maSV} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{sv.maSV}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{sv.hoTen}</td>
                    <td className="py-3 px-4 text-slate-600">{sv.lop}</td>
                    <td className="py-3 px-4 text-slate-600">{sv.chuyenNganh || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                        {sv.gpa != null ? Number(sv.gpa).toFixed(2) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default SinhVienListPage
