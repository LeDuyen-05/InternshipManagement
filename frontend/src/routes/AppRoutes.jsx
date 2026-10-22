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

import MainLayout from '../components/layout/MainLayout.jsx'
import DashboardSinhVienPage from '../pages/SinhVien/DashboardSinhVienPage.jsx'
import HoSoNangLucPage from '../pages/SinhVien/HoSoNangLucPage.jsx'
import DangKyThucTapPage from '../pages/SinhVien/DangKyThucTapPage.jsx'
import LichTrinhPhongVanPage from '../pages/SinhVien/LichTrinhPhongVanPage.jsx'
import NopTienDoSVPage from '../pages/SinhVien/NopTienDoSVPage.jsx'
import EnterpriseLayout from '../components/layout/EnterpriseLayout.jsx'
import EnterpriseDashboardPage from '../pages/DoanhNghiep/EnterpriseDashboardPage.jsx'
import QuanLyTinTuyenDungPage from '../pages/DoanhNghiep/QuanLyTinTuyenDungPage.jsx'
import QuanLyUngVienPage from '../pages/DoanhNghiep/QuanLyUngVienPage.jsx'
import LichPhongVanDNPage from '../pages/DoanhNghiep/LichPhongVanDNPage.jsx'
import DanhGiaThucTapSinhPage from '../pages/DoanhNghiep/DanhGiaThucTapSinhPage.jsx'

import GioiThieuCongTyPage from '../pages/GiangVien/GioiThieuCongTyPage.jsx'
import DanhSachSVHuongDanPage from '../pages/GiangVien/DanhSachSVHuongDanPage.jsx'
import TienDoThucTapSVPage from '../pages/GiangVien/TienDoThucTapSVPage.jsx'
import ChamDiemCLOPage from '../pages/GiangVien/ChamDiemCLOPage.jsx'
import ThongKeCLOPage from '../pages/Khoa/ThongKeCLOPage.jsx'
import DuyetGioiThieuPage from '../pages/Khoa/DuyetGioiThieuPage.jsx'
import PhanCongGVHDPage from '../pages/Khoa/PhanCongGVHDPage.jsx'
import ThongBaoPage from '../pages/ThongBao/ThongBaoPage.jsx'
import GoiYCongTyAIPage from '../pages/SinhVien/GoiYCongTyAIPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import DashboardGVPage from '../pages/GiangVien/DashboardGVPage.jsx'
import LichDeadlinePage from '../pages/GiangVien/LichDeadlinePage.jsx'
import HoSoChuyenMonPage from '../pages/GiangVien/HoSoChuyenMonPage.jsx'

