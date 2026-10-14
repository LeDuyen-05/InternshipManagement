import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { phieuChamDiemService } from '../../services/phieuChamDiemService'
import RubricCLOModal from '../../components/giang-vien/RubricCLOModal.jsx'
import PhieuDiemPdfModal from '../../components/giang-vien/PhieuDiemPdfModal.jsx'

export default function ChamDiemCLOPage() {
  const [searchParams] = useSearchParams()
  const { selectedDot } = useDotThucTap()

  const [studentList, setStudentList] = useState([])
  const [selectedMaSV, setSelectedMaSV] = useState('')
  const [tieuChiList, setTieuChiList] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingGrade, setLoadingGrade] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [showRubricModal, setShowRubricModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)

  // Điểm các tiêu chuẩn CLO (thang 10)
  const [scores, setScores] = useState({
    clo1: 0, // Kiến thức chuyên môn (30%)
    clo2: 0, // Kỹ năng kỹ thuật (35%)
    clo3: 0, // Tác phong & kỷ luật (20%)
    clo4: 0, // Báo cáo & thuyết trình (15%)
  })

  // Nhận xét chi tiết cho từng tiêu chí
  const [comments, setComments] = useState({
    clo1: '',
    clo2: '',
    clo3: '',
    clo4: '',
  })

  // Nhận xét chung
  const [generalReview, setGeneralReview] = useState('')
  const [confirmIntegrity, setConfirmIntegrity] = useState(true)
  const [savedSuccess, setSavedSuccess] = useState('')

  // Đọc mã sinh viên từ URL query ?sv=... nếu có
  useEffect(() => {
    const svParam = searchParams.get('sv')
    if (svParam) {
      setSelectedMaSV(svParam)
    }
  }, [searchParams])

  // 0. Tải danh mục Tiêu chí CLO từ Database SQL Server
  useEffect(() => {
    const fetchTieuChi = async () => {
      try {
        const res = await phieuChamDiemService.getDanhSachTieuChi()
        const data = res.data?.data || res.data || []
        if (Array.isArray(data) && data.length > 0) {
          setTieuChiList(data)
        }
      } catch (err) {
        console.warn('Không thể tải danh mục tiêu chí từ DB, sử dụng mặc định:', err)
      }
    }
    fetchTieuChi()
  }, [])

  // 1. Lấy danh sách SV thực tế từ SQL Server theo tài khoản GV001
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true)
        setError(null)
        const res = await gvHuongDanService.getSVTheoGiangVien('GV001')
        const data = res.data?.data || res.data || []
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item) => ({
            maSV: item.sinhVien?.maSV || item.maSV,
            hoTen: item.sinhVien?.hoTen || item.hoTen,
            lop: item.sinhVien?.lop || item.lop || 'CNTT',
            tenCongTy: item.congTy?.tenCongTy || item.tenCongTy || 'Chưa phân bổ',
            tienDo: 'Đang theo dõi',
            gpaHienTai: item.sinhVien?.gpa || item.gpa || '-',
          }))
          setStudentList(mapped)
          if (!searchParams.get('sv')) {
            setSelectedMaSV(mapped[0].maSV)
          }
        } else {
          setStudentList([])
          setSelectedMaSV('')
        }
      } catch (err) {
        console.error('Lỗi tải danh sách sinh viên:', err)
        setError('Không thể tải danh sách sinh viên từ cơ sở dữ liệu: ' + (err.response?.data?.message || err.message))
      } finally {
        setLoadingStudents(false)
      }
    }
    fetchStudents()
  }, [searchParams])

  // 2. Lấy điểm đã chấm của sinh viên từ database (bảng PHIEUCHAMDIEM & CHITIETCHAMDIEM)
  useEffect(() => {
    if (!selectedMaSV || !selectedDot?.maDot) return
    const fetchExistingGrade = async () => {
      try {
        setLoadingGrade(true)
        const res = await phieuChamDiemService.getPhieuChamBySinhVien(selectedMaSV, selectedDot.maDot)
        if (res.data?.success && res.data.data) {
          const p = res.data.data
          if (p.chiTiets && p.chiTiets.length > 0) {
            const newScores = { clo1: 0, clo2: 0, clo3: 0, clo4: 0 }
            const newComments = { clo1: '', clo2: '', clo3: '', clo4: '' }

            p.chiTiets.forEach((ct) => {
              const val = Number(ct.diemCham)
              if (ct.maTieuChi === 'TC02') {
                newScores.clo1 = Math.round((val > 4 ? val : (val / 4.0) * 10) * 10) / 10
                newComments.clo1 = ct.nhanXet || ''
              }
              if (ct.maTieuChi === 'TC03') {
                newScores.clo2 = Math.round((val > 2 ? val : (val / 2.0) * 10) * 10) / 10
                newComments.clo2 = ct.nhanXet || ''
              }
              if (ct.maTieuChi === 'TC01') {
                newScores.clo3 = Math.round((val > 3 ? val : (val / 3.0) * 10) * 10) / 10
                newComments.clo3 = ct.nhanXet || ''
              }
              if (ct.maTieuChi === 'TC04') {
                newScores.clo4 = Math.round((val > 1 ? val : (val / 1.0) * 10) * 10) / 10
                newComments.clo4 = ct.nhanXet || ''
              }
            })
            setScores(newScores)
            setComments(newComments)
            setGeneralReview(p.nhanXet || '')
          }
        } else {
          // Chưa chấm điểm: reset về 0 và rỗng
          setScores({ clo1: 0, clo2: 0, clo3: 0, clo4: 0 })
          setComments({ clo1: '', clo2: '', clo3: '', clo4: '' })
          setGeneralReview('')
        }
      } catch (err) {
        // Chưa có phiếu chấm trong DB
        setScores({ clo1: 0, clo2: 0, clo3: 0, clo4: 0 })
        setComments({ clo1: '', clo2: '', clo3: '', clo4: '' })
        setGeneralReview('')
      } finally {
        setLoadingGrade(false)
      }
    }
    fetchExistingGrade()
  }, [selectedMaSV, selectedDot?.maDot])

  // Sinh viên đang chọn
  const currentStudent = studentList.find((s) => s.maSV === selectedMaSV)

  // Trọng số chuẩn theo mô hình ABET/AUN-QA
  const weights = {
    clo1: 0.3,
    clo2: 0.35,
    clo3: 0.2,
    clo4: 0.15,
  }

  // Tính điểm tổng kết tự động
  const finalScore = useMemo(() => {
    const total =
      (scores.clo1 || 0) * weights.clo1 +
      (scores.clo2 || 0) * weights.clo2 +
      (scores.clo3 || 0) * weights.clo3 +
      (scores.clo4 || 0) * weights.clo4
    return Math.min(10, Math.max(0, total)).toFixed(2)
  }, [scores])

  // Xếp loại chữ
  const gradeInfo = useMemo(() => {
    const num = parseFloat(finalScore)
    if (num === 0) return { letter: '-', rank: 'Chưa chấm', passed: false, color: 'text-slate-600 bg-slate-50 border-slate-200' }
    if (num >= 8.5) return { letter: 'A', rank: 'Xuất sắc', passed: true, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
    if (num >= 8.0) return { letter: 'B+', rank: 'Giỏi', passed: true, color: 'text-blue-700 bg-blue-50 border-blue-200' }
    if (num >= 7.0) return { letter: 'B', rank: 'Khá', passed: true, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' }
    if (num >= 6.5) return { letter: 'C+', rank: 'Trung bình khá', passed: true, color: 'text-amber-700 bg-amber-50 border-amber-200' }
    if (num >= 5.5) return { letter: 'C', rank: 'Trung bình', passed: true, color: 'text-amber-700 bg-amber-50 border-amber-200' }
    if (num >= 4.0) return { letter: 'D', rank: 'Yếu', passed: true, color: 'text-orange-700 bg-orange-50 border-orange-200' }
    return { letter: 'F', rank: 'Không đạt', passed: false, color: 'text-rose-700 bg-rose-50 border-rose-200' }
  }, [finalScore])

  const handleScoreChange = (key, value) => {
    let num = parseFloat(value)
    if (isNaN(num)) num = 0
    if (num > 10) num = 10
    if (num < 0) num = 0
    setScores((prev) => ({ ...prev, [key]: num }))
  }

  // Lưu điểm chính thức vào SQL Server
  const handleFinalize = async () => {
    if (!currentStudent) return
    if (!confirmIntegrity) {
      alert('Vui lòng đánh dấu xác nhận tính chính xác và khách quan trước khi chốt điểm!')
      return
    }

    try {
      setSubmitting(true)
      await phieuChamDiemService.chamDiem({
        maSV: currentStudent.maSV,
        maDot: selectedDot?.maDot || 'DOT01',
        maGVHuongDan: 'GV001',
        tongDiem: parseFloat(finalScore),
        chiTiets: [
          { maTieuChi: 'TC01', diemCham: parseFloat(((scores.clo3 / 10) * 3.0).toFixed(2)), nhanXet: comments.clo3 },
          { maTieuChi: 'TC02', diemCham: parseFloat(((scores.clo1 / 10) * 4.0).toFixed(2)), nhanXet: comments.clo1 },
          { maTieuChi: 'TC03', diemCham: parseFloat(((scores.clo2 / 10) * 2.0).toFixed(2)), nhanXet: comments.clo2 },
          { maTieuChi: 'TC04', diemCham: parseFloat(((scores.clo4 / 10) * 1.0).toFixed(2)), nhanXet: comments.clo4 },
        ],
      })

      setSavedSuccess(`Đã chốt điểm thành công cho sinh viên ${currentStudent.hoTen} (${finalScore}/10) vào cơ sở dữ liệu!`)
    } catch (err) {
      alert('Lỗi khi lưu điểm vào SQL Server: ' + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  // Lưu bản nháp vào SQL Server
  const handleSaveDraft = async () => {
    if (!currentStudent) return
    try {
      setSubmitting(true)
      await phieuChamDiemService.chamDiem({
        maSV: currentStudent.maSV,
        maDot: selectedDot?.maDot || 'DOT01',
        maGVHuongDan: 'GV001',
        tongDiem: parseFloat(finalScore),
        chiTiets: [
          { maTieuChi: 'TC01', diemCham: parseFloat(((scores.clo3 / 10) * 3.0).toFixed(2)), nhanXet: comments.clo3 },
          { maTieuChi: 'TC02', diemCham: parseFloat(((scores.clo1 / 10) * 4.0).toFixed(2)), nhanXet: comments.clo1 },
          { maTieuChi: 'TC03', diemCham: parseFloat(((scores.clo2 / 10) * 2.0).toFixed(2)), nhanXet: comments.clo2 },
          { maTieuChi: 'TC04', diemCham: parseFloat(((scores.clo4 / 10) * 1.0).toFixed(2)), nhanXet: comments.clo4 },
        ],
      })
      setSavedSuccess(`Đã lưu bản nháp đánh giá CLO của ${currentStudent.hoTen} vào database!`)
    } catch (err) {
      alert('Lỗi khi lưu bản nháp vào SQL Server: ' + (err.response?.data?.message || err.message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Trang & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>{selectedDot?.namHoc || 'Học kỳ hiện tại'}</span>
            <span>•</span>
            <span className="text-blue-600 font-bold">Chuẩn kiểm định quốc tế ABET & AUN-QA</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Đánh Giá & Chấm Điểm CLO
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              {selectedDot?.tenDot || 'Đợt thực tập'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bảng đánh giá mức độ đạt chuẩn đầu ra (Course Learning Outcomes) theo quy chế thực tập doanh nghiệp Khoa CNTT.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRubricModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 border border-blue-200 shadow-sm transition-all hover:shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-blue-600">menu_book</span>
            <span>Hướng dẫn Rubric CLO</span>
          </button>
        </div>
      </div>

      {/* Thông báo thành công nếu có */}
      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span className="font-semibold">{savedSuccess}</span>
          </div>
          <button onClick={() => setSavedSuccess('')} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

      {loadingStudents ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          Đang tải danh sách sinh viên hướng dẫn từ cơ sở dữ liệu...
        </div>
      ) : studentList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <span className="material-symbols-outlined text-4xl text-slate-300">school</span>
          <p className="text-sm font-semibold text-slate-700">Chưa có sinh viên nào được phân công hướng dẫn cho Giảng viên GV001 trong cơ sở dữ liệu.</p>
          <p className="text-xs text-slate-400">Vui lòng phân công sinh viên cho giảng viên tại cổng Cán bộ Khoa trước.</p>
        </div>
      ) : (
        <>
          {/* 2. Bộ chọn sinh viên & Thẻ tóm tắt thông tin */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Bộ chọn sinh viên */}
            <div className="xl:col-span-6 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sinh viên hướng dẫn ({studentList.length} SV)</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                    Đang chấm điểm
                  </span>
                </div>

                <div className="relative">
                  <select
                    value={selectedMaSV}
                    onChange={(e) => setSelectedMaSV(e.target.value)}
                    className="w-full h-11 pl-3 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {studentList.map((s) => (
                      <option key={s.maSV} value={s.maSV}>
                        {s.hoTen} ({s.maSV}) - {s.lop}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentStudent && (
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400">Đơn vị thực tập</span>
                    <p className="font-bold text-slate-800 mt-0.5 truncate" title={currentStudent.tenCongTy}>
                      {currentStudent.tenCongTy}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400">Điểm GPA tích lũy</span>
                    <p className="font-bold text-emerald-600 mt-0.5">{currentStudent.gpaHienTai}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tổng quan cấu trúc điểm học phần */}
            <div className="xl:col-span-6 bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-blue-200 uppercase font-semibold">
                  <span>Tổng hợp điểm CLO GVHD</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold">Trọng số 40% Điểm HP</span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-black font-mono tracking-tight">{finalScore}</span>
                  <span className="text-xl text-blue-200 font-semibold">/ 10</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white text-blue-800 shadow-sm">
                    <span className="material-symbols-outlined text-sm">military_tech</span>
                    Điểm chữ: {gradeInfo.letter} ({gradeInfo.rank})
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {gradeInfo.passed ? 'Đạt chuẩn đầu ra' : 'Chưa đạt chuẩn'}
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10 text-xs text-blue-200 flex justify-between items-center">
                <span>Trạng thái phiếu điểm:</span>
                <span className="font-bold text-white">
                  {loadingGrade ? 'Đang đọc DB...' : parseFloat(finalScore) > 0 ? 'Đã có điểm trong DB' : 'Chưa có điểm'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Bảng Nhập Điểm Tiêu Chí CLO */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Chi Tiết Tiêu Chí Đánh Giá Chuẩn Đầu Ra (ABET / AUN-QA)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giảng viên nhập điểm thang 10 cho từng chuẩn đầu ra. Hệ thống sẽ tự động nhân trọng số và quy đổi theo biểu mẫu BM-KD-08/FIT.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">Mã CLO</th>
                    <th className="py-3 px-4 min-w-[280px]">Nội dung tiêu chuẩn đầu ra</th>
                    <th className="py-3 px-4 w-24 text-center">Trọng số</th>
                    <th className="py-3 px-4 w-32 text-center">Điểm đánh giá (0-10)</th>
                    <th className="py-3 px-4 w-28 text-center">Điểm quy đổi</th>
                    <th className="py-3 px-4 min-w-[220px]">Nhận xét chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {/* CLO1 */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 align-top">
                      <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                        CLO 1
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <p className="font-bold text-slate-900 text-sm">Kiến thức chuyên môn & ứng dụng công nghệ</p>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Khả năng áp dụng kiến thức cốt lõi ngành CNTT vào môi trường sản xuất thực tế tại doanh nghiệp.
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top text-center font-bold text-slate-700">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-mono">30%</span>
                    </td>
                    <td className="py-4 px-4 align-top text-center">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={scores.clo1}
                        onChange={(e) => handleScoreChange('clo1', e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    </td>
                    <td className="py-4 px-4 align-top text-center font-mono font-bold text-blue-700 text-sm">
                      {((scores.clo1 || 0) * weights.clo1).toFixed(2)} đ
                    </td>
                    <td className="py-4 px-4 align-top">
                      <input
                        type="text"
                        value={comments.clo1}
                        onChange={(e) => setComments({ ...comments, clo1: e.target.value })}
                        placeholder="Nhập nhận xét tiêu chí CLO 1..."
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>

                  {/* CLO2 */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 align-top">
                      <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        CLO 2
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <p className="font-bold text-slate-900 text-sm">Kỹ năng kỹ thuật, lập trình & giải quyết bài toán</p>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Khả năng tiếp cận công nghệ mới, thiết kế hệ thống, viết mã nguồn sạch, gỡ lỗi và kiểm thử phần mềm.
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top text-center font-bold text-slate-700">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-mono">35%</span>
                    </td>
                    <td className="py-4 px-4 align-top text-center">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={scores.clo2}
                        onChange={(e) => handleScoreChange('clo2', e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    </td>
                    <td className="py-4 px-4 align-top text-center font-mono font-bold text-indigo-700 text-sm">
                      {((scores.clo2 || 0) * weights.clo2).toFixed(2)} đ
                    </td>
                    <td className="py-4 px-4 align-top">
                      <input
                        type="text"
                        value={comments.clo2}
                        onChange={(e) => setComments({ ...comments, clo2: e.target.value })}
                        placeholder="Nhập nhận xét tiêu chí CLO 2..."
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>

                  {/* CLO3 */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 align-top">
                      <span className="inline-flex items-center gap-1 font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200">
                        CLO 3
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <p className="font-bold text-slate-900 text-sm">Thái độ làm việc, kỷ luật & đạo đức nghề nghiệp</p>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Tuân thủ nội quy công ty, bảo mật dữ liệu, tích cực tương tác và tinh thần trách nhiệm trong phối hợp nhóm.
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top text-center font-bold text-slate-700">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-mono">20%</span>
                    </td>
                    <td className="py-4 px-4 align-top text-center">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={scores.clo3}
                        onChange={(e) => handleScoreChange('clo3', e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    </td>
                    <td className="py-4 px-4 align-top text-center font-mono font-bold text-cyan-700 text-sm">
                      {((scores.clo3 || 0) * weights.clo3).toFixed(2)} đ
                    </td>
                    <td className="py-4 px-4 align-top">
                      <input
                        type="text"
                        value={comments.clo3}
                        onChange={(e) => setComments({ ...comments, clo3: e.target.value })}
                        placeholder="Nhập nhận xét tiêu chí CLO 3..."
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>

                  {/* CLO4 */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 align-top">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        CLO 4
                      </span>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <p className="font-bold text-slate-900 text-sm">Báo cáo, thuyết trình & tư duy phản biện</p>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                        Chất lượng viết báo cáo tổng kết, tính khoa học của tài liệu bàn giao và khả năng giải trình kết quả đạt được.
                      </p>
                    </td>
                    <td className="py-4 px-4 align-top text-center font-bold text-slate-700">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 font-mono">15%</span>
                    </td>
                    <td className="py-4 px-4 align-top text-center">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={scores.clo4}
                        onChange={(e) => handleScoreChange('clo4', e.target.value)}
                        className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    </td>
                    <td className="py-4 px-4 align-top text-center font-mono font-bold text-emerald-700 text-sm">
                      {((scores.clo4 || 0) * weights.clo4).toFixed(2)} đ
                    </td>
                    <td className="py-4 px-4 align-top">
                      <input
                        type="text"
                        value={comments.clo4}
                        onChange={(e) => setComments({ ...comments, clo4: e.target.value })}
                        placeholder="Nhập nhận xét tiêu chí CLO 4..."
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Nhận xét chung & Điều khoản */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-200 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Nhận xét tổng quát của Giảng viên hướng dẫn:
                </label>
                <textarea
                  rows={3}
                  value={generalReview}
                  onChange={(e) => setGeneralReview(e.target.value)}
                  placeholder="Nhập nhận xét tổng quát về thái độ, năng lực và kết quả thực tập của sinh viên..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-integrity"
                  checked={confirmIntegrity}
                  onChange={(e) => setConfirmIntegrity(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="confirm-integrity" className="text-xs text-slate-600 cursor-pointer select-none">
                  Tôi xác nhận điểm số phản ánh khách quan, minh bạch quá trình thực tập của sinh viên theo chuẩn kiểm định đào tạo.
                </label>
              </div>

              {/* Toolbar nút hành động */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base text-rose-600">picture_as_pdf</span>
                  Xem & Xuất phiếu điểm PDF
                </button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={submitting}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    Lưu bản nháp vào DB
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalize}
                    disabled={submitting}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                    <span>Chốt & Gửi Điểm Kiểm Định</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Rubric CLO */}
      <RubricCLOModal isOpen={showRubricModal} onClose={() => setShowRubricModal(false)} />

      {/* MODAL 2: Xem trước Phiếu điểm PDF */}
      {currentStudent && (
        <PhieuDiemPdfModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          currentStudent={currentStudent}
          selectedDot={selectedDot}
          scores={scores}
          comments={comments}
          finalScore={finalScore}
          gradeInfo={gradeInfo}
          generalReview={generalReview}
        />
      )}
    </div>
  )
}
