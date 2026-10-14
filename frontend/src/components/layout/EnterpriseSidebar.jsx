import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'

export default function EnterpriseSidebar() {
  const { user } = useAuth()
  const isManagerOrAdmin = user?.maVaiTro === 'VT01' || user?.maVaiTro === 'VT02'

  const navItems = [
    {
      group: 'Kênh Quản trị Tuyển dụng',
      items: [
        { path: '/doanh-nghiep', label: 'Bảng điều khiển', icon: 'dashboard', end: true },
        { path: '/doanh-nghiep/tuyen-dung', label: 'Tin tuyển dụng', icon: 'campaign' },
        { path: '/doanh-nghiep/ung-vien', label: 'Duyệt hồ sơ ứng viên', icon: 'how_to_reg' },
        { path: '/doanh-nghiep/phong-van', label: 'Lịch phỏng vấn', icon: 'event_note' },
        { path: '/doanh-nghiep/danh-gia', label: 'Đánh giá thực tập sinh', icon: 'rate_review' },
      ],
    },
    ...(isManagerOrAdmin
      ? [
          {
            group: 'Cổng thông tin liên kết',
            items: [{ path: '/sinh-vien', label: 'Cổng Sinh viên', icon: 'school' }],
          },
        ]
      : []),
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col justify-between shadow-xs">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand / Logo */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100 bg-white">
          <div className="w-9 h-9 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-indigo-950 text-base leading-tight tracking-tight">
              DOANH NGHIỆP
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Hợp tác & Tuyển dụng</span>
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
                        ? 'bg-indigo-50 text-indigo-800 font-semibold border-l-4 border-indigo-700 shadow-2xs'
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
      <div className="p-3 m-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase font-bold text-indigo-600">Đợt tuyển dụng</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            Đang nhận CV
          </span>
        </div>
        <div className="text-xs font-semibold text-slate-800">Đợt 2 - HK2 (2026 - 2027)</div>
        <div className="text-[11px] text-slate-500 mt-0.5">Khoa Công nghệ Thông tin</div>
      </div>
    </aside>
  )
}
