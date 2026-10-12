import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'

export default function MainLayout() {
  const { user } = useAuth()
  
  // Ánh xạ mã vai trò (VT01, VT02, VT03, VT04) sang Role hiển thị của Sidebar
  const mapRole = (maVaiTro) => {
    if (maVaiTro === 'VT04') return 'SinhVien'
    if (maVaiTro === 'VT02' || maVaiTro === 'VT01') return 'Khoa'
    return 'GiangVien' // VT03 hoặc mặc định
  }

  const [currentRole, setCurrentRole] = useState(() => mapRole(user?.maVaiTro))

  useEffect(() => {
    if (user?.maVaiTro) {
      setCurrentRole(mapRole(user.maVaiTro))
    }
  }, [user])


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

