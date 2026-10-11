import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout.jsx'
import HoSoNangLucPage from '../pages/SinhVien/HoSoNangLucPage.jsx'
import SinhVienListPage from '../pages/SinhVien/SinhVienListPage.jsx'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/sinh-vien/ho-so" replace />} />
        <Route path="/sinh-vien" element={<Navigate to="/sinh-vien/ho-so" replace />} />
        <Route path="/sinh-vien/ho-so" element={<HoSoNangLucPage />} />
        <Route path="/sinh-vien/danh-sach" element={<SinhVienListPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
