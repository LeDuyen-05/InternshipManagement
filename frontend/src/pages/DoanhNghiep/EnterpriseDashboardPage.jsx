import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'

// Trạng thái hợp tác do Khoa phê duyệt (CONGTY.trangThai)
const HOP_TAC = {
  DaDuyet: { label: 'Đối tác đã được Khoa CNTT phê duyệt', icon: 'verified', cls: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30' },
  ChoDuyet: { label: 'Đang chờ Khoa CNTT thẩm định', icon: 'hourglass_top', cls: 'bg-amber-500/20 text-amber-100 border-amber-400/30' },
  TuChoi: { label: 'Khoa CNTT chưa chấp thuận hợp tác', icon: 'block', cls: 'bg-rose-500/20 text-rose-100 border-rose-400/30' },
  DongBang: { label: 'Tạm ngưng hợp tác', icon: 'pause_circle', cls: 'bg-slate-500/20 text-slate-100 border-slate-400/30' },
}

export default function EnterpriseDashboardPage() {
  const { activeCompany } = useEnterprise()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      if (!activeCompany?.maCongTy) return
      try {
        setLoading(true)
        const res = await doanhNghiepService.getTongQuan(activeCompany.maCongTy)
        setData(res)
      } catch (err) {
        console.error('Lỗi lấy dữ liệu tổng quan:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [activeCompany?.maCongTy])

  const thongKe = data?.thongKe || {
    soViTriTuyen: activeCompany?.viTriTuyen ? 1 : 0,
    soLuongNhan: activeCompany?.soLuongNhan || 0,
    soUngVien: 0,
    soChoDuyet: 0,
    soDaDuyet: 0,
    soPhongVan: 0,
    soPhongVanChoKetQua: 0,
    soThucTapSinh: 0,
    soDaDanhGia: 0,
  }
  const chiTieu = data?.chiTieu
  const trangThaiCongTy = data?.congTy?.trangThai || activeCompany?.trangThai
  const hopTac = HOP_TAC[trangThaiCongTy] || HOP_TAC.ChoDuyet

  // Tính toán trạng thái các bước quy trình dựa trên dữ liệu thật từ DB
  const step1Done = thongKe.soViTriTuyen > 0
  const step2Active = thongKe.soChoDuyet > 0
  const step2Done = thongKe.soUngVien > 0 && thongKe.soChoDuyet === 0
  const step3Active = thongKe.soPhongVan > 0
  const step4Active = thongKe.soThucTapSinh > 0

  const stageLabel = (() => {
    if (step4Active) return 'Giai đoạn 3: Thực tập & Đánh giá'
    if (step3Active) return 'Giai đoạn 2: Phỏng vấn ứng viên'
    if (step2Active || thongKe.soUngVien > 0) return 'Giai đoạn 2: Sàng lọc hồ sơ'
    if (step1Done) return 'Giai đoạn 1: Đã đăng tin tuyển'
    return 'Giai đoạn 1: Chuẩn bị tuyển dụng'
  })()

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Doanh nghiệp */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-8 text-white shadow-md border border-indigo-700/30">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${hopTac.cls}`}>
              <span className="material-symbols-outlined text-[16px]">{hopTac.icon}</span>
              <span>{hopTac.label}</span>
            </div>

            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                {activeCompany?.tenCongTy || 'Doanh Nghiệp Tuyển Dụng'}
              </h1>
              <p className="text-sm text-indigo-200/90 mt-1 max-w-2xl">
                Cổng tiếp nhận và quản lý công tác thực tập tốt nghiệp: Đăng tin tuyển dụng, sàng lọc hồ sơ CV, tổ chức phỏng vấn và đánh giá kết quả thực tập sinh.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-200 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-400">badge</span>
                Mã DN: <strong className="text-white font-semibold">{activeCompany?.maCongTy || '—'}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-400">work</span>
                Vị trí tuyển: <strong className="text-white font-semibold">{activeCompany?.viTriTuyen || 'Chưa cập nhật'}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-400">person</span>
                Đại diện: <strong className="text-white font-semibold">{activeCompany?.daiDienChinh?.hoTen || '—'}</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <Link
              to="/doanh-nghiep/ung-vien"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-indigo-900 shadow-sm hover:bg-indigo-50 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
              <span>Duyệt hồ sơ ứng viên</span>
            </Link>
            <Link
              to="/doanh-nghiep/tuyen-dung"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-700/80 hover:bg-indigo-700 border border-indigo-400/40 px-5 py-2.5 text-xs font-semibold text-white transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Cập nhật tin tuyển dụng</span>
            </Link>
          </div>
        </div>
      </div>

      {trangThaiCongTy && trangThaiCongTy !== 'DaDuyet' && (
        <div className="p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">info</span>
          Doanh nghiệp chưa ở trạng thái được Khoa duyệt nên chưa hiển thị với sinh viên và chưa thể tiếp nhận thực tập sinh.
          Bạn vẫn có thể hoàn thiện tin tuyển dụng trong lúc chờ.
        </div>
      )}

      {/* 2. 4 Thẻ KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vị trí tuyển dụng</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">campaign</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{thongKe.soViTriTuyen} <span className="text-xs font-normal text-slate-500">vị trí</span></div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Đã nhận: </span>
              <strong className="text-indigo-700 font-bold">{thongKe.soThucTapSinh}/{thongKe.soLuongNhan} sinh viên</strong>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ứng viên nộp hồ sơ</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">group</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{thongKe.soUngVien} <span className="text-xs font-normal text-slate-500">hồ sơ</span></div>
            <div className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <span>{thongKe.soChoDuyet} hồ sơ đang chờ duyệt</span>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lịch phỏng vấn</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">event_available</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{thongKe.soPhongVan} <span className="text-xs font-normal text-slate-500">lượt PV</span></div>
            <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>{thongKe.soPhongVanChoKetQua} buổi chờ ghi kết quả</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang tiếp nhận</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{thongKe.soThucTapSinh} <span className="text-xs font-normal text-slate-500">thực tập sinh</span></div>
            <div className="text-xs text-purple-700 font-medium mt-1">
              {thongKe.soDaDanhGia}/{thongKe.soThucTapSinh} đã có Phiếu nhận xét
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tiến trình tuyển dụng & Lối tắt nhanh */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Tiến trình 4 bước */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Quy trình Hợp tác & Tuyển dụng Thực tập</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {chiTieu?.tenDot ? `Tiến độ ${chiTieu.tenDot}` : 'Chưa có đợt thực tập đang diễn ra'}
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
              {stageLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
            {/* Step 1 */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              step1Done
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mb-2 ${
                  step1Done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {step1Done ? '✓' : '1'}
                </div>
                <div className="font-bold text-xs text-slate-900">1. Đăng tin tuyển</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {step1Done ? (activeCompany?.viTriTuyen || 'Đã đăng chỉ tiêu tuyển') : 'Chưa cập nhật tin tuyển'}
                </p>
              </div>
              <span className={`text-[10px] font-bold mt-3 block uppercase ${
                step1Done ? 'text-emerald-700' : 'text-slate-400'
              }`}>
                {step1Done ? 'Đã hoàn tất' : 'Chưa đăng'}
              </span>
            </div>

            {/* Step 2 */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              step2Active
                ? 'bg-indigo-50 border-indigo-200'
                : step2Done
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mb-2 ${
                  step2Active
                    ? 'bg-indigo-600 text-white animate-pulse'
                    : step2Done
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {step2Done ? '✓' : '2'}
                </div>
                <div className="font-bold text-xs text-slate-900">2. Sàng lọc hồ sơ</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {step2Active
                    ? `${thongKe.soChoDuyet} hồ sơ chờ duyệt`
                    : step2Done
                    ? `Đã duyệt ${thongKe.soDaDuyet} hồ sơ`
                    : 'Chờ sinh viên nộp CV'}
                </p>
              </div>
              <span className={`text-[10px] font-bold mt-3 block uppercase ${
                step2Active
                  ? 'text-indigo-700'
                  : step2Done
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}>
                {step2Active ? 'Đang diễn ra' : step2Done ? 'Đã hoàn tất' : 'Chưa bắt đầu'}
              </span>
            </div>

            {/* Step 3 */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              step3Active
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mb-2 ${
                  step3Active ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-200 text-slate-700'
                }`}>
                  3
                </div>
                <div className="font-bold text-xs text-slate-900">3. Phỏng vấn</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {step3Active ? `${thongKe.soPhongVan} lịch hẹn phỏng vấn` : 'Chưa lên lịch phỏng vấn'}
                </p>
              </div>
              <span className={`text-[10px] font-bold mt-3 block uppercase ${
                step3Active ? 'text-indigo-700' : 'text-slate-400'
              }`}>
                {step3Active ? 'Đang diễn ra' : 'Chưa bắt đầu'}
              </span>
            </div>

            {/* Step 4 */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              step4Active
                ? 'bg-purple-50 border-purple-200'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center mb-2 ${
                  step4Active ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  4
                </div>
                <div className="font-bold text-xs text-slate-900">4. Đánh giá TTS</div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {step4Active
                    ? `${thongKe.soThucTapSinh} thực tập sinh • ${thongKe.soDaDanhGia} đã đánh giá`
                    : 'Chưa có thực tập sinh'}
                </p>
              </div>
              <span className={`text-[10px] font-bold mt-3 block uppercase ${
                step4Active ? 'text-purple-700' : 'text-slate-400'
              }`}>
                {!step4Active ? 'Sắp tới' : thongKe.soDaDanhGia >= thongKe.soThucTapSinh ? 'Đã đánh giá xong' : 'Đang thực tập'}
              </span>
            </div>
          </div>

          {/* Quick Review Table: Ứng viên mới nộp gần đây */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hồ sơ ứng viên nộp gần nhất</h3>
              <Link to="/doanh-nghiep/ung-vien" className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1">
                Xem tất cả ứng viên
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {data?.ungVienMoiNhat?.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {data.ungVienMoiNhat.map((uv) => (
                  <div key={uv.maDK} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
                        {uv.hoTen?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">{uv.hoTen}</div>
                        <div className="text-[11px] text-slate-500">MSSV: {uv.maSV} • Lớp: {uv.lop || '—'} • GPA: {uv.gpa != null ? uv.gpa : '—'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        uv.trangThai === 'DaDuyet'
                          ? 'bg-emerald-100 text-emerald-800'
                          : uv.trangThai === 'TuChoi'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {uv.trangThai === 'DaDuyet' ? 'Đã duyệt' : uv.trangThai === 'TuChoi' ? 'Từ chối' : 'Chờ duyệt'}
                      </span>
                      <span className="text-[11px] text-slate-400">Ưu tiên {uv.thuTuUuTien || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                Chưa có sinh viên nào nộp hồ sơ vào doanh nghiệp.
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Lối tắt 4 phân hệ */}
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1">Lối tắt Quản trị Doanh nghiệp</h2>
            <p className="text-xs text-slate-500 mb-4">Truy cập nhanh các nghiệp vụ tuyển dụng và đánh giá</p>

            <div className="space-y-3">
              <Link
                to="/doanh-nghiep/tuyen-dung"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">campaign</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">Quản lý Tin Tuyển Dụng</div>
                  <div className="text-[11px] text-slate-500 truncate">Cập nhật vị trí, số lượng và tiêu chí</div>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-indigo-600">chevron_right</span>
              </Link>

              <Link
                to="/doanh-nghiep/ung-vien"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">Duyệt Hồ Sơ Ứng Viên</div>
                  <div className="text-[11px] text-slate-500 truncate">Xem CV, lọc hồ sơ sinh viên</div>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-blue-600">chevron_right</span>
              </Link>

              <Link
                to="/doanh-nghiep/phong-van"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">event_note</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">Lịch Phỏng Vấn Tuyển Dụng</div>
                  <div className="text-[11px] text-slate-500 truncate">Lên lịch hẹn & ghi nhận kết quả</div>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-emerald-600">chevron_right</span>
              </Link>

              <Link
                to="/doanh-nghiep/danh-gia"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-[20px]">rate_review</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800">Đánh Giá Thực Tập Sinh</div>
                  <div className="text-[11px] text-slate-500 truncate">Phiếu nhận xét CLO4.1, CLO4.2</div>
                </div>
                <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-purple-600">chevron_right</span>
              </Link>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-indigo-600 shrink-0">contact_support</span>
            <span>Cần hỗ trợ về quy trình thực tập? Liên hệ Văn phòng Khoa CNTT.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
