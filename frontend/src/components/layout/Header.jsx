import { useState } from 'react'

export default function Header({ sinhVien = { hoTen: 'Phạm Minh Đức', maSV: 'SV001' } }) {
  const [showNotifications, setShowNotifications] = useState(false)

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 z-40 px-6 flex items-center justify-between shadow-xs">
      {/* Left section: Breadcrumb & Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center text-slate-500 text-sm">
          <span className="material-symbols-outlined text-[18px] text-blue-700 mr-1.5">school</span>
          <span className="font-semibold text-blue-900">FIT Portal</span>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-800 font-medium">Cổng Sinh Viên</span>
        </div>

        <div className="relative ml-4 hidden md:block w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="search"
            placeholder="Tìm kiếm doanh nghiệp, đợt báo cáo..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right section: Notification & User Info */}
      <div className="flex items-center gap-4">
        {/* Semester Tag */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Đợt 2 - HK2 (2026 - 2027)</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors relative"
            title="Thông báo"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
              2
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 text-xs">
              <div className="font-semibold text-slate-800 pb-2 border-b border-slate-100 flex justify-between items-center">
                <span>Thông báo mới</span>
                <span className="text-blue-600 font-normal cursor-pointer hover:underline">Đã đọc tất cả</span>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="p-2 rounded-lg bg-blue-50/60 text-slate-700 border border-blue-100">
                  <p className="font-medium text-blue-900">Nhắc nhở nộp báo cáo Tuần 3</p>
                  <p className="text-slate-500 mt-0.5 text-[11px]">Hạn cuối: 23:59 Chủ Nhật ngày 18/10</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-100">
                  <p className="font-medium text-slate-900">Doanh nghiệp đã phản hồi lịch phỏng vấn</p>
                  <p className="text-slate-500 mt-0.5 text-[11px]">FPT Software đã xếp lịch lúc 09:30 ngày 15/10</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="h-7 w-[1px] bg-slate-200"></div>

        {/* Student Avatar & Identity */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-slate-800 leading-tight">
              {sinhVien.hoTen}
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-500 font-medium">MSSV: {sinhVien.maSV}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-700 font-semibold">
                Sinh viên
              </span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {sinhVien.hoTen?.charAt(0) || 'S'}
          </div>
        </div>
      </div>
    </header>
  )
}
