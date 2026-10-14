import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout.jsx'
import SinhVienListPage from '../pages/SinhVien/SinhVienListPage.jsx'
import GioiThieuCongTyPage from '../pages/GiangVien/GioiThieuCongTyPage.jsx'
import DanhSachSVHuongDanPage from '../pages/GiangVien/DanhSachSVHuongDanPage.jsx'
import DuyetGioiThieuPage from '../pages/Khoa/DuyetGioiThieuPage.jsx'
import PhanCongGVHDPage from '../pages/Khoa/PhanCongGVHDPage.jsx'
import TienDoThucTapSVPage from '../pages/GiangVien/TienDoThucTapSVPage.jsx'
import ChamDiemCLOPage from '../pages/GiangVien/ChamDiemCLOPage.jsx'
import ThongKeCLOPage from '../pages/Khoa/ThongKeCLOPage.jsx'
import ThongBaoPage from '../pages/ThongBao/ThongBaoPage.jsx'
import GoiYCongTyAIPage from '../pages/SinhVien/GoiYCongTyAIPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'
import DashboardGVPage from '../pages/GiangVien/DashboardGVPage.jsx'
import LichDeadlinePage from '../pages/GiangVien/LichDeadlinePage.jsx'
import HoSoChuyenMonPage from '../pages/GiangVien/HoSoChuyenMonPage.jsx'

function AppRoutes() {
  return (
    <Routes>
      {/* Khung giao diện dùng chung (Sidebar + Header) */}
      <Route element={<MainLayout />}>
        {/* Mặc định chuyển hướng vào Dashboard Giảng viên */}
        <Route path="/" element={<Navigate to="/giang-vien/dashboard" replace />} />
        
        {/* Module Giảng viên (Người 3) */}
        <Route path="/giang-vien/dashboard" element={<DashboardGVPage />} />
        <Route path="/giang-vien/gioi-thieu" element={<GioiThieuCongTyPage />} />
        <Route path="/giang-vien/sinh-vien" element={<DanhSachSVHuongDanPage />} />
        <Route path="/giang-vien/tien-do" element={<TienDoThucTapSVPage />} />
        <Route path="/giang-vien/cham-diem" element={<ChamDiemCLOPage />} />
        <Route path="/giang-vien/lich-deadline" element={<LichDeadlinePage />} />
        <Route path="/giang-vien/ho-so" element={<HoSoChuyenMonPage />} />
        <Route path="/giang-vien/thong-bao" element={<ThongBaoPage />} />
        
        {/* Module Cán bộ Khoa (Người 3) */}
        <Route path="/khoa/dashboard" element={<Navigate to="/khoa/thong-ke-clo" replace />} />
        <Route path="/khoa/duyet-gioi-thieu" element={<DuyetGioiThieuPage />} />
        <Route path="/khoa/phan-cong" element={<PhanCongGVHDPage />} />
        <Route path="/khoa/thong-ke-clo" element={<ThongKeCLOPage />} />
        <Route path="/khoa/thong-bao" element={<ThongBaoPage />} />
        
        {/* Module Sinh viên */}
        <Route path="/sinh-vien" element={<SinhVienListPage />} />
        <Route path="/sinh-vien/goi-y-ai" element={<GoiYCongTyAIPage />} />
        <Route path="/sinh-vien/ho-so" element={<GoiYCongTyAIPage />} />
        <Route path="/sinh-vien/thong-bao" element={<ThongBaoPage />} />

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
