import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 shadow-sm border border-blue-100">
        <span className="material-symbols-outlined text-4xl">travel_explore</span>
      </div>
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">404 - Không tìm thấy trang</h1>
      <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-6">
        Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển trong hệ thống Quản lý Thực tập.
      </p>
      <div className="flex items-center gap-3">
        <Link
          to="/giang-vien/gioi-thieu"
          className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition shadow-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">home</span>
          <span>Trang chủ Giảng viên</span>
        </Link>
        <Link
          to="/khoa/thong-ke-clo"
          className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
        >
          <span>Dashboard Thống kê Khoa</span>
        </Link>
      </div>
    </div>
  )
}
