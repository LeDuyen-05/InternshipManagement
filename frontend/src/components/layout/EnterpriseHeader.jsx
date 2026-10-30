import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import apiClient from '../../services/api.js'
import ModalOverlay from '../common/ModalOverlay.jsx'

export default function EnterpriseHeader({ activeCompany, onSelectCompany }) {
  const [companies, setCompanies] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const { user: authUser, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const { selectedDot, danhSachNamHoc, changeDot } = useDotThucTap()

  // Dropdown menu người dùng
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // Modal xem/sửa hồ sơ cá nhân
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileEditing, setProfileEditing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileStatus, setProfileStatus] = useState(null)
  const [profileForm, setProfileForm] = useState({
    hoTen: '',
    email: '',
    soDienThoai: '',
  })

  // Modal đổi mật khẩu
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordStatus, setPasswordStatus] = useState(null)
  const [submittingPassword, setSubmittingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPass: '',
    newPass: '',
    confirmPass: '',
  })

  const isManagerOrAdmin = authUser?.maVaiTro === 'VT01' || authUser?.maVaiTro === 'VT02'

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    async function loadCompanies() {
      if (!isManagerOrAdmin) return
      try {
        const data = await doanhNghiepService.getDanhSachDoanhNghiep()
        setCompanies(data || [])
      } catch (err) {
        console.error('Lỗi tải danh sách doanh nghiệp:', err)
      }
    }
    loadCompanies()
  }, [isManagerOrAdmin])

  const handleLogout = async () => {
    await logout()
    navigate('/auth')
  }

  // Mở modal hồ sơ
  const openProfile = async () => {
    setIsUserMenuOpen(false)
    setProfileEditing(false)
    setProfileStatus(null)
    setProfileForm({
      hoTen: authUser?.hoTen || '',
      email: authUser?.email || '',
      soDienThoai: authUser?.soDienThoai || '',
    })
    setShowProfileModal(true)
    try {
      const { data } = await apiClient.get('/auth/profile')
      setProfileForm({
        hoTen: data.hoTen || authUser?.hoTen || '',
        email: data.email || '',
        soDienThoai: data.soDienThoai || '',
      })
    } catch (err) {
      setProfileStatus(err.response?.data?.message || 'Không thể tải thông tin liên hệ mới nhất.')
    }
  }

  // Lưu hồ sơ
  const saveProfile = async () => {
    try {
      setSavingProfile(true)
      setProfileStatus(null)
      const { data } = await apiClient.put('/auth/profile', {
        email: profileForm.email,
        soDienThoai: profileForm.soDienThoai,
      })
      if (updateUser) {
        updateUser({
          hoTen: data.hoTen,
          email: data.email,
          soDienThoai: data.soDienThoai,
        })
      }
      setProfileForm({
        hoTen: data.hoTen || profileForm.hoTen,
        email: data.email || '',
        soDienThoai: data.soDienThoai || '',
      })
      setProfileEditing(false)
      setProfileStatus('Đã cập nhật thông tin liên hệ thành công.')
    } catch (err) {
      setProfileStatus(err.response?.data?.message || 'Không thể cập nhật thông tin hồ sơ.')
    } finally {
      setSavingProfile(false)
    }
  }

  // Đổi mật khẩu
  const handleChangePassword = async (e) => {
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
        err.response?.data?.message || err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.'
      )
    } finally {
      setSubmittingPassword(false)
    }
  }

  const displayName = authUser?.hoTen || authUser?.tenDangNhap || 'Đại diện Doanh nghiệp'
  const displayRole = authUser?.tenVaiTro || (authUser?.maVaiTro === 'VT02' ? 'Khoa' : authUser?.maVaiTro === 'VT01' ? 'Quản trị viên' : 'Đại diện Doanh nghiệp')
  const userCode = authUser?.maDaiDien || authUser?.tenDangNhap || 'DN'

  return (
    <>
      <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white border-b border-slate-200 z-40 pl-16 pr-3 lg:px-6 flex items-center justify-between gap-2 shadow-xs">
        {/* Bộ chọn đợt thực tập */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl px-2.5 py-1.5 transition-all focus-within:ring-2 focus-within:ring-indigo-500 shadow-2xs">
            <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0">calendar_month</span>
            <select
              aria-label="Đợt thực tập doanh nghiệp"
              value={selectedDot?.maDot || ''}
              onChange={(e) => {
                const round = danhSachNamHoc.flatMap((year) => year.dots).find((item) => item.maDot === e.target.value)
                if (round) changeDot(round)
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer max-w-[220px] sm:max-w-[340px] truncate pr-1"
            >
              {danhSachNamHoc.flatMap((year) => year.dots).map((round) => (
                <option key={round.maDot} value={round.maDot}>
                  {round.tenDot}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Khối giữa: Breadcrumb & Doanh nghiệp */}
        <div className="flex items-center gap-4">
          <div className="hidden xl:flex items-center text-slate-500 text-sm">
            <span className="material-symbols-outlined text-[18px] text-indigo-700 mr-1.5">corporate_fare</span>
            <span className="hidden xl:inline font-semibold text-indigo-950">FIT Portal</span>
            <span className="hidden sm:inline mx-2 text-slate-300">/</span>
            <span className="hidden sm:inline text-slate-800 font-medium">Cổng Doanh nghiệp</span>
          </div>

          {isManagerOrAdmin ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-xs font-semibold transition-all"
              >
                <span className="material-symbols-outlined text-[16px] text-indigo-600">domain</span>
                <span>{activeCompany?.tenCongTy || 'Đang chọn doanh nghiệp...'}</span>
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>

              {showDropdown && (
                <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs">
                  <div className="px-2 py-1.5 font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                    Chọn Doanh nghiệp (Quyền Quản trị)
                  </div>
                  <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                    {companies.map((c) => (
                      <button
                        key={c.maCongTy}
                        type="button"
                        onClick={() => {
                          if (onSelectCompany) onSelectCompany(c)
                          setShowDropdown(false)
                        }}
                        className={`text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                          activeCompany?.maCongTy === c.maCongTy
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{c.tenCongTy}</div>
                          <div
                            className={`text-[10px] ${
                              activeCompany?.maCongTy === c.maCongTy ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            Mã: {c.maCongTy} • {c.viTriTuyen || 'Chưa cập nhật'}
                          </div>
                        </div>
                        {activeCompany?.maCongTy === c.maCongTy && (
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs font-bold shadow-2xs">
              <span className="material-symbols-outlined text-[16px] text-indigo-600">domain</span>
              <span>{activeCompany?.tenCongTy || 'Doanh Nghiệp'}</span>
            </div>
          )}
        </div>

        {/* Khối phải: Menu Người dùng & Đăng xuất */}
        <div className="flex items-center gap-3">
          {isManagerOrAdmin && (
            <Link
              to={authUser?.maVaiTro === 'VT01' ? '/admin' : '/khoa'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-all shadow-2xs"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>{authUser?.maVaiTro === 'VT01' ? 'Cổng Quản trị' : 'Cổng Khoa'}</span>
            </Link>
          )}

          {/* Badge Người dùng & Dropdown Menu */}
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl transition-all cursor-pointer border ${
                isUserMenuOpen
                  ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                  : 'hover:bg-slate-100 border-transparent hover:border-slate-200'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                {(authUser?.tenDangNhap?.charAt(0) || activeCompany?.tenCongTy?.charAt(0) || 'D').toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">
                  {displayRole}
                </span>
              </div>
              <span
                className={`material-symbols-outlined text-slate-400 text-[18px] transition-transform hidden sm:inline-block ${
                  isUserMenuOpen ? 'rotate-180 text-indigo-600' : ''
                }`}
              >
                expand_more
              </span>
            </button>

            {/* Menu thả xuống khi click vào User */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 z-50">
                {/* Header User Card */}
                <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                      {(authUser?.tenDangNhap?.charAt(0) || 'D').toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                          {userCode}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate">
                          {activeCompany?.tenCongTy || 'Doanh nghiệp'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate">{authUser?.email || 'Chưa cập nhật email'}</span>
                    <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" title="Đang trực tuyến"></span>
                  </div>
                </div>

                {/* Các tùy chọn hồ sơ */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={openProfile}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[19px] text-slate-500">person</span>
                    <span>Xem & chỉnh sửa hồ sơ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      setPasswordStatus(null)
                      setPasswordForm({ oldPass: '', newPass: '', confirmPass: '' })
                      setShowPasswordModal(true)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[19px] text-slate-500">lock_reset</span>
                    <span>Đổi mật khẩu tài khoản</span>
                  </button>
                </div>

                {/* Đăng xuất */}
                <div className="p-1.5 border-t border-slate-100 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[19px] text-rose-500">logout</span>
                    <span>Đăng xuất phiên làm việc</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MODAL 1: XEM & CHỈNH SỬA HỒ SƠ CÁ NHÂN */}
      {showProfileModal && (
        <ModalOverlay onClose={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {(authUser?.tenDangNhap?.charAt(0) || 'D').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hồ Sơ Đại Diện Doanh Nghiệp</h3>
                  <p className="text-xs text-slate-500">Cổng tiếp nhận & Quản trị thực tập</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Chi tiết người dùng */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/70 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium text-[11px]">Tên đăng nhập:</span>
                  <span className="font-bold text-slate-900 text-sm">{authUser?.tenDangNhap || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium text-[11px]">Mã đại diện:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded text-xs">
                    {userCode}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block font-medium text-[11px]">Doanh nghiệp công tác:</span>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {activeCompany?.tenCongTy || 'Doanh nghiệp'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block font-medium text-[11px]">Vai trò hệ thống:</span>
                  <span className="font-semibold text-slate-800">{displayRole}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block font-medium text-[11px]">Họ và tên:</span>
                  <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                    {profileForm.hoTen || displayName}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium text-[11px]">Email liên hệ:</span>
                  {profileEditing ? (
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="name@company.com"
                      className="mt-1 w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  ) : (
                    <span className="font-semibold text-slate-800">{profileForm.email || '—'}</span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block font-medium text-[11px]">Số điện thoại:</span>
                  {profileEditing ? (
                    <input
                      type="tel"
                      value={profileForm.soDienThoai}
                      onChange={(e) => setProfileForm({ ...profileForm, soDienThoai: e.target.value })}
                      placeholder="VD: 0901234567"
                      className="mt-1 w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  ) : (
                    <span className="font-semibold text-slate-800">{profileForm.soDienThoai || '—'}</span>
                  )}
                </div>
              </div>
            </div>

            {profileStatus && (
              <p
                className={`text-xs p-2.5 rounded-xl font-medium ${
                  profileStatus.startsWith('Đã')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {profileStatus}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              {profileEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileEditing(false)
                      setProfileStatus(null)
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={saveProfile}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition disabled:opacity-60 cursor-pointer"
                  >
                    {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setProfileEditing(true)}
                  className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer"
                >
                  Chỉnh sửa liên hệ
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* MODAL 2: ĐỔI MẬT KHẨU TÀI KHOẢN */}
      {showPasswordModal && (
        <ModalOverlay onClose={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">lock_reset</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Đổi Mật Khẩu</h3>
                  <p className="text-xs text-slate-400">Bảo mật tài khoản doanh nghiệp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {passwordStatus === 'success' ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
                <p className="text-xs font-bold text-emerald-800">Đổi mật khẩu thành công!</p>
                <p className="text-[11px] text-emerald-600">
                  Mật khẩu mới đã được cập nhật cho tài khoản {userCode}.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition cursor-pointer"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-3">
                {passwordStatus && passwordStatus !== 'success' && (
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">error</span>
                    <span>{passwordStatus}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mật khẩu hiện tại *</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.oldPass}
                    onChange={(e) => setPasswordForm({ ...passwordForm, oldPass: e.target.value })}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordForm.newPass}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPass}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPass: e.target.value })}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPassword}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition disabled:opacity-60 cursor-pointer"
                  >
                    {submittingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </ModalOverlay>
      )}
    </>
  )
}
