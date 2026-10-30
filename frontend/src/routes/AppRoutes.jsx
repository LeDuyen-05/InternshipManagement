import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const AuthPage = lazy(() => import('../pages/Auth/AuthPage.jsx'))
const DashboardPage = lazy(() => import('../pages/Dashboard/DashboardPage.jsx'))
const AdminPage = lazy(() => import('../pages/Admin/AdminPage.jsx'))
const KhoaPage = lazy(() => import('../pages/Khoa/KhoaPage.jsx'))
const SinhVienTheoDotPage = lazy(() => import('../pages/Khoa/SinhVienTheoDotPage.jsx'))
const PhanBoGVHDPage = lazy(() => import('../pages/Khoa/PhanBoGVHDPage.jsx'))
const ThongKeBaoCaoPage = lazy(() => import('../pages/Khoa/ThongKeBaoCaoPage.jsx'))
const AIPage = lazy(() => import('../pages/AI/AIPage.jsx'))
const ChangePasswordPage = lazy(() => import('../pages/Account/ChangePasswordPage.jsx'))
const DocumentsPage = lazy(() => import('../pages/Account/DocumentsPage.jsx'))
const KhoaOperationsPage = lazy(() => import('../pages/Khoa/KhoaOperationsPage.jsx'))
const KhoaDeadlinesPage = lazy(() => import('../pages/Khoa/KhoaDeadlinesPage.jsx'))
const KhoaDoanhNghiepPage = lazy(() => import('../pages/Khoa/KhoaDoanhNghiepPage.jsx'))
const KhoaCommitteePage = lazy(() => import('../pages/Khoa/KhoaCommitteePage.jsx'))
const KhoaCriteriaPage = lazy(() => import('../pages/Khoa/KhoaCriteriaPage.jsx'))
const MainLayout = lazy(() => import('../components/layout/MainLayout.jsx'))
const DashboardSinhVienPage = lazy(() => import('../pages/SinhVien/DashboardSinhVienPage.jsx'))
const HoSoNangLucPage = lazy(() => import('../pages/SinhVien/HoSoNangLucPage.jsx'))
const DangKyThucTapPage = lazy(() => import('../pages/SinhVien/DangKyThucTapPage.jsx'))
const LichTrinhPhongVanPage = lazy(() => import('../pages/SinhVien/LichTrinhPhongVanPage.jsx'))
const NopTienDoSVPage = lazy(() => import('../pages/SinhVien/NopTienDoSVPage.jsx'))
const EnterpriseLayout = lazy(() => import('../components/layout/EnterpriseLayout.jsx'))
const EnterpriseDashboardPage = lazy(() => import('../pages/DoanhNghiep/EnterpriseDashboardPage.jsx'))
const QuanLyTinTuyenDungPage = lazy(() => import('../pages/DoanhNghiep/QuanLyTinTuyenDungPage.jsx'))
const QuanLyUngVienPage = lazy(() => import('../pages/DoanhNghiep/QuanLyUngVienPage.jsx'))
const LichPhongVanDNPage = lazy(() => import('../pages/DoanhNghiep/LichPhongVanDNPage.jsx'))
const DanhGiaThucTapSinhPage = lazy(() => import('../pages/DoanhNghiep/DanhGiaThucTapSinhPage.jsx'))
const GioiThieuCongTyPage = lazy(() => import('../pages/GiangVien/GioiThieuCongTyPage.jsx'))
const DanhSachSVHuongDanPage = lazy(() => import('../pages/GiangVien/DanhSachSVHuongDanPage.jsx'))
const TienDoThucTapSVPage = lazy(() => import('../pages/GiangVien/TienDoThucTapSVPage.jsx'))
const ChamDiemCLOPage = lazy(() => import('../pages/GiangVien/ChamDiemCLOPage.jsx'))
const ThongKeCLOPage = lazy(() => import('../pages/Khoa/ThongKeCLOPage.jsx'))
const DuyetGioiThieuPage = lazy(() => import('../pages/Khoa/DuyetGioiThieuPage.jsx'))
const PhanCongGVHDPage = lazy(() => import('../pages/Khoa/PhanCongGVHDPage.jsx'))
const ThongBaoPage = lazy(() => import('../pages/ThongBao/ThongBaoPage.jsx'))
const GoiYCongTyAIPage = lazy(() => import('../pages/SinhVien/GoiYCongTyAIPage.jsx'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'))
const DashboardGVPage = lazy(() => import('../pages/GiangVien/DashboardGVPage.jsx'))
const LichDeadlinePage = lazy(() => import('../pages/GiangVien/LichDeadlinePage.jsx'))
const HoSoChuyenMonPage = lazy(() => import('../pages/GiangVien/HoSoChuyenMonPage.jsx'))

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
    <Suspense fallback={<div role="status" aria-live="polite" className="p-6 text-slate-600">Đang tải trang…</div>}>
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
      <Route path="/doanh-nghiep" element={<Guard roles={['VT05']}><EnterpriseLayout /></Guard>}>
        <Route index element={<EnterpriseDashboardPage />} />
        <Route path="tuyen-dung" element={<QuanLyTinTuyenDungPage />} />
        <Route path="ung-vien" element={<QuanLyUngVienPage />} />
        <Route path="phong-van" element={<LichPhongVanDNPage />} />
        <Route path="danh-gia" element={<DanhGiaThucTapSinhPage />} />
        <Route path="thong-bao" element={<ThongBaoPage />} />
        <Route path="tai-lieu" element={<DocumentsPage />} />
      </Route>
      {/* Admin, Faculty & Lecturer Portal Routes (Wrapped with MainLayout & Guard) */}
      <Route element={<Guard><MainLayout /></Guard>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<Guard roles={['VT01']}><AdminPage /></Guard>} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/tai-lieu" element={<DocumentsPage />} />
        <Route path="/thong-bao" element={<ThongBaoPage />} />

        {/* Module Khoa */}
        <Route path="/khoa/sinh-vien-theo-dot" element={<Guard roles={['VT02']}><SinhVienTheoDotPage /></Guard>} />
        <Route path="/khoa" element={<Guard roles={['VT02']}><KhoaPage /></Guard>} />
        <Route path="/khoa/dashboard" element={<Navigate to="/khoa/thong-ke-clo" replace />} />
        <Route path="/khoa/dot-thuc-tap" element={<Guard roles={['VT02']}><KhoaPage initialTab="dot" /></Guard>} />
        <Route path="/khoa/doanh-nghiep" element={<Guard roles={['VT02']}><KhoaDoanhNghiepPage /></Guard>} />
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
        <Route path="/khoa/cham-diem" element={<Guard roles={['VT02']}><ChamDiemCLOPage /></Guard>} />
        <Route path="/khoa/thong-bao" element={<Guard roles={['VT02']}><ThongBaoPage /></Guard>} />

        {/* Module Giảng viên (Người 3) */}
        <Route path="/giang-vien" element={<Navigate to="/giang-vien/dashboard" replace />} />
        <Route path="/giang-vien/dashboard" element={<Guard roles={['VT03']}><DashboardGVPage /></Guard>} />
        <Route path="/giang-vien/sinh-vien" element={<Guard roles={['VT03']}><DanhSachSVHuongDanPage /></Guard>} />
        <Route path="/giang-vien/tien-do" element={<Guard roles={['VT03']}><TienDoThucTapSVPage /></Guard>} />
        <Route path="/giang-vien/cham-diem" element={<Guard roles={['VT02', 'VT03']}><ChamDiemCLOPage /></Guard>} />
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
    </Suspense>
  )
}
