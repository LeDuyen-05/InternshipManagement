import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { phongVanService } from '../../services/phongVanService'
import { tienDoThucTapService } from '../../services/tienDoThucTapService'
import { hoSoNangLucService } from '../../services/hoSoNangLucService'

export default function DashboardSinhVienPage() {
  const { user } = useAuth()
  const currentMaSV = user?.maSV || (user?.tenDangNhap?.toLowerCase().startsWith('sv') ? user.tenDangNhap.toUpperCase() : 'SV001')

  const [profile, setProfile] = useState(null)
  const [placement, setPlacement] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [profData, pbData, repData] = await Promise.all([
          hoSoNangLucService.getHoSoBySinhVien(currentMaSV),
          phongVanService.getPhanBoThucTap(currentMaSV),
          tienDoThucTapService.getTienDoBySinhVien(currentMaSV),
        ])
        setProfile(profData || null)
        setPlacement(pbData || null)
        setReports(repData || [])
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu bảng điều khiển:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentMaSV])

  const approvedReports = reports.filter((r) => r.trangThaiDuyet === 'DaDuyet').length
  const pendingReports = reports.filter((r) => r.trangThaiDuyet === 'DaNop' || r.trangThaiDuyet === 'ChoDuyet').length

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            HỆ THỐNG QUẢN LÝ THỰC TẬP TỐT NGHIỆP • KHOA CNTT
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Bảng Điều Khiển Sinh Viên
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Chào mừng {profile?.hoTen || user?.hoTen || user?.tenDangNhap || 'Sinh viên'} (MSSV: {currentMaSV}) trở lại cổng thông tin thực tập.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/sinh-vien/tien-do"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">post_add</span>
            Nộp báo cáo tuần mới
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500 font-medium">Đang tải bảng điều khiển...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Hero: Corporate Placement & Academic Advisor Box */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row gap-6 justify-between items-stretch">
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    Đợt 1 năm 2026 • Đang thực tập
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Mã PB: {placement?.maPhanBo || 'PB001'}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {placement?.tenCongTy || 'Công ty TNHH FPT Software'}
                </h2>
                <div className="text-sm font-semibold text-blue-700 mt-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">work</span>
                  {placement?.viTriTuyen || 'Lập trình viên Web Fullstack'}
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-normal">
                    {placement?.thoiGianThucTap || 'Từ 14/09/2026 đến 25/12/2026'}
                  </span>
                </div>
              </div>

              {/* Advisors grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">school</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      GV Hướng Dẫn Khoa
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {placement?.giangVienHD ? `TS. ${placement.giangVienHD}` : 'TS. Nguyễn Văn An'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {placement?.chuyenMonGV || 'Công nghệ phần mềm'}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Cố Vấn Doanh Nghiệp (Mentor)
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {placement?.mentorDoanhNghiep || 'Nguyễn Hoàng Long'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {placement?.chucVuMentor || 'Team Leader'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Summary Card */}
            <div className="xl:w-80 w-full p-5 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-xl flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-xs font-bold uppercase tracking-wider">Môi trường thực tập</span>
                <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
              </div>
              <div className="my-4">
                <div className="text-sm font-semibold text-white">Khu Công Nghệ Cao, TP. Thủ Đức</div>
                <div className="text-xs text-blue-200 mt-1">Chế độ: Onsite & Dự án thực tế</div>
                <div className="text-xs text-emerald-300 font-semibold mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">verified</span> Hợp đồng liên kết FIT-FSOFT
                </div>
              </div>
              <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
                <span>Trạng thái hồ sơ:</span>
                <span className="text-emerald-400 font-bold">Hợp lệ ✓</span>
              </div>
            </div>
          </div>

          {/* 4 Crucial Academic KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Trạng thái đợt</span>
                <span className="material-symbols-outlined text-blue-700 text-[22px]">timelapse</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900">Tuần 5/10</div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-blue-700 h-full rounded-full" style={{ width: '50%' }}></div>
                </div>
                <div className="text-xs text-slate-500 mt-1.5">Tiến độ kỳ thực tập: 50%</div>
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Báo cáo tuần</span>
                <span className="material-symbols-outlined text-indigo-700 text-[22px]">assignment_turned_in</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-indigo-900">
                  {reports.length} <span className="text-sm font-normal text-slate-400">/ 10 tuần</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  {approvedReports} báo cáo đã duyệt • {pendingReports} chờ duyệt
                </div>
                <div className="text-xs text-slate-400 mt-1">Điểm đánh giá: 9.0/10</div>
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Đánh giá giữa kỳ</span>
                <span className="material-symbols-outlined text-amber-600 text-[22px]">event_note</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900">20/04/2026</div>
                <div className="text-xs text-amber-700 font-semibold mt-1">Sắp diễn ra</div>
                <div className="text-xs text-slate-400 mt-1">Phiếu đánh giá của Mentor doanh nghiệp</div>
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Chuẩn đầu ra (CLO)</span>
                <span className="material-symbols-outlined text-emerald-700 text-[22px]">verified</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-emerald-800">
                  85<span className="text-sm font-normal text-slate-400">/100</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">Đạt chuẩn năng lực thực tế</div>
                <div className="text-xs text-slate-400 mt-1">Đánh giá CLO-3 & CLO-4</div>
              </div>
            </div>
          </div>

          {/* 4-Phase Internship Lifecycle Tracker */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Lộ Trình 4 Giai Đoạn Thực Tập Tốt Nghiệp
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-emerald-800 mb-2">
                    <span className="text-xs font-bold uppercase">Giai đoạn 1</span>
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Hồ sơ & Đăng ký</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Cập nhật CV, chọn nguyện vọng và đề xuất đơn vị tiếp nhận.
                  </p>
                </div>
                <div className="mt-3 text-xs font-bold text-emerald-700">Đã hoàn thành ✓</div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-emerald-800 mb-2">
                    <span className="text-xs font-bold uppercase">Giai đoạn 2</span>
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Phỏng vấn & Phân bổ</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Tham gia phỏng vấn, nhận quyết định phân bổ và gán GVHD.
                  </p>
                </div>
                <div className="mt-3 text-xs font-bold text-emerald-700">Đã hoàn thành ✓</div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col justify-between shadow-2xs">
                <div>
                  <div className="flex items-center justify-between text-blue-800 mb-2">
                    <span className="text-xs font-bold uppercase">Giai đoạn 3</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Thực tập & Báo cáo</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Làm việc tại doanh nghiệp, nộp báo cáo định kỳ hàng tuần.
                  </p>
                </div>
                <div className="mt-3 text-xs font-bold text-blue-700">Đang diễn ra (Tuần 5) ⏳</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between opacity-80">
                <div>
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase">Giai đoạn 4</span>
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Nghiệm thu & Điểm</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Đánh giá kết quả từ Mentor, nộp báo cáo tổng kết và chấm điểm.
                  </p>
                </div>
                <div className="mt-3 text-xs font-semibold text-slate-400">Dự kiến tháng 12/2026</div>
              </div>
            </div>
          </div>

          {/* Quick Access Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              to="/sinh-vien/ho-so"
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">badge</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Hồ sơ năng lực
                </div>
                <div className="text-xs text-slate-500">Xem và cập nhật CV, kỹ năng</div>
              </div>
            </Link>

            <Link
              to="/sinh-vien/dang-ky"
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 group-hover:bg-indigo-700 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">apartment</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Nguyện vọng & Đề xuất
                </div>
                <div className="text-xs text-slate-500">Khám phá doanh nghiệp đối tác</div>
              </div>
            </Link>

            <Link
              to="/sinh-vien/lich-trinh"
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-3.5 group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-colors flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">event_available</span>
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Phỏng vấn & Phân bổ
                </div>
                <div className="text-xs text-slate-500">Xem lịch và kết quả tiếp nhận</div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
