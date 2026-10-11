import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  const navItems = [
    {
      group: 'Kênh học tập & Thực tập',
      items: [
        { path: '/sinh-vien', label: 'Bảng điều khiển', icon: 'dashboard', end: true },
        { path: '/sinh-vien/ho-so', label: 'Hồ sơ năng lực', icon: 'badge' },
        { path: '/sinh-vien/dang-ky', label: 'Đăng ký & Đề xuất DN', icon: 'apartment' },
        { path: '/sinh-vien/lich-trinh', label: 'Lịch phỏng vấn & Phân bổ', icon: 'event_available' },
        { path: '/sinh-vien/tien-do', label: 'Báo cáo tiến độ tuần', icon: 'pending_actions' },
      ],
    },
    {
      group: 'Danh mục tra cứu',
      items: [
        { path: '/sinh-vien/danh-sach', label: 'Danh sách sinh viên', icon: 'group' },
      ],
    },
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col justify-between shadow-xs">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand / Logo */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100 bg-white">
          <div className="w-9 h-9 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <span className="material-symbols-outlined text-[20px]">school</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-blue-900 text-base leading-tight tracking-tight">
              FIT PORTAL
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Khoa Công nghệ Thông tin</span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="px-3 py-4 flex flex-col gap-5">
          {navItems.map((group, gIdx) => (
            <div key={gIdx} className="flex flex-col gap-1">
              <div className="px-3 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {group.group}
              </div>
              {group.items.map((item, idx) => (
                <NavLink
                  key={idx}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-800 font-semibold border-l-4 border-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Session Box */}
      <div className="p-3 m-3 rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">Đợt thực tập</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
            Đang mở
          </span>
        </div>
        <div className="text-xs font-semibold text-slate-800">Đợt 2 - HK2 (2026 - 2027)</div>
        <div className="text-[11px] text-slate-500 mt-0.5">Thời hạn nộp: 15/10/2026</div>
      </div>
    </aside>
  )
}
