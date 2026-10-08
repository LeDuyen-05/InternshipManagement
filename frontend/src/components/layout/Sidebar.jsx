import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'

export default function Sidebar({ currentRole, onRoleChange }) {
  const location = useLocation()
  const { selectedDot, changeDot, danhSachNamHoc } = useDotThucTap()
  const [showDotModal, setShowDotModal] = useState(false)
  const [activeYearTab, setActiveYearTab] = useState(danhSachNamHoc[0]?.namHoc || '2026 - 2027')

  // Danh mục menu phân nhóm theo từng Role
  const roleMenuGroups = {
    GiangVien: {
      hocVu: [
        { path: '/giang-vien/dashboard', label: 'Bảng điều khiển', icon: 'dashboard' },
        { path: '/giang-vien/sinh-vien', label: 'Sinh viên hướng dẫn', icon: 'group' },
        { path: '/giang-vien/tien-do', label: 'Theo dõi tiến độ', icon: 'trending_up' },
        { path: '/giang-vien/cham-diem', label: 'Đánh giá & Chấm điểm CLO', icon: 'fact_check' },
        { path: '/giang-vien/gioi-thieu', label: 'Đề xuất doanh nghiệp', icon: 'apartment' },
      ],
      tienIch: [
        { path: '/giang-vien/lich-deadline', label: 'Lịch & Deadline đợt', icon: 'calendar_month' },
        { path: '/giang-vien/thong-bao', label: 'Thông báo từ Khoa', icon: 'notifications' },
        { path: '/giang-vien/ho-so', label: 'Hồ sơ chuyên môn', icon: 'account_circle' },
      ],
    },
    Khoa: {
      hocVu: [
        { path: '/khoa/dashboard', label: 'Tổng quan điều hành', icon: 'analytics' },
        { path: '/khoa/duyet-gioi-thieu', label: 'Duyệt công ty đề xuất', icon: 'verified' },
        { path: '/khoa/phan-cong', label: 'Phân công GVHD', icon: 'assignment_ind' },
        { path: '/khoa/thong-ke-clo', label: 'Báo cáo thống kê CLO', icon: 'bar_chart' },
      ],
      tienIch: [
        { path: '/khoa/dot-thuc-tap', label: 'Cấu hình đợt thực tập', icon: 'date_range' },
        { path: '/khoa/thong-bao', label: 'Quản lý thông báo', icon: 'campaign' },
      ],
    },
    SinhVien: {
      hocVu: [
        { path: '/sinh-vien', label: 'Bảng điều khiển SV', icon: 'dashboard' },
        { path: '/sinh-vien/ho-so', label: 'Hồ sơ năng lực', icon: 'badge' },
        { path: '/sinh-vien/goi-y-ai', label: 'Tư vấn chọn cty (AI)', icon: 'psychology' },
        { path: '/sinh-vien/dang-ky', label: 'Đăng ký thực tập', icon: 'how_to_reg' },
        { path: '/sinh-vien/ket-qua-diem', label: 'Kết quả đánh giá CLO', icon: 'grade' },
      ],
      tienIch: [
        { path: '/sinh-vien/lich-trinh', label: 'Lịch phỏng vấn & Deadline', icon: 'event' },
        { path: '/sinh-vien/huong-dan', label: 'Biểu mẫu & Hướng dẫn', icon: 'help_outline' },
      ],
    },
  }

  const currentGroups = roleMenuGroups[currentRole] || roleMenuGroups.GiangVien

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'GiangVien':
        return 'Cổng Giảng Viên'
      case 'Khoa':
        return 'Cổng Cán Bộ Khoa'
      case 'SinhVien':
        return 'Cổng Sinh Viên'
      default:
        return 'Cổng Người Dùng'
    }
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white z-50 flex flex-col justify-between border-r border-slate-200 shadow-sm">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Header Logo */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100 bg-white">
          <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <span className="material-symbols-outlined text-[20px]">school</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-blue-900 text-base leading-tight tracking-tight">
              FIT Portal
            </span>
            <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              {getRoleDisplayName(currentRole)}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-4 flex-1 space-y-5">
          {/* Nhóm 1: Học vụ & Nghiệp vụ */}
          <div>
            <div className="px-3 pb-2">
              <span className="text-[10px] uppercase text-slate-400 tracking-wider font-bold">
                Học vụ & Nghiệp vụ
              </span>
            </div>
            <nav className="space-y-1">
              {currentGroups.hocVu.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Nhóm 2: Tiện ích & Tài khoản */}
          <div>
            <div className="px-3 pb-2">
              <span className="text-[10px] uppercase text-slate-400 tracking-wider font-bold">
                Tiện ích & Học vụ
              </span>
            </div>
            <nav className="space-y-1">
              {currentGroups.tienIch.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-blue-700 text-white shadow-xs'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[19px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom User / Role Switcher */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/70">
        {/* Thẻ Học vụ Hiện hành (Bấm vào để đổi Đợt / Năm học) */}
        <div
          onClick={() => setShowDotModal(true)}
          className="p-2.5 rounded-xl bg-white border border-slate-200/80 mb-2 shadow-xs cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group"
          title="Bấm để chuyển đổi Năm học / Đợt thực tập"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  selectedDot.trangThai === 'DangDienRa'
                    ? 'bg-emerald-500 animate-pulse'
                    : selectedDot.trangThai === 'SapDienRa'
                    ? 'bg-blue-500'
                    : 'bg-slate-400'
                }`}
              ></span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                Học vụ tác nghiệp
              </span>
            </div>
            <span className="text-[10px] text-blue-600 font-semibold group-hover:underline flex items-center gap-0.5">
              <span>Đổi</span>
              <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
            </span>
          </div>

          <p className="text-xs text-slate-900 font-bold leading-tight group-hover:text-blue-700 transition-colors">
            {selectedDot.tenDot}
          </p>

          <div className="flex items-center justify-between mt-1">
            <span
              className={`text-[10px] font-medium ${
                selectedDot.trangThai === 'DangDienRa'
                  ? 'text-emerald-600 font-bold'
                  : selectedDot.trangThai === 'SapDienRa'
                  ? 'text-blue-600'
                  : 'text-slate-500'
              }`}
            >
              {selectedDot.labelTrangThai}
            </span>
            {selectedDot.trangThai === 'DaKetThuc' && (
              <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                Chỉ xem
              </span>
            )}
          </div>
        </div>

        {/* Nút chuyển đổi vai trò nhanh để test */}
        <div className="flex items-center justify-between gap-1 pt-1">
          <select
            value={currentRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="flex-1 py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            title="Chuyển đổi vai trò để kiểm tra giao diện"
          >
            <option value="GiangVien">Role: Giảng viên</option>
            <option value="Khoa">Role: Khoa/Giáo vụ</option>
            <option value="SinhVien">Role: Sinh viên</option>
          </select>
        </div>
      </div>

      {/* Modal 2 tầng: Chọn Năm học -> Đợt thực tập */}
      {showDotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chọn Đợt Thực Tập Tác Nghiệp</h3>
                  <p className="text-xs text-slate-400">Dữ liệu trên toàn hệ thống sẽ lọc theo đợt bạn chọn</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDotModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Tầng 1: Dropdown chọn Năm học */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                1. Chọn Năm học:
              </label>
              <div className="relative">
                <select
                  value={activeYearTab}
                  onChange={(e) => setActiveYearTab(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer transition-all"
                >
                  {danhSachNamHoc.map((nh) => (
                    <option key={nh.namHoc} value={nh.namHoc}>
                      Năm học {nh.namHoc} {nh.isCurrentYear ? '— (Năm hiện tại)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tầng 2: Danh sách các Đợt trong Năm học đã chọn */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                2. Chọn Học kỳ / Đợt thực tập:
              </label>
              <div className="space-y-2">
                {danhSachNamHoc
                  .find((nh) => nh.namHoc === activeYearTab)
                  ?.dots.map((dot) => {
                    const isSelected = selectedDot.maDot === dot.maDot
                    return (
                      <div
                        key={dot.maDot}
                        onClick={() => {
                          changeDot(dot)
                          setShowDotModal(false)
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{dot.tenDot}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                            Thời gian: {dot.thoiGian}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              dot.trangThai === 'DangDienRa'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : dot.trangThai === 'SapDienRa'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {dot.labelTrangThai}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Chú thích thông minh */}
            <div className="p-2.5 bg-amber-50/80 rounded-xl border border-amber-200/60 text-[11px] text-amber-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-600 text-base">info</span>
              <span>
                <strong>Lưu ý:</strong> Các đợt đã kết thúc ở năm cũ sẽ tự động kích hoạt chế độ <strong>Chỉ xem lịch sử</strong>.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDotModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
