import { useMemo } from 'react'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'

export default function LichDeadlinePage() {
  const { selectedDot, danhSachDot, changeDot } = useDotThucTap()

  // Mốc thời gian 12 tuần được tính chuẩn từ thời gian bắt đầu của đợt
  const timelineWeeks = useMemo(() => {
    // Ngày bắt đầu mặc định của Đợt 2: 14/09/2026
    const baseDate = new Date(2026, 8, 14) // Tháng 9 (0-indexed: 8)
    const weeks = []

    for (let i = 1; i <= 12; i++) {
      const startDate = new Date(baseDate)
      startDate.setDate(baseDate.getDate() + (i - 1) * 7)

      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)

      const deadlineNop = new Date(endDate) // Hạn nộp là Chủ nhật cuối tuần

      // Xác định trạng thái tuần dựa theo thời điểm giả lập hiện tại (Tháng 10/2026 ~ Tuần 4 - Tuần 5)
      let status = 'ChuaDienRa'
      if (i < 4) status = 'DaKetThuc'
      else if (i === 4 || i === 5) status = 'DangDienRa'

      weeks.push({
        tuan: i,
        startDate: startDate.toLocaleDateString('vi-VN'),
        endDate: endDate.toLocaleDateString('vi-VN'),
        deadlineNop: deadlineNop.toLocaleDateString('vi-VN') + ' 23:59',
        chuDe: getChuDeTuan(i),
        status,
      })
    }
    return weeks
  }, [selectedDot])

  function getChuDeTuan(tuan) {
    switch (tuan) {
      case 1:
        return 'Tiếp nhận đơn vị, làm quen văn hóa doanh nghiệp, khảo sát quy trình'
      case 2:
        return 'Tìm hiểu bài toán thực tế, nghiên cứu tài liệu kỹ thuật & công nghệ'
      case 3:
        return 'Phân tích yêu cầu bài toán, lập kế hoạch thiết kế kiến trúc phần mềm'
      case 4:
        return 'Thiết kế cơ sở dữ liệu, API & giao diện mẫu ban đầu'
      case 5:
        return 'Lập trình phân hệ chức năng 1, viết Unit Test cho dịch vụ backend'
      case 6:
        return 'Kiểm tra tiến độ giữa kỳ với Doanh nghiệp & Giảng viên hướng dẫn'
      case 7:
        return 'Lập trình phân hệ chức năng 2 & tích hợp giao diện người dùng'
      case 8:
        return 'Tối ưu hóa mã nguồn, xử lý ngoại lệ và kiểm thử tích hợp (Integration Test)'
      case 9:
        return 'Triển khai thử nghiệm lên môi trường Staging, thu thập phản hồi khách hàng'
      case 10:
        return 'Hoàn thiện sản phẩm, viết tài liệu kỹ thuật & hướng dẫn sử dụng'
      case 11:
        return 'Xin nhận xét & phiếu đánh giá kết quả từ Cán bộ hướng dẫn Doanh nghiệp'
      case 12:
        return 'Tổng kết thực tập, nộp báo cáo hoàn chỉnh & bảo vệ kết quả trước GVHD'
      default:
        return 'Thực hiện nhiệm vụ chuyên môn theo phân công'
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Trang */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Khoa Công nghệ thông tin</span>
            <span>•</span>
            <span className="text-blue-600 font-bold">Kế hoạch đào tạo thực tập</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Lịch Trình & Deadline Đợt Thực Tập
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {selectedDot?.tenDot || 'Đợt 2 năm 2026'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quy chế đào tạo thực tập doanh nghiệp 12 tuần liên tục theo chuẩn ABET / AUN-QA Khoa CNTT - HUIT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Đổi đợt xem:</span>
          <select
            value={selectedDot?.maDot}
            onChange={(e) => {
              const dot = danhSachDot?.flatMap((y) => y.dots).find((d) => d.maDot === e.target.value)
              if (dot) changeDot(dot)
            }}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="DOT02">Đợt 2 năm 2026 (Đang diễn ra)</option>
            <option value="DOT01">Đợt 1 năm 2026 (Đã kết thúc)</option>
          </select>
        </div>
      </div>

      {/* 2. Các mốc quan trọng của Khoa */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">event_available</span>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase">Khai mạc đợt</p>
              <p className="text-sm font-bold text-slate-900">14/09/2026</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Bắt đầu tuần tiếp nhận doanh nghiệp đầu tiên</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">hourglass_bottom</span>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase">Báo cáo giữa kỳ</p>
              <p className="text-sm font-bold text-slate-900">25/10/2026</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Cuối tuần 6: Họp đối chiếu tiến độ giữa kỳ</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">task_alt</span>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase">Hạn nộp báo cáo cuối</p>
              <p className="text-sm font-bold text-slate-900">06/12/2026</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Cuối tuần 12: Sinh viên nộp báo cáo bản chính</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">gavel</span>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium uppercase">Hạn GV chốt điểm CLO</p>
              <p className="text-sm font-bold text-slate-900">25/12/2026</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Hạn chót Khoa khóa hệ thống nhập điểm</p>
        </div>
      </div>

      {/* 3. Bảng timeline chi tiết 12 tuần */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Timeline Chi Tiết 12 Tuần Thực Tập & Hạn Nộp Định Kỳ
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Hạn nộp báo cáo tuần: <span className="font-bold text-rose-600">Chủ nhật 23:59</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-24">Tuần</th>
                <th className="py-3 px-4 w-48">Khoảng thời gian</th>
                <th className="py-3 px-4 min-w-[320px]">Nội dung & Yêu cầu trọng tâm</th>
                <th className="py-3 px-4 w-44">Hạn nộp của Sinh viên</th>
                <th className="py-3 px-4 w-36 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timelineWeeks.map((w) => (
                <tr
                  key={w.tuan}
                  className={`hover:bg-slate-50/70 transition-colors ${
                    w.status === 'DangDienRa' ? 'bg-blue-50/30 font-medium' : ''
                  }`}
                >
                  <td className="py-3.5 px-4 font-bold align-top">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg ${
                        w.status === 'DangDienRa'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Tuần {w.tuan}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 align-top">
                    {w.startDate} — {w.endDate}
                  </td>
                  <td className="py-3.5 px-4 text-slate-800 align-top leading-relaxed">
                    {w.chuDe}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono align-top">
                    {w.deadlineNop}
                  </td>
                  <td className="py-3.5 px-4 text-center align-top">
                    {w.status === 'DaKetThuc' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        Đã qua
                      </span>
                    ) : w.status === 'DangDienRa' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                        Đang diễn ra
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Sắp tới
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
