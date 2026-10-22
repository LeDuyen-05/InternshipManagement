import { useState } from 'react'

export default function TaoThongBaoModal({ isOpen, onClose, onCreated, selectedDot }) {
  const [tieuDe, setTieuDe] = useState('')
  const [doiTuong, setDoiTuong] = useState('ALL') // 'ALL' | 'GiangVien' | 'SinhVien'
  const [danhMuc, setDanhMuc] = useState('KHAN_CAP')
  const [nguoiGui, setNguoiGui] = useState('Văn phòng Khoa CNTT')
  const [noiDung, setNoiDung] = useState('')
  
  // Tài liệu đính kèm qua Google Drive / OneDrive
  const [driveTitle, setDriveTitle] = useState('')
  const [driveLink, setDriveLink] = useState('')
  
  const [actionLink, setActionLink] = useState('')
  const [actionText, setActionText] = useState('')
  const [isKhanCap, setIsKhanCap] = useState(false)

  if (!isOpen) return null

  const categoryPresets = [
    { key: 'KHAN_CAP', label: 'Khẩn cấp / Học vụ', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { key: 'TIEN_DO', label: 'Tiến độ báo cáo 12 tuần', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'BIEU_MAU', label: 'Biểu mẫu BM-KD-08', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'DOANH_NGHIEP', label: 'Doanh nghiệp đối tác', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'HOI_DONG', label: 'Hội đồng nghiệm thu', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ]

  const actionLinkPresets = [
    { label: '-- Không có liên kết nhanh --', link: '', text: '' },
    { label: 'Chấm điểm CLO (Giảng viên)', link: '/giang-vien/cham-diem', text: 'Vào chấm điểm CLO' },
    { label: 'Theo dõi tiến độ sinh viên (Giảng viên)', link: '/giang-vien/tien-do', text: 'Xem tiến độ SV' },
    { label: 'Phân công GVHD (Khoa)', link: '/khoa/phan-cong', text: 'Vào phân công GVHD' },
    { label: 'Duyệt công ty đề xuất (Khoa)', link: '/khoa/duyet-gioi-thieu', text: 'Vào duyệt công ty' },
    { label: 'Bảng điều khiển & Báo cáo (Sinh viên)', link: '/sinh-vien', text: 'Vào trang sinh viên' },
  ]

  const handleActionSelect = (e) => {
    const selected = actionLinkPresets.find((x) => x.link === e.target.value)
    if (selected) {
      setActionLink(selected.link)
      setActionText(selected.text)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!tieuDe.trim()) return alert('Vui lòng nhập tiêu đề thông báo.')
    if (!noiDung.trim()) return alert('Vui lòng nhập nội dung thông báo.')

    const matchedCategory = categoryPresets.find((c) => c.key === danhMuc) || categoryPresets[0]

    let attachment = null
    let attachmentUrl = null
    let attachmentSize = null

    if (driveLink.trim()) {
      attachment = driveTitle.trim() || 'Tài liệu / biểu mẫu đính kèm'
      attachmentUrl = driveLink.trim()
      attachmentSize = 'Google Drive'
    }

    const newNotification = {
      id: Date.now(),
      title: isKhanCap && !tieuDe.startsWith('[KHẨN]') ? `[KHẨN] ${tieuDe.trim()}` : tieuDe.trim(),
      sender: nguoiGui.trim() || 'Văn phòng Khoa CNTT',
      date: 'Vừa xong • Hôm nay',
      category: danhMuc,
      categoryLabel: matchedCategory.label,
      categoryColor: isKhanCap ? 'bg-rose-50 text-rose-700 border-rose-200' : matchedCategory.color,
      summary: noiDung.trim(),
      attachment,
      attachmentUrl,
      attachmentSize,
      actionLink: actionLink || null,
      actionText: actionText || (actionLink ? 'Xem chi tiết' : null),
      isNew: true,
      doiTuong, // 'ALL', 'GiangVien', 'SinhVien'
      isCustomCreated: true,
      maDot: selectedDot?.maDot || 'DOT01',
    }

    onCreated(newNotification)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 p-4 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <header className="p-5 bg-blue-700 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">campaign</span>
            </div>
            <div>
              <h2 className="font-bold text-base md:text-lg">Tạo và Phát Hành Thông Báo Mới</h2>
              <p className="text-xs text-blue-100">Cổng điều hành Cán bộ Khoa • {selectedDot?.tenDot || 'Đợt thực tập'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-white/80 hover:text-white transition-opacity cursor-pointer"
          >
            ×
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* Đối tượng nhận */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
              Đối tượng nhận thông báo <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'ALL', label: 'Tất cả (GV & SV)', icon: 'groups' },
                { value: 'GiangVien', label: 'Chỉ Giảng viên', icon: 'person' },
                { value: 'SinhVien', label: 'Chỉ Sinh viên', icon: 'school' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDoiTuong(opt.value)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    doiTuong === opt.value
                      ? 'bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tiêu đề & Cờ khẩn cấp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase text-slate-600">
                Tiêu đề thông báo <span className="text-rose-500">*</span>
              </label>
              <label className="flex items-center gap-1 text-xs font-semibold text-rose-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isKhanCap}
                  onChange={(e) => setIsKhanCap(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                Đánh dấu là [KHẨN CẤP]
              </label>
            </div>
            <input
              type="text"
              required
              value={tieuDe}
              onChange={(e) => setTieuDe(e.target.value)}
              placeholder="VD: Kế hoạch nghiệm thu & Hạn chót hoàn tất chấm điểm chuẩn CLO..."
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Phân loại & Đơn vị gửi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                Danh mục / Nhóm
              </label>
              <select
                value={danhMuc}
                onChange={(e) => setDanhMuc(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {categoryPresets.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                Đơn vị ban hành
              </label>
              <select
                value={nguoiGui}
                onChange={(e) => setNguoiGui(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Văn phòng Khoa CNTT">Văn phòng Khoa CNTT</option>
                <option value="Ban Chủ nhiệm Khoa CNTT">Ban Chủ nhiệm Khoa CNTT</option>
                <option value="Hội đồng chuyên môn Khoa">Hội đồng chuyên môn Khoa</option>
                <option value="Tổ Giáo vụ & Học vụ Khoa">Tổ Giáo vụ & Học vụ Khoa</option>
                <option value="Tổ Hợp tác Doanh nghiệp">Tổ Hợp tác Doanh nghiệp</option>
              </select>
            </div>
          </div>

          {/* Nội dung chi tiết */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
              Nội dung thông báo <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows="4"
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              placeholder="Nhập nội dung thông báo chi tiết gửi đến Giảng viên / Sinh viên..."
              className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Tài liệu / Biểu mẫu đính kèm (Google Drive / OneDrive) */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3">
            <label className="text-xs font-bold uppercase text-slate-700 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-blue-600">link</span>
              <span>Tài liệu / Biểu mẫu đính kèm (Google Drive / OneDrive)</span>
            </label>

            <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên tài liệu / biểu mẫu (tùy chọn)
                </label>
                <input
                  type="text"
                  value={driveTitle}
                  onChange={(e) => setDriveTitle(e.target.value)}
                  placeholder="VD: Ke_Hoach_Thuc_Tap_Dot_2.pdf hoặc BM_KD_08_FIT.docx"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đường dẫn liên kết (URL Google Drive / OneDrive)
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    link
                  </span>
                  <input
                    type="url"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/... hoặc https://1drv.ms/..."
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Liên kết hành động nhanh */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
              Liên kết hành động nhanh (tùy chọn)
            </label>
            <select
              value={actionLink}
              onChange={handleActionSelect}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {actionLinkPresets.map((p, i) => (
                <option key={i} value={p.link}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">send</span>
              <span>Đăng &amp; Phát hành thông báo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
