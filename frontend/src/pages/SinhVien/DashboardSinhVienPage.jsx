import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useIdentity } from '../../hooks/useIdentity'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import NoLinkedAccount from '../../components/common/NoLinkedAccount'
import { phongVanService } from '../../services/phongVanService'
import { tienDoThucTapService } from '../../services/tienDoThucTapService'
import { hoSoNangLucService } from '../../services/hoSoNangLucService'
import { dangKyThucTapService } from '../../services/dangKyThucTapService'
import { phieuChamDiemService } from '../../services/phieuChamDiemService'

export default function DashboardSinhVienPage() {
  const { user, maSV: currentMaSV } = useIdentity()
  const { selectedDot } = useDotThucTap()

  const [profile, setProfile] = useState(null)
  const [placement, setPlacement] = useState(null)
  const [reports, setReports] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [phieuDiem, setPhieuDiem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentMaSV) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const [profData, pbData, repData, dkData, diemData] = await Promise.allSettled([
          hoSoNangLucService.getHoSoBySinhVien(currentMaSV),
          phongVanService.getPhanBoThucTap(currentMaSV),
          tienDoThucTapService.getTienDoBySinhVien(currentMaSV),
          dangKyThucTapService.getDangKyBySinhVien(currentMaSV),
          phieuChamDiemService.getPhieuChamBySinhVien(currentMaSV, selectedDot?.maDot),
        ])

        if (profData.status === 'fulfilled') setProfile(profData.value || null)
        if (pbData.status === 'fulfilled') setPlacement(pbData.value || null)
        if (repData.status === 'fulfilled') {
          const list = repData.value
          setReports(Array.isArray(list) ? list : (list?.data || []))
        }
        if (dkData.status === 'fulfilled') setRegistrations(dkData.value || [])
        if (diemData.status === 'fulfilled') setPhieuDiem(diemData.value?.data || diemData.value || null)
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu bảng điều khiển:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [currentMaSV, selectedDot?.maDot])

  if (!currentMaSV) {
    return <NoLinkedAccount type="sinh viên" />
  }

  const totalSlots = reports.length
  const approvedReports = reports.filter((r) => r.trangThaiDuyet === 'DaDuyet').length
  const submittedReports = reports.filter((r) => r.trangThaiDuyet === 'DaNop').length
  const percentProgress = totalSlots > 0 ? Math.round((approvedReports / totalSlots) * 100) : 0

  // Đánh giá tiến độ 4 giai đoạn
  const g1Done = Boolean(profile && registrations.length > 0)
  const g2Done = Boolean(placement)
  const g3Done = Boolean(placement && approvedReports > 0)
  const g4Done = Boolean(phieuDiem && phieuDiem.tongDiem != null)

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
            Chào mừng {profile?.hoTen || user?.hoTen || user?.tenDangNhap || 'Sinh viên'} (MSSV: {currentMaSV})
            {selectedDot ? ` • ${selectedDot.tenDot}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/sinh-vien/tien-do"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">post_add</span>
            Nộp báo cáo tiến độ
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
          {/* Hero: Placement or Empty State */}
          {placement ? (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col xl:flex-row gap-6 justify-between items-stretch">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      {selectedDot?.tenDot || 'Đang thực tập'}
                    </span>
                    {placement.maPhanBo && (
                      <span className="text-xs text-slate-400 font-mono">Mã PB: {placement.maPhanBo}</span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {placement.tenCongTy || 'Doanh nghiệp thực tập'}
                  </h2>
                  <div className="text-sm font-semibold text-blue-700 mt-1 flex flex-wrap items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">work</span>
                    {placement.viTriTuyen || 'Thực tập sinh'}
                    {placement.thoiGianThucTap && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-normal">{placement.thoiGianThucTap}</span>
                      </>
                    )}
                  </div>
                </div>

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
                        {placement.giangVienHD || 'Chưa phân công'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {placement.chuyenMonGV || 'Khoa CNTT'}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">badge</span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Cố Vấn Doanh Nghiệp
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {placement.mentorDoanhNghiep || 'Đang cập nhật'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {placement.chucVuMentor || 'Đại diện kỹ thuật'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:w-80 w-full p-5 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-xl flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-xs font-bold uppercase tracking-wider">Thông tin phân bổ</span>
                  <span className="material-symbols-outlined text-[20px]">corporate_fare</span>
                </div>
                <div className="my-4">
                  <div className="text-sm font-semibold text-white">{placement.tenCongTy}</div>
                  <div className="text-xs text-blue-200 mt-1">Vị trí: {placement.viTriTuyen || 'Thực tập sinh'}</div>
                  <div className="text-xs text-emerald-300 font-semibold mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">verified</span> Trạng thái: {placement.trangThai || 'Đã phân bổ'}
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-300">
                  <span>Mã đợt thực tập:</span>
                  <span className="text-white font-mono font-bold">{selectedDot?.maDot || placement.maDot || '—'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl">domain_disabled</span>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Chưa có quyết định phân bổ</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mt-1 mb-4">
                Bạn chưa được phân bổ vào doanh nghiệp tiếp nhận thực tập trong đợt này. Vui lòng đăng ký nguyện vọng hoặc theo dõi thông báo từ Khoa.
              </p>
              <Link
                to="/sinh-vien/dang-ky"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                <span>Xem danh sách doanh nghiệp tuyển dụng</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          )}

          {/* Academic KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Tiến độ báo cáo</span>
                <span className="material-symbols-outlined text-blue-700 text-[22px]">timelapse</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900">
                  {approvedReports} <span className="text-sm font-normal text-slate-400">/ {totalSlots} mốc</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-blue-700 h-full rounded-full transition-all" style={{ width: `${percentProgress}%` }}></div>
                </div>
                <div className="text-xs text-slate-500 mt-1.5">Tỷ lệ hoàn thành: {percentProgress}%</div>
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Trạng thái nộp</span>
                <span className="material-symbols-outlined text-indigo-700 text-[22px]">assignment_turned_in</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-indigo-900">
                  {submittedReports} <span className="text-sm font-normal text-slate-400">chờ duyệt</span>
                </div>
                <div className="text-xs text-emerald-600 font-semibold mt-1">
                  {approvedReports} báo cáo đã phê duyệt
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {totalSlots === 0 ? 'Chưa có mốc tiến độ' : `${totalSlots - approvedReports - submittedReports} mốc chưa nộp`}
                </div>
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Nguyện vọng đăng ký</span>
                <span className="material-symbols-outlined text-amber-600 text-[22px]">how_to_vote</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-slate-900">
                  {registrations.length} <span className="text-sm font-normal text-slate-400">/ 3</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {registrations.some((r) => r.trangThai === 'DaDuyet')
                    ? 'Đã được duyệt 1 nguyện vọng ✓'
                    : 'Chưa có nguyện vọng được duyệt'}
                </div>
                <div className="text-xs text-slate-400 mt-1">Tối đa 3 nguyện vọng/đợt</div>
              </div>
            </div>

            <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Điểm đánh giá (CLO)</span>
                <span className="material-symbols-outlined text-emerald-700 text-[22px]">verified</span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-emerald-800">
                  {phieuDiem?.tongDiem != null ? `${Number(phieuDiem.tongDiem).toFixed(2)}` : '—'}
                  {phieuDiem?.tongDiem != null && <span className="text-sm font-normal text-slate-400">/10</span>}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {phieuDiem?.tongDiem != null ? 'Đã có kết quả đánh giá' : 'Chưa có điểm đánh giá'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {phieuDiem?.ngayCham ? `Ngày chấm: ${new Date(phieuDiem.ngayCham).toLocaleDateString('vi-VN')}` : 'Đánh giá cuối kỳ'}
                </div>
              </div>
            </div>
          </div>

          {/* 4-Phase Internship Lifecycle Tracker */}
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Lộ Trình 4 Giai Đoạn Thực Tập Tốt Nghiệp
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                g1Done ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className={`flex items-center justify-between mb-2 ${g1Done ? 'text-emerald-800' : 'text-slate-400'}`}>
                    <span className="text-xs font-bold uppercase">Giai đoạn 1</span>
                    <span className="material-symbols-outlined text-[20px]">{g1Done ? 'check_circle' : 'pending'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Hồ sơ & Đăng ký</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Cập nhật CV, chọn nguyện vọng và đề xuất đơn vị tiếp nhận.
                  </p>
                </div>
                <div className={`mt-3 text-xs font-bold ${g1Done ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {g1Done ? 'Đã hoàn thành ✓' : 'Đang thực hiện'}
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                g2Done ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className={`flex items-center justify-between mb-2 ${g2Done ? 'text-emerald-800' : 'text-slate-400'}`}>
                    <span className="text-xs font-bold uppercase">Giai đoạn 2</span>
                    <span className="material-symbols-outlined text-[20px]">{g2Done ? 'check_circle' : 'lock'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Phỏng vấn & Phân bổ</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Nhận quyết định phân bổ doanh nghiệp và phân công GVHD.
                  </p>
                </div>
                <div className={`mt-3 text-xs font-bold ${g2Done ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {g2Done ? 'Đã hoàn thành ✓' : 'Chưa phân bổ'}
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                g3Done ? 'bg-emerald-50/70 border-emerald-200' : g2Done ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className={`flex items-center justify-between mb-2 ${
                    g3Done ? 'text-emerald-800' : g2Done ? 'text-blue-800' : 'text-slate-400'
                  }`}>
                    <span className="text-xs font-bold uppercase">Giai đoạn 3</span>
                    <span className="material-symbols-outlined text-[20px]">{g3Done ? 'check_circle' : g2Done ? 'timelapse' : 'lock'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Thực tập & Báo cáo</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Làm việc tại doanh nghiệp, nộp báo cáo tiến độ định kỳ.
                  </p>
                </div>
                <div className={`mt-3 text-xs font-bold ${
                  g3Done ? 'text-emerald-700' : g2Done ? 'text-blue-700' : 'text-slate-400'
                }`}>
                  {g3Done ? 'Đang thực hiện tốt ✓' : g2Done ? 'Đang thực tập ⏳' : 'Chưa bắt đầu'}
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                g4Done ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className={`flex items-center justify-between mb-2 ${g4Done ? 'text-emerald-800' : 'text-slate-400'}`}>
                    <span className="text-xs font-bold uppercase">Giai đoạn 4</span>
                    <span className="material-symbols-outlined text-[20px]">{g4Done ? 'check_circle' : 'lock'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Nghiệm thu & Đánh giá</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Chấm điểm phiếu đánh giá kết quả thực tập theo chuẩn CLO.
                  </p>
                </div>
                <div className={`mt-3 text-xs font-bold ${g4Done ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {g4Done ? `Hoàn tất (${Number(phieuDiem.tongDiem).toFixed(2)}/10) ✓` : 'Chưa đánh giá'}
                </div>
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
