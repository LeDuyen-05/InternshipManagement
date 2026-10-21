import { useState, useRef, useEffect } from 'react'
import ModalOverlay from '../common/ModalOverlay.jsx'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import apiClient from '../../services/api'

export default function Header({ currentRole }) {
  const navigate = useNavigate()
  const { user: authUser, logout, updateUser } = useAuth()

  // State thông báo & menu người dùng
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // State Modal Hồ sơ & Đổi mật khẩu
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileEditing, setProfileEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({ email: '', soDienThoai: '' })
  const [profileStatus, setProfileStatus] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPass: '', newPass: '', confirmPass: '' })
  const [passwordStatus, setPasswordStatus] = useState(null) // null | 'success' | 'error string'
  const [submittingPassword, setSubmittingPassword] = useState(false)
  const [logoutSuccess, setLogoutSuccess] = useState(false)

  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await apiClient.get('/thong-bao')
      const data = Array.isArray(res.data) ? res.data : []
      setNotifications(data)
      const lastSeen = localStorage.getItem('lastSeenNotifAt') || '1970-01-01'
      const unread = data.filter((n) => new Date(n.ngayTao) > new Date(lastSeen)).length
      setUnreadCount(unread)
    } catch {
      // Bỏ qua lỗi nếu mất mạng
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkAllRead = () => {
    localStorage.setItem('lastSeenNotifAt', new Date().toISOString())
    setUnreadCount(0)
  }

  // Thông tin người dùng theo tài khoản thực tế đã đăng nhập
  const getUserInfo = () => {
    const rawRole = authUser?.maVaiTro
    const isSV = currentRole === 'SinhVien' || rawRole === 'VT04'
    const isKhoa = currentRole === 'Khoa' || rawRole === 'VT02' || rawRole === 'VT01'

    const code = authUser?.maSV || authUser?.maGV || authUser?.tenDangNhap || '—'
    const name = authUser?.hoTen || authUser?.tenDangNhap || 'Người dùng'

    if (isSV) {
      return {
        code,
        name,
        role: `Sinh viên • MSSV: ${code}`,
        department: 'Khoa Công nghệ Thông tin',
        faculty: 'Khoa Công nghệ Thông tin',
        email: authUser?.email || '—',
        phone: authUser?.phone || '—',
        office: 'Sinh viên thực tập',
        avatar: (name.charAt(0) || code.charAt(0) || 'SV').toUpperCase(),
        avatarColor: 'bg-emerald-700 text-white',
        badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      }
    }

    if (isKhoa) {
      return {
        code,
        name,
        role: rawRole === 'VT01' ? 'Quản trị viên hệ thống' : 'Văn phòng Khoa CNTT',
        department: 'Văn phòng Khoa CNTT',
        faculty: 'Khoa Công nghệ Thông tin',
        email: authUser?.email || '—',
        phone: authUser?.phone || '—',
        office: 'Văn phòng Khoa CNTT',
        avatar: (name.charAt(0) || 'K').toUpperCase(),
        avatarColor: 'bg-indigo-700 text-white',
        badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      }
    }

    return {
      code,
      name,
      role: `Giảng viên Hướng dẫn • ${code}`,
      department: 'Khoa Công nghệ Thông tin',
      faculty: 'Khoa Công nghệ Thông tin',
      email: authUser?.email || '—',
      phone: authUser?.phone || '—',
      office: 'Văn phòng Bộ môn',
      avatar: (name.charAt(0) || 'GV').toUpperCase(),
      avatarColor: 'bg-blue-700 text-white',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    }
  }
  const user = getUserInfo()

  const openProfile = async () => {
    setIsUserMenuOpen(false)
    setProfileEditing(false)
    setProfileStatus(null)
    setProfileForm({ email: authUser?.email || '', soDienThoai: authUser?.soDienThoai || '' })
    setShowProfileModal(true)
    try {
      const { data } = await apiClient.get('/auth/profile')
      setProfileForm({ email: data.email || '', soDienThoai: data.soDienThoai || '' })
    } catch (err) {
      setProfileStatus(err.response?.data?.message || 'Không thể tải thông tin liên hệ mới nhất.')
    }
  }

  const saveProfile = async () => {
    try {
      setSavingProfile(true)
      setProfileStatus(null)
      const { data } = await apiClient.put('/auth/profile', {
        email: profileForm.email,
        soDienThoai: profileForm.soDienThoai,
      })
      updateUser({ email: data.email, soDienThoai: data.soDienThoai })
      setProfileForm({ email: data.email || '', soDienThoai: data.soDienThoai || '' })
      setProfileEditing(false)
      setProfileStatus('Đã cập nhật thông tin liên hệ.')
    } catch (err) {
      setProfileStatus(err.response?.data?.message || 'Không thể cập nhật thông tin hồ sơ.')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-6 shadow-sm">
      {/* Left section: Breadcrumb / Title */}
      <div className="flex items-center text-slate-500 text-sm">
        <span className="material-symbols-outlined text-[18px] text-blue-700 mr-1.5">school</span>
        <span className="font-semibold text-blue-900">FIT Portal</span>
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-slate-800 font-medium">
          {currentRole === 'Khoa'
            ? 'Văn phòng Khoa'
            : currentRole === 'GiangVien'
            ? 'Giảng viên Hướng dẫn'
            : currentRole === 'SinhVien'
            ? 'Cổng Sinh viên'
            : 'Hệ thống Quản lý'}
        </span>
      </div>

      <div className="flex-1" />

      {/* Right section: Switch Portal + Semester + Notifications + User Menu */}
      <div className="flex items-center gap-3">
        {/* Switch Portal Button (only for Admin/Faculty/Enterprise) */}
        {(authUser?.maVaiTro === 'VT01' || authUser?.maVaiTro === 'VT02' || authUser?.maVaiTro === 'VT05') && (
          <Link
            to="/doanh-nghiep"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold transition-all shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
            <span>Cổng Doanh nghiệp</span>
          </Link>
        )}

        {/* Semester Tag */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Đợt 2 - HK2 (2026 - 2027)</span>
        </div>

        {/* Nút Chuông Thông Báo */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            aria-label="Thông báo"
            className={`relative p-2 rounded-xl transition ${
              isNotifOpen ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Hộp Thông Báo Thả Xuống (Notification Popover) */}
          {isNotifOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 z-50">
              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">Thông báo học vụ</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  Đã đọc tất cả
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Chưa có thông báo nào từ Khoa.
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <div
                      key={notif.maThongBao}
                      onClick={() => {
                        setIsNotifOpen(false)
                        navigate(
                          currentRole === 'Khoa'
                            ? '/khoa/thong-bao'
                            : currentRole === 'SinhVien'
                            ? '/sinh-vien/thong-bao'
                            : '/giang-vien/thong-bao'
                        )
                      }}
                      className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[17px]">campaign</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 line-clamp-1">{notif.tieuDe}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {notif.ngayTao ? new Date(notif.ngayTao).toLocaleDateString('vi-VN') : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{notif.noiDung}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    setIsNotifOpen(false)
                    navigate(
                      currentRole === 'Khoa'
                        ? '/khoa/thong-bao'
                        : currentRole === 'SinhVien'
                        ? '/sinh-vien/thong-bao'
                        : '/giang-vien/thong-bao'
                    )
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center justify-center gap-1 mx-auto"
                >
                  <span>Xem tất cả thông báo</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200"></div>

        {/* 👤 3. USER BADGE VÀ MENU TÀI KHOẢN THẢ XUỐNG */}
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`flex items-center gap-2.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl transition-all cursor-pointer border ${
              isUserMenuOpen
                ? 'bg-blue-50/80 border-blue-200 shadow-sm'
                : 'hover:bg-slate-100/80 border-transparent hover:border-slate-200'
            }`}
          >
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
              <span className="text-[11px] text-slate-500 leading-tight">{user.role}</span>
            </div>
            <div
              className={`w-8 h-8 rounded-full ${user.avatarColor} flex items-center justify-center font-bold text-xs shadow-sm shrink-0`}
            >
              {user.avatar}
            </div>
            <span
              className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform hidden sm:inline-block ${
                isUserMenuOpen ? 'rotate-180 text-blue-600' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {/* DROPDOWN MENU KHI BẤM VÀO USER */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 z-50">
              {/* Header Profile Card */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl ${user.avatarColor} flex items-center justify-center font-bold text-sm shadow-md shrink-0`}
                  >
                    {user.avatar}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${user.badgeColor}`}>
                        {user.code}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">{user.department}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate">{user.email}</span>
                  <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" title="Đang trực tuyến"></span>
                </div>
              </div>

              {/* Danh sách hành động */}
              <div className="p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={openProfile}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[19px] text-slate-500">person</span>
                  <span>Xem hồ sơ chi tiết</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setPasswordStatus(null)
                    setPasswordForm({ oldPass: '', newPass: '', confirmPass: '' })
                    setShowPasswordModal(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[19px] text-slate-500">lock_reset</span>
                  <span>Đổi mật khẩu tài khoản</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    navigate(
                      currentRole === 'Khoa'
                        ? '/khoa/thong-bao'
                        : currentRole === 'SinhVien'
                        ? '/sinh-vien/thong-bao'
                        : '/giang-vien/thong-bao'
                    )
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-blue-50/70 hover:text-blue-700 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[19px] text-slate-500">notifications</span>
                  <span>Trung tâm thông báo</span>
                </button>
              </div>

              {/* Footer Đăng xuất */}
              <div className="p-1.5 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setShowLogoutConfirm(true)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[19px] text-rose-500">logout</span>
                  <span>Đăng xuất phiên làm việc</span>
                </button>
              </div>

              <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-center">
                <span className="text-[10px] text-slate-400">HUIT • FIT Portal v2.4</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 📋 MODAL 1: XEM HỒ SƠ CHI TIẾT (DÙNG PORTAL ĐỂ CĂN GIỮA TOÀN MÀN HÌNH) */}
      {showProfileModal &&
          <ModalOverlay onClose={() => setShowProfileModal(false)}>
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${user.avatarColor} flex items-center justify-center font-bold text-sm`}>
                    {user.avatar}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Hồ Sơ Tài Khoản Cá Nhân</h3>
                    <p className="text-xs text-slate-400">Trường Đại học Công Thương TP.HCM (HUIT)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Chi tiết người dùng */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium text-[11px]">Tên đăng nhập:</span>
                    <span className="font-bold text-slate-900 text-sm">{authUser?.tenDangNhap || user.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium text-[11px]">Mã định danh:</span>
                    <span className="font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded text-xs">{user.code}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-medium text-[11px]">Vai trò hệ thống:</span>
                    <span className="font-semibold text-slate-800">{user.role.split('•')[0]}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-medium text-[11px]">Đơn vị công tác / Lớp:</span>
                    <span className="font-semibold text-slate-800">{user.department}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-medium text-[11px]">Khoa phụ trách:</span>
                    <span className="font-semibold text-slate-800">{user.faculty}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium text-[11px]">Email:</span>
                    {profileEditing ? (
                      <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="name@example.com" className="mt-1 w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    ) : <span className="font-semibold text-slate-800">{profileForm.email || '—'}</span>}
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium text-[11px]">Số điện thoại:</span>
                    {profileEditing ? (
                      <input type="tel" value={profileForm.soDienThoai} onChange={(e) => setProfileForm({ ...profileForm, soDienThoai: e.target.value })} placeholder="VD: 0901234567" className="mt-1 w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    ) : <span className="font-semibold text-slate-800">{profileForm.soDienThoai || '—'}</span>}
                  </div>
                </div>
              </div>

              {profileStatus && <p className={`text-xs ${profileStatus.startsWith('Đã') ? 'text-emerald-700' : 'text-rose-700'}`}>{profileStatus}</p>}
              <div className="flex justify-end gap-2 pt-1">
                {profileEditing ? (
                  <>
                    <button type="button" onClick={() => { setProfileEditing(false); setProfileStatus(null) }} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Hủy</button>
                    <button type="button" disabled={savingProfile} onClick={saveProfile} className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition disabled:opacity-60">{savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                  </>
                ) : <button type="button" onClick={() => setProfileEditing(true)} className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition">Chỉnh sửa liên hệ</button>}
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </ModalOverlay>
        }

      {/* 🔑 MODAL 2: ĐỔI MẬT KHẨU */}
      {showPasswordModal &&
          <ModalOverlay onClose={() => setShowPasswordModal(false)}>
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Đổi Mật Khẩu</h3>
                    <p className="text-xs text-slate-400">Cập nhật mật khẩu bảo mật tài khoản HUIT</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {passwordStatus === 'success' ? (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                  <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                  <p className="text-xs font-bold text-emerald-800">Đổi mật khẩu thành công!</p>
                  <p className="text-[11px] text-emerald-600">
                    Mật khẩu mới đã được cập nhật cho tài khoản {user.code}.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="px-4 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition"
                    >
                      Hoàn tất
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!passwordForm.oldPass || !passwordForm.newPass || !passwordForm.confirmPass) {
                      setPasswordStatus('Vui lòng điền đầy đủ các thông tin!')
                      return
                    }
                    if (passwordForm.newPass.length < 6) {
                      setPasswordStatus('Mật khẩu mới phải có tối thiểu 6 ký tự!')
                      return
                    }
                    if (passwordForm.newPass !== passwordForm.confirmPass) {
                      setPasswordStatus('Mật khẩu xác nhận không trùng khớp!')
                      return
                    }
                    try {
                      setSubmittingPassword(true)
                      setPasswordStatus(null)
                      await apiClient.post('/auth/change-password', {
                        MatKhauCu: passwordForm.oldPass,
                        MatKhauMoi: passwordForm.newPass,
                      })
                      setPasswordStatus('success')
                      setPasswordForm({ oldPass: '', newPass: '', confirmPass: '' })
                    } catch (err) {
                      setPasswordStatus(
                        err.response?.data?.message ||
                          err.message ||
                          'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.'
                      )
                    } finally {
                      setSubmittingPassword(false)
                    }
                  }}
                  className="space-y-3"
                >
                  {passwordStatus && passwordStatus !== 'success' && (
                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">error</span>
                      <span>{passwordStatus}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Mật khẩu hiện tại:</label>
                    <input
                      type="password"
                      value={passwordForm.oldPass}
                      onChange={(e) => setPasswordForm({ ...passwordForm, oldPass: e.target.value })}
                      placeholder="Nhập mật khẩu hiện tại"
                      className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Mật khẩu mới:</label>
                    <input
                      type="password"
                      value={passwordForm.newPass}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Xác nhận mật khẩu mới:</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPass}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPass: e.target.value })}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submittingPassword}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                    >
                      {submittingPassword ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <span>Lưu mật khẩu mới</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </ModalOverlay>
        }

      {/* 🚪 MODAL 3: XÁC NHẬN ĐĂNG XUẤT */}
      {showLogoutConfirm &&
          <ModalOverlay onClose={() => setShowLogoutConfirm(false)}>
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 max-h-[90vh] overflow-y-auto">
              {logoutSuccess ? (
                <div className="space-y-3 py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-2xl">check</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Đã đăng xuất thành công</h4>
                  <p className="text-xs text-slate-500">Phiên làm việc đã kết thúc an toàn. Hẹn gặp lại bạn!</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-2xl">logout</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Đăng xuất khỏi hệ thống?</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Bạn đang đăng nhập với tài khoản <strong>{user.name}</strong> ({user.code}). Bạn có chắc chắn muốn thoát?
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLogoutConfirm(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    >
                      Ở lại
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLogoutSuccess(true)
                        setTimeout(() => {
                          setShowLogoutConfirm(false)
                          setLogoutSuccess(false)
                          logout()
                          navigate('/auth', { replace: true })
                        }, 500)
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Xác nhận Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </ModalOverlay>
        }
    </header>
  )
}
