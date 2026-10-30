import { Suspense, useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import RoundLockNotice from '../common/RoundLockNotice'
import ResponsiveNavigation from './ResponsiveNavigation'

export default function MainLayout() {
  const { user } = useAuth()
  const { roundLock } = useDotThucTap()
  
  // Ánh xạ mã vai trò (VT01..VT05) sang Role hiển thị của Sidebar
  const mapRole = (maVaiTro) => {
    if (maVaiTro === 'VT01') return 'QuanTriVien'
    if (maVaiTro === 'VT02') return 'Khoa'
    if (maVaiTro === 'VT03') return 'GiangVien'
    if (maVaiTro === 'VT04') return 'SinhVien'
    if (maVaiTro === 'VT05') return 'DaiDienDN'
    return 'GiangVien'
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
      <ResponsiveNavigation><Sidebar currentRole={currentRole} onRoleChange={setCurrentRole} /></ResponsiveNavigation>

      {/* Header cố định trên cùng (bắt đầu từ left-64) */}
      <Header currentRole={currentRole} />

      {/* Khu vực nội dung các trang (bắt đầu từ lề trái pl-64 và lề trên pt-16) */}
      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          <RoundLockNotice lock={roundLock} />
          <Suspense fallback={<div role="status" aria-live="polite" className="p-6 text-slate-600">Đang tải trang…</div>}>
            <Outlet context={{ currentRole }} />
          </Suspense>
        </div>
      </main>
    </div>
  )
}