function Guard({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/auth" replace />
  if (roles && !roles.includes(user.maVaiTro)) {
    if (user.maVaiTro === 'VT04') return <Navigate to="/sinh-vien" replace />
    if (user.maVaiTro === 'VT05') return <Navigate to="/doanh-nghiep" replace />
    if (user.maVaiTro === 'VT03') return <Navigate to="/giang-vien/dashboard" replace />
    if (user.maVaiTro === 'VT02') return <Navigate to="/khoa" replace />
    if (user.maVaiTro === 'VT01') return <Navigate to="/admin" replace />
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
  if (user.maVaiTro === 'VT05') return <Navigate to="/doanh-nghiep" replace />
  return <Navigate to="/dashboard" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Root Intelligent Redirection */}
      <Route path="/" element={<RootRedirect />} />

      {/* Student Portal Routes (Wrapped with MainLayout & Guard) */}
      <Route element={<Guard roles={['VT04']}><MainLayout /></Guard>}>
        <Route path="/sinh-vien" element={<DashboardSinhVienPage />} />
        <Route path="/sinh-vien/ho-so" element={<HoSoNangLucPage />} />
        <Route path="/sinh-vien/dang-ky" element={<DangKyThucTapPage />} />
        <Route path="/sinh-vien/lich-trinh" element={<LichTrinhPhongVanPage />} />
        <Route path="/sinh-vien/tien-do" element={<NopTienDoSVPage />} />
        <Route path="/sinh-vien/goi-y-ai" element={<GoiYCongTyAIPage />} />
        <Route path="/sinh-vien/thong-bao" element={<ThongBaoPage />} />
      </Route>

      {/* Phân hệ Doanh nghiệp độc lập */}
      <Route path="/doanh-nghiep" element={<Guard roles={['VT05', 'VT01', 'VT02']}><EnterpriseLayout /></Guard>}>
        <Route index element={<EnterpriseDashboardPage />} />
        <Route path="tuyen-dung" element={<QuanLyTinTuyenDungPage />} />
        <Route path="ung-vien" element={<QuanLyUngVienPage />} />
        <Route path="phong-van" element={<LichPhongVanDNPage />} />
        <Route path="danh-gia" element={<DanhGiaThucTapSinhPage />} />
        <Route path="thong-bao" element={<ThongBaoPage />} />
      </Route>
      {/* Admin, Faculty & Lecturer Portal Routes (Wrapped with MainLayout & Guard) */}
      <Route element={<Guard><MainLayout /></Guard>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<Guard roles={['VT01']}><AdminPage /></Guard>} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/thong-bao" element={<ThongBaoPage />} />

        {/* Module Khoa */}
        <Route path="/khoa" element={<Guard roles={['VT02']}><KhoaPage /></Guard>} />
        <Route path="/khoa/dashboard" element={<Navigate to="/khoa/thong-ke-clo" replace />} />
        <Route path="/khoa/dot-thuc-tap" element={<Guard roles={['VT02']}><KhoaPage initialTab="dot" /></Guard>} />
        <Route path="/khoa/doanh-nghiep" element={<Guard roles={['VT02']}><KhoaPage initialTab="ct" /></Guard>} />
        <Route path="/khoa/dang-ky" element={<Guard roles={['VT02']}><KhoaOperationsPage mode="registrations" /></Guard>} />
        <Route path="/khoa/phan-bo" element={<Guard roles={['VT02']}><PhanBoGVHDPage /></Guard>} />
        <Route path="/khoa/theo-doi" element={<Guard roles={['VT02']}><KhoaOperationsPage mode="progress" /></Guard>} />
        <Route path="/khoa/han-bao-cao" element={<Guard roles={['VT02']}><KhoaDeadlinesPage /></Guard>} />
        <Route path="/khoa/thong-ke" element={<Navigate to="/khoa/thong-ke-clo" replace />} />
        <Route path="/khoa/thong-ke-clo" element={<Guard roles={['VT02']}><ThongKeCLOPage /></Guard>} />
        <Route path="/khoa/bao-cao-tien-do" element={<Guard roles={['VT02']}><ThongKeBaoCaoPage /></Guard>} />
        <Route path="/khoa/hoi-dong" element={<Guard roles={['VT02']}><KhoaCommitteePage /></Guard>} />
        <Route path="/khoa/tieu-chi" element={<Guard roles={['VT02']}><KhoaCriteriaPage /></Guard>} />
        <Route path="/khoa/duyet-gioi-thieu" element={<Guard roles={['VT02']}><DuyetGioiThieuPage /></Guard>} />
        <Route path="/khoa/phan-cong" element={<Guard roles={['VT02']}><PhanCongGVHDPage /></Guard>} />
        <Route path="/khoa/thong-bao" element={<Guard roles={['VT02']}><ThongBaoPage /></Guard>} />

        {/* Module Giảng viên (Người 3) */}
        <Route path="/giang-vien" element={<Navigate to="/giang-vien/dashboard" replace />} />
        <Route path="/giang-vien/dashboard" element={<Guard roles={['VT03']}><DashboardGVPage /></Guard>} />
        <Route path="/giang-vien/sinh-vien" element={<Guard roles={['VT03']}><DanhSachSVHuongDanPage /></Guard>} />
        <Route path="/giang-vien/tien-do" element={<Guard roles={['VT03']}><TienDoThucTapSVPage /></Guard>} />
        <Route path="/giang-vien/cham-diem" element={<Guard roles={['VT03']}><ChamDiemCLOPage /></Guard>} />
        <Route path="/giang-vien/gioi-thieu" element={<Guard roles={['VT03']}><GioiThieuCongTyPage /></Guard>} />
        <Route path="/giang-vien/lich-deadline" element={<Guard roles={['VT03']}><LichDeadlinePage /></Guard>} />
        <Route path="/giang-vien/ho-so" element={<Guard roles={['VT03']}><HoSoChuyenMonPage /></Guard>} />
        <Route path="/giang-vien/thong-bao" element={<Guard roles={['VT03']}><ThongBaoPage /></Guard>} />

        {/* AI & Tiện ích */}
        <Route path="/ai" element={<Guard roles={['VT04']}><AIPage /></Guard>} />

        {/* Aliases gvhd */}
        <Route path="/gvhd" element={<Navigate to="/giang-vien/dashboard" replace />} />
        <Route path="/gvhd/dashboard" element={<Guard roles={['VT03']}><DashboardGVPage /></Guard>} />
        <Route path="/gvhd/sinh-vien" element={<Guard roles={['VT03']}><DanhSachSVHuongDanPage /></Guard>} />
        <Route path="/gvhd/tien-do" element={<Guard roles={['VT03']}><TienDoThucTapSVPage /></Guard>} />
        <Route path="/gvhd/cham-diem" element={<Guard roles={['VT03']}><ChamDiemCLOPage /></Guard>} />
        <Route path="/gvhd/bao-cao" element={<Guard roles={['VT03']}><TienDoThucTapSVPage /></Guard>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
