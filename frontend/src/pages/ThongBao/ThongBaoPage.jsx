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
    if (location.pathname.startsWith('/khoa')) return 'Khoa'
    if (location.pathname.startsWith('/sinh-vien')) return 'SinhVien'
    return 'GiangVien'
  }

  const currentRole = determineRole()

  const [activeCategory, setActiveCategory] = useState('ALL')
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
  const [newNotice, setNewNotice] = useState({ tieuDe: '', noiDung: '' })
  const [sending, setSending] = useState(false)

  const loadServerNotifs = async () => {
    try {
      const res = await apiClient.get('/thong-bao')
      const data = Array.isArray(res.data) ? res.data : []
      setServerNotifs(data)
    } catch {
      // Bỏ qua lỗi nếu không có mạng
    }
  }

  useEffect(() => {
    loadServerNotifs()
  }, [])

  const formattedServerNotifs = serverNotifs.map((sn) => ({
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
    category: 'ALL',
    categoryLabel: 'Thông báo Khoa',
    categoryColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    summary: sn.noiDung,
    attachment: null,
    actionLink: null,
    actionText: null,
    isNew: true,
  }))

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
      })
      setShowCreateModal(false)
      setNewNotice({ tieuDe: '', noiDung: '' })
      setToastMessage('Đã đăng thông báo toàn khoa thành công!')
      setTimeout(() => setToastMessage(''), 4000)
      loadServerNotifs()
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể đăng thông báo.')
    } finally {
      setSending(false)
    }
  }

  const filtered = combinedList.filter((item) => {
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
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap bg-blue-700 text-white shadow-sm"
          >
            Tất cả thông báo ({filtered.length})
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
                  isUnread
                    ? 'border-blue-300 bg-blue-50/15 ring-1 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${item.categoryColor}`}
                      >
                        {item.categoryLabel}
                      </span>
                      {isUnread && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
                          Chưa đọc
                        </span>
                      )}
                      <span className="text-xs text-slate-400">• {item.sender}</span>
                      <span className="text-xs text-slate-400">• {item.date}</span>
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      {item.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {item.summary}
                    </p>

                    {/* Tệp đính kèm nếu có */}
                    {item.attachment && (
                      <div className="pt-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:bg-slate-100 transition">
                          <span className="material-symbols-outlined text-base text-rose-600">
                            description
                          </span>
                          <span className="font-medium underline">{item.attachment}</span>
                          <span className="text-slate-400 text-[11px]">({item.attachmentSize})</span>
                        </div>
                      </div>
                    )}
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
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[19px]">campaign</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Đăng Thông Báo Toàn Khoa</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNoticeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề thông báo:</label>
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

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nội dung chi tiết:</label>
                <textarea
                  rows={4}
                  value={newNotice.noiDung}
                  onChange={(e) => setNewNotice({ ...newNotice, noiDung: e.target.value })}
                  placeholder="Nhập nội dung thông báo gửi đến toàn thể giảng viên và sinh viên..."
                  required
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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

