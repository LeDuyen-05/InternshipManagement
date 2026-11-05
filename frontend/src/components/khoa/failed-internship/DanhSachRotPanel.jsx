import { toast } from "../../../contexts/ToastContext.jsx"
import { useState, useEffect, useRef } from 'react'
import { failedInternshipService } from '../../../services/failedInternshipService'
import { rubricService } from '../../../services/rubricService'
import { useDotThucTap } from '../../../contexts/DotThucTapContext'
import ChiTietHoSoRotModal from './ChiTietHoSoRotModal'

const NGUYEN_NHAN_OPTIONS = [
  { value: 'ALL', label: 'Tất cả nguyên nhân' },
  { value: 'RotDiem', label: 'Rớt do điểm đánh giá' },
  { value: 'KhongHoanTat', label: 'Không hoàn tất đợt thực tập' },
  { value: 'TuChoiHoTro', label: 'Từ chối nhận hỗ trợ của Khoa' },
]

const NGUON_OPTIONS = [
  { value: 'TuDong', label: 'Tự động (Ưu tiên bản chốt nếu đã khóa)' },
  { value: 'HienHanh', label: 'Dữ liệu hiện hành' },
  { value: 'BanChot', label: 'Chỉ lấy bản chốt' },
]

export default function DanhSachRotPanel({ maDot: initialMaDot }) {
  const { danhSachNamHoc: academicYears, selectedDot } = useDotThucTap()
  const [loaiThucTaps, setLoaiThucTaps] = useState([])

  const [filters, setFilters] = useState({
    namHoc: '',
    maLoaiThucTap: 'ALL',
    maDot: initialMaDot || selectedDot?.maDot || '',
    lop: '',
    search: '',
    nguyenNhan: 'ALL',
    nguon: 'TuDong',
    page: 1,
    pageSize: 20,
  })

  const [data, setData] = useState({ items: [], totalCount: 0, page: 1, pageSize: 20 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)

  const requestVersion = useRef(0)

  // Tải danh mục loại thực tập
  useEffect(() => {
    rubricService.getLoaiThucTap().then(setLoaiThucTaps).catch(() => {})
  }, [])

  // Cập nhật maDot nếu component nhận initialMaDot mới
  useEffect(() => {
    if (initialMaDot && initialMaDot !== filters.maDot) {
      setFilters((prev) => ({ ...prev, maDot: initialMaDot, page: 1 }))
    }
  }, [initialMaDot])

  const fetchData = async () => {
    const v = ++requestVersion.current
    setLoading(true)
    setError('')
    try {
      const res = await failedInternshipService.getDanhSach(filters)
      if (v === requestVersion.current) {
        setData(res || { items: [], totalCount: 0, page: 1, pageSize: 20 })
      }
    } catch (err) {
      if (v === requestVersion.current) {
        setError(err.response?.data?.message || err.message || 'Không thể tải danh sách kết quả rớt.')
      }
    } finally {
      if (v === requestVersion.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [
    filters.namHoc,
    filters.maLoaiThucTap,
    filters.maDot,
    filters.lop,
    filters.nguyenNhan,
    filters.nguon,
    filters.page,
    filters.pageSize,
  ])

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData()
    }, 400)
    return () => clearTimeout(timer)
  }, [filters.search])

  const handleExport = async (format) => {
    try {
      setIsExporting(true)
      const blob = await failedInternshipService.exportFile(filters, format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `danh-sach-rot-thuc-tap-${new Date().toISOString().slice(0, 10)}.${format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Không thể xuất danh sách.')
    } finally {
      setIsExporting(false)
    }
  }

  // Danh sách các đợt thực tập phẳng
  const allDots = (academicYears || []).flatMap((y) =>
    (y.dots || []).map((d) => ({
      ...d,
      namHoc: y.namHoc,
    }))
  )

  const items = data.items || []
  const totalPages = Math.ceil((data.totalCount || 0) / filters.pageSize) || 1

  return (
    <div className="space-y-5">
      {/* 1. Header & Bộ lọc */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-700 mb-1">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              QUẢN LÝ HỒ SƠ &amp; THẨM ĐỊNH KẾT QUẢ KHÔNG ĐẠT
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight m-0">
              Danh sách &amp; Hồ sơ Rớt Thực tập
            </h2>
            <p className="text-xs text-slate-500 mt-1 m-0">
              Tra cứu hồ sơ sinh viên không đạt theo đợt, phân biệt rõ nguyên nhân rớt điểm, không hoàn tất hoặc từ chối nhận hỗ trợ của Khoa.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleExport('xlsx')}
              disabled={isExporting || loading || data.totalCount === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
              <span>{isExporting ? 'Đang xuất...' : 'Xuất Excel (.xlsx)'}</span>
            </button>

          </div>
        </div>

        {/* Filter controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          {/* Năm học */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Năm học</label>
            <select
              value={filters.namHoc}
              onChange={(e) => setFilters({ ...filters, namHoc: e.target.value, page: 1 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              <option value="">Tất cả năm học</option>
              {(academicYears || []).map((y) => (
                <option key={y.namHoc} value={y.namHoc}>
                  {y.namHoc}
                </option>
              ))}
            </select>
          </div>

          {/* Loại thực tập */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Loại thực tập</label>
            <select
              value={filters.maLoaiThucTap}
              onChange={(e) => setFilters({ ...filters, maLoaiThucTap: e.target.value, page: 1 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              <option value="ALL">Tất cả loại</option>
              {loaiThucTaps.map((l) => (
                <option key={l.maLoai} value={l.maLoai}>
                  {l.tenLoai}
                </option>
              ))}
            </select>
          </div>

          {/* Đợt thực tập */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Đợt thực tập</label>
            <select
              value={filters.maDot}
              onChange={(e) => setFilters({ ...filters, maDot: e.target.value, page: 1 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-blue-500/20 font-medium truncate"
            >
              <option value="">Tất cả đợt thực tập</option>
              {allDots.map((d) => (
                <option key={d.maDot} value={d.maDot}>
                  {d.tenDot} ({d.maDot})
                </option>
              ))}
            </select>
          </div>

          {/* Nguyên nhân */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nguyên nhân</label>
            <select
              value={filters.nguyenNhan}
              onChange={(e) => setFilters({ ...filters, nguyenNhan: e.target.value, page: 1 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              {NGUYEN_NHAN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nguồn dữ liệu */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nguồn đối chiếu</label>
            <select
              value={filters.nguon}
              onChange={(e) => setFilters({ ...filters, nguon: e.target.value, page: 1 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-blue-500/20 font-medium"
            >
              {NGUON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Tìm kiếm */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tìm kiếm</label>
            <input
              type="text"
              placeholder="MSSV hoặc Họ tên..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs focus:ring-2 focus:ring-blue-500/20 font-medium"
            />
          </div>
        </div>

        {/* Ghi chú nguyên tắc nghiệp vụ */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-slate-600 text-[11px] flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-500 text-[18px] shrink-0">info</span>
          <span>
            <strong>Nguyên tắc ghi nhận rớt thực tập: </strong>
            Rớt do điểm chỉ gồm phiếu đủ tiêu chí có kết quả Không đạt theo quy đổi; sinh viên chưa đủ điểm, rớt tuyển dụng hoặc một dòng trong danh sách Không tham gia không tự kết luận thành rớt thực tập.
          </span>
        </div>
      </div>

      {/* 2. Bảng kết quả */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Đang truy vấn danh sách sinh viên rớt...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-3">
            <span className="material-symbols-outlined text-3xl text-rose-600">error</span>
            <p className="text-xs font-bold text-rose-800">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer"
            >
              Tải lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <span className="material-symbols-outlined text-3xl">task_alt</span>
            </div>
            <h3 className="text-sm font-bold text-slate-700 m-0">Không có kết quả rớt thực tập phù hợp</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto m-0">
              Không tìm thấy sinh viên nào rớt thực tập theo các tiêu chí và bộ lọc đã chọn.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3.5">Sinh viên &amp; Lớp</th>
                    <th className="px-4 py-3.5">Đợt / Loại / Bộ điểm</th>
                    <th className="px-4 py-3.5">Nguyên nhân</th>
                    <th className="px-4 py-3.5 text-center">Tổng điểm</th>
                    <th className="px-4 py-3.5">Căn cứ &amp; Xác nhận</th>
                    <th className="px-4 py-3.5">Đơn vị tiếp nhận</th>
                    <th className="px-4 py-3.5">Nguồn dữ liệu</th>
                    <th className="px-4 py-3.5 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row) => {
                    const isBanChot = row.nguonDuLieu === 'BanChot'
                    return (
                      <tr key={`${row.maSV}-${row.maDot}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{row.hoTen}</div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-mono font-semibold text-slate-700">{row.maSV}</span>
                            {row.lop && <span>• Lớp: {row.lop}</span>}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800 line-clamp-1" title={row.tenDot}>
                            {row.tenDot || row.maDot}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {row.tenLoaiThucTap || row.maLoaiThucTap || '—'}
                            {row.tenRubric && ` • ${row.tenRubric}`}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {row.nguyenNhan === 'RotDiem' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Rớt do điểm
                            </span>
                          ) : row.nguyenNhan === 'KhongHoanTat' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Không hoàn tất
                            </span>
                          ) : row.nguyenNhan === 'TuChoiHoTro' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Từ chối hỗ trợ
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {row.nguyenNhan || 'Không đạt'}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          {row.tongDiem != null ? (
                            <span className="font-black text-rose-600 text-sm">
                              {Number(row.tongDiem).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 max-w-xs">
                          {row.lyDo && (
                            <div className="text-xs text-slate-800 line-clamp-1" title={row.lyDo}>
                              {row.lyDo}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {row.nguoiXacNhan && <span>Bởi: {row.nguoiXacNhan} </span>}
                            {row.ngayXacNhan && (
                              <span>• {new Date(row.ngayXacNhan).toLocaleDateString('vi-VN')}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="font-medium text-slate-800">
                            {row.tenCongTy || '—'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isBanChot
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isBanChot ? `Bản chốt (v${row.phienBanChot ?? 1})` : 'Hiện hành'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedStudent(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                            <span>Xem hồ sơ</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 text-xs text-slate-500">
              <div>
                Hiển thị{' '}
                <strong className="text-slate-700">
                  {items.length > 0 ? (filters.page - 1) * filters.pageSize + 1 : 0}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-700">
                  {Math.min(filters.page * filters.pageSize, data.totalCount || 0)}
                </strong>{' '}
                trong tổng số <strong className="text-slate-900">{data.totalCount || 0}</strong> hồ sơ
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold"
                >
                  Trang trước
                </button>
                <span className="font-semibold text-slate-700">
                  Trang {filters.page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold"
                >
                  Trang sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Modal chi tiết hồ sơ rớt */}
      {selectedStudent && (
        <ChiTietHoSoRotModal
          maSV={selectedStudent.maSV}
          maDot={selectedStudent.maDot || filters.maDot}
          initialNguon={filters.nguon}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  )
}
