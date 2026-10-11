import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout.jsx'
import DashboardSinhVienPage from '../pages/SinhVien/DashboardSinhVienPage.jsx'
import HoSoNangLucPage from '../pages/SinhVien/HoSoNangLucPage.jsx'
import DangKyThucTapPage from '../pages/SinhVien/DangKyThucTapPage.jsx'
import LichTrinhPhongVanPage from '../pages/SinhVien/LichTrinhPhongVanPage.jsx'
import NopTienDoSVPage from '../pages/SinhVien/NopTienDoSVPage.jsx'
import SinhVienListPage from '../pages/SinhVien/SinhVienListPage.jsx'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/sinh-vien" replace />} />
        <Route path="/sinh-vien" element={<DashboardSinhVienPage />} />
        <Route path="/sinh-vien/ho-so" element={<HoSoNangLucPage />} />
        <Route path="/sinh-vien/dang-ky" element={<DangKyThucTapPage />} />
        <Route path="/sinh-vien/lich-trinh" element={<LichTrinhPhongVanPage />} />
        <Route path="/sinh-vien/tien-do" element={<NopTienDoSVPage />} />
        <Route path="/sinh-vien/danh-sach" element={<SinhVienListPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
