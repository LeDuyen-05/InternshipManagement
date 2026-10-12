import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthPage from '../pages/Auth/AuthPage.jsx'
import DashboardPage from '../pages/Dashboard/DashboardPage.jsx'
import AdminPage from '../pages/Admin/AdminPage.jsx'
import KhoaPage from '../pages/Khoa/KhoaPage.jsx'
import PhanBoGVHDPage from '../pages/Khoa/PhanBoGVHDPage.jsx'
import ThongKeBaoCaoPage from '../pages/Khoa/ThongKeBaoCaoPage.jsx'
import AIPage from '../pages/AI/AIPage.jsx'
import ChangePasswordPage from '../pages/Account/ChangePasswordPage.jsx'
import ChamDiemCLOPage from '../pages/GVHD/ChamDiemCLOPage.jsx'
import TheoDoiTienDoPage from '../pages/GVHD/TheoDoiTienDoPage.jsx'
import KhoaOperationsPage from '../pages/Khoa/KhoaOperationsPage.jsx'
import KhoaDeadlinesPage from '../pages/Khoa/KhoaDeadlinesPage.jsx'
import KhoaCommitteePage from '../pages/Khoa/KhoaCommitteePage.jsx'
import KhoaCriteriaPage from '../pages/Khoa/KhoaCriteriaPage.jsx'
import KhoaAccountsPage from '../pages/Khoa/KhoaAccountsPage.jsx'

import MainLayout from '../components/layout/MainLayout.jsx'
import DashboardSinhVienPage from '../pages/SinhVien/DashboardSinhVienPage.jsx'
import HoSoNangLucPage from '../pages/SinhVien/HoSoNangLucPage.jsx'
import DangKyThucTapPage from '../pages/SinhVien/DangKyThucTapPage.jsx'
import LichTrinhPhongVanPage from '../pages/SinhVien/LichTrinhPhongVanPage.jsx'
import NopTienDoSVPage from '../pages/SinhVien/NopTienDoSVPage.jsx'
import SinhVienListPage from '../pages/SinhVien/SinhVienListPage.jsx'

function Guard({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/auth" replace />
  if (roles && !roles.includes(user.maVaiTro)) {
    if (user.maVaiTro === 'VT04') return <Navigate to="/sinh-vien" replace />
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/auth" replace />
  if (user.maVaiTro === 'VT04') return <Navigate to="/sinh-vien" replace />
  if (user.maVaiTro === 'VT03') return <Navigate to="/gvhd/tien-do" replace />
  if (user.maVaiTro === 'VT02') return <Navigate to="/khoa" replace />
  if (user.maVaiTro === 'VT01') return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Root Intelligent Redirection */}
      <Route path="/" element={<RootRedirect />} />

      {/* Student Portal Routes (Wrapped with MainLayout) */}
      <Route element={<Guard roles={['VT04', 'VT01', 'VT02']}><MainLayout /></Guard>}>
        <Route path="/sinh-vien" element={<DashboardSinhVienPage />} />
        <Route path="/sinh-vien/ho-so" element={<HoSoNangLucPage />} />
        <Route path="/sinh-vien/dang-ky" element={<DangKyThucTapPage />} />
        <Route path="/sinh-vien/lich-trinh" element={<LichTrinhPhongVanPage />} />
        <Route path="/sinh-vien/tien-do" element={<NopTienDoSVPage />} />
        <Route path="/sinh-vien/danh-sach" element={<SinhVienListPage />} />
      </Route>

      {/* Admin & Faculty Portal Routes */}
      <Route path="/dashboard" element={<Guard><DashboardPage /></Guard>} />
      <Route path="/admin" element={<Guard roles={['VT01']}><AdminPage /></Guard>} />
      <Route path="/khoa" element={<Guard roles={['VT01', 'VT02']}><KhoaPage /></Guard>} />
      <Route path="/khoa/dot-thuc-tap" element={<Guard roles={['VT01', 'VT02']}><KhoaPage initialTab="dot" /></Guard>} />
      <Route path="/khoa/doanh-nghiep" element={<Guard roles={['VT01', 'VT02']}><KhoaPage initialTab="ct" /></Guard>} />
      <Route path="/khoa/dang-ky" element={<Guard roles={['VT01', 'VT02']}><KhoaOperationsPage mode="registrations" /></Guard>} />
      <Route path="/khoa/phan-bo" element={<Guard roles={['VT01', 'VT02']}><PhanBoGVHDPage /></Guard>} />
      <Route path="/khoa/theo-doi" element={<Guard roles={['VT01', 'VT02']}><KhoaOperationsPage mode="progress" /></Guard>} />
      <Route path="/khoa/han-bao-cao" element={<Guard roles={['VT01', 'VT02']}><KhoaDeadlinesPage /></Guard>} />
      <Route path="/khoa/thong-ke" element={<Guard roles={['VT01', 'VT02']}><ThongKeBaoCaoPage /></Guard>} />
      <Route path="/khoa/hoi-dong" element={<Guard roles={['VT01', 'VT02']}><KhoaCommitteePage /></Guard>} />
      <Route path="/khoa/tai-khoan" element={<Guard roles={['VT01', 'VT02']}><KhoaAccountsPage /></Guard>} />
      <Route path="/khoa/tieu-chi" element={<Guard roles={['VT01', 'VT02']}><KhoaCriteriaPage /></Guard>} />
      <Route path="/ai" element={<Guard><AIPage /></Guard>} />
      <Route path="/change-password" element={<Guard><ChangePasswordPage /></Guard>} />

      {/* GVHD Routes */}
      <Route path="/gvhd/dashboard" element={<Guard roles={['VT01', 'VT02', 'VT03']}><TheoDoiTienDoPage /></Guard>} />
      <Route path="/gvhd/cham-diem" element={<Guard roles={['VT01', 'VT02', 'VT03']}><ChamDiemCLOPage /></Guard>} />
      <Route path="/gvhd/tien-do" element={<Guard roles={['VT01', 'VT02', 'VT03']}><TheoDoiTienDoPage /></Guard>} />
      <Route path="/gvhd/sinh-vien" element={<Guard roles={['VT01', 'VT02', 'VT03']}><TheoDoiTienDoPage /></Guard>} />
      <Route path="/gvhd/bao-cao" element={<Guard roles={['VT01', 'VT02', 'VT03']}><TheoDoiTienDoPage /></Guard>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
