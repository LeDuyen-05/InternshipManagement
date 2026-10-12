import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthPage from '../pages/Auth/AuthPage.jsx'
import DashboardPage from '../pages/Dashboard/DashboardPage.jsx'
import AdminPage from '../pages/Admin/AdminPage.jsx'
import KhoaPage from '../pages/Khoa/KhoaPage.jsx'
import PhanBoGVHDPage from '../pages/Khoa/PhanBoGVHDPage.jsx'
import ThongKeBaoCaoPage from '../pages/Khoa/ThongKeBaoCaoPage.jsx'
import AIPage from '../pages/AI/AIPage.jsx'
import ChangePasswordPage from '../pages/Account/ChangePasswordPage.jsx'
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

import GioiThieuCongTyPage from '../pages/GiangVien/GioiThieuCongTyPage.jsx'
import DanhSachSVHuongDanPage from '../pages/GiangVien/DanhSachSVHuongDanPage.jsx'
import TienDoThucTapSVPage from '../pages/GiangVien/TienDoThucTapSVPage.jsx'
import ChamDiemCLOPage from '../pages/GiangVien/ChamDiemCLOPage.jsx'
import DuyetGioiThieuPage from '../pages/Khoa/DuyetGioiThieuPage.jsx'
import PhanCongGVHDPage from '../pages/Khoa/PhanCongGVHDPage.jsx'
import ThongBaoPage from '../pages/ThongBao/ThongBaoPage.jsx'

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
  if (user.maVaiTro === 'VT03') return <Navigate to="/giang-vien/dashboard" replace />
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
        <Route path="/sinh-vien/thong-bao" element={<ThongBaoPage />} />
      </Route>

      {/* Admin, Faculty & Lecturer Portal Routes (Wrapped with MainLayout & Dynamic Sidebar) */}
      <Route element={<Guard><MainLayout /></Guard>}>
        <Route path="/dashboard" element={<DashboardPage />} />
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
        <Route path="/khoa/duyet-gioi-thieu" element={<Guard roles={['VT01', 'VT02']}><DuyetGioiThieuPage /></Guard>} />
        <Route path="/khoa/phan-cong" element={<Guard roles={['VT01', 'VT02']}><PhanCongGVHDPage /></Guard>} />
        <Route path="/ai" element={<AIPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/thong-bao" element={<ThongBaoPage />} />
        <Route path="/khoa/thong-bao" element={<Guard roles={['VT01', 'VT02']}><ThongBaoPage /></Guard>} />

        {/* Giảng viên hướng dẫn Routes */}
        <Route path="/giang-vien" element={<Navigate to="/giang-vien/dashboard" replace />} />
        <Route path="/giang-vien/dashboard" element={<Guard roles={['VT01', 'VT02', 'VT03']}><DanhSachSVHuongDanPage /></Guard>} />
        <Route path="/giang-vien/sinh-vien" element={<Guard roles={['VT01', 'VT02', 'VT03']}><DanhSachSVHuongDanPage /></Guard>} />
        <Route path="/giang-vien/tien-do" element={<Guard roles={['VT01', 'VT02', 'VT03']}><TienDoThucTapSVPage /></Guard>} />
        <Route path="/giang-vien/cham-diem" element={<Guard roles={['VT01', 'VT02', 'VT03']}><ChamDiemCLOPage /></Guard>} />
        <Route path="/giang-vien/gioi-thieu" element={<Guard roles={['VT01', 'VT02', 'VT03']}><GioiThieuCongTyPage /></Guard>} />
        <Route path="/giang-vien/thong-bao" element={<Guard roles={['VT01', 'VT02', 'VT03']}><ThongBaoPage /></Guard>} />

        {/* Alias routes tương thích */}
        <Route path="/gvhd" element={<Navigate to="/giang-vien/dashboard" replace />} />
        <Route path="/gvhd/dashboard" element={<Guard roles={['VT01', 'VT02', 'VT03']}><DanhSachSVHuongDanPage /></Guard>} />
        <Route path="/gvhd/sinh-vien" element={<Guard roles={['VT01', 'VT02', 'VT03']}><DanhSachSVHuongDanPage /></Guard>} />
        <Route path="/gvhd/tien-do" element={<Guard roles={['VT01', 'VT02', 'VT03']}><TienDoThucTapSVPage /></Guard>} />
        <Route path="/gvhd/cham-diem" element={<Guard roles={['VT01', 'VT02', 'VT03']}><ChamDiemCLOPage /></Guard>} />
        <Route path="/gvhd/bao-cao" element={<Guard roles={['VT01', 'VT02', 'VT03']}><TienDoThucTapSVPage /></Guard>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
