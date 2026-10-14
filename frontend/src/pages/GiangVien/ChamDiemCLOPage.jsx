import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { useIdentity } from '../../hooks/useIdentity'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { phieuChamDiemService } from '../../services/phieuChamDiemService'
import RubricCLOModal from '../../components/giang-vien/RubricCLOModal.jsx'
import PhieuDiemPdfModal from '../../components/giang-vien/PhieuDiemPdfModal.jsx'
import NoLinkedAccount from '../../components/common/NoLinkedAccount.jsx'

export default function ChamDiemCLOPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedDot, isReadOnly } = useDotThucTap()
  const { user, maGV, role } = useIdentity()
  const isStaff = role === 'VT01' || role === 'VT02'

  const [studentList, setStudentList] = useState([])
  const [selectedMaSV, setSelectedMaSV] = useState('')
  const [criteria, setCriteria] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingGrade, setLoadingGrade] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState('')
  const [lecturerName, setLecturerName] = useState(user?.hoTen || user?.tenDangNhap || '')

  const [showRubricModal, setShowRubricModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)

  // Điểm từng tiêu chí theo maTieuChi (khởi tạo rỗng)
  const [scores, setScores] = useState({})
  const [generalReview, setGeneralReview] = useState('')
  const [confirmIntegrity, setConfirmIntegrity] = useState(false)

  // Lấy thông tin giảng viên thật
  useEffect(() => {
    gvHuongDanService
      .getGiangVienTai()
      .then((res) => {
        if (res.data?.hoTen) setLecturerName(res.data.hoTen)
      })
      .catch(() => {})
  }, [])

  // Tải danh mục Tiêu chí CLO từ API
  useEffect(() => {
    const fetchTieuChi = async () => {
      try {
        const res = await phieuChamDiemService.getDanhSachTieuChi()
        const data = res.data?.data || res.data || []
        if (Array.isArray(data)) {
          setCriteria(data)
        }
      } catch (err) {
        console.warn('Không thể tải danh mục tiêu chí:', err)
      }
    }
    fetchTieuChi()
  }, [])

  // Lấy danh sách SV thực tế theo giảng viên
  useEffect(() => {
    if (!maGV && !isStaff) return
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true)
        setError(null)
        const targetGV = maGV || ''
        const res = await gvHuongDanService.getSVTheoGiangVien(targetGV)
        const data = res.data?.data || res.data || []
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((item) => ({
            maSV: item.sinhVien?.maSV || item.maSV,
            hoTen: item.sinhVien?.hoTen || item.hoTen,
            lop: item.sinhVien?.lop || item.lop || '—',
            tenCongTy: item.congTy?.tenCongTy || item.tenCongTy || '—',
            gpaHienTai: item.sinhVien?.gpa ?? item.gpa ?? '—',
          }))
          setStudentList(mapped)
          const requestedMaSV = searchParams.get('sv')
          const requestedStudentIsAssigned = mapped.some((student) => student.maSV === requestedMaSV)
          const nextMaSV = requestedStudentIsAssigned ? requestedMaSV : mapped[0].maSV
          setSelectedMaSV(nextMaSV)
          if (nextMaSV !== requestedMaSV) {
            setSearchParams({ sv: nextMaSV }, { replace: true })
          }
        } else {
          setStudentList([])
          setSelectedMaSV('')
        }
      } catch (err) {
        setError('Không thể tải danh sách sinh viên: ' + (err.response?.data?.message || err.message))
      } finally {
        setLoadingStudents(false)
      }
    }
    fetchStudents()
  }, [maGV, isStaff, searchParams, setSearchParams])

  // Lấy điểm đã chấm của sinh viên từ database
  useEffect(() => {
    if (!selectedMaSV || !selectedDot?.maDot) {
      setScores({})
      setGeneralReview('')
      return
    }

    const fetchExistingGrade = async () => {
      try {
        setLoadingGrade(true)
        setScores({})
        setGeneralReview('')
        const res = await phieuChamDiemService.getPhieuChamBySinhVien(selectedMaSV, selectedDot.maDot)
        if (res.data?.success && res.data.data) {
          const p = res.data.data
          if (p.chiTiets && p.chiTiets.length > 0) {
            const loaded = {}
            p.chiTiets.forEach((ct) => {
              loaded[ct.maTieuChi] = Number(ct.diemCham)
            })
            setScores(loaded)
            setGeneralReview(p.nhanXet || '')
          }
        }
      } catch {
        // Chưa có phiếu chấm: giữ form rỗng
        setScores({})
        setGeneralReview('')
      } finally {
        setLoadingGrade(false)
      }
    }
    fetchExistingGrade()
  }, [selectedMaSV, selectedDot?.maDot])

  // Tính tổng điểm trực tiếp từ tổng các tiêu chí
  const totalScore = useMemo(() => {
    if (!criteria.length) return '0.00'
    const total = criteria.reduce((sum, c) => {
      const val = parseFloat(scores[c.maTieuChi])
      return sum + (isNaN(val) ? 0 : val)
    }, 0)
    return Math.min(10, Math.max(0, total)).toFixed(2)
  }, [criteria, scores])

  // Xếp loại theo thang điểm 10
  const gradeInfo = useMemo(() => {
    const num = parseFloat(totalScore)
    const hasAnyScore = Object.values(scores).some((v) => v !== '' && v !== null && v !== undefined && Number(v) > 0)
    if (!hasAnyScore && num === 0) {
      return { letter: '-', rank: 'Chưa chấm', passed: false, color: 'text-slate-600 bg-slate-50 border-slate-200' }
    }
    if (num >= 8.5) return { letter: 'A', rank: 'Xuất sắc', passed: true, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
    if (num >= 8.0) return { letter: 'B+', rank: 'Giỏi', passed: true, color: 'text-blue-700 bg-blue-50 border-blue-200' }
    if (num >= 7.0) return { letter: 'B', rank: 'Khá', passed: true, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' }
    if (num >= 6.5) return { letter: 'C+', rank: 'Trung bình khá', passed: true, color: 'text-amber-700 bg-amber-50 border-amber-200' }
    if (num >= 5.5) return { letter: 'C', rank: 'Trung bình', passed: true, color: 'text-amber-700 bg-amber-50 border-amber-200' }
    if (num >= 4.0) return { letter: 'D', rank: 'Yếu', passed: true, color: 'text-orange-700 bg-orange-50 border-orange-200' }
    return { letter: 'F', rank: 'Không đạt', passed: false, color: 'text-rose-700 bg-rose-50 border-rose-200' }
  }, [totalScore, scores])

  if (!maGV && !isStaff) {
    return <NoLinkedAccount />
  }

  const currentStudent = studentList.find((s) => s.maSV === selectedMaSV) || studentList[0] || null

  const handleScoreChange = (maTieuChi, value, maxVal) => {
    if (value === '') {
      setScores((prev) => ({ ...prev, [maTieuChi]: '' }))
      return
    }
    let num = parseFloat(value)
    if (isNaN(num)) num = 0
    if (num < 0) num = 0
    if (num > maxVal) num = maxVal
    setScores((prev) => ({ ...prev, [maTieuChi]: num }))
  }

  // Lưu điểm chính thức vào server
  const handleSave = async () => {
    if (!currentStudent || !selectedDot?.maDot) return
    if (isReadOnly) {
      alert('Đợt thực tập đã kết thúc hoặc ở chế độ chỉ đọc.')
      return
    }
    if (!confirmIntegrity) {
      alert('Vui lòng xác nhận tính chính xác và khách quan trước khi lưu điểm!')
      return
    }

    // Kiểm tra điểm từng tiêu chí
    for (const c of criteria) {
      const val = Number(scores[c.maTieuChi] ?? 0)
      if (val < 0 || val > c.diemToiDa) {
        alert(`Điểm cho tiêu chí "${c.tenTieuChi}" phải từ 0 đến ${c.diemToiDa}.`)
        return
      }
    }

    try {
      setSubmitting(true)
      setError(null)
      await phieuChamDiemService.chamDiem({
        maSV: currentStudent.maSV,
        maDot: selectedDot.maDot,
        chiTiets: criteria.map((c) => ({
          maTieuChi: c.maTieuChi,
          diemCham: Number(scores[c.maTieuChi] ?? 0),
        })),
      })

      setSavedSuccess(`Đã lưu điểm thành công cho sinh viên ${currentStudent.hoTen} (${totalScore}/10).`)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể lưu điểm vào hệ thống.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Trang */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>{selectedDot?.namHoc || 'Năm học'}</span>
            <span>•</span>
            <span className="text-blue-600 font-bold">Chuẩn đánh giá học phần Thực tập</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Đánh Giá & Chấm Điểm Thực Tập
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              {selectedDot?.tenDot || 'Đợt thực tập'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đánh giá theo từng tiêu chí quy định bởi Khoa Công nghệ Thông tin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRubricModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 border border-blue-200 shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base text-blue-600">menu_book</span>
            <span>Hướng dẫn Rubric</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600">error</span>
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      )}

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
          Đang tải danh sách sinh viên hướng dẫn...
        </div>
      ) : studentList.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
          <span className="material-symbols-outlined text-4xl text-slate-300">school</span>
          <p className="text-sm font-semibold text-slate-700">Chưa có sinh viên nào được phân công hướng dẫn.</p>
          <p className="text-xs text-slate-400">Danh sách sinh viên phân công sẽ được cập nhật từ Văn phòng Khoa.</p>
        </div>
      ) : (
        <>
          {/* 2. Bộ chọn sinh viên & Thẻ tóm tắt thông tin */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Bộ chọn sinh viên */}
            <div className="xl:col-span-6 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sinh viên hướng dẫn ({studentList.length} SV)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="material-symbols-outlined text-[14px]">edit_note</span>
                    Chấm điểm
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
                  <span>Tổng hợp điểm đánh giá</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-bold">Thang điểm 10</span>
                </div>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-5xl font-black font-mono tracking-tight">{totalScore}</span>
                  <span className="text-xl text-blue-200 font-semibold">/ 10</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white text-blue-800 shadow-sm">
                    <span className="material-symbols-outlined text-sm">military_tech</span>
                    Điểm chữ: {gradeInfo.letter} ({gradeInfo.rank})
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {gradeInfo.passed ? 'Đạt' : 'Chưa đạt'}
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10 text-xs text-blue-200 flex justify-between items-center">
                <span>Trạng thái:</span>
                <span className="font-bold text-white">
                  {loadingGrade ? 'Đang tải dữ liệu...' : Object.keys(scores).length > 0 ? 'Đã nhập điểm' : 'Chưa nhập điểm'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Bảng Nhập Điểm Tiêu Chí */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Chi Tiết Tiêu Chí Đánh Giá Thực Tập
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhập điểm thành phần cho từng tiêu chí đánh giá. Điểm tối đa mỗi tiêu chí được quy định bởi Khoa.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4 w-28">Mã tiêu chí</th>
                    <th className="py-3 px-4 min-w-[280px]">Nội dung tiêu chí đánh giá</th>
                    <th className="py-3 px-4 w-32 text-center">Điểm tối đa</th>
                    <th className="py-3 px-4 w-44 text-center">Điểm chấm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {criteria.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Chưa có tiêu chí đánh giá được cấu hình.
                      </td>
                    </tr>
                  ) : (
                    criteria.map((c) => {
                      const currentVal = scores[c.maTieuChi] ?? ''
                      return (
                        <tr key={c.maTieuChi} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-4 align-top">
                            <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-mono">
                              {c.maTieuChi}
                            </span>
                          </td>
                          <td className="py-4 px-4 align-top">
                            <p className="font-bold text-slate-900 text-sm">{c.tenTieuChi}</p>
                          </td>
                          <td className="py-4 px-4 align-top text-center font-bold text-slate-700 font-mono text-sm">
                            {c.diemToiDa} đ
                          </td>
                          <td className="py-4 px-4 align-top text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.25"
                                min="0"
                                max={c.diemToiDa}
                                value={currentVal}
                                disabled={isReadOnly}
                                onChange={(e) => handleScoreChange(c.maTieuChi, e.target.value, c.diemToiDa)}
                                placeholder="0"
                                className="w-24 px-3 py-1.5 rounded-xl border border-slate-200 text-center font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-slate-100"
                              />
                              <span className="text-slate-400 font-medium">/ {c.diemToiDa}</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Điều khoản cam kết & Toolbar */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-200 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Ghi chú đánh giá của Giảng viên hướng dẫn (tùy chọn):
                </label>
                <textarea
                  rows={3}
                  value={generalReview}
                  onChange={(e) => setGeneralReview(e.target.value)}
                  placeholder="Nhập ghi chú cho sinh viên..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-integrity"
                  checked={confirmIntegrity}
                  onChange={(e) => setConfirmIntegrity(e.target.checked)}
                  disabled={isReadOnly}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="confirm-integrity" className="text-xs text-slate-600 cursor-pointer select-none">
                  Tôi xác nhận điểm số phản ánh khách quan, minh bạch quá trình thực tập của sinh viên.
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
                    onClick={handleSave}
                    disabled={submitting || !confirmIntegrity || isReadOnly}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting && <span className="material-symbols-outlined text-sm animate-spin">sync</span>}
                    <span>Lưu điểm</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Rubric CLO */}
      <RubricCLOModal
        isOpen={showRubricModal}
        onClose={() => setShowRubricModal(false)}
        criteria={criteria}
      />

      {/* MODAL 2: Xem trước Phiếu điểm PDF */}
      {currentStudent && (
        <PhieuDiemPdfModal
          isOpen={showPdfModal}
          onClose={() => setShowPdfModal(false)}
          currentStudent={currentStudent}
          selectedDot={selectedDot}
          criteria={criteria}
          scores={scores}
          totalScore={totalScore}
          gradeInfo={gradeInfo}
          generalReview={generalReview}
          lecturerName={lecturerName}
        />
      )}
    </div>
  )
}
