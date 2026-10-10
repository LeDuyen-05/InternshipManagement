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
import TheoDõiTienDoPage from '../pages/GVHD/TheoDõiTienDoPage.jsx'
import KhoaOperationsPage from '../pages/Khoa/KhoaOperationsPage.jsx'
import KhoaDeadlinesPage from '../pages/Khoa/KhoaDeadlinesPage.jsx'
import KhoaCommitteePage from '../pages/Khoa/KhoaCommitteePage.jsx'
import KhoaCriteriaPage from '../pages/Khoa/KhoaCriteriaPage.jsx'
import KhoaAccountsPage from '../pages/Khoa/KhoaAccountsPage.jsx'

function Guard({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/auth" replace />
  if (roles && !roles.includes(user.maVaiTro)) return <Navigate to="/dashboard" replace />
  return children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
      <Route path="/gvhd/cham-diem" element={<Guard roles={['VT01', 'VT02', 'VT03']}><ChamDiemCLOPage /></Guard>} />
      <Route path="/gvhd/tien-do" element={<Guard roles={['VT01', 'VT02', 'VT03']}><TheoDõiTienDoPage /></Guard>} />
      <Route path="/gvhd/sinh-vien" element={<Guard roles={['VT01', 'VT02', 'VT03']}><TheoDõiTienDoPage /></Guard>} />
    </Routes>
  )
}
