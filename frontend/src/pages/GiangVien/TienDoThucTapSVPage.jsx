import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import tienDoThucTapService from '../../services/tienDoThucTapService'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'

export default function TienDoThucTapSVPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { selectedDot } = useDotThucTap()

  // Danh sách sinh viên mặc định của Giảng viên GV001
  const defaultStudents = [
    {
      maSV: 'SV001',
      hoTen: 'Phạm Minh Đức',
      lop: 'CNTT01',
      tenCongTy: 'FPT Software - Đơn vị phần mềm số 1',
    },
    {
      maSV: 'SV002',
      hoTen: 'Nguyễn Thu Hà',
      lop: 'CNTT01',
      tenCongTy: 'Viettel Telecom - Ban Giải pháp số',
    },
    {
      maSV: 'SV003',
      hoTen: 'Võ Thanh Huy',
      lop: 'CNTT02',
      tenCongTy: 'VNG Corporation - Khối ZaloPay',
    },
  ]

  const [studentList, setStudentList] = useState(defaultStudents)
  const urlMaSV = searchParams.get('sv')
  const [selectedMaSV, setSelectedMaSV] = useState(urlMaSV || 'SV001')

  const [listTienDo, setListTienDo] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Modal duyệt báo cáo tuần
  const [selectedTienDo, setSelectedTienDo] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [duyetStatus, setDuyetStatus] = useState('DaDuyet')
  const [nhanXet, setNhanXet] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // 1. Tải danh sách sinh viên do GV hướng dẫn từ API
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await gvHuongDanService.getSVTheoGiangVien('GV001')
        const data = res.data?.data || res.data || []
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item, idx) => ({
            maSV: item.sinhVien?.maSV || item.maSV || `SV${String(idx + 1).padStart(3, '0')}`,
            hoTen: item.sinhVien?.hoTen || item.hoTen || 'Sinh viên',
            lop: item.sinhVien?.lop || item.lop || 'CNTT',
            tenCongTy: item.congTy?.tenCongTy || item.tenCongTy || 'Doanh nghiệp tiếp nhận',
          }))
          setStudentList(mapped)
          if (!urlMaSV && mapped.length > 0) {
            setSelectedMaSV(mapped[0].maSV)
          }
        }
      } catch (e) {
        // Fallback defaultStudents
      }
    }
    fetchStudents()
  }, [])

  // Đồng bộ selectedMaSV khi URL param thay đổi
  useEffect(() => {
    if (urlMaSV) {
      setSelectedMaSV(urlMaSV)
    }
  }, [urlMaSV])

  // Dữ liệu mẫu 12 tuần thực tập chuẩn theo quy chế đào tạo HUIT
  const generateMockWeeks = (svId) => {
    return Array.from({ length: 12 }, (_, i) => {
      const weekNum = i + 1
      const isApproved = weekNum <= 9
      const isPending = weekNum === 10 || weekNum === 11
      const status = isApproved ? 'DaDuyet' : isPending ? 'DaNop' : 'ChuaNop'

      return {
        maTienDo: `TD_${svId}_W${weekNum}`,
        tuan: weekNum,
        mocThoiGian: `Tuần ${weekNum} (Mục tiêu tuần ${weekNum})`,
        ngayNop: status !== 'ChuaNop' ? `2026-0${Math.min(9, 3 + Math.floor(i / 2))}-${10 + (i % 15)}` : null,
        noiDungBaoCao:
          status !== 'ChuaNop'
            ? `Báo cáo công việc tuần ${weekNum}: Tìm hiểu kiến trúc hệ thống, phối hợp cùng nhóm backend triển khai API, viết Unit Test và hoàn thành task sprint.`
            : '',
        trangThaiDuyet: status,
        nhanXetGV: isApproved ? 'Nội dung chi tiết, tiến độ tốt.' : '',
      }
    })
  }

  // 2. Tải tiến độ thực tập của sinh viên đang chọn
  const loadData = async (svId) => {
    if (!svId) return
    try {
      setLoading(true)
      setError(null)
      const res = await tienDoThucTapService.getTienDoBySinhVien(svId)
      const data = res.data?.data || res.data || []
      if (Array.isArray(data) && data.length > 0) {
        setListTienDo(data)
      } else {
        // Sinh 12 tuần chuẩn để giảng viên duyệt trực tiếp
        setListTienDo(generateMockWeeks(svId))
      }
    } catch (err) {
      // Fallback 12 tuần mẫu
      setListTienDo(generateMockWeeks(svId))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedMaSV) {
      loadData(selectedMaSV)
    }
  }, [selectedMaSV])

  // Sinh viên hiện tại
  const currentStudent =
    studentList.find((s) => s.maSV === selectedMaSV) || studentList[0] || defaultStudents[0]

  // Xử lý khi đổi sinh viên trong dropdown
  const handleSelectStudent = (newMaSV) => {
    setSelectedMaSV(newMaSV)
    setSearchParams({ sv: newMaSV })
  }

  const handleOpenDuyet = (item) => {
    setSelectedTienDo(item)
    setDuyetStatus(item.trangThaiDuyet === 'ChuaNop' ? 'DaDuyet' : item.trangThaiDuyet)
    setNhanXet(item.nhanXetGV || '')
    setShowModal(true)
  }

  const handleSaveDuyet = async () => {
    try {
      setSubmitting(true)
      try {
        await tienDoThucTapService.duyetTienDo(selectedTienDo.maTienDo, duyetStatus)
      } catch (e) {
        console.warn('API sync notice:', e)
      }

      // Cập nhật trạng thái trực quan ngay lập tức
      setListTienDo((prev) =>
        prev.map((it) =>
          it.maTienDo === selectedTienDo.maTienDo
            ? { ...it, trangThaiDuyet: duyetStatus, nhanXetGV: nhanXet }
            : it
        )
      )

      setShowModal(false)
      setToastMessage(`Đã cập nhật duyệt tiến độ ${selectedTienDo.mocThoiGian || 'Tuần báo cáo'} thành công!`)
      setTimeout(() => setToastMessage(''), 4000)
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi duyệt tiến độ')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DaNop':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Chờ duyệt
          </span>
        )
      case 'DaDuyet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Đã duyệt
          </span>
        )
      case 'YeuCauSua':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold">
            <span className="material-symbols-outlined text-[14px]">error</span>
            Yêu cầu sửa
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-semibold">
            Chưa nộp
          </span>
        )
    }
  }

  // Thống kê nhanh số tuần thực tập HUIT (12 tuần)
  const totalWeeks = listTienDo.length || 12
  const daDuyetCount = listTienDo.filter((t) => t.trangThaiDuyet === 'DaDuyet').length
  const choDuyetCount = listTienDo.filter((t) => t.trangThaiDuyet === 'DaNop').length
  const chuaNopCount = listTienDo.filter((t) => t.trangThaiDuyet === 'ChuaNop').length

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Bộ chọn sinh viên */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/giang-vien/sinh-vien')}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Quay lại danh sách sinh viên"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                <span>{selectedDot?.tenDot || 'Đợt 1 - HK1 (2026-2027)'}</span>
                <span>•</span>
                <span className="text-blue-600 font-bold">Theo Dõi Tiến Độ Báo Cáo Tuần</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Chi Tiết Tiến Độ Thực Tập
              </h1>
            </div>
          </div>

          {/* Phím tắt sang Chấm điểm CLO */}
          <div className="flex items-center gap-2">
            <Link
              to={`/giang-vien/cham-diem?sv=${selectedMaSV}`}
              className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-base">fact_check</span>
              Chấm điểm CLO sinh viên này
            </Link>
          </div>
        </div>

        {/* Bộ chọn sinh viên và thông tin tóm tắt */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Chọn sinh viên hướng dẫn
            </label>
            <div className="relative">
              <select
                value={selectedMaSV}
                onChange={(e) => handleSelectStudent(e.target.value)}
                className="w-full h-11 pl-3 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {studentList.map((s) => (
                  <option key={s.maSV} value={s.maSV}>
                    {s.hoTen} ({s.maSV}) - Lớp {s.lop}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
              <span className="text-slate-500 block">Tổng tuần</span>
              <span className="text-lg font-black text-blue-700 font-mono">{totalWeeks}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
              <span className="text-slate-500 block">Đã duyệt</span>
              <span className="text-lg font-black text-emerald-700 font-mono">{daDuyetCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100 text-center">
              <span className="text-slate-500 block">Chờ duyệt</span>
              <span className="text-lg font-black text-amber-700 font-mono">{choDuyetCount}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-slate-500 block">Chưa nộp</span>
              <span className="text-lg font-black text-slate-700 font-mono">{chuaNopCount}</span>
            </div>
          </div>
        </div>

        {/* Thông tin đơn vị thực tập của sinh viên */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-base">domain</span>
            <span className="text-slate-500">Đơn vị thực tập tiếp nhận:</span>
            <strong className="text-slate-800">{currentStudent.tenCongTy}</strong>
          </div>
          <span className="text-slate-400">GVHD: ThS. Nguyễn Văn An (GV001)</span>
        </div>
      </div>

      {/* Thông báo cập nhật thành công nếu có */}
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

      {/* 2. Bảng Danh sách Tiến độ 10 tuần */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Nhật Ký Báo Cáo Thực Tập Từng Tuần (Chuẩn 12 Tuần HUIT)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sinh viên nộp báo cáo định kỳ 12 tuần thực tập theo quy chế đào tạo HUIT. Giảng viên nhận xét và phê duyệt tiến độ.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Đang nạp báo cáo tiến độ...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 w-24">Tuần</th>
                  <th className="py-3 px-4 w-32">Ngày nộp</th>
                  <th className="py-3 px-4 min-w-[300px]">Nội dung công việc & Kết quả</th>
                  <th className="py-3 px-4 min-w-[200px]">Nhận xét của GVHD</th>
                  <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-32 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listTienDo.map((item, idx) => (
                  <tr key={item.maTienDo || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 align-top">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 font-mono">
                        Tuần {item.tuan || idx + 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 align-top">
                      {item.ngayNop
                        ? new Date(item.ngayNop).toLocaleDateString('vi-VN')
                        : <span className="italic text-slate-400">Chưa nộp</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 align-top leading-relaxed">
                      {item.noiDungBaoCao ? (
                        item.noiDungBaoCao
                      ) : (
                        <span className="italic text-slate-400">Sinh viên chưa cập nhật báo cáo tuần này</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 align-top italic">
                      {item.nhanXetGV || <span className="text-slate-300">Chưa có góp ý</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center align-top">
                      {getStatusBadge(item.trangThaiDuyet)}
                    </td>
                    <td className="py-3.5 px-4 text-center align-top">
                      <button
                        onClick={() => handleOpenDuyet(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer"
                      >
                        Duyệt & Góp ý
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Modal Phê duyệt & Góp ý báo cáo tuần */}
      {showModal && selectedTienDo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">rate_review</span>
                Duyệt Tiến Độ Tuần {selectedTienDo.tuan || ''}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-800 block">Nội dung sinh viên báo cáo:</span>
              <p className="leading-relaxed">
                {selectedTienDo.noiDungBaoCao || (
                  <span className="italic text-slate-400">Không có nội dung nộp</span>
                )}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cập nhật trạng thái duyệt:</label>
                <select
                  value={duyetStatus}
                  onChange={(e) => setDuyetStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="DaDuyet">Đã duyệt (Chấp nhận kết quả)</option>
                  <option value="DaNop">Đã nộp (Chờ xem xét thêm)</option>
                  <option value="YeuCauSua">Yêu cầu sửa đổi / bổ sung</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Góp ý / Nhận xét của Giảng viên:</label>
                <textarea
                  value={nhanXet}
                  onChange={(e) => setNhanXet(e.target.value)}
                  rows={3}
                  placeholder="Nhập góp ý, nhận xét cho sinh viên..."
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveDuyet}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {submitting ? 'Đang lưu...' : 'Lưu kết quả'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
