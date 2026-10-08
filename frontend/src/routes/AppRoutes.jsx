import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../components/layout/MainLayout.jsx'
import SinhVienListPage from '../pages/SinhVien/SinhVienListPage.jsx'
import GioiThieuCongTyPage from '../pages/GiangVien/GioiThieuCongTyPage.jsx'
import DanhSachSVHuongDanPage from '../pages/GiangVien/DanhSachSVHuongDanPage.jsx'
import DuyetGioiThieuPage from '../pages/Khoa/DuyetGioiThieuPage.jsx'
import PhanCongGVHDPage from '../pages/Khoa/PhanCongGVHDPage.jsx'
import TienDoThucTapSVPage from '../pages/GiangVien/TienDoThucTapSVPage.jsx'
import ChamDiemCLOPage from '../pages/GiangVien/ChamDiemCLOPage.jsx'
import ThongBaoPage from '../pages/ThongBao/ThongBaoPage.jsx'

function AppRoutes() {
  return (
    <Routes>
      {/* Khung giao diện dùng chung (Sidebar + Header) */}
      <Route element={<MainLayout />}>
        {/* Mặc định chuyển hướng vào trang Giảng viên giới thiệu công ty */}
        <Route path="/" element={<Navigate to="/giang-vien/gioi-thieu" replace />} />
        
        {/* Module Giảng viên (Người 3) */}
        <Route path="/giang-vien/gioi-thieu" element={<GioiThieuCongTyPage />} />
        <Route path="/giang-vien/sinh-vien" element={<DanhSachSVHuongDanPage />} />
        <Route path="/giang-vien/tien-do" element={<TienDoThucTapSVPage />} />
        <Route path="/giang-vien/cham-diem" element={<ChamDiemCLOPage />} />
        <Route path="/giang-vien/thong-bao" element={<ThongBaoPage />} />
        
        {/* Module Cán bộ Khoa (Người 3) */}
        <Route path="/khoa/duyet-gioi-thieu" element={<DuyetGioiThieuPage />} />
        <Route path="/khoa/phan-cong" element={<PhanCongGVHDPage />} />
        <Route path="/khoa/thong-bao" element={<ThongBaoPage />} />
        
        {/* Module Sinh viên */}
        <Route path="/sinh-vien" element={<SinhVienListPage />} />
        <Route path="/sinh-vien/thong-bao" element={<ThongBaoPage />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
