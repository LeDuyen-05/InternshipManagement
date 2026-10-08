import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout() {
  // Quản lý vai trò xem hiện tại (mặc định là Giảng viên)
  const [currentRole, setCurrentRole] = useState('GiangVien')

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans">
      {/* Sidebar cố định bên trái (w-64) */}
      <Sidebar currentRole={currentRole} onRoleChange={setCurrentRole} />

      {/* Header cố định trên cùng (bắt đầu từ left-64) */}
      <Header currentRole={currentRole} />

      {/* Khu vực nội dung các trang (bắt đầu từ lề trái pl-64 và lề trên pt-16) */}
      <main className="pl-64 pt-16 min-h-screen">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet context={{ currentRole }} />
        </div>
      </main>
    </div>
  )
}
