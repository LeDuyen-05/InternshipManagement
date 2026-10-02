import { Routes, Route } from 'react-router-dom'
import SinhVienListPage from '../pages/SinhVien/SinhVienListPage.jsx'

// Khung định tuyến ban đầu — bổ sung dần route cho GiangVien, GiaoVuKhoa, Auth...
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SinhVienListPage />} />
      <Route path="/sinh-vien" element={<SinhVienListPage />} />
    </Routes>
  )
}

export default AppRoutes
