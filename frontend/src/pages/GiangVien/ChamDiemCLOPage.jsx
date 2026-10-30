import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { useIdentity } from '../../hooks/useIdentity'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { phieuChamDiemService } from '../../services/phieuChamDiemService'
import RubricCLOModal from '../../components/giang-vien/RubricCLOModal.jsx'
import PhieuDiemPdfModal from '../../components/giang-vien/PhieuDiemPdfModal.jsx'
import { restoreEnterpriseScores } from '../../utils/diemDoanhNghiep'
import { buildLecturerDetails, restoreLecturerScores, summarizeGrade } from '../../utils/diemGiangVien'
import { useGradeDeadline } from '../../hooks/useGradeDeadline'
import GradeDeadlineNotice from '../../components/common/GradeDeadlineNotice'

export default function ChamDiemCLOPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedDot } = useDotThucTap()
  const { user, maGV: identityMaGV, role } = useIdentity() || {}
  const isStaff = role === 'VT01' || role === 'VT02'
  const maGV = isStaff && searchParams.get('gv') ? searchParams.get('gv') : (identityMaGV || 'GV001')

  // Danh sách giảng viên từ Database
  const [lecturers, setLecturers] = useState([])

  // Danh sách sinh viên thuộc giảng viên được chọn
  const [students, setStudents] = useState([])
  const [maSV, setMaSV] = useState('')
  const [criteria, setCriteria] = useState([])
  const [scores, setScores] = useState({})
  const [loadedKey, setLoadedKey] = useState('')
  const [reloadCount, setReloadCount] = useState(0)
  const gradeKey = `${maGV}|${selectedDot?.maDot || ''}|${maSV}`
  const gradeKeyRef = useRef(gradeKey)
  gradeKeyRef.current = gradeKey
  const deadline = useGradeDeadline(selectedDot?.maDot, 'GV')
  const canEdit = deadline.canGrade

  // Điểm doanh nghiệp quy đổi để hiển thị trong bản in
  const [dnChuyenCan, setDnChuyenCan] = useState('')   // => CLO4.1
  const [dnChuyenMon, setDnChuyenMon] = useState('')   // => CLO4.2

  const [generalReview, setGeneralReview] = useState('')
  const [enterpriseConfirmed, setEnterpriseConfirmed] = useState(false)
  const [enterpriseNote, setEnterpriseNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showRubric, setShowRubric] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const ready = !loading && loadedKey === gradeKey && criteria.length > 0 && Boolean(maSV)
  const isErrorMessage = Boolean(message) && /^(Không|Lỗi|Chưa)/i.test(message)

  // 1. Tải danh sách giảng viên từ DB theo đợt
  useEffect(() => {
    let active = true
    async function loadLecturers() {
      try {
        const res = await gvHuongDanService.getGiangVienTai(selectedDot?.maDot)
        const data = res.data?.data || res.data || []
        if (active) setLecturers(data)
      } catch (err) {
        console.error('Lỗi tải danh sách giảng viên:', err)
      }
    }
    loadLecturers()
    return () => { active = false }
  }, [selectedDot?.maDot, reloadCount])

  // 2. Tải danh sách sinh viên theo giảng viên được chọn từ DB
  useEffect(() => {
    let cancelled = false
    const loadStudents = async () => {
      setStudents([])
      setMaSV('')
      setMessage('')
      if (!maGV || !selectedDot?.maDot) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const res = await gvHuongDanService.getSVTheoGiangVien(maGV, '', selectedDot?.maDot)
        const data = res.data?.data || res.data || []
        if (cancelled) return
        const mapped = data.map((x) => ({
          maSV: x.sinhVien?.maSV || x.maSV,
          hoTen: x.sinhVien?.hoTen || x.hoTen,
          lop: x.sinhVien?.lop || x.lop || '—',
          chuyenNganh: x.sinhVien?.chuyenNganh || x.chuyenNganh || 'Công nghệ thông tin',
          tenCongTy: x.congTy?.tenCongTy || x.tenCongTy || 'Chưa phân bổ',
        }))
        setStudents(mapped)

        // Kiểm tra nếu có param ?sv= trên URL
        const paramSV = searchParams.get('sv')
        if (paramSV && mapped.some((s) => s.maSV === paramSV)) {
          setMaSV(paramSV)
        } else if (mapped.length > 0) {
          setMaSV(mapped[0].maSV)
        } else {
          setMaSV('')
        }
      } catch (error) {
        if (!cancelled) setMessage(`Không tải được danh sách sinh viên: ${error.response?.data?.message || error.message}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadStudents()
    return () => { cancelled = true }
  }, [maGV, searchParams, selectedDot?.maDot, reloadCount])

  // Khi là Cán bộ Khoa và có param ?sv= trên URL nhưng chưa có ?gv= hoặc gv chưa khớp
  useEffect(() => {
    let active = true
    const paramSV = searchParams.get('sv')
    const paramGV = searchParams.get('gv')
    if (!isStaff || !paramSV || paramGV || !selectedDot?.maDot) return

    async function detectLecturer() {
      try {
        const res = await gvHuongDanService.getTatCaPhanCong(selectedDot.maDot)
        const all = res.data?.data || res.data || []
        const matched = all.find((x) => (x.maSV === paramSV || x.sinhVien?.maSV === paramSV))
        const foundGV = matched?.maGV || matched?.giangVien?.maGV
        if (active && foundGV && foundGV !== maGV) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('gv', foundGV)
            next.set('sv', paramSV)
            return next
          }, { replace: true })
        }
      } catch (err) {
        console.error('Không tìm thấy giảng viên phân công cho sinh viên:', err)
      }
    }
    detectLecturer()
    return () => { active = false }
  }, [isStaff, searchParams, selectedDot?.maDot, maGV, setSearchParams])


  useEffect(() => {
    let cancelled = false
    setLoadedKey('')
    setScores({})
    setCriteria([])
    setGeneralReview('')
    setEnterpriseConfirmed(false)
    setEnterpriseNote('')
    setDnChuyenCan('')
    setDnChuyenMon('')
    setShowPrint(false)
    if (!maSV || !selectedDot?.maDot) return
    setMessage('')
    const loadGrade = async () => {
      try {
        const [rubricRes, gradeRes] = await Promise.all([
          phieuChamDiemService.getDanhSachTieuChi(selectedDot.maDot),
          phieuChamDiemService.getPhieuChamBySinhVien(maSV, selectedDot.maDot),
        ])
        if (cancelled) return
        const loadedCriteria = rubricRes.data?.data || []
        const p = gradeRes.data?.data
        const loadedScores = restoreLecturerScores(loadedCriteria, p?.chiTiets || [])
        setCriteria(loadedCriteria)
        setScores(loadedScores)
        const dnCriteria = loadedCriteria.filter(criterion => criterion.nhomDanhGia === 'DN')
        const rawScores = restoreEnterpriseScores(dnCriteria, p?.chiTiets || [])
        setDnChuyenCan(String(rawScores[dnCriteria.find(criterion => criterion.maCLO === 'CLO4.1')?.maTieuChi] ?? ''))
        setDnChuyenMon(String(rawScores[dnCriteria.find(criterion => criterion.maCLO === 'CLO4.2')?.maTieuChi] ?? ''))
        setGeneralReview(p?.nhanXetGV || '')
        setEnterpriseConfirmed(Boolean(p?.daDoiChieuPhieuDN))
        setEnterpriseNote(p?.ghiChuPhieuDN || '')
        setLoadedKey(gradeKey)
      } catch (error) {
        if (!cancelled) setMessage(`Không tải được phiếu/rubric: ${error.response?.data?.message || error.message}. Chưa cho phép lưu.`)
      }
    }
    loadGrade()
    return () => { cancelled = true }
  }, [maSV, selectedDot?.maDot, gradeKey, reloadCount])

  // Tìm tiêu chí CLO4.1 và CLO4.2
  const clo41 = criteria.find((c) => c.maCLO === 'CLO4.1')
  const clo42 = criteria.find((c) => c.maCLO === 'CLO4.2')
  const needsEnterpriseSheet = criteria.some(c => c.nhomDanhGia === 'DN')

  // Criteria không phải CLO4.1/CLO4.2 — GV nhập trực tiếp
  const manualCriteria = criteria.filter((c) => c.nhomDanhGia === 'GV')

  const student = students.find((x) => x.maSV === maSV)
  const currentLecturer = lecturers.find((l) => l.maGV === maGV)
  const lecturerFullName = currentLecturer?.hoTen || user?.hoTen || 'Giảng viên hướng dẫn'
  const lecturerDisplayName = currentLecturer?.hoTen ? `ThS. ${currentLecturer.hoTen}` : lecturerFullName

  const summary = summarizeGrade(criteria, scores)
  const total = summary.total
  const grade = `${summary.xepLoai} · ${summary.ketQua}`

  const handleSelectStudent = (nextMaSV) => {
    setMaSV(nextMaSV)
    if (typeof setSearchParams === 'function') {
      const nextParams = new URLSearchParams(searchParams)
      if (nextMaSV) nextParams.set('sv', nextMaSV)
      else nextParams.delete('sv')
      setSearchParams(nextParams, { replace: true })
    }
  }

  const changeScore = (c, value) =>
    setScores((old) => ({
      ...old,
      [c.maTieuChi]: value,
    }))

  const save = async () => {
    if (!student || !selectedDot?.maDot || !ready || !canEdit || saving) return
    try {
      const chiTiets = buildLecturerDetails(manualCriteria, scores)
      if (!chiTiets.length) return alert('Vui lòng nhập ít nhất một tiêu chí điểm GV trước khi lưu.')
      setSaving(true)
      const response = await phieuChamDiemService.chamDiem({
        maSV: student.maSV,
        maDot: selectedDot.maDot,
        maGVHuongDan: maGV, // Lưu đúng mã giảng viên đang chọn
        tongDiem: total,
        chiTiets,
        nhanXetGV: generalReview,
      })
      if (gradeKeyRef.current !== gradeKey) return
      const saved = response.data?.data
      if (!saved?.chiTiets) throw new Error('Phản hồi không hợp lệ. Vui lòng tải lại phiếu để kiểm tra.')
      setScores(restoreLecturerScores(criteria, saved.chiTiets))
      const dnCriteria = criteria.filter(criterion => criterion.nhomDanhGia === 'DN')
      const rawScores = restoreEnterpriseScores(dnCriteria, saved.chiTiets)
      setDnChuyenCan(String(rawScores[clo41?.maTieuChi] ?? ''))
      setDnChuyenMon(String(rawScores[clo42?.maTieuChi] ?? ''))
      setEnterpriseConfirmed(Boolean(saved.daDoiChieuPhieuDN))
      setEnterpriseNote(saved.ghiChuPhieuDN || '')
      setMessage(`Đã lưu phiếu của ${student.hoTen}: ${saved.daDuDiem ? 'Tổng' : 'Tạm tính'} ${Number(saved.daDuDiem ? saved.tongDiem : saved.diemTamTinh || 0).toFixed(2)}/10 · ${saved.ketQua || 'Chưa đủ điểm'}.`)
    } catch (error) {
      alert(`Không thể lưu phiếu chấm: ${error.response?.data?.message || error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <GradeDeadlineNotice deadline={deadline} group="GV"/>
      {/* Header */}
      <header className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div>
          <p className="text-xs font-bold uppercase text-blue-600">{selectedDot?.tenDot || 'Chọn đợt thực tập'}</p>
          <h1 className="text-xl font-bold text-slate-900">Đánh giá thực tập theo rubric CNTT</h1>
          <p className="text-sm text-slate-500">CLO1–CLO3 do GV nhập trực tiếp. Điểm doanh nghiệp do doanh nghiệp cập nhật, GVHD chỉ xem.</p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Link
              to="/khoa/thong-ke-clo"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Trở về Rà soát chốt đợt</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowRubric(true)}
            className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-sm font-bold transition-colors cursor-pointer"
          >
            Xem rubric
          </button>
        </div>
      </header>

      {message && (
        <div
          role="alert"
          className={`p-4 rounded-xl border text-sm flex flex-wrap items-center justify-between gap-3 ${
            isErrorMessage
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            <span className="material-symbols-outlined text-lg">
              {isErrorMessage ? 'error' : 'check_circle'}
            </span>
            <span>{message}</span>
          </div>
          {isErrorMessage && (
            <button
              type="button"
              onClick={() => setReloadCount((c) => c + 1)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {/* Chọn Giảng viên & Sinh viên & Tổng điểm */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Giảng viên hướng dẫn (Cố định theo tài khoản đăng nhập) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
              Giảng viên hướng dẫn {isStaff && <span className="text-indigo-600 font-semibold">(Văn phòng Khoa)</span>}
            </label>
            {isStaff ? (
              <select
                value={maGV}
                onChange={(e) => {
                  const nextGv = e.target.value
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev)
                    next.set('gv', nextGv)
                    next.delete('sv')
                    return next
                  })
                }}
                className="w-full p-2.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-indigo-500 outline-none cursor-pointer"
              >
                {lecturers.map((l) => (
                  <option key={l.maGV} value={l.maGV}>
                    {l.hoTen} ({l.maGV}) — {l.soLuongDangHuongDan || 0} SV
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm">
                {lecturerDisplayName} ({maGV})
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Chuyên môn: <b>{currentLecturer?.chuyenMon || 'Công nghệ thông tin'}</b>
          </p>
        </div>

        {/* Bộ chọn Sinh viên thuộc Giảng viên */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Sinh viên hướng dẫn {students.length > 0 ? `(${students.length} SV)` : ''}
              </label>
              {maSV && (
                <a
                  href={`/giang-vien/tien-do?sv=${encodeURIComponent(maSV)}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  <span>Xem tiến độ tuần</span>
                </a>
              )}
            </div>
            {loading ? (
              <div className="p-3 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                Đang tải danh sách sinh viên...
              </div>
            ) : students.length > 0 ? (
              <select
                value={maSV}
                disabled={saving}
                onChange={(e) => handleSelectStudent(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 font-semibold text-slate-800 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {students.map((s) => (
                  <option key={s.maSV} value={s.maSV}>
                    {s.hoTen} ({s.maSV}) — {s.lop}
                  </option>
                ))}
              </select>
            ) : isErrorMessage ? (
              <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium">
                Chưa tải được danh sách sinh viên do lỗi kết nối máy chủ.
              </div>
            ) : (
              <div className="p-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                Chưa có sinh viên nào phân công cho giảng viên này.
              </div>
            )}
          </div>
          <p className="mt-3 text-sm text-slate-600 truncate" title={student?.tenCongTy || '-'}>
            Doanh nghiệp: <b>{student?.tenCongTy || '-'}</b>
          </p>
        </div>

        {/* Tổng điểm */}
        <div className="bg-blue-700 text-white p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <p className="text-sm text-blue-100">{summary.complete ? 'Tổng điểm (thang 10)' : 'Điểm tạm tính — chưa đủ điều kiện'}</p>
            <p className="text-5xl font-black mt-2">{total.toFixed(2)}</p>
          </div>
          <p className="mt-3 text-sm">Xếp loại: <b>{grade}</b></p>
        </div>
      </section>

      {/* CLO1 – CLO3: GV nhập trực tiếp */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">CLO1 – CLO3: Điểm do Giảng viên chấm</h2>
          <p className="text-xs text-slate-500 mt-1">Nhập điểm từng tiêu chí không vượt quá mức tối đa. Ô trống không phải điểm 0; khi lưu chỉ cập nhật ô đã nhập, không xóa điểm đã lưu.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="p-3 w-24">CLO</th>
                <th className="p-3">Tiêu chí</th>
                <th className="p-3 text-center w-28">Tối đa</th>
                <th className="p-3 text-center w-36">Điểm GV chấm</th>
              </tr>
            </thead>
            <tbody>
              {manualCriteria.length > 0 ? (
                manualCriteria.map((c) => (
                  <tr key={c.maTieuChi} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="p-3 font-bold text-blue-700">{c.maCLO || c.maTieuChi}</td>
                    <td className="p-3 text-slate-800">{c.tenTieuChi}</td>
                    <td className="p-3 text-center font-medium text-slate-600">{Number(c.diemToiDa).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max={c.diemToiDa}
                        step="0.01"
                        disabled={!ready || !canEdit || saving}
                        value={scores[c.maTieuChi] ?? ''}
                        onChange={(e) => changeScore(c, e.target.value)}
                        placeholder="—"
                        className="w-24 text-center border border-slate-300 rounded-lg p-2 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-slate-100">
                  <td colSpan={4} className="p-8 text-center text-sm text-slate-500">
                    {loading
                      ? 'Đang tải danh sách sinh viên và bộ tiêu chí đánh giá (Rubric CLO)...'
                      : !maSV
                        ? 'Vui lòng chọn sinh viên hướng dẫn ở trên để hiển thị bảng tiêu chí chấm điểm CLO.'
                        : 'Chưa tải được tiêu chí đánh giá CLO của đợt thực tập này.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {needsEnterpriseSheet && (
        <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-slate-900">Điểm doanh nghiệp — chỉ xem</h2>
              <p className="text-xs text-slate-500 mt-0.5">Doanh nghiệp trực tiếp cập nhật điểm trên hệ thống; hệ thống tự động quy đổi theo trọng số CLO4.</p>
            </div>
            {enterpriseConfirmed && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                Đã đối chiếu phiếu DN
              </span>
            )}
          </div>
          {criteria.filter(c => c.nhomDanhGia === 'DN').map(c => {
            const rawTen = c.maCLO === 'CLO4.1' ? dnChuyenCan : c.maCLO === 'CLO4.2' ? dnChuyenMon : ''
            const hasVal = scores[c.maTieuChi] !== '' && scores[c.maTieuChi] != null
            return (
              <div key={c.maTieuChi} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                <div>
                  <span className="font-bold text-amber-700">{c.maCLO}</span>
                  <span className="text-slate-800"> — {c.tenTieuChi}</span>
                  {rawTen !== '' && (
                    <span className="ml-2 text-xs text-slate-500">
                      (Điểm phiếu DN: <b>{rawTen}/10</b>)
                    </span>
                  )}
                </div>
                <b className={hasVal ? 'text-slate-900' : 'text-amber-700'}>
                  {!hasVal ? 'Chưa chấm' : `${Number(scores[c.maTieuChi]).toFixed(2)} / ${Number(c.diemToiDa).toFixed(2)}`}
                </b>
              </div>
            )
          })}
          {enterpriseNote && (
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 italic">
              Nhận xét / ghi chú từ Doanh nghiệp: <span className="text-slate-800 not-italic font-medium">{enterpriseNote}</span>
            </div>
          )}
        </section>
      )}

      {/* Nhận xét GV + Nút lưu */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-2">
            <span className="material-symbols-outlined text-base text-blue-600">rate_review</span>
            Nhận xét của giảng viên hướng dẫn
          </label>

          <textarea
            value={generalReview}
            disabled={!ready || !canEdit || saving}
            onChange={(e) => setGeneralReview(e.target.value)}
            rows="3"
            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
            placeholder="Nhận xét tổng quát về tinh thần thái độ, ý thức kỷ luật và mức độ hoàn thành nhiệm vụ thực tập của sinh viên..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowPrint(true)}
            disabled={!ready || saving}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Xem & In phiếu điểm PDF</span>
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !ready || !canEdit}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <span className="material-symbols-outlined text-base animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-base">save</span>
            )}
            <span>{saving ? 'Đang lưu...' : 'Lưu phiếu chấm'}</span>
          </button>
        </div>
      </section>

      <RubricCLOModal isOpen={showRubric} onClose={() => setShowRubric(false)} criteria={criteria} />
      <PhieuDiemPdfModal
        isOpen={showPrint}
        onClose={() => setShowPrint(false)}
        currentStudent={student}
        selectedDot={selectedDot}
        criteria={criteria}
        scores={scores}
        total={total}
        generalReview={generalReview}
        enterpriseConfirmed={enterpriseConfirmed}
        enterpriseNote={enterpriseNote}
        dnChuyenCan={dnChuyenCan}
        dnChuyenMon={dnChuyenMon}
        lecturerName={lecturerDisplayName}
      />
    </div>
  )
}
