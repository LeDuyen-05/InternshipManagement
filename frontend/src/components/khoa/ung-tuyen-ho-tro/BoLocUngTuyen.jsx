import { loaiThucTapOptions } from '../../../utils/dotThucTap'
export default function BoLocUngTuyen({
  filters,
  onChange,
  onReset,
  onReload,
  danhSachNamHoc = [],
  loading = false,
}) {
  const currentYearObj = danhSachNamHoc.find((y) => y.namHoc === filters.namHoc) || danhSachNamHoc[0]

  // Lọc các đợt theo năm học và loại thực tập
  const availableDots = (currentYearObj?.dots || []).filter((d) => {
    if (!filters.maLoaiThucTap || filters.maLoaiThucTap === 'ALL') return true
    return d.maLoaiThucTap === filters.maLoaiThucTap
  })

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-xs space-y-3">
      {/* Hàng 1: Năm học -> Loại thực tập -> Đợt thực tập */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Năm học
          </label>
          <select
            value={filters.namHoc || ''}
            onChange={(e) => {
              const newYear = e.target.value
              const yearObj = danhSachNamHoc.find((y) => y.namHoc === newYear)
              const validDots = (yearObj?.dots || []).filter(
                (d) => !filters.maLoaiThucTap || filters.maLoaiThucTap === 'ALL' || d.maLoaiThucTap === filters.maLoaiThucTap
              )
              onChange({
                ...filters,
                namHoc: newYear,
                maDot: validDots[0]?.maDot || '',
              })
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          >
            {danhSachNamHoc.map((y) => (
              <option key={y.namHoc} value={y.namHoc}>
                {y.namHoc} {y.isCurrentYear ? '(Hiện hành)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Loại thực tập
          </label>
          <select
            value={filters.maLoaiThucTap || 'ALL'}
            onChange={(e) => {
              const newType = e.target.value
              const validDots = (currentYearObj?.dots || []).filter(
                (d) => newType === 'ALL' || d.maLoaiThucTap === newType
              )
              onChange({
                ...filters,
                maLoaiThucTap: newType,
                maDot: validDots[0]?.maDot || '',
              })
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Tất cả loại thực tập</option>
            {loaiThucTapOptions(danhSachNamHoc.flatMap((y) => y.dots || [])).map((o) => (
              <option key={o.code} value={o.code}>{o.label} ({o.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Đợt thực tập <span className="text-rose-500">*</span>
          </label>
          <select
            value={filters.maDot || ''}
            onChange={(e) => onChange({ ...filters, maDot: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          >
            {availableDots.length === 0 ? (
              <option value="">Không có đợt phù hợp</option>
            ) : (
              availableDots.map((d) => (
                <option key={d.maDot} value={d.maDot}>
                  {d.tenDot} [{d.labelTrangThai || d.trangThai}]
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Hàng 2: Tìm kiếm, Lớp, Kết quả ứng tuyển, Tình trạng nơi, Cần hỗ trợ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tìm sinh viên
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-slate-400">
              search
            </span>
            <input
              type="text"
              placeholder="MSSV hoặc họ tên..."
              value={filters.search || ''}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Lớp sinh viên
          </label>
          <input
            type="text"
            placeholder="VD: 12DHTH01..."
            value={filters.lop || ''}
            onChange={(e) => onChange({ ...filters, lop: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kết quả ứng tuyển
          </label>
          <select
            value={filters.ketQua || 'ALL'}
            onChange={(e) => onChange({ ...filters, ketQua: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Tất cả kết quả</option>
            <option value="Dat">Trúng tuyển</option>
            <option value="KhongDat">Không trúng tuyển</option>
            <option value="ChuaCoKetQua">Chờ kết quả</option>
            <option value="DaKetThuc">Đã kết thúc / Hủy / Đóng</option>
            <option value="Vang">Vắng phỏng vấn</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nơi thực tập
          </label>
          <select
            value={filters.tinhTrangNoi || 'ALL'}
            onChange={(e) => onChange({ ...filters, tinhTrangNoi: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Tất cả tình trạng nơi thực tập</option>
            <option value="ChuaCoNoi">Chưa có nơi thực tập</option>
            <option value="ChoXacNhan">Chờ xác nhận / Chốt</option>
            <option value="DaCoNoi">Đã có nơi chính thức</option>
            <option value="KhongHoanTat">Không hoàn tất đợt</option>
            <option value="CanKiemTra">Cần kiểm tra lại</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Diện hỗ trợ
          </label>
          <select
            value={filters.canHoTro ?? 'ALL'}
            onChange={(e) =>
              onChange({
                ...filters,
                canHoTro:
                  e.target.value === 'ALL'
                    ? 'ALL'
                    : e.target.value === 'true',
              })
            }
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Tất cả</option>
            <option value="true">Cần Khoa hỗ trợ (Chưa có nơi)</option>
            <option value="false">Chưa cần hỗ trợ (Đã có nơi/Đang xử lý)</option>
          </select>
        </div>
      </div>

      {/* Nút hành động */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          <span>Đặt lại</span>
        </button>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
        >
          <span
            className={`material-symbols-outlined text-[16px] ${
              loading ? 'animate-spin' : ''
            }`}
          >
            refresh
          </span>
          <span>Tải lại</span>
        </button>
      </div>
    </div>
  )
}
