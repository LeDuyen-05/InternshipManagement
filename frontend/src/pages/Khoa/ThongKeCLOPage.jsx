import { useState, useEffect, useMemo } from 'react'
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

export default function ThongKeCLOPage() {
  const { selectedDot } = useDotThucTap()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toastMsg, setToastMsg] = useState('')

  // Bộ lọc bảng điểm sinh viên
  const [searchKeyword, setSearchKeyword] = useState('')
  const [filterResult, setFilterResult] = useState('ALL') // 'ALL' | 'Dat' | 'KhongDat' | 'ChuaCham'

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await thongKeService.getBaoCaoThongKe(selectedDot?.maDot)
      if (res.data?.success) {
        setData(res.data.data)
      } else {
        setData(res.data)
      }
    } catch (err) {
      console.error('Lỗi tải báo cáo thống kê:', err)
      setError(err.response?.data?.message || err.message || 'Không thể tải dữ liệu thống kê')
    } finally {
      setLoading(false)
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
  const handleExportExcel = () => {
    if (!data) return
    try {
      thongKeService.exportExcel(
        data,
        `BaoCao_ThongKe_CLO_${selectedDot?.maDot || 'FIT'}_${new Date().toISOString().slice(0, 10)}.xlsx`
      )
      showToast('Đã xuất file Microsoft Excel (.xlsx) 3 sheets thành công!')
    } catch (e) {
      alert('Lỗi khi xuất file Excel: ' + e.message)
    }
  }

  // Xuất file chấm điểm đúng mẫu của Khoa (CLO1.1 → CLO4.2, GVHD, Tên công ty)
  const handleExportMauKhoa = async () => {
    try {
      const res = await phieuChamDiemService.getBangDiem(selectedDot?.maDot)
      xuatBangDiemTheoMauKhoa(res.data?.data, `DiemTTTN_${selectedDot?.maDot || 'Dot'}_${new Date().toISOString().slice(0, 10)}.xlsx`)
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

      return matchKeyword && matchStatus
    })
  }, [data?.danhSachBangDiem, searchKeyword, filterResult])

  // Màu sắc cho biểu đồ tròn xếp loại
  const PIE_COLORS = ['#10b981', '#3b82f6', '#06b6d4', '#8b5cf6', '#f59e0b', '#f97316', '#fb7185', '#ef4444']

  const tongQuan = data?.tongQuan || {}

  return (
    <div className="space-y-6">
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
            <span>Xuất Excel</span>
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
                  Còn chưa chấm: <strong className="text-rose-600">{tongQuan.chuaChamCLO || 0}</strong> SV
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
                <span className="text-xs text-slate-400 font-medium">Đã chấm: {tongQuan.daChamCLO} SV</span>
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
              {data.taiGiangVien?.map((gv) => {
                const isOver = gv.tiLeTai >= 100
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
                        {isOver ? 'Đã đủ tải' : isWarning ? 'Gần tối đa' : 'Còn nhận thêm'}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-600 mb-1">
                        <span>Số SV hướng dẫn:</span>
                        <span className="font-bold">
                          {gv.soLuongHienTai} / {gv.soLuongSVHD} ({gv.tiLeTai}%)
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
                    <th className="py-3 px-2 text-center">CLO1 (/2)</th>
                    <th className="py-3 px-2 text-center">CLO2 (/1)</th>
                    <th className="py-3 px-2 text-center">CLO3 (/2)</th>
                    <th className="py-3 px-2 text-center">CLO4 – DN (/5)</th>
                    <th className="py-3 px-3 text-center">Tổng Điểm</th>
                    <th className="py-3 px-3 text-center">Xếp Loại</th>
                    <th className="py-3 px-3 text-center">Kết Quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((sv, idx) => (
                      <tr key={sv.maSV} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-slate-400 font-medium">{idx + 1}</td>
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
                            <span className="text-slate-400 italic">Chưa chấm</span>
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
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                        Không tìm thấy sinh viên nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
    </div>
  )
}
