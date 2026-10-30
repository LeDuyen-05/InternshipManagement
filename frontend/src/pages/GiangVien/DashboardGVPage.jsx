import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { tienDoThucTapService } from '../../services/tienDoThucTapService'
import { phieuChamDiemService } from '../../services/phieuChamDiemService'
import { useIdentity } from '../../hooks/useIdentity'
import NoLinkedAccount from '../../components/common/NoLinkedAccount.jsx'
import { loadLecturerDashboard, lecturerLoad } from '../../utils/lecturerDashboard'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function DashboardGVPage() {
  const [searchParams] = useSearchParams()
  const { selectedDot } = useDotThucTap()
  const { maGV: identityMaGV, role } = useIdentity() || {}
  const isStaff = role === 'VT01' || role === 'VT02'
  const currentMaGV = isStaff && searchParams.get('gv') ? searchParams.get('gv') : identityMaGV

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Danh sách giảng viên từ database
  const [lecturers, setLecturers] = useState([])

  // Dữ liệu từ database
  const [students, setStudents] = useState([])
  const [pendingReports, setPendingReports] = useState([])
  const [gradedCount, setGradedCount] = useState(0)
  const [avgScore, setAvgScore] = useState(0)

  const [weekly, setWeekly] = useState({ rows: [], invalidDates: 0 })
  const [readyKey, setReadyKey] = useState('')
  const maDot = selectedDot?.maDot

  useEffect(() => {
    let active = true
    setLecturers([]); setStudents([]); setPendingReports([]); setGradedCount(0); setAvgScore(0)
    setWeekly({ rows: [], invalidDates: 0 }); setError(null)
    if (!currentMaGV || !maDot) { setLoading(false); return () => { active = false } }
    setLoading(true)
    loadLecturerDashboard(currentMaGV, maDot, {
      supervisors: gvHuongDanService, progress: tienDoThucTapService, grades: phieuChamDiemService,
    }).then(data => {
      if (!active) return
      setLecturers(data.lecturers); setStudents(data.students); setPendingReports(data.pendingReports)
      setGradedCount(data.completed.count)
      setAvgScore(data.completed.average == null ? 0 : data.completed.average.toFixed(2))
      setWeekly(data.weekly)
    }).catch(err => {
      if (active) setError('Không thể tải đầy đủ thống kê: ' + (err.response?.data?.message || err.message))
    }).finally(() => { if (active) { setReadyKey(`${maDot}|${currentMaGV}`); setLoading(false) } })
    return () => { active = false }
  }, [maDot, currentMaGV])

  const currentLecturer = lecturers.find(g => g.maGV === currentMaGV)
  const load = lecturerLoad(currentLecturer, students.length)
  const pendingGradeCount = Math.max(0, students.length - gradedCount)
  const pieData = [
    { name: 'Chưa đủ điểm CLO', value: pendingGradeCount, color: '#2563EB' },
    { name: 'Đủ điểm CLO', value: gradedCount, color: '#10B981' },
  ].filter(d => d.value > 0)

  if (!currentMaGV) return <NoLinkedAccount type="giảng viên (Khoa cần chọn GV để xem)" />
  if (!maDot) return <div role="status">Chọn đợt thực tập để xem thống kê giảng viên.</div>

  return (
    <div className="space-y-6">
      {/* 1. Header Trang */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>FIT Portal HUIT</span>
            <span>•</span>
            <span className="text-blue-600 font-bold">Cổng Giảng Viên</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Bảng Điều Khiển Tổng Quan
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              {selectedDot?.tenDot || maDot}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi toàn diện tải hướng dẫn, việc cần xử lý gấp và tiến độ nộp báo cáo thực tập của sinh viên.
          </p>

          {isStaff && currentLecturer && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-semibold text-slate-500">Đang xem dữ liệu của:</span>
              <span className="p-1 px-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-700">
                {currentLecturer.hoTen} ({currentMaGV})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/giang-vien/tien-do?gv=${currentMaGV}`}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
            <span>Duyệt tiến độ tuần</span>
          </Link>
          <Link
            to={`/giang-vien/cham-diem?gv=${currentMaGV}`}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">fact_check</span>
            <span>Chấm điểm CLO</span>
          </Link>
        </div>
      </div>

      {loading || readyKey !== `${maDot}|${currentMaGV}` ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Đang tổng hợp dữ liệu điều hành...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-600 bg-white rounded-2xl border border-red-200 text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* 2. Hàng 4 Card KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sinh viên phụ trách</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900">{students.length}</span>
                  <span className="text-xs font-semibold text-slate-400">/ {load.quota ?? '—'} chỉ tiêu</span>
                </div>
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {load.quota == null ? 'Chưa có dữ liệu chỉ tiêu' : load.quota === 0 ? 'Chỉ tiêu 0 — không nhận thêm' : `${load.percent}% tải hướng dẫn (${load.used}/${load.quota})`}
                </span>
                {load.used > students.length && <p className="text-xs text-amber-700 mt-2">Tải có tính phân công cũ chưa xác định đợt; Khoa cần rà soát.</p>}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">groups</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Báo cáo chờ duyệt</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-2xl font-black ${pendingReports.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {pendingReports.length}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">báo cáo</span>
                </div>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  pendingReports.length > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {pendingReports.length > 0 ? 'Cần duyệt gấp' : 'Đã duyệt hết'}
                </span>
              </div>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                pendingReports.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
              }`}>
                <span className="material-symbols-outlined text-2xl">pending_actions</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đủ điểm CLO</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-600">{gradedCount}</span>
                  <span className="text-xs font-semibold text-slate-400">/ {students.length} SV</span>
                </div>
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {students.length > 0 ? Math.round((gradedCount / students.length) * 100) : 0}% đã đủ điểm
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Điểm CLO trung bình</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-indigo-600">{gradedCount > 0 ? avgScore : '—'}</span>
                  <span className="text-xs font-semibold text-slate-400">/ 10.0</span>
                </div>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  gradedCount > 0
                    ? Number(avgScore) >= 8.5
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : Number(avgScore) >= 6.5
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {gradedCount > 0
                    ? 'Chỉ tính phiếu đủ điểm'
                    : 'Chờ hoàn tất chấm'}
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">grade</span>
              </div>
            </div>
          </div>

          {/* 3. Khối trung tâm: Việc cần làm (To-Do) & Biểu đồ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột 2/3: Danh sách việc cần làm / Báo cáo SV vừa nộp */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">notification_important</span>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Việc Cần Xử Lý Ngay ({pendingReports.length})
                  </h2>
                </div>
                <Link to="/giang-vien/tien-do" className="text-xs text-blue-600 font-bold hover:underline">
                  Xem tất cả tiến độ →
                </Link>
              </div>

              {pendingReports.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <span className="material-symbols-outlined text-4xl text-slate-300">task_alt</span>
                  <p className="font-medium">Tuyệt vời! Hiện không có báo cáo tuần nào đang chờ duyệt.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReports.slice(0, 5).map((r) => (
                    <div
                      key={r.maTienDo}
                      className="p-3.5 bg-slate-50 hover:bg-blue-50/40 rounded-xl border border-slate-100 transition flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{r.hoTenSinhVien}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                            {r.maSV}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {r.maTienDo}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-1">
                          {r.noiDungBaoCao || 'Sinh viên đã nộp báo cáo tuần'}
                        </p>
                      </div>

                      <Link
                        to={`/giang-vien/tien-do?sv=${r.maSV}`}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition whitespace-nowrap"
                      >
                        Duyệt ngay
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cột 1/3: Trạng thái & Tỷ lệ hoàn thành */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">
                Mức Độ Hoàn Tất Điểm CLO
              </h2>

              <div className="h-44 flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={4}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-400">Chưa có dữ liệu</span>
                )}
              </div>

              <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    Chưa đủ điểm CLO
                  </span>
                  <span className="font-bold text-slate-800">
                    {pendingGradeCount} SV
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Đủ điểm CLO
                  </span>
                  <span className="font-bold text-slate-800">{gradedCount} SV</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">Chốt đợt do Khoa thực hiện riêng.</p>
            </div>
          </div>

          {/* Thống kê mốc báo cáo thực tế, không giới hạn 6 tuần. */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Tiến Độ Nộp Báo Cáo Theo Tuần Của Sinh Viên Phụ Trách
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tuần theo hạn gốc (thứ Hai–Chủ nhật, giờ Việt Nam). Nộp bổ sung thuộc nhóm nộp sau hạn gốc.
                </p>
              </div>
              <Link to="/giang-vien/lich-deadline" className="text-xs text-blue-600 font-bold hover:underline">
                Xem lịch & deadline chi tiết →
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-600" aria-label="Chú thích biểu đồ tiến độ">
              <span><span className="inline-block w-2 h-2 rounded-full bg-blue-600 mr-1" />Đã nộp đúng hạn</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Nộp sau hạn gốc</span>
              <span><span className="inline-block w-2 h-2 rounded-full bg-slate-400 mr-1" />Chưa nộp</span>
              {weekly.rows.some(row => row.chuaRo > 0) && <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />Chưa xác định</span>}
            </div>

            {weekly.invalidDates > 0 && <p role="status" className="text-xs text-amber-700">{weekly.invalidDates} mốc thiếu ngày hợp lệ, chưa thể đưa vào biểu đồ.</p>}
            {!weekly.rows.length ? <p className="py-10 text-center text-slate-500">Chưa có mốc báo cáo trong đợt này cho sinh viên phụ trách.</p> : <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekly.rows} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="tuan" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="nop" name="Đã nộp đúng hạn" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tre" name="Nộp sau hạn gốc" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="chuaNop" name="Chưa nộp" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  {weekly.rows.some(row => row.chuaRo > 0) && <Bar dataKey="chuaRo" name="Chưa xác định" fill="#F59E0B" radius={[4, 4, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>}
          </div>
        </>
      )}
    </div>
  )
}
