import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { useIdentity } from '../../hooks/useIdentity'

export default function DanhSachSVHuongDanPage() {
  const [searchParams] = useSearchParams()
  const { selectedDot, isReadOnly } = useDotThucTap()
  const { maGV: identityMaGV, role } = useIdentity() || {}
  const isStaff = role === 'VT01' || role === 'VT02'

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedSV, setSelectedSV] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [lecturerInfo, setLecturerInfo] = useState(null)

  // Nếu Cán bộ Khoa bấm nút "Xem DS" từ trang Phân công sang thì có param ?gv=...
  // Nếu là Giảng viên thì luôn luôn là tài khoản của chính mình
  const urlMaGV = searchParams.get('gv')
  const currentMaGV = isStaff && urlMaGV ? urlMaGV : (identityMaGV || 'GV001')

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [resSv, resGvTai] = await Promise.all([
        gvHuongDanService.getSVTheoGiangVien(currentMaGV, keyword),
        gvHuongDanService.getGiangVienTai(),
      ])

      if (resSv.data?.success) {
        setList(resSv.data.data || [])
      } else {
        setList(resSv.data || [])
      }

      if (resGvTai.data?.success) {
        const found = resGvTai.data.data?.find((g) => g.maGV === currentMaGV)
        if (found) setLecturerInfo(found)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể tải danh sách sinh viên')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentMaGV, keyword, selectedDot])

  // Lọc dữ liệu hiển thị theo tab trạng thái
  const filteredList = list.filter((item) => {
    if (statusFilter === 'ALL') return true
    return item.trangThai === statusFilter
  })

  // Tính toán thống kê KPI
  const totalSV = list.length
  const dangHuongDanCount = list.filter((s) => s.trangThai === 'DangHuongDan').length
  const hoanThanhCount = list.filter((s) => s.trangThai === 'HoanThanh').length
  const avgGpa = totalSV > 0
    ? (list.reduce((acc, cur) => acc + (cur.gpa || 0), 0) / totalSV).toFixed(2)
    : '0.00'
  // Xuất danh sách sinh viên ra file Excel
  const handleExportExcel = () => {
    if (!list || list.length === 0) {
      alert('Không có dữ liệu sinh viên để xuất!')
      return
    }
    const rows = list.map((item, idx) => ({
      STT: idx + 1,
      'Mã sinh viên': item.sinhVien?.maSV || item.maSV,
      'Họ và tên': item.sinhVien?.hoTen || item.hoTen,
      Lớp: item.sinhVien?.lop || item.lop || '-',
      'Doanh nghiệp tiếp nhận': item.congTy?.tenCongTy || item.tenCongTy || 'Chưa có',
      'Vị trí': item.congTy?.viTriTuyen || item.viTriTuyen || '-',
      GPA: item.sinhVien?.gpa || item.gpa || '-',
      'Trạng thái':
        item.trangThai === 'DangHuongDan'
          ? 'Đang hướng dẫn'
          : item.trangThai === 'HoanThanh'
          ? 'Đã hoàn thành'
          : item.trangThai,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 6 },
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
      { wch: 8 },
      { wch: 18 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'SinhVienHuongDan')
    XLSX.writeFile(wb, `DS_SinhVien_GV_${currentMaGV}_${selectedDot?.maDot || 'FIT'}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Trang đồng bộ chuẩn với Header và Đợt tác nghiệp */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined text-2xl">group</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Sinh Viên Hướng Dẫn</h1>
              <p className="text-sm text-slate-500">
                Theo dõi tiến độ, phân công thực tập và đánh giá CLO trong <strong>{selectedDot.tenDot}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Thông tin tài khoản Giảng viên và nút làm mới */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold shadow-xs">
            <span className="material-symbols-outlined text-base text-blue-600">account_circle</span>
            <span>GVHD: {lecturerInfo?.hoTen ? `ThS. ${lecturerInfo.hoTen}` : currentMaGV} ({currentMaGV})</span>
          </div>

          <button
            onClick={handleExportExcel}
            title="Xuất file Excel danh sách sinh viên"
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-base">table_chart</span>
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={loadData}
            title="Làm mới dữ liệu"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ KPI Tổng quan (Lấy chỉ tiêu thực tế từ DB) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng sinh viên nhận</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">{totalSV}</span>
              <span className="text-xs font-medium text-slate-400">
                / {Math.max(10, Number(lecturerInfo?.soLuongSVHD) || 10)} chỉ tiêu
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined">school</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đang hướng dẫn</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-600">{dangHuongDanCount}</span>
              <span className="text-xs font-medium text-emerald-600">Đang thực tập</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined">sync</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Đã hoàn thành</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-indigo-600">{hoanThanhCount}</span>
              <span className="text-xs font-medium text-indigo-600">Đã chốt điểm</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined">verified</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">GPA Tích Lũy TB Lớp</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-amber-600">{avgGpa}</span>
              <span className="text-xs font-medium text-slate-400">/ 4.00</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {Number(avgGpa) >= 3.6
                ? '⭐ Học lực Xuất sắc'
                : Number(avgGpa) >= 3.2
                ? '⭐ Học lực Giỏi'
                : Number(avgGpa) >= 2.5
                ? 'Học lực Khá'
                : 'Cần theo dõi sát'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined">stars</span>
          </div>
        </div>
      </div>

      {/* 3. Thanh Tìm kiếm & Bộ lọc trạng thái */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Tabs Trạng thái */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({totalSV})
          </button>
          <button
            onClick={() => setStatusFilter('DangHuongDan')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'DangHuongDan'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đang hướng dẫn ({dangHuongDanCount})
          </button>
          <button
            onClick={() => setStatusFilter('HoanThanh')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'HoanThanh'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã hoàn thành ({hoanThanhCount})
          </button>
        </div>

        {/* Ô tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo MSSV, Họ tên hoặc Lớp..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 4. Bảng Danh sách Sinh viên */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl animate-spin text-blue-600">sync</span>
            <p className="mt-2 text-sm font-medium">Đang tải danh sách sinh viên...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <span className="material-symbols-outlined text-4xl">error</span>
            <p className="mt-1 text-sm font-medium">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-5xl text-slate-300">person_search</span>
            <p className="mt-3 text-base font-medium text-slate-600">Chưa có sinh viên nào</p>
            <p className="text-xs text-slate-400 mt-1">
              Cán bộ Khoa chưa phân công sinh viên cho giảng viên này hoặc không có dữ liệu khớp bộ lọc.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Sinh viên</th>
                  <th className="py-3.5 px-4">Lớp / Ngành</th>
                  <th className="py-3.5 px-4">Đơn vị thực tập</th>
                  <th className="py-3.5 px-4">Ngày phân công</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredList.map((sv) => {
                  const isChuaPhanBo = !sv.tenCongTy || sv.tenCongTy.trim().toLowerCase() === 'chưa phân bổ'
                  const dateFormatted = sv.ngayPC
                    ? new Date(sv.ngayPC).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '---'

                  return (
                    <tr key={sv.maSo} className="hover:bg-slate-50/80 transition-colors">
                      {/* Cột Sinh viên */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {sv.hoTen ? sv.hoTen.slice(0, 2).toUpperCase() : 'SV'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{sv.hoTen}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                              <span>{sv.maSV}</span>
                              {sv.gpa && (
                                <span>
                                  • GPA: <strong className="text-slate-600">{Number(sv.gpa).toFixed(2)}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột Lớp / Ngành */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-700">{sv.lop || 'N/A'}</div>
                        <div className="text-xs text-slate-400">{sv.chuyenNganh || 'Công nghệ thông tin'}</div>
                      </td>

                      {/* Cột Doanh nghiệp */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-base">apartment</span>
                          <span className={`font-medium ${isChuaPhanBo ? 'text-amber-600 italic' : 'text-slate-800'}`}>
                            {sv.tenCongTy}
                          </span>
                        </div>
                      </td>

                      {/* Cột Ngày phân công */}
                      <td className="py-3.5 px-4 text-slate-500 text-xs font-mono">
                        {dateFormatted}
                      </td>

                      {/* Cột Trạng thái */}
                      <td className="py-3.5 px-4">
                        {isChuaPhanBo ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="Sinh viên chưa có đơn vị thực tập tiếp nhận">
                            Chờ tiếp nhận DN
                          </span>
                        ) : sv.trangThai === 'DangHuongDan' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đang hướng dẫn
                          </span>
                        ) : sv.trangThai === 'HoanThanh' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {sv.trangThai}
                          </span>
                        )}
                      </td>

                      {/* Cột Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Nút Xem chi tiết */}
                          <button
                            onClick={() => {
                              setSelectedSV(sv)
                              setShowDetailModal(true)
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Xem thông tin chi tiết sinh viên"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            Chi tiết
                          </button>

                          {/* Nút Liên kết sang Duyệt tiến độ */}
                          {isChuaPhanBo ? (
                            <button
                              disabled
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 rounded-lg flex items-center gap-1 cursor-not-allowed opacity-60"
                              title="Chưa thể theo dõi tiến độ khi sinh viên chưa có công ty tiếp nhận"
                            >
                              <span className="material-symbols-outlined text-sm">trending_up</span>
                              Tiến độ
                            </button>
                          ) : (
                            <Link
                              to={`/giang-vien/tien-do?sv=${sv.maSV}${urlMaGV ? '&gv=' + urlMaGV : ''}`}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                              title="Xem tiến độ báo cáo tuần của sinh viên này"
                            >
                              <span className="material-symbols-outlined text-sm">trending_up</span>
                              Tiến độ
                            </Link>
                          )}

                          {/* Nút Liên kết sang Chấm điểm CLO */}
                          {isChuaPhanBo ? (
                            <button
                              disabled
                              className="px-2.5 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 rounded-lg flex items-center gap-1 cursor-not-allowed opacity-60"
                              title="Chưa thể chấm điểm khi sinh viên chưa có công ty tiếp nhận"
                            >
                              <span className="material-symbols-outlined text-sm">fact_check</span>
                              Chấm điểm
                            </button>
                          ) : (
                            <Link
                              to={`/giang-vien/cham-diem?sv=${sv.maSV}${urlMaGV ? '&gv=' + urlMaGV : ''}`}
                              className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                              title="Đánh giá và chấm điểm CLO cho sinh viên này"
                            >
                              <span className="material-symbols-outlined text-sm">fact_check</span>
                              Chấm điểm
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Modal Xem Chi Tiết Sinh Viên */}
      {showDetailModal && selectedSV && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-base">
                  {selectedSV.hoTen ? selectedSV.hoTen.slice(0, 2).toUpperCase() : 'SV'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedSV.hoTen}</h3>
                  <p className="text-xs text-slate-400 font-mono">Mã số: {selectedSV.maSV}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-medium">Lớp sinh hoạt</span>
                <p className="text-slate-800 font-semibold mt-0.5">{selectedSV.lop || 'Chưa cập nhật'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-medium">Điểm tích lũy (GPA)</span>
                <p className="text-slate-800 font-semibold mt-0.5">{selectedSV.gpa || '3.20'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-medium">Chuyên ngành</span>
                <p className="text-slate-800 font-semibold mt-0.5">{selectedSV.chuyenNganh || 'Công nghệ phần mềm'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-medium">Mã phân công</span>
                <p className="text-slate-800 font-semibold mt-0.5">{selectedSV.maSo}</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
                <span className="material-symbols-outlined text-base">domain</span>
                Đơn vị thực tập
              </div>
              <p className="text-sm font-bold text-slate-800">{selectedSV.tenCongTy}</p>
              <p className="text-xs text-slate-500">
                Ngày phân công: {new Date(selectedSV.ngayPC).toLocaleDateString('vi-VN')}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <Link
                to={`/giang-vien/tien-do?sv=${selectedSV.maSV}${urlMaGV ? '&gv=' + urlMaGV : ''}`}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">trending_up</span>
                Vào duyệt tiến độ
              </Link>
              <Link
                to={`/giang-vien/cham-diem?sv=${selectedSV.maSV}${urlMaGV ? '&gv=' + urlMaGV : ''}`}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">fact_check</span>
                Chấm điểm CLO
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
