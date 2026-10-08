import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

export default function Header({ currentRole }) {
  const navigate = useNavigate()

  // State tìm kiếm, thông báo & menu người dùng
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(3)

  // State Modal Hồ sơ & Đổi mật khẩu
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ oldPass: '', newPass: '', confirmPass: '' })
  const [passwordStatus, setPasswordStatus] = useState(null) // null | 'success' | 'error'
  const [logoutSuccess, setLogoutSuccess] = useState(false)

  const searchRef = useRef(null)
  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false)
      }
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

  // Thông tin người dùng chi tiết theo Role
  const getUserInfo = () => {
    switch (currentRole) {
      case 'GiangVien':
        return {
          code: 'GV001',
          name: 'ThS. Nguyễn Văn An',
          degree: 'Thạc sĩ Khoa học Máy tính',
          role: 'Giảng viên Hướng dẫn • Bộ môn CNPM',
          department: 'Bộ môn Công nghệ Phần mềm',
          faculty: 'Khoa Công nghệ Thông tin - HUIT',
          email: 'an.nv@huit.edu.vn',
          phone: '0903.123.456',
          office: 'Phòng B.304 - Cơ sở chính',
          avatar: 'GV',
          avatarColor: 'bg-blue-700 text-white',
          badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
        }
      case 'Khoa':
        return {
          code: 'CB002',
          name: 'ThS. Trần Thị Giáo Vụ',
          degree: 'Thạc sĩ Quản lý Giáo dục',
          role: 'Văn phòng Khoa CNTT',
          department: 'Văn phòng Giáo vụ & Học vụ',
          faculty: 'Khoa Công nghệ Thông tin - HUIT',
          email: 'giaovu.fit@huit.edu.vn',
          phone: '(028) 3816 1673 - Ext: 104',
          office: 'Văn phòng Khoa CNTT - Tòa nhà F',
          avatar: 'K',
          avatarColor: 'bg-indigo-700 text-white',
          badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        }
      case 'SinhVien':
        return {
          code: '2001210123',
          name: 'Phạm Minh Đức',
          degree: 'Sinh viên Khóa 12 (K2022)',
          role: 'Sinh viên • Lớp 12DHTH01',
          department: 'Lớp 12DHTH01 - Ngành CNTT',
          faculty: 'Khoa Công nghệ Thông tin - HUIT',
          email: '2001210123@huit.edu.vn',
          phone: '0912.345.678',
          office: 'Lớp sinh hoạt: 12DHTH01',
          avatar: 'SV',
          avatarColor: 'bg-emerald-700 text-white',
          badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        }
      default:
        return {
          code: 'ADMIN',
          name: 'Người dùng Hệ thống',
          degree: 'Quản trị viên',
          role: 'Hệ thống FIT Portal',
          department: 'Quản trị hệ thống',
          faculty: 'Trường ĐH Công Thương TP.HCM',
          email: 'admin@huit.edu.vn',
          phone: '028.3816.1673',
          office: 'Phòng TT-TH',
          avatar: 'U',
          avatarColor: 'bg-slate-700 text-white',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        }
    }
  }
  const user = getUserInfo()

  // 1. DỮ LIỆU TÌM KIẾM PHÂN THEO ROLE
  const getSearchDatabase = () => {
    switch (currentRole) {
      case 'GiangVien':
        return [
          {
            id: 'SV001',
            title: 'Nguyễn Văn An',
            subtitle: 'MSSV: SV001 • Lớp CNTT01 (Đang hướng dẫn)',
            badge: 'Sinh viên của bạn',
            icon: 'person',
            link: '/giang-vien/sinh-vien',
          },
          {
            id: 'SV002',
            title: 'Nguyễn Thu Hà',
            subtitle: 'MSSV: SV002 • Đã hoàn thành 12 tuần báo cáo',
            badge: 'Sinh viên của bạn',
            icon: 'person',
            link: '/giang-vien/sinh-vien',
          },
          {
            id: 'CT01',
            title: 'FPT Software',
            subtitle: 'Đơn vị bạn đề xuất • Vị trí: .NET Developer',
            badge: 'DN bạn đề xuất',
            icon: 'apartment',
            link: '/giang-vien/gioi-thieu',
          },
          {
            id: 'CLO',
            title: 'Đánh giá & Chấm điểm CLO',
            subtitle: 'Trang nhập điểm và xếp loại sinh viên hướng dẫn',
            badge: 'Chức năng',
            icon: 'fact_check',
            link: '/giang-vien/cham-diem',
          },
        ]
      case 'Khoa':
        return [
          {
            id: 'SV002',
            title: 'Nguyễn Thu Hà',
            subtitle: 'MSSV: SV002 • Lớp CNTT01 (Chờ phân công GVHD)',
            badge: 'Sinh viên Khoa',
            icon: 'person',
            link: '/khoa/phan-cong',
          },
          {
            id: 'SV003',
            title: 'Võ Thanh Huy',
            subtitle: 'MSSV: SV003 • Lớp CNTT02 (Chưa có GVHD)',
            badge: 'Sinh viên Khoa',
            icon: 'person',
            link: '/khoa/phan-cong',
          },
          {
            id: 'GV001',
            title: 'ThS. Nguyễn Văn An',
            subtitle: 'Mã GV: GV001 • Bộ môn CNPM (Tải 1/4 SV)',
            badge: 'Giảng viên Khoa',
            icon: 'badge',
            link: '/giang-vien/sinh-vien?gv=GV001',
          },
          {
            id: 'GV002',
            title: 'TS. Trần Thị Bình',
            subtitle: 'Mã GV: GV002 • Bộ môn HTTT (Tải 0/10 SV)',
            badge: 'Giảng viên Khoa',
            icon: 'badge',
            link: '/giang-vien/sinh-vien?gv=GV002',
          },
          {
            id: 'CT01',
            title: 'FPT Software',
            subtitle: 'Doanh nghiệp do GV giới thiệu • Chờ phê duyệt',
            badge: 'Duyệt DN',
            icon: 'verified',
            link: '/khoa/duyet-gioi-thieu',
          },
        ]
      case 'SinhVien':
        return [
          {
            id: 'CT01',
            title: 'FPT Software - Chi nhánh 1',
            subtitle: 'Tuyển dụng: .NET / ReactJS Intern (Chỉ tiêu: 10)',
            badge: 'Doanh nghiệp',
            icon: 'apartment',
            link: '/sinh-vien',
          },
          {
            id: 'BM01',
            title: 'Biểu mẫu Báo cáo tuần & Đánh giá CLO',
            subtitle: 'Tài liệu hướng dẫn thực tập doanh nghiệp chuẩn Khoa',
            badge: 'Biểu mẫu',
            icon: 'description',
            link: '/sinh-vien',
          },
        ]
      default:
        return []
    }
  }

  // Lọc kết quả tìm kiếm theo từ khóa gõ
  const searchResults = getSearchDatabase().filter((item) => {
    if (!searchQuery.trim()) return false
    const q = searchQuery.toLowerCase()
    return item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
  })

  // Placeholder theo Role
  const getSearchPlaceholder = () => {
    switch (currentRole) {
      case 'GiangVien':
        return 'Tìm sinh viên của bạn (Tên, MSSV), đề tài...'
      case 'Khoa':
        return 'Tìm sinh viên, giảng viên, doanh nghiệp trong Khoa...'
      case 'SinhVien':
        return 'Tìm doanh nghiệp thực tập, biểu mẫu học vụ...'
      default:
        return 'Tìm kiếm...'
    }
  }

  // 2. DỮ LIỆU THÔNG BÁO THEO ROLE
  const getNotifications = () => {
    switch (currentRole) {
      case 'GiangVien':
        return [
          {
            id: 1,
            title: 'Sinh viên nộp báo cáo tuần',
            desc: 'Phạm Minh Đức (SV001) vừa nộp báo cáo tuần 9. Vui lòng kiểm tra và duyệt.',
            time: '10 phút trước',
            type: 'report',
            unread: true,
            link: '/giang-vien/tien-do?sv=SV001',
          },
          {
            id: 2,
            title: 'Nhắc nhở hạn chót CLO',
            desc: 'Khoa thông báo: Hạn cuối hoàn tất chấm điểm chuẩn đầu ra CLO là 15/01/2027.',
            time: '2 giờ trước',
            type: 'deadline',
            unread: true,
            link: '/giang-vien/cham-diem',
          },
          {
            id: 3,
            title: 'Phân công hướng dẫn mới',
            desc: 'Cán bộ Khoa vừa điều phối thêm sinh viên vào danh sách hướng dẫn của bạn.',
            time: 'Hôm qua',
            type: 'assign',
            unread: false,
            link: '/giang-vien/sinh-vien',
          },
        ]
      case 'Khoa':
        return [
          {
            id: 1,
            title: 'Doanh nghiệp mới chờ phê duyệt',
            desc: 'ThS. Nguyễn Văn An vừa đề xuất kết nối Doanh nghiệp FPT Software.',
            time: '5 phút trước',
            type: 'company',
            unread: true,
            link: '/khoa/duyet-gioi-thieu',
          },
          {
            id: 2,
            title: 'Cảnh báo sinh viên chưa có GVHD',
            desc: 'Hiện còn 2 sinh viên trong đợt chưa được gán giảng viên hướng dẫn.',
            time: '1 giờ trước',
            type: 'alert',
            unread: true,
            link: '/khoa/phan-cong',
          },
          {
            id: 3,
            title: 'Kế hoạch học vụ đợt 1',
            desc: 'Đợt 1 - HK1 (2026-2027) đã đi được 50% thời lượng kế hoạch thực tập.',
            time: '2 ngày trước',
            type: 'info',
            unread: false,
            link: '/khoa/phan-cong',
          },
        ]
      case 'SinhVien':
        return [
          {
            id: 1,
            title: 'Phân công GVHD thành công',
            desc: 'Khoa đã phân công ThS. Nguyễn Văn An phụ trách hướng dẫn thực tập của bạn.',
            time: 'Vừa xong',
            type: 'assign',
            unread: true,
            link: '/sinh-vien',
          },
          {
            id: 2,
            title: 'Báo cáo tuần đã được duyệt',
            desc: 'Giảng viên hướng dẫn đã đánh giá Đạt báo cáo tuần 9 của bạn.',
            time: '3 ngày trước',
            type: 'report',
            unread: false,
            link: '/sinh-vien',
          },
        ]
      default:
        return []
    }
  }

  const notifications = getNotifications()

  const handleSelectSearchResult = (link) => {
    setSearchQuery('')
    setIsSearchOpen(false)
    navigate(link)
  }

  const handleMarkAllRead = () => {
    setUnreadCount(0)
  }

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 z-40 flex items-center justify-between px-6 shadow-xs">
      {/* 🔍 1. THANH TÌM KIẾM TOÀN CỤC THEO ROLE */}
      <div ref={searchRef} className="relative flex items-center gap-3 flex-1 max-w-lg">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsSearchOpen(true)
            }}
            onFocus={() => {
              if (searchQuery.trim()) setIsSearchOpen(true)
            }}
            placeholder={getSearchPlaceholder()}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-100 text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all border border-transparent focus:border-blue-600"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setIsSearchOpen(false)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Dropdown Kết quả tìm kiếm theo Role */}
        {isSearchOpen && searchQuery.trim() && (
          <div className="absolute top-11 left-0 right-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 z-50">
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Kết quả theo quyền {user.role.split('•')[0]}</span>
              <span>{searchResults.length} tìm thấy</span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">search_off</span>
                  <p>Không tìm thấy dữ liệu nào phù hợp với quyền hạn của bạn.</p>
                </div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSearchResult(item.link)}
                    className="p-3 hover:bg-blue-50/70 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-700 flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.subtitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {item.badge}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 🔔 2. KHU VỰC ĐIỀU KHIỂN & CHUÔNG THÔNG BÁO THEO ROLE */}
      <div className="flex items-center gap-4">
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
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
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
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      setIsNotifOpen(false)
                      navigate(notif.link)
                    }}
                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 ${
                      notif.unread ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[17px]">
                        {notif.type === 'report' ? 'description' : notif.type === 'deadline' ? 'alarm' : 'campaign'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-900">{notif.title}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{notif.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.desc}</p>
                    </div>
                  </div>
                ))}
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
                ? 'bg-blue-50/80 border-blue-200 shadow-xs'
                : 'hover:bg-slate-100/80 border-transparent hover:border-slate-200'
            }`}
          >
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
              <span className="text-[11px] text-slate-500 leading-tight">{user.role}</span>
            </div>
            <div
              className={`w-8 h-8 rounded-full ${user.avatarColor} flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}
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
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    setShowProfileModal(true)
                  }}
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
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                    <span className="text-slate-400 block font-medium text-[11px]">Họ và tên:</span>
                    <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium text-[11px]">Mã định danh:</span>
                    <span className="font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded text-xs">{user.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium text-[11px]">Học vị / Khóa:</span>
                    <span className="font-semibold text-slate-800">{user.degree}</span>
                  </div>
                  <div>
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
                    <span className="text-slate-400 block font-medium text-[11px]">Email công vụ:</span>
                    <span className="font-semibold text-slate-800">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium text-[11px]">Số điện thoại:</span>
                    <span className="font-semibold text-slate-800">{user.phone}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-medium text-[11px]">Vị trí làm việc:</span>
                    <span className="font-semibold text-slate-800">{user.office}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 text-[11px] text-blue-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-base">verified_user</span>
                <span>
                  Tài khoản đã được liên kết và định danh qua hệ thống <strong>HUIT SSO Identity</strong>.
                </span>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 🔑 MODAL 2: ĐỔI MẬT KHẨU */}
      {showPasswordModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                  onSubmit={(e) => {
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
                    setPasswordStatus('success')
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
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition"
                    >
                      Lưu mật khẩu mới
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* 🚪 MODAL 3: XÁC NHẬN ĐĂNG XUẤT */}
      {showLogoutConfirm &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
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
                        }, 1800)
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
                    >
                      Xác nhận Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </header>
  )
}
