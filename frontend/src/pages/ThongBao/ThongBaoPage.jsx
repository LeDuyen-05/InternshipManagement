import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'

export default function ThongBaoPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedDot } = useDotThucTap()

  // Tự động nhận diện Role từ URL path
  const currentRole = location.pathname.startsWith('/khoa')
    ? 'Khoa'
    : location.pathname.startsWith('/sinh-vien')
    ? 'SinhVien'
    : 'GiangVien'

  const [activeCategory, setActiveCategory] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [readIds, setReadIds] = useState(new Set())
  const [toastMessage, setToastMessage] = useState('')

  // 1. KHO DỮ LIỆU THÔNG BÁO CHUẨN XÁC THEO TỪNG VAI TRÒ
  const databaseByRole = {
    // ----------------------------------------------------
    // ROLE: GIẢNG VIÊN
    // ----------------------------------------------------
    GiangVien: {
      title: 'Bảng Tin Thông Báo Giảng Viên',
      subtitle: 'Kế hoạch học vụ, hạn chót báo cáo 12 tuần và đánh giá chuẩn đầu ra CLO Khoa CNTT',
      categories: [
        { key: 'ALL', label: 'Tất cả' },
        { key: 'KHAN_CAP', label: 'Khẩn cấp / Học vụ' },
        { key: 'TIEN_DO', label: 'Tiến độ sinh viên' },
        { key: 'BIEU_MAU', label: 'Biểu mẫu BM-KD-08' },
        { key: 'DOANH_NGHIEP', label: 'Doanh nghiệp đối tác' },
      ],
      list: [
        {
          id: 101,
          title: '[KHẨN] Kế hoạch nghiệm thu & Hạn chót hoàn tất chấm điểm chuẩn đầu ra CLO Đợt 1',
          sender: 'Văn phòng Khoa CNTT',
          date: '10:30 • Hôm nay',
          category: 'KHAN_CAP',
          categoryLabel: 'Khẩn cấp / Học vụ',
          categoryColor: 'bg-rose-50 text-rose-700 border-rose-200',
          summary:
            'Căn cứ tiến độ đào tạo năm học 2026-2027 (chuẩn 12 tuần thực tập HUIT), Ban Chủ nhiệm Khoa đề nghị tất cả Giảng viên hướng dẫn hoàn thành việc đánh giá kết quả thực tập theo 4 tiêu chuẩn CLO trước 17h00 ngày 15/01/2027.',
          attachment: 'Ke_Hoach_Cham_Diem_CLO_HK1_2026.pdf',
          attachmentSize: '450 KB',
          actionLink: '/giang-vien/cham-diem',
          actionText: 'Vào chấm điểm CLO',
          isNew: true,
        },
        {
          id: 102,
          title: 'Sinh viên Phạm Minh Đức (SV001) vừa nộp Báo cáo tiến độ tuần 9',
          sender: 'Hệ thống Quản lý Thực tập',
          date: '08:15 • Hôm nay',
          category: 'TIEN_DO',
          categoryLabel: 'Tiến độ sinh viên',
          categoryColor: 'bg-amber-50 text-amber-700 border-amber-200',
          summary:
            'Sinh viên Phạm Minh Đức (SV001 - Lớp CNTT01) tại FPT Software đã hoàn thành cập nhật báo cáo tuần 9: "Hoàn thiện API xác thực và viết tài liệu kỹ thuật sprint 3". Giảng viên vui lòng xem xét và phản hồi.',
          attachment: null,
          actionLink: '/giang-vien/tien-do?sv=SV001',
          actionText: 'Duyệt báo cáo tuần',
          isNew: true,
        },
        {
          id: 103,
          title: 'Ban hành biểu mẫu BM-KD-08/FIT phục vụ đánh giá thực tập 12 tuần HUIT',
          sender: 'Hội đồng chuyên môn Khoa',
          date: '14:15 • 28/09/2026',
          category: 'BIEU_MAU',
          categoryLabel: 'Biểu mẫu BM-KD-08',
          categoryColor: 'bg-blue-50 text-blue-700 border-blue-200',
          summary:
            'Áp dụng quy chuẩn đánh giá ABET CAC & AUN-QA cho sinh viên thực tập tốt nghiệp. Giảng viên sử dụng biểu mẫu điện tử trực tiếp trên FIT Portal hoặc xuất phiếu điểm PDF có chữ ký số xác thực.',
          attachment: 'BM_KD_08_Phieu_Danh_Gia_Thuc_Tap_HUIT.docx',
          attachmentSize: '1.2 MB',
          actionLink: '/giang-vien/cham-diem',
          actionText: 'Xem biểu mẫu PDF',
          isNew: false,
        },
        {
          id: 104,
          title: 'Thông báo kết quả tiếp nhận doanh nghiệp liên kết và chỉ tiêu thực tập đợt 1',
          sender: 'Tổ Hợp tác Doanh nghiệp',
          date: '08:00 • 15/09/2026',
          category: 'DOANH_NGHIEP',
          categoryLabel: 'Doanh nghiệp đối tác',
          categoryColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          summary:
            'Danh sách 15 đối tác chiến lược (FPT Software, Viettel Telecom, VNG...) đã tiếp nhận sinh viên thực tập khóa 2021. Đề nghị các GVHD liên hệ mentor doanh nghiệp để nắm bắt tình hình rèn luyện của sinh viên.',
          attachment: 'Danh_Sach_DN_Tiep_Nhan_2026.xlsx',
          attachmentSize: '890 KB',
          actionLink: '/giang-vien/gioi-thieu',
          actionText: 'Đề xuất thêm DN',
          isNew: false,
        },
      ],
    },

    // ----------------------------------------------------
    // ROLE: CÁN BỘ KHOA
    // ----------------------------------------------------
    Khoa: {
      title: 'Bảng Tin Điều Hành & Quản Lý Thông Báo Khoa',
      subtitle: 'Giám sát phân công GVHD, thẩm định đề xuất doanh nghiệp và điều hành đợt thực tập',
      categories: [
        { key: 'ALL', label: 'Tất cả' },
        { key: 'PHE_DUYET', label: 'Phê duyệt đề xuất' },
        { key: 'PHAN_CONG', label: 'Điều phối & Phân công' },
        { key: 'GIAM_SAT', label: 'Giám sát tiến độ' },
        { key: 'HOI_DONG', label: 'Hội đồng nghiệm thu' },
      ],
      list: [
        {
          id: 201,
          title: '[CHỜ DUYỆT] ThS. Nguyễn Văn An gửi đề xuất kết nối Doanh nghiệp: FPT Software',
          sender: 'Cổng Giảng Viên (GV001)',
          date: '09:20 • Hôm nay',
          category: 'PHE_DUYET',
          categoryLabel: 'Phê duyệt đề xuất',
          categoryColor: 'bg-blue-50 text-blue-700 border-blue-200',
          summary:
            'Hồ sơ đề xuất hợp tác doanh nghiệp FPT Software (.NET/ReactJS, chỉ tiêu tiếp nhận: 10 SV) đã được nộp. Cán bộ Khoa vui lòng thẩm định thông tin pháp lý và phê duyệt đưa vào danh sách đợt thực tập.',
          attachment: 'Ho_So_Doanh_Nghiep_FPT_Software.pdf',
          attachmentSize: '2.1 MB',
          actionLink: '/khoa/duyet-gioi-thieu',
          actionText: 'Vào duyệt đề xuất',
          isNew: true,
        },
        {
          id: 202,
          title: '[CẢNH BÁO] Còn 2 sinh viên (SV002, SV003) chưa được phân công GVHD trong đợt',
          sender: 'Ban Thư ký Giáo vụ Khoa',
          date: '15:45 • Hôm qua',
          category: 'PHAN_CONG',
          categoryLabel: 'Điều phối & Phân công',
          categoryColor: 'bg-rose-50 text-rose-700 border-rose-200',
          summary:
            'Sinh viên Nguyễn Thu Hà (SV002) và Võ Thanh Huy (SV003) đang ở trạng thái Chờ phân công. Giảng viên ThS. Nguyễn Văn An hiện có tải 1/10 SV, TS. Trần Thị Bình tải 0/10 SV. Đề nghị Cán bộ Khoa hoàn tất điều phối.',
          attachment: null,
          actionLink: '/khoa/phan-cong',
          actionText: 'Phân công ngay',
          isNew: true,
        },
        {
          id: 203,
          title: 'Báo cáo thống kê tiến độ nộp báo cáo 12 tuần của sinh viên khóa 2021 đạt 91.5%',
          sender: 'Tổ Đảm bảo Chất lượng Đào tạo',
          date: '11:00 • 04/10/2026',
          category: 'GIAM_SAT',
          categoryLabel: 'Giám sát tiến độ',
          categoryColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          summary:
            'Hệ thống ghi nhận 100% sinh viên đã được doanh nghiệp tiếp nhận thực tập. Tỷ lệ giảng viên phê duyệt báo cáo tuần đúng hạn đạt 95.2%.',
          attachment: 'Bao_Cao_Tien_Do_Tuan_FIT_HUIT.xlsx',
          attachmentSize: '750 KB',
          actionLink: '/khoa/phan-cong',
          actionText: 'Xem danh sách GV',
          isNew: false,
        },
        {
          id: 204,
          title: 'Quyết định thành lập Hội đồng chấm báo cáo thực tập tốt nghiệp cuối khóa',
          sender: 'Ban Chủ nhiệm Khoa CNTT',
          date: '08:30 • 01/10/2026',
          category: 'HOI_DONG',
          categoryLabel: 'Hội đồng nghiệm thu',
          categoryColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          summary:
            'Kế hoạch bảo vệ trước Hội đồng phản biện Khoa dự kiến tổ chức vào tuần thứ 13 sau khi kết thúc 12 tuần thực tập doanh nghiệp. Danh sách các tiểu ban phản biện đính kèm văn bản.',
          attachment: 'Quyet_Dinh_Hoi_Dong_Cham_TTTN_2026.pdf',
          attachmentSize: '1.4 MB',
          actionLink: null,
          actionText: null,
          isNew: false,
        },
      ],
    },

    // ----------------------------------------------------
    // ROLE: SINH VIÊN
    // ----------------------------------------------------
    SinhVien: {
      title: 'Bảng Tin Thông Báo Sinh Viên Thực Tập',
      subtitle: 'Theo dõi phân công GVHD, lịch nộp báo cáo 12 tuần và tài liệu biểu mẫu HUIT',
      categories: [
        { key: 'ALL', label: 'Tất cả' },
        { key: 'GVHD', label: 'Giảng viên hướng dẫn' },
        { key: 'TIEN_DO', label: 'Báo cáo 12 tuần' },
        { key: 'DOANH_NGHIEP', label: 'Tuyển dụng & Doanh nghiệp' },
        { key: 'BIEU_MAU', label: 'Biểu mẫu & Hướng dẫn' },
      ],
      list: [
        {
          id: 301,
          title: '[QUAN TRỌNG] Bạn đã được phân công Giảng viên hướng dẫn: ThS. Nguyễn Văn An',
          sender: 'Văn phòng Khoa CNTT',
          date: '16:00 • Hôm qua',
          category: 'GVHD',
          categoryLabel: 'Giảng viên hướng dẫn',
          categoryColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          summary:
            'Khoa CNTT - HUIT đã hoàn tất phân công GVHD đợt 1. Bạn được ThS. Nguyễn Văn An (Bộ môn CNPM) phụ trách theo dõi và đánh giá CLO. Vui lòng liên hệ GVHD và nộp báo cáo tuần đúng hạn.',
          attachment: null,
          actionLink: '/sinh-vien',
          actionText: 'Xem thông tin GVHD',
          isNew: true,
        },
        {
          id: 302,
          title: '[NHẮC NHỞ] Hạn chót nộp Báo cáo tiến độ tuần theo quy chế 12 tuần HUIT',
          sender: 'Cổng Thông Tin Đào Tạo HUIT',
          date: '07:00 • Hôm nay',
          category: 'TIEN_DO',
          categoryLabel: 'Báo cáo 12 tuần',
          categoryColor: 'bg-amber-50 text-amber-700 border-amber-200',
          summary:
            'Hệ thống mở cổng nộp nhật ký công việc định kỳ vào thứ Bảy hàng tuần. Sinh viên nộp trễ quá 2 tuần sẽ bị trừ điểm tiêu chuẩn CLO 3 (Kỷ luật & thái độ làm việc).',
          attachment: null,
          actionLink: '/sinh-vien',
          actionText: 'Nộp báo cáo tuần',
          isNew: true,
        },
        {
          id: 303,
          title: 'Hướng dẫn viết Báo cáo tổng kết và chuẩn bị hồ sơ minh chứng BM-KD-08/FIT',
          sender: 'Tổ Chuyên Môn Khoa CNTT',
          date: '13:30 • 25/09/2026',
          category: 'BIEU_MAU',
          categoryLabel: 'Biểu mẫu & Hướng dẫn',
          categoryColor: 'bg-blue-50 text-blue-700 border-blue-200',
          summary:
            'Tài liệu hướng dẫn sinh viên cấu trúc cuốn báo cáo thực tập tốt nghiệp: Phần giới thiệu công ty, quy trình công nghệ, sản phẩm đạt được, nhận xét của người hướng dẫn doanh nghiệp và tự đánh giá chuẩn CLO.',
          attachment: 'Huong_Dan_Viet_Bao_Cao_TTTN_HUIT.pdf',
          attachmentSize: '3.5 MB',
          actionLink: '/sinh-vien',
          actionText: 'Tải tài liệu hướng dẫn',
          isNew: false,
        },
        {
          id: 304,
          title: 'Thông báo tiếp nhận thực tập tại FPT Software, Viettel Telecom và VNG',
          sender: 'Tổ Hợp tác Doanh nghiệp',
          date: '09:15 • 12/09/2026',
          category: 'DOANH_NGHIEP',
          categoryLabel: 'Tuyển dụng & Doanh nghiệp',
          categoryColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          summary:
            'Sinh viên đã trúng tuyển thực tập sinh cần liên hệ nhân sự công ty để nhận thẻ ra vào và hoàn thành thủ tục đăng ký thực tập tốt nghiệp trên hệ thống FIT Portal.',
          attachment: 'Danh_Sach_Sinh_Vien_Trung_Tuyen_DN.pdf',
          attachmentSize: '820 KB',
          actionLink: '/sinh-vien',
          actionText: 'Kiểm tra trạng thái',
          isNew: false,
        },
      ],
    },
  }

  const roleConfig = databaseByRole[currentRole] || databaseByRole.GiangVien

  const handleMarkAllRead = () => {
    const allIds = new Set(roleConfig.list.map((n) => n.id))
    setReadIds(allIds)
    setToastMessage('Đã đánh dấu tất cả thông báo trong hộp thư là đã đọc!')
    setTimeout(() => setToastMessage(''), 4000)
  }

  const handleMarkSingleRead = (id) => {
    setReadIds((prev) => new Set([...prev, id]))
  }

  const filtered = roleConfig.list.filter((item) => {
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
              <h1 className="text-xl font-bold text-slate-900">{roleConfig.title}</h1>
              <p className="text-sm text-slate-500">{roleConfig.subtitle}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleMarkAllRead}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer border border-slate-200 shadow-xs"
        >
          <span className="material-symbols-outlined text-base text-blue-600">done_all</span>
          <span>Đánh dấu đã đọc tất cả</span>
        </button>
      </div>

      {/* Thông báo thành công nếu có */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between shadow-xs animate-fadeIn">
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
        {/* Tabs Danh mục chuyên biệt theo Role */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {roleConfig.categories.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveCategory(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeCategory === tab.key
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 shadow-xs">
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
                className={`bg-white p-5 rounded-2xl border transition-all shadow-xs hover:shadow-md cursor-pointer ${
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
                        className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
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
    </div>
  )
}
