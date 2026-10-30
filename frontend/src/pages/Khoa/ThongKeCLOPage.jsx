import { Link } from 'react-router-dom'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { thongKeService } from '../../services/thongKeService'
import { phieuChamDiemService } from '../../services/phieuChamDiemService'
import { xuatBangDiemTheoMauKhoa } from '../../utils/bangDiemExcel.js'
import ChotDotPanel from '../../components/khoa/ChotDotPanel'
import StudentEnterpriseDocuments from '../../components/khoa/StudentEnterpriseDocuments'

export default function ThongKeCLOPage() {
  const { selectedDot, roundLock } = useDotThucTap()
  const currentRound = useRef(selectedDot?.maDot); currentRound.current = selectedDot?.maDot
  const requestId = useRef(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [activeTab, setActiveTab] = useState('thong-ke') // 'thong-ke' | 'khoa-dot'
  const [selectedStudentScore, setSelectedStudentScore] = useState(null)
  const [loadingScoreDetail, setLoadingScoreDetail] = useState(false)
  const [scoreDetailData, setScoreDetailData] = useState(null)

  const handleOpenScoreDetail = async (sv) => {
    setSelectedStudentScore(sv)
    setScoreDetailData(null)
    setLoadingScoreDetail(true)
    const maDot = selectedDot?.maDot || data?.maDot
    try {
      const [phieuRes, tieuChiRes] = await Promise.all([
        phieuChamDiemService.getPhieuChamBySinhVien(sv.maSV, maDot),
        phieuChamDiemService.getDanhSachTieuChi(maDot),
      ])
      const pData = phieuRes.data?.data || null
      const rubric = tieuChiRes.data?.data || []
      setScoreDetailData({
        ...(pData || {}),
        allCriteria: rubric,
        hasScoreSheet: Boolean(pData),
      })
    } catch {
      setScoreDetailData(null)
    } finally {
      setLoadingScoreDetail(false)
    }
  }

  const displayCriteriaList = useMemo(() => {
    if (!selectedStudentScore) return []
    const allCriteria = scoreDetailData?.allCriteria || []
    const chiTiets = scoreDetailData?.chiTiets || []
    const scoreMap = new Map()
    chiTiets.forEach((c) => {
      scoreMap.set(c.maTieuChi, c.diemCham)
    })
    if (selectedStudentScore.diemTheoTieuChi) {
      selectedStudentScore.diemTheoTieuChi.forEach((x) => {
        if (!scoreMap.has(x.maTieuChi)) scoreMap.set(x.maTieuChi, x.diemCham)
      })
    }

    if (allCriteria.length > 0) {
      return allCriteria.map((c) => ({
        maTieuChi: c.maTieuChi,
        tenTieuChi: c.tenTieuChi,
        maCLO: c.maCLO,
        nhom: c.nhomDanhGia || (c.maTieuChi?.startsWith('CLO4') ? 'DN' : 'GV'),
        diemToiDa: c.diemToiDa,
        diemCham: scoreMap.has(c.maTieuChi) ? scoreMap.get(c.maTieuChi) : null,
      }))
    }

    if (chiTiets.length > 0) {
      return chiTiets.map((c) => ({
        maTieuChi: c.maTieuChi,
        tenTieuChi: c.tenTieuChi,
        maCLO: c.maCLO,
        nhom: c.nhomDanhGia || (c.maTieuChi?.startsWith('CLO4') ? 'DN' : 'GV'),
        diemToiDa: c.diemToiDa,
        diemCham: c.diemCham,
      }))
    }

    if (data?.diemTheoCLO && data.diemTheoCLO.length > 0) {
      return data.diemTheoCLO.map((c) => ({
        maTieuChi: c.maTieuChi,
        tenTieuChi: c.tenCLO,
        maCLO: c.maCLO,
        nhom: c.maTieuChi?.startsWith('CLO4') ? 'DN' : 'GV',
        diemToiDa: c.diemToiDa,
        diemCham: scoreMap.get(c.maTieuChi) ?? null,
      }))
    }
    return []
  }, [selectedStudentScore, scoreDetailData, data?.diemTheoCLO])

  // Bộ lọc bảng điểm sinh viên
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterResult, setFilterResult] = useState('ALL') // 'ALL' | 'Dat' | 'KhongDat' | 'ChuaCham'

  const loadData = async () => {
    const round = selectedDot?.maDot
    const request = ++requestId.current
    setData(null)
    if (!round) { setLoading(false); return }
    try {
      setLoading(true)
      setError(null)
      const res = await thongKeService.getBaoCaoThongKe(round)
      if (request !== requestId.current || currentRound.current !== round) return
      if (res.data?.success) {
        setData(res.data.data)
      } else {
        setData(res.data)
      }
    } catch (err) {
      if (request !== requestId.current || currentRound.current !== round) return
      console.error('Lỗi tải báo cáo thống kê:', err)
      setError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu thống kê')
    } finally {
      if (request === requestId.current && currentRound.current === round) setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedDot?.maDot])

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  // Xử lý xuất file Excel trực tiếp
  const handleExportExcel = async () => {
    if (!data || loading || data.maDot !== selectedDot?.maDot) return
    try {
      const exported = await thongKeService.exportExcel(
        data,
        `BaoCao_ThongKe_CLO_${selectedDot?.maDot || 'FIT'}_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
      if (exported === false) return
      showToast('Đã xuất file Microsoft Excel (.xlsx) 3 sheets thành công!')
    } catch (e) {
      alert('Lỗi khi xuất file Excel: ' + e.message)
    }
  }

  // Xuất file chấm điểm đúng mẫu của Khoa (CLO1.1 → CLO4.2, GVHD, Tên công ty)
  const handleExportMauKhoa = async () => {
    const round = selectedDot?.maDot
    if (!round || loading) return
    try {
      const res = await phieuChamDiemService.getBangDiem(round)
      if (currentRound.current !== round) return
      const exported = await xuatBangDiemTheoMauKhoa({ ...res.data?.data, trangThaiChotDot: roundLock.status, phienBanChotDot: roundLock.data?.phienBan }, `DiemTTTN_${round}_${new Date().toISOString().slice(0, 10)}.xlsx`)
      if (exported === false) return
      showToast('Đã xuất file chấm điểm theo mẫu của Khoa!')
    } catch (e) {
      alert('Lỗi khi xuất file chấm điểm: ' + (e.response?.data?.message || e.message))
    }
  }

  // Tải CSV từ backend
  const handleExportCsv = () => {
    const url = thongKeService.getExportCsvUrl(selectedDot?.maDot)
    window.open(url, '_blank')
    showToast('Đang tải tệp CSV mã hóa UTF-8...')
  }

  // Danh sách sinh viên sau khi lọc
  const filteredStudents = useMemo(() => {
    if (!data?.danhSachBangDiem) return []
    return data.danhSachBangDiem.filter((sv) => {
      const matchKeyword =
        !searchKeyword ||
        sv.maSV?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        sv.hoTen?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        sv.lop?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        sv.tenCongTy?.toLowerCase().includes(searchKeyword.toLowerCase())

      let matchStatus = true
      if (filterResult === 'Dat') matchStatus = sv.ketQua === 'Đạt'
      else if (filterResult === 'KhongDat') matchStatus = sv.ketQua === 'Không đạt'
      else if (filterResult === 'ChuaCham') matchStatus = sv.ketQua === 'Chưa chấm'
      else if (filterResult === 'DangCham') matchStatus = sv.ketQua === 'Chưa đủ điểm' || sv.ketQua === 'Chưa cấu hình rubric'

      return matchKeyword && matchStatus
    })
  }, [data?.danhSachBangDiem, searchKeyword, filterResult])

  // Màu sắc cho biểu đồ tròn xếp loại
  const PIE_COLORS = ['#10b981', '#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#f97316', '#fb7185', '#ef4444']

  const tongQuan = data?.tongQuan || {}
  const studentPagination = usePagination(filteredStudents, JSON.stringify([selectedDot?.maDot, searchKeyword, filterResult]))
  const lecturerPagination = usePagination(data?.taiGiangVien || [], selectedDot?.maDot)

  return (
    <div className="space-y-6">
      {/* Thanh chuyển Tab nghiệp vụ */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('thong-ke')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'thong-ke'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bar_chart</span>
          <span>1. Báo cáo & Thống kê Chuẩn đầu ra (CLO)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('khoa-dot')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'khoa-dot'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">lock_clock</span>
          <span>2. Rà soát & Khóa đợt</span>
        </button>
      </div>

      {activeTab === 'khoa-dot' && (
        <ChotDotPanel maDot={selectedDot?.maDot} onChanged={loadData} onViewScoreDetail={handleOpenScoreDetail} />
      )}

      {activeTab === 'thong-ke' && (
        <>
      {/* Toast thông báo */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-xl">check_circle</span>
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* 1. Header Trang & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <span className="material-symbols-outlined text-2xl">bar_chart</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Báo Cáo & Thống Kê Chuẩn Đầu Ra (CLO)</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng hợp tiến độ, phân bổ kết quả đánh giá thực tập theo chuẩn kiểm định tại{' '}
                <strong className="text-blue-700">{selectedDot?.tenDot || data?.tenDot}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Nút hành động Xuất Báo Cáo */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadData}
            title="Làm mới dữ liệu"
            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || !data}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base text-slate-500">csv</span>
            <span>Tải CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading || !data}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">table_chart</span>
            <span>Xuất báo cáo trình ký</span>
          </button>

          <button
            type="button"
            onClick={handleExportMauKhoa}
            disabled={loading || !selectedDot?.maDot}
            className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="File chấm điểm theo mẫu của Khoa: 11 tiêu chí CLO, tổng điểm, GVHD, tên công ty"
          >
            <span className="material-symbols-outlined text-base">grading</span>
            <span>Mẫu chấm Khoa</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Đang tổng hợp dữ liệu thống kê từ hệ thống...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-center space-y-3">
          <span className="material-symbols-outlined text-rose-600 text-4xl">error_outline</span>
          <p className="text-sm font-bold text-rose-800">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <>
          {/* 2. Hàng Thẻ KPI Tổng Quan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Sinh viên & Phân công */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sinh Viên & Phân Công</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">{tongQuan.tongSinhVien || 0}</span>
                  <span className="text-xs font-semibold text-emerald-600">
                    {tongQuan.tiLePhanCong || 0}% đã có GVHD
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Đã gán: <strong className="text-slate-800">{tongQuan.daPhanCongGVHD || 0}</strong> | Chưa gán: {tongQuan.chuaPhanCongGVHD || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-2xl">group</span>
              </div>
            </div>

            {/* KPI 2: Báo cáo Tiến độ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tiến Độ Thực Tập</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">{tongQuan.tienDoDaDuyet || 0}</span>
                  <span className="text-xs font-semibold text-slate-400">
                    / {tongQuan.tongBaoCaoTienDo || 0} báo cáo
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  Đang chờ duyệt: <strong>{tongQuan.tienDoChoDuyet || 0}</strong> tuần
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">pending_actions</span>
              </div>
            </div>

            {/* KPI 3: Tình trạng Chấm điểm */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tiến Độ Chấm CLO</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-indigo-700">{tongQuan.daChamCLO || 0}</span>
                  <span className="text-xs font-semibold text-slate-400">
                    / {tongQuan.tongSinhVien || 0} sinh viên
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Chưa đủ điểm: <strong className="text-rose-600">{tongQuan.chuaChamCLO || 0}</strong> SV (đang chấm: {tongQuan.dangChamCLO || 0})
                  <span className="block">Không hoàn tất đợt (Khoa xác nhận): <strong>{tongQuan.khongHoanTatDot || 0}</strong> SV</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">fact_check</span>
              </div>
            </div>

            {/* KPI 4: Điểm TB & Tỷ lệ Đạt */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chất Lượng Đầu Ra</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-emerald-600">
                    {tongQuan.diemTrungBinhCLO ? tongQuan.diemTrungBinhCLO.toFixed(2) : '0.00'}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">/ 10.0</span>
                </div>
                <p className="text-xs text-emerald-700 mt-1 font-semibold">
                  Tỷ lệ đạt chuẩn: {tongQuan.tiLeDatCLO || 0}% ({tongQuan.soLuongDat || 0} SV)
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">verified</span>
              </div>
            </div>
          </div>

          {/* 3. Khối Biểu Đồ Trực Quan (2 Biểu đồ song song) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Biểu đồ 1: Phân bố xếp loại CLO */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">pie_chart</span>
                  <h3 className="text-sm font-bold text-slate-900">Phân Bố Xếp Loại Tốt Nghiệp CLO</h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Đủ điểm: {tongQuan.daChamCLO} SV</span>
              </div>

              <div className="h-64 w-full">
                {data.phanBoDiem && data.phanBoDiem.some((d) => d.soLuong > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.phanBoDiem}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="soLuong"
                        nameKey="xepLoai"
                      >
                        {data.phanBoDiem.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name, item) => [
                          `${value} SV (${item.payload.tiLe}%)`,
                          item.payload.khoangDiem,
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                    <span className="material-symbols-outlined text-3xl">sentiment_dissatisfied</span>
                    <span>Chưa có đủ dữ liệu phiếu chấm để vẽ biểu đồ xếp loại</span>
                  </div>
                )}
              </div>

              {/* Bảng tóm tắt số lượng theo phân hạng điểm */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 pt-2 border-t border-slate-100 text-center">
                {data.phanBoDiem?.map((item, idx) => {
                  const letter = item.xepLoai.match(/\((.*?)\)/)?.[1] || item.xepLoai.slice(0, 3)
                  return (
                    <div key={idx} className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[11px] font-bold text-slate-700" title={item.xepLoai}>
                        {letter}
                      </p>
                      <p className="text-sm font-black text-slate-900 mt-0.5">{item.soLuong}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{item.tiLe}%</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Biểu đồ 2: Điểm trung bình từng Chuẩn đầu ra CLO */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600">equalizer</span>
                  <h3 className="text-sm font-bold text-slate-900">Điểm Đạt Chuẩn Theo Từng CLO (Thang 10)</h3>
                </div>
                <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                  Mô hình ABET / AUN-QA
                </span>
              </div>

              <div className="h-64 w-full">
                {data.diemTheoCLO && data.diemTheoCLO.length > 0 && data.diemTheoCLO.some((d) => d.diemTrungBinh > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.diemTheoCLO} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="maCLO" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip
                        formatter={(val, name, item) => [
                          `${val}/10 (Trọng số ${Math.round(item.payload.trongSo * 100)}%)`,
                          item.payload.tenCLO,
                        ]}
                      />
                      <Bar dataKey="diemTrungBinh" name="Điểm trung bình" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                    <span className="material-symbols-outlined text-3xl">sentiment_dissatisfied</span>
                    <span>Chưa có đủ dữ liệu điểm chuẩn đầu ra CLO để vẽ biểu đồ</span>
                  </div>
                )}
              </div>

              {/* Danh sách tiêu chí CLO giải thích */}
              {data.diemTheoCLO && data.diemTheoCLO.length > 0 ? (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 max-h-48 overflow-y-auto">
                  {data.diemTheoCLO.map((clo) => (
                    <div key={clo.maCLO} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">
                        <strong>{clo.maCLO}:</strong> {clo.tenCLO} ({Math.round(clo.trongSo * 100)}%)
                      </span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {clo.diemTrungBinh}/10
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 text-center text-slate-400 text-xs py-2 italic">
                  Dữ liệu điểm theo chuẩn đầu ra CLO sẽ tự động hiển thị khi giảng viên hoàn tất chấm điểm.
                </div>
              )}
            </div>
          </div>

          {/* 4. Khối Tải Hướng Dẫn Giảng Viên */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700">supervisor_account</span>
                <h3 className="text-sm font-bold text-slate-900">Giám Sát Tải Hướng Dẫn Giảng Viên Trong Đợt</h3>
              </div>
              <span className="text-xs text-slate-400">Tổng số: {data.taiGiangVien?.length || 0} Giảng viên</span>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lecturerPagination.items.map((gv) => {
                const noCapacity = gv.soLuongSVHD === 0
                const isOver = noCapacity || gv.tiLeTai >= 100
                const isWarning = gv.tiLeTai >= 75 && gv.tiLeTai < 100

                return (
                  <div
                    key={gv.maGV}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{gv.hoTen}</p>
                        <p className="text-[11px] text-slate-500">{gv.chuyenMon || 'Giảng viên hướng dẫn'}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOver
                            ? 'bg-rose-100 text-rose-700'
                            : isWarning
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {noCapacity ? 'Chỉ tiêu 0 — không nhận thêm' : isOver ? 'Đã đủ tải' : isWarning ? 'Gần tối đa' : 'Còn nhận thêm'}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                        <span>Số SV hướng dẫn:</span>
                        <span className="font-bold">
                          {gv.soLuongHienTai} / {gv.soLuongSVHD} {noCapacity ? '(không nhận thêm)' : `(${gv.tiLeTai}%)`}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, gv.tiLeTai)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="pt-3 border-t border-slate-100">
              <Pagination pagination={lecturerPagination} label="tải GVHD trong đợt"/>
            </div>
          </div>

          {/* 5. Khối Bảng Điểm CLO Chi Tiết & Tìm Kiếm */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bảng Tổng Hợp Kết Quả Đánh Giá CLO Chi Tiết</h3>
                <p className="text-xs text-slate-500">
                  Dữ liệu trực tiếp phục vụ hội đồng nghiệm thu, xuất phiếu điểm và hậu kiểm định đào tạo
                </p>
              </div>

              {/* Bộ lọc bảng */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="Tìm MSSV, Tên, Lớp..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white w-48 transition-all"
                  />
                </div>

                <select
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="Dat">Chỉ sinh viên ĐẠT</option>
                  <option value="KhongDat">Chỉ sinh viên KHÔNG ĐẠT</option>
                  <option value="ChuaCham">Chưa chấm điểm</option>
                  <option value="DangCham">Chưa đủ điểm / rubric</option>
                </select>
              </div>
            </div>

            {/* Bảng dữ liệu */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    <th className="py-3 px-3">STT</th>
                    <th className="py-3 px-3">Sinh Viên</th>
                    <th className="py-3 px-3">Lớp</th>
                    <th className="py-3 px-3">Doanh Nghiệp & GVHD</th>
                    <th className="py-3 px-2 text-center">CLO1 (Tổng /2)</th>
                    <th className="py-3 px-2 text-center">CLO2 (Tổng /1)</th>
                    <th className="py-3 px-2 text-center">CLO3 (Tổng /2)</th>
                    <th className="py-3 px-2 text-center">CLO4 - DN (Tổng /5)</th>
                    <th className="py-3 px-3 text-center">Tổng Điểm</th>
                    <th className="py-3 px-3 text-center">Xếp Loại</th>
                    <th className="py-3 px-3 text-center">Kết Quả</th>
                    <th className="py-3 px-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.length > 0 ? (
                    studentPagination.items.map((sv, idx) => (
                      <tr key={sv.maSV} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-slate-400 font-medium">{studentPagination.start + idx}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{sv.hoTen}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{sv.maSV}</p>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{sv.lop || '-'}</td>
                        <td className="py-3 px-3">
                          <p className="text-slate-800 font-medium truncate max-w-[180px]">{sv.tenCongTy}</p>
                          <p className="text-[11px] text-blue-700 font-semibold truncate max-w-[180px]">
                            GV: {sv.tenGVHD}
                          </p>
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-medium text-slate-700">
                          {sv.diemCLO1 != null ? sv.diemCLO1.toFixed(2) : '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-medium text-slate-700">
                          {sv.diemCLO2 != null ? sv.diemCLO2.toFixed(2) : '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-medium text-slate-700">
                          {sv.diemCLO3 != null ? sv.diemCLO3.toFixed(2) : '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-mono font-medium text-slate-700">
                          {sv.diemCLO4 != null ? sv.diemCLO4.toFixed(2) : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {sv.tongDiem != null ? (
                            <span className="font-bold text-sm text-slate-900 font-mono">
                              {sv.tongDiem.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">{sv.ketQua || 'Chưa chấm'}{sv.ketQua !== 'Không hoàn tất đợt' && sv.diemTamTinh != null ? ` · tạm tính ${sv.diemTamTinh}` : ''}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-[11px] font-semibold text-slate-700">{sv.xepLoai}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              sv.ketQua === 'Đạt'
                                ? 'bg-emerald-100 text-emerald-700'
                                : sv.ketQua === 'Không đạt'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {sv.ketQua}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1 items-start min-w-[130px]">
                            <button
                              type="button"
                              onClick={() => handleOpenScoreDetail(sv)}
                              className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">visibility</span>
                              <span>Xem chi tiết điểm</span>
                            </button>
                            <StudentEnterpriseDocuments key={`${data.maDot}|${sv.maSV}`} maSV={sv.maSV} maDot={data.maDot} />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-slate-400 text-xs">
                        Không tìm thấy sinh viên nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination pagination={studentPagination} label="bảng điểm CLO"/>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Hiển thị <strong>{filteredStudents.length}</strong> / {data.danhSachBangDiem?.length || 0} sinh viên
              </span>
              <span>Đạt chuẩn AUN-QA / Kiểm định đào tạo FIT</span>
            </div>
          </div>
        </>
      )}
        </>
      )}

      {/* Modal Bảng điểm chi tiết Chuẩn đầu ra CLO */}
      {selectedStudentScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">fact_check</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 m-0">
                    Chi tiết bảng điểm đánh giá Chuẩn đầu ra (CLO)
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Sinh viên: <strong className="text-slate-900">{selectedStudentScore.hoTen}</strong> ({selectedStudentScore.maSV}) — Lớp: <strong>{selectedStudentScore.lop || '—'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedStudentScore(null); setScoreDetailData(null) }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5 text-xs">
              {/* Info card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Đơn vị thực tập tiếp nhận</span>
                  <p className="font-bold text-slate-800 text-xs mt-0.5">{selectedStudentScore.tenCongTy || '—'}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase">Giảng viên hướng dẫn</span>
                  <p className="font-bold text-blue-700 text-xs mt-0.5">{selectedStudentScore.tenGVHD || '—'}</p>
                </div>
              </div>

              {/* Bảng chi tiết 11 tiêu chí Rubric */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-blue-600">checklist</span>
                  <span>Chi tiết điểm theo từng tiêu chí thành phần (Rubric đợt)</span>
                </h4>

                {loadingScoreDetail ? (
                  <div className="py-8 text-center text-slate-400">
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    <p className="mt-1">Đang tải chi tiết điểm từ hệ thống...</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                          <th className="py-2.5 px-3 w-20">Mã tiêu chí</th>
                          <th className="py-2.5 px-3">Nội dung tiêu chí đánh giá</th>
                          <th className="py-2.5 px-3 w-28 text-center">Bên chấm</th>
                          <th className="py-2.5 px-3 w-20 text-center">Điểm tối đa</th>
                          <th className="py-2.5 px-3 w-24 text-center">Điểm chấm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayCriteriaList.map(tc => (
                          <tr key={tc.maTieuChi} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{tc.maTieuChi}</td>
                            <td className="py-2.5 px-3 text-slate-700">
                              <span className="font-semibold text-slate-900">{tc.tenTieuChi}</span>
                              {tc.maCLO && <span className="ml-1.5 text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded font-bold">{tc.maCLO}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tc.nhom === 'DN' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                {tc.nhom === 'DN' ? 'Doanh nghiệp' : 'GVHD'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-500">{tc.diemToiDa != null ? Number(tc.diemToiDa).toFixed(2) : '—'}</td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                              {tc.diemCham != null ? Number(tc.diemCham).toFixed(2) : <span className="text-slate-400 italic font-normal">Chưa chấm</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100/90 font-bold text-slate-900 border-t border-slate-200">
                          <td colSpan="3" className="py-2.5 px-3 text-right uppercase text-[11px]">Tổng điểm học phần thực tập:</td>
                          <td className="py-2.5 px-3 text-center font-mono">10.00</td>
                          <td className="py-2.5 px-3 text-center font-mono text-blue-700 text-sm font-bold">
                            {selectedStudentScore.tongDiem != null ? Number(selectedStudentScore.tongDiem).toFixed(2) : (selectedStudentScore.diemTamTinh != null ? `${selectedStudentScore.diemTamTinh} (tạm tính)` : '—')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Xếp loại & Nhận xét */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700 uppercase text-[11px]">Nhận xét của Giảng viên hướng dẫn:</span>
                  <p className="text-slate-600 italic">
                    {scoreDetailData?.nhanXetGV || 'Chưa ghi nhận nhận xét từ GVHD.'}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700 uppercase text-[11px]">Nhận xét của Doanh nghiệp tiếp nhận:</span>
                  <p className="text-slate-600 italic">
                    {scoreDetailData?.nhanXetDN || 'Chưa ghi nhận nhận xét từ Doanh nghiệp.'}
                  </p>
                </div>
              </div>

              {/* Footer info kết quả */}
              <div className="flex items-center justify-between p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80 text-blue-900">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Xếp loại</span>
                    <strong className="text-sm text-slate-900">{selectedStudentScore.xepLoai || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Kết quả học phần</span>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedStudentScore.ketQua === 'Đạt' ? 'bg-emerald-100 text-emerald-800' : selectedStudentScore.ketQua === 'Không đạt' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}`}>
                      {selectedStudentScore.ketQua || 'Chưa hoàn tất'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/khoa/cham-diem?sv=${selectedStudentScore.maSV}`}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    <span>Nhập điểm học vụ</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setSelectedStudentScore(null); setScoreDetailData(null) }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
