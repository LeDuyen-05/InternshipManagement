import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import apiClient from '../../services/api'

export default function ThongBaoPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedDot } = useDotThucTap()
  const { user } = useAuth()

  // Xác định Role hiển thị thông báo theo tài khoản đăng nhập hoặc URL
  const determineRole = () => {
    if (user?.maVaiTro === 'VT04') return 'SinhVien'
    if (user?.maVaiTro === 'VT03') return 'GiangVien'
    if (user?.maVaiTro === 'VT02' || user?.maVaiTro === 'VT01') return 'Khoa'
    if (user?.maVaiTro === 'VT05') return 'DoanhNghiep'
    if (location.pathname.startsWith('/khoa')) return 'Khoa'
    if (location.pathname.startsWith('/sinh-vien')) return 'SinhVien'
    if (location.pathname.startsWith('/doanh-nghiep')) return 'DoanhNghiep'
    return 'GiangVien'
  }

  const currentRole = determineRole()

  const [activeCategory, setActiveCategory] = useState('ALL')
  const [activeTarget, setActiveTarget] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem('readNotifIds')
      return new Set(stored ? JSON.parse(stored) : [])
    } catch {
      return new Set()
    }
  })
  const [toastMessage, setToastMessage] = useState('')
  const [serverNotifs, setServerNotifs] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newNotice, setNewNotice] = useState({
    tieuDe: '',
    noiDung: '',
    doiTuong: 'ALL',
    loaiThongBao: 'Chung',
    tepDinhKem: '',
    ghim: false,
  })
  const [sending, setSending] = useState(false)

  const loadServerNotifs = async () => {
    try {
      const res = await apiClient.get('/thong-bao', {
        params: { role: currentRole }
      })
      const data = Array.isArray(res.data) ? res.data : []
      setServerNotifs(data)
    } catch {
      // Bỏ qua lỗi nếu không có mạng
    }
  }

  useEffect(() => {
    loadServerNotifs()
  }, [currentRole])

  const getCategoryMeta = (loai) => {
    switch (loai) {
      case 'KeHoach':
        return { label: 'Kế hoạch & Lịch trình', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'BieuMau':
        return { label: 'Biểu mẫu & Hướng dẫn', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      case 'KhanCap':
        return { label: 'Khẩn cấp / Quan trọng', color: 'bg-rose-50 text-rose-700 border-rose-200' }
      default:
        return { label: 'Thông báo chung', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
    }
  }

  const getTargetMeta = (dt) => {
    switch (dt) {
      case 'SV':
        return { label: 'Chỉ Sinh Viên', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'school' }
      case 'GV':
        return { label: 'Chỉ Giảng Viên', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'person_apron' }
      case 'DN':
        return { label: 'Chỉ Doanh Nghiệp', color: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'corporate_fare' }
      default:
        return { label: 'Toàn Khoa', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: 'groups' }
    }
  }

  const formattedServerNotifs = serverNotifs.map((sn) => {
    const cat = getCategoryMeta(sn.loaiThongBao)
    const target = getTargetMeta(sn.doiTuong)
    return {
      id: `srv-${sn.maThongBao}`,
      title: sn.tieuDe,
      sender: sn.maNguoiGui || 'Văn phòng Khoa CNTT',
      date: sn.ngayTao
        ? new Date(sn.ngayTao).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Vừa xong',
      category: sn.loaiThongBao || 'Chung',
      categoryLabel: cat.label,
      categoryColor: cat.color,
      doiTuong: sn.doiTuong || 'ALL',
      targetLabel: target.label,
      targetColor: target.color,
      targetIcon: target.icon,
      ghim: !!sn.ghim,
      summary: sn.noiDung,
      attachment: sn.tepDinhKem || null,
      attachmentSize: sn.tepDinhKem ? 'Tài liệu đính kèm' : null,
      actionLink: null,
      actionText: null,
      isNew: true,
    }
  })

  const combinedList = formattedServerNotifs

  const handleMarkAllRead = () => {
    const allIds = new Set(combinedList.map((n) => n.id))
    setReadIds(allIds)
    localStorage.setItem('readNotifIds', JSON.stringify([...allIds]))
    setToastMessage('Đã đánh dấu tất cả thông báo trong hộp thư là đã đọc!')
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handleMarkSingleRead = (id) => {
    setReadIds((prev) => {
      const next = new Set([...prev, id])
      localStorage.setItem('readNotifIds', JSON.stringify([...next]))
      return next
    })
  }

  const handleCreateNoticeSubmit = async (e) => {
    e.preventDefault()
    if (!newNotice.tieuDe.trim() || !newNotice.noiDung.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo!')
      return
    }
    try {
      setSending(true)
      await apiClient.post('/thong-bao', {
        TieuDe: newNotice.tieuDe.trim(),
        NoiDung: newNotice.noiDung.trim(),
        DoiTuong: newNotice.doiTuong,
        LoaiThongBao: newNotice.loaiThongBao,
        TepDinhKem: newNotice.tepDinhKem.trim() || null,
        Ghim: newNotice.ghim,
      })
      setShowCreateModal(false)
      setNewNotice({
        tieuDe: '',
        noiDung: '',
        doiTuong: 'ALL',
        loaiThongBao: 'Chung',
        tepDinhKem: '',
        ghim: false,
      })
      setToastMessage('Đã đăng thông báo thành công!')
      setTimeout(() => setToastMessage(''), 4000)
      loadServerNotifs()
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể đăng thông báo.')
    } finally {
      setSending(false)
    }
  }

  const myTargetCode = currentRole === 'SinhVien' ? 'SV' : currentRole === 'GiangVien' ? 'GV' : currentRole === 'DoanhNghiep' ? 'DN' : null

  const filtered = combinedList.filter((item) => {
    // Nếu không phải là Khoa, chỉ hiển thị thông báo Toàn khoa hoặc thông báo riêng cho Role của mình
    if (currentRole !== 'Khoa') {
      const isForMe = item.doiTuong === 'ALL' || item.doiTuong === myTargetCode
      if (!isForMe) return false
    } else {
      if (activeTarget !== 'ALL' && item.doiTuong !== activeTarget) return false
    }

    const matchCategory = activeCategory === 'ALL' || item.category === activeCategory
    const matchKeyword =
      !keyword.trim() ||
      item.title.toLowerCase().includes(keyword.toLowerCase()) ||
      item.summary.toLowerCase().includes(keyword.toLowerCase()) ||
      item.sender.toLowerCase().includes(keyword.toLowerCase())
    return matchCategory && matchKeyword
  })

  return (
    <div className="space-y-6">
      {/* 1. Header Trang theo Role */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-2xl">campaign</span>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
                <span>{selectedDot?.tenDot || 'Đợt 1 - HK1 (2026-2027)'}</span>
                <span>•</span>
                <span className="text-blue-600 font-bold">
                  {currentRole === 'Khoa'
                    ? 'Cổng Cán Bộ Khoa'
                    : currentRole === 'SinhVien'
                    ? 'Cổng Sinh Viên'
                    : currentRole === 'DoanhNghiep'
                    ? 'Cổng Doanh Nghiệp'
                    : 'Cổng Giảng Viên'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">Bảng Tin Thông Báo Khoa</h1>
              <p className="text-sm text-slate-500">Cập nhật kế hoạch học vụ, hạn chót và thông báo chính thức từ Khoa CNTT</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {currentRole === 'Khoa' && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-base">add_box</span>
              <span>Đăng thông báo mới</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-xs"
          >
            <span className="material-symbols-outlined text-base text-blue-600">done_all</span>
            <span>Đã đọc tất cả</span>
          </button>
        </div>
      </div>

      {/* Thông báo thành công nếu có */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {/* 2. Thanh lọc & Tìm kiếm */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Bộ lọc danh mục */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'ALL'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả danh mục ({filtered.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('KeHoach')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'KeHoach'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Kế hoạch & Lịch trình
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('BieuMau')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'BieuMau'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Biểu mẫu & Hướng dẫn
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('KhanCap')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCategory === 'KhanCap'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Khẩn cấp / Quan trọng
            </button>
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative min-w-[260px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
              search
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm kiếm thông báo, từ khóa..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Bộ lọc đối tượng nhận: CHỈ hiển thị khi là Cán bộ Khoa */}
        {currentRole === 'Khoa' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Lọc theo đối tượng:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'ALL', label: 'Tất cả đối tượng' },
                { id: 'SV', label: 'Chỉ Sinh Viên' },
                { id: 'GV', label: 'Chỉ Giảng Viên' },
                { id: 'DN', label: 'Chỉ Doanh Nghiệp' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTarget(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeTarget === t.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Danh sách thông báo */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 shadow-sm">
            <span className="material-symbols-outlined text-4xl text-slate-300">notifications_off</span>
            <p className="mt-2 text-sm font-medium">Không tìm thấy thông báo nào phù hợp bộ lọc.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isRead = readIds.has(item.id)
            const isUnread = item.isNew && !isRead

            return (
              <div
                key={item.id}
                onClick={() => handleMarkSingleRead(item.id)}
                className={`bg-white p-5 rounded-2xl border transition-all shadow-sm hover:shadow-md cursor-pointer ${
                  item.ghim
                    ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200'
                    : isUnread
                    ? 'border-blue-300 bg-blue-50/15 ring-1 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Badge Ghim nếu có */}
                      {item.ghim && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                          <span className="material-symbols-outlined text-xs">push_pin</span>
                          <span>Đã ghim</span>
                        </span>
                      )}

                      {/* Badge Danh mục */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item.categoryColor}`}
                      >
                        {item.categoryLabel}
                      </span>

                      {/* Badge Đối tượng nhận */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${item.targetColor}`}
                      >
                        <span className="material-symbols-outlined text-[12px]">{item.targetIcon}</span>
                        <span>{item.targetLabel}</span>
                      </span>

                      {isUnread && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                          Chưa đọc
                        </span>
                      )}
                      <span className="text-xs text-slate-400">• {item.sender}</span>
                      <span className="text-xs text-slate-400">• {item.date}</span>
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug flex items-center gap-1.5">
                      <span>{item.title}</span>
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {item.summary}
                    </p>

                    {/* Tệp đính kèm / Link Google Drive nếu có */}
                    {item.attachment && (() => {
                      const rawUrl = item.attachment.trim()
                      const finalUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
                        ? rawUrl
                        : `https://${rawUrl}`
                      const isDrive = finalUrl.includes('drive.google.com') || finalUrl.includes('docs.google.com')

                      return (
                        <div className="pt-2">
                          <a
                            href={finalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-2xs border ${
                              isDrive
                                ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span className={`material-symbols-outlined text-base ${isDrive ? 'text-blue-600' : 'text-rose-600'}`}>
                              {isDrive ? 'cloud_download' : 'description'}
                            </span>
                            <span className="underline truncate max-w-xs sm:max-w-md">
                              {isDrive ? 'Mở tài liệu đính kèm (Google Drive)' : item.attachment}
                            </span>
                            <span className="material-symbols-outlined text-[14px] text-slate-400">
                              open_in_new
                            </span>
                          </a>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Nút hành động nhanh nếu có */}
                  {item.actionLink && (
                    <div className="shrink-0 self-start md:self-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(item.actionLink)
                        }}
                        className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                      >
                        <span>{item.actionText}</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal Đăng Thông Báo Mới (Dành cho Cán bộ Khoa / Quản trị) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[19px]">campaign</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Đăng Thông Báo Mới</h3>
                  <p className="text-[11px] text-slate-400">Gửi thông báo tới các đối tượng trong đợt thực tập</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNoticeSubmit} className="space-y-3.5 text-xs">
              {/* Chọn đối tượng nhận */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Gửi thông báo cho ai? (Đối tượng nhận) <span className="text-rose-500">*</span>:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ALL', label: 'Toàn Khoa (Tất cả)', icon: 'groups' },
                    { id: 'SV', label: 'Chỉ Sinh Viên', icon: 'school' },
                    { id: 'GV', label: 'Chỉ Giảng Viên HD', icon: 'person_apron' },
                    { id: 'DN', label: 'Chỉ Doanh Nghiệp', icon: 'corporate_fare' },
                  ].map((target) => (
                    <label
                      key={target.id}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                        newNotice.doiTuong === target.id
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold shadow-2xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="doiTuong"
                        value={target.id}
                        checked={newNotice.doiTuong === target.id}
                        onChange={(e) => setNewNotice({ ...newNotice, doiTuong: e.target.value })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="material-symbols-outlined text-[17px] text-slate-500">{target.icon}</span>
                      <span className="text-[11px]">{target.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Loại thông báo (Danh mục) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Danh mục thông báo:</label>
                <select
                  value={newNotice.loaiThongBao}
                  onChange={(e) => setNewNotice({ ...newNotice, loaiThongBao: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                >
                  <option value="Chung">📌 Thông báo chung</option>
                  <option value="KeHoach">📅 Kế hoạch & Lịch trình (Hạn chót)</option>
                  <option value="BieuMau">📋 Biểu mẫu & Hướng dẫn thực tập</option>
                  <option value="KhanCap">🚨 Khẩn cấp / Quan trọng</option>
                </select>
              </div>

              {/* Tiêu đề */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Tiêu đề thông báo <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={newNotice.tieuDe}
                  onChange={(e) => setNewNotice({ ...newNotice, tieuDe: e.target.value })}
                  placeholder="Nhập tiêu đề thông báo (tối đa 200 ký tự)..."
                  required
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              {/* Nội dung */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nội dung chi tiết <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={4}
                  value={newNotice.noiDung}
                  onChange={(e) => setNewNotice({ ...newNotice, noiDung: e.target.value })}
                  placeholder="Nhập nội dung thông báo gửi đến đối tượng đã chọn..."
                  required
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              {/* Tệp đính kèm / Liên kết Google Drive */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Liên kết tài liệu / Google Drive (Tùy chọn):
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    add_link
                  </span>
                  <input
                    type="text"
                    value={newNotice.tepDinhKem}
                    onChange={(e) => setNewNotice({ ...newNotice, tepDinhKem: e.target.value })}
                    placeholder="Dán link Google Drive chia sẻ (VD: https://drive.google.com/file/d/...)"
                    className="w-full pl-9 pr-3 h-10 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 <em>Mẹo: Khi dùng link Google Drive, vui lòng chọn quyền chia sẻ &quot;Bất kỳ ai có đường liên kết đều có thể xem&quot;.</em>
                </p>
              </div>

              {/* Ghim lên đầu trang */}
              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newNotice.ghim}
                    onChange={(e) => setNewNotice({ ...newNotice, ghim: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="font-semibold text-slate-800">
                    📌 Ghim thông báo này lên đầu bảng tin
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
                >
                  {sending ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>Đăng thông báo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
