import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { useIdentity } from '../../hooks/useIdentity'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { phieuChamDiemService } from '../../services/phieuChamDiemService'
import RubricCLOModal from '../../components/giang-vien/RubricCLOModal.jsx'
import PhieuDiemPdfModal from '../../components/giang-vien/PhieuDiemPdfModal.jsx'

// Điểm DN từ phiếu nhận xét (thang 10):
// Tốt: 9 hoặc 10 | Khá: 7 hoặc 8 | Trung bình: 5 hoặc 6 | Yếu: dưới 5
const DN_SCORE_OPTIONS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]

/**
 * Quy đổi điểm DN (thang 10) sang CLO4.x theo trọng số
 * CLO4.1 max = 2đ  =>  clo41 = (diemDN / 10) * 2
 * CLO4.2 max = 3đ  =>  clo42 = (diemDN / 10) * 3
 */
function convertDNScore(rawScore, maxCLO) {
  return Math.round((Number(rawScore) / 10) * maxCLO * 100) / 100
}

const emptyScores = (criteria) => Object.fromEntries(criteria.map((c) => [c.maTieuChi, 0]))


export default function ChamDiemCLOPage() {
  const [searchParams] = useSearchParams()
  const { selectedDot } = useDotThucTap()
  const { maGV: identityMaGV, role } = useIdentity() || {}
  const isStaff = role === 'VT01' || role === 'VT02'
  const maGV = isStaff && searchParams.get('gv') ? searchParams.get('gv') : (identityMaGV || 'GV001')

  // Danh sách giảng viên từ Database
  const [lecturers, setLecturers] = useState([])

  // Danh sách sinh viên thuộc giảng viên được chọn
  const [students, setStudents] = useState([])
  const [maSV, setMaSV] = useState('')
  const [criteria, setCriteria] = useState([])
  const [scores, setScores] = useState({})

  // Điểm thô từ phiếu DN (thang 10) - người dùng chọn từ phiếu giấy
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



  // 1. Tải danh sách giảng viên từ DB
  useEffect(() => {
    async function loadLecturers() {
      try {
        const res = await gvHuongDanService.getGiangVienTai()
        const data = res.data?.data || res.data || []
        setLecturers(data)
      } catch (err) {
        console.error('Lỗi tải danh sách giảng viên:', err)
      }
    }
    loadLecturers()
  }, [])

  // 2. Tải danh sách sinh viên theo giảng viên được chọn từ DB
  useEffect(() => {
    const loadStudents = async () => {
      if (!maGV) return
      try {
        setLoading(true)
        const res = await gvHuongDanService.getSVTheoGiangVien(maGV)
        const data = res.data?.data || res.data || []
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
        setMessage(`Không tải được danh sách sinh viên: ${error.response?.data?.message || error.message}`)
      } finally {
        setLoading(false)
      }
    }
    loadStudents()
  }, [maGV, searchParams])

  // 3. Tải rubric tiêu chí theo đợt từ DB
  useEffect(() => {
    if (!selectedDot?.maDot) return
    const loadCriteria = async () => {
      try {
        const res = await phieuChamDiemService.getDanhSachTieuChi(selectedDot.maDot)
        const data = res.data?.data || res.data || []
        setCriteria(data)
        setScores(emptyScores(data))
      } catch (error) {
        setMessage(`Không tải được rubric: ${error.response?.data?.message || error.message}`)
      }
    }
    loadCriteria()
  }, [selectedDot?.maDot])

  // 4. Khi chọn sinh viên khác: nạp điểm đã lưu từ DB
  useEffect(() => {
    if (!maSV || !selectedDot?.maDot || !criteria.length) return
    const loadGrade = async () => {
      setScores(emptyScores(criteria))
      setGeneralReview('')
      setEnterpriseConfirmed(false)
      setEnterpriseNote('')
      setDnChuyenCan('')
      setDnChuyenMon('')
      try {
        const res = await phieuChamDiemService.getPhieuChamBySinhVien(maSV, selectedDot.maDot)
        const p = res.data?.data || res.data
        if (!p?.chiTiets) return

        const loadedScores = Object.fromEntries(
          criteria.map((c) => [
            c.maTieuChi,
            Number(p.chiTiets.find((x) => x.maTieuChi === c.maTieuChi)?.diemCham || 0),
          ])
        )
        setScores(loadedScores)

        // Phục hồi điểm DN thô từ CLO4.1 / CLO4.2 đã lưu
        if (clo41) {
          const saved41 = loadedScores[clo41.maTieuChi] || 0
          const raw41 = Math.round((saved41 / Number(clo41.diemToiDa)) * 10)
          setDnChuyenCan(String(raw41))
        }
        if (clo42) {
          const saved42 = loadedScores[clo42.maTieuChi] || 0
          const raw42 = Math.round((saved42 / Number(clo42.diemToiDa)) * 10)
          setDnChuyenMon(String(raw42))
        }

        setGeneralReview(p.nhanXetGV || '')
        setEnterpriseConfirmed(Boolean(p.daDoiChieuPhieuDN))
        setEnterpriseNote(p.ghiChuPhieuDN || '')
      } catch {
        /* Chưa có phiếu — bình thường */
      }
    }
    loadGrade()
  }, [maSV, selectedDot?.maDot, criteria]) // eslint-disable-line

  // Tìm tiêu chí CLO4.1 và CLO4.2
  const clo41 = criteria.find((c) => c.maCLO === 'CLO4.1')
  const clo42 = criteria.find((c) => c.maCLO === 'CLO4.2')
  const needsEnterpriseSheet = Boolean(clo41 || clo42)

  // Criteria không phải CLO4.1/CLO4.2 — GV nhập trực tiếp
  const manualCriteria = criteria.filter((c) => c.maCLO !== 'CLO4.1' && c.maCLO !== 'CLO4.2')

  // Khi thay đổi điểm DN → tự động cập nhật CLO4.1 / CLO4.2 trong scores
  useEffect(() => {
    if (!clo41 || dnChuyenCan === '') return
    const converted = convertDNScore(dnChuyenCan, Number(clo41.diemToiDa))
    setScores((prev) => ({ ...prev, [clo41.maTieuChi]: converted }))
  }, [dnChuyenCan, clo41?.maTieuChi]) // eslint-disable-line

  useEffect(() => {
    if (!clo42 || dnChuyenMon === '') return
    const converted = convertDNScore(dnChuyenMon, Number(clo42.diemToiDa))
    setScores((prev) => ({ ...prev, [clo42.maTieuChi]: converted }))
  }, [dnChuyenMon, clo42?.maTieuChi]) // eslint-disable-line

  const student = students.find((x) => x.maSV === maSV)
  const currentLecturer = lecturers.find((l) => l.maGV === maGV)
  const lecturerDisplayName = currentLecturer?.hoTen ? `ThS. ${currentLecturer.hoTen}` : 'Giảng viên hướng dẫn'

  const total = useMemo(
    () => criteria.reduce((sum, c) => sum + Number(scores[c.maTieuChi] || 0), 0),
    [criteria, scores]
  )

  const grade =
    total >= 8.5 ? 'Xuất sắc' : total >= 7 ? 'Khá' : total >= 5 ? 'Đạt' : 'Chưa đạt'

  const changeScore = (c, value) =>
    setScores((old) => ({
      ...old,
      [c.maTieuChi]: Math.min(Number(c.diemToiDa), Math.max(0, Number(value) || 0)),
    }))

  const save = async () => {
    if (!student || !selectedDot?.maDot) return
    if (needsEnterpriseSheet && !enterpriseConfirmed)
      return alert('Cần xác nhận đã đối chiếu phiếu nhận xét doanh nghiệp trước khi lưu CLO4.1 và CLO4.2.')
    if (needsEnterpriseSheet && (dnChuyenCan === '' || dnChuyenMon === ''))
      return alert('Vui lòng nhập điểm chuyên cần và chuyên môn từ phiếu nhận xét doanh nghiệp.')
    try {
      setSaving(true)
      await phieuChamDiemService.chamDiem({
        maSV: student.maSV,
        maDot: selectedDot.maDot,
        maGVHuongDan: maGV, // Lưu đúng mã giảng viên đang chọn
        tongDiem: total,
        chiTiets: criteria.map((c) => ({ maTieuChi: c.maTieuChi, diemCham: Number(scores[c.maTieuChi] || 0) })),
        nhanXetGV: generalReview,
        daDoiChieuPhieuDN: enterpriseConfirmed,
        ghiChuPhieuDN: enterpriseNote,
      })
      setMessage(`Đã lưu phiếu chấm của ${student.hoTen}: ${total.toFixed(2)}/10.`)
    } catch (error) {
      alert(`Không thể lưu phiếu chấm: ${error.response?.data?.message || error.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <div>
          <p className="text-xs font-bold uppercase text-blue-600">{selectedDot?.tenDot || 'Chọn đợt thực tập'}</p>
          <h1 className="text-xl font-bold text-slate-900">Đánh giá thực tập theo rubric CNTT</h1>
          <p className="text-sm text-slate-500">CLO1–CLO3 do GV nhập trực tiếp. CLO4.1 &amp; CLO4.2 lấy từ phiếu nhận xét Doanh nghiệp.</p>
        </div>
        <button onClick={() => setShowRubric(true)} className="px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold">
          Xem rubric
        </button>
      </header>

      {message && <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{message}</div>}

      {/* Chọn Giảng viên & Sinh viên & Tổng điểm */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Giảng viên hướng dẫn (Cố định theo tài khoản đăng nhập) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Giảng viên hướng dẫn</label>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-sm">
            {currentLecturer?.hoTen || 'ThS. Nguyễn Văn An'} ({maGV})
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Chuyên môn: <b>{currentLecturer?.chuyenMon || 'Công nghệ phần mềm'}</b>
          </p>
        </div>

        {/* Bộ chọn Sinh viên thuộc Giảng viên */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Sinh viên hướng dẫn</label>
          {loading ? (
            <div className="p-3 text-xs text-slate-400 bg-slate-50 rounded-xl">Đang tải sinh viên...</div>
          ) : students.length > 0 ? (
            <select
              value={maSV}
              onChange={(e) => setMaSV(e.target.value)}
              className="w-full border rounded-xl p-3 font-semibold text-slate-800 bg-white"
            >
              {students.map((s) => (
                <option key={s.maSV} value={s.maSV}>
                  {s.hoTen} ({s.maSV}) — {s.lop}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
              Chưa có sinh viên nào phân công cho giảng viên này.
            </div>
          )}
          <p className="mt-3 text-sm text-slate-600">Doanh nghiệp: <b>{student?.tenCongTy || '-'}</b></p>
        </div>

        {/* Tổng điểm */}
        <div className="bg-blue-700 text-white p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <p className="text-sm text-blue-100">Tổng điểm toàn diện (thang 10)</p>
            <p className="text-5xl font-black mt-2">{total.toFixed(2)}</p>
          </div>
          <p className="mt-3 text-sm">Xếp loại: <b>{grade}</b></p>
        </div>
      </section>

      {/* CLO1 – CLO3: GV nhập trực tiếp */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-bold">CLO1 – CLO3: Điểm do Giảng viên chấm</h2>
          <p className="text-xs text-slate-500 mt-1">Nhập điểm từng tiêu chí không vượt quá mức tối đa.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">CLO</th>
                <th className="p-3">Tiêu chí</th>
                <th className="p-3 text-center">Tối đa</th>
                <th className="p-3 text-center">Điểm GV chấm</th>
              </tr>
            </thead>
            <tbody>
              {manualCriteria.map((c) => (
                <tr key={c.maTieuChi} className="border-t">
                  <td className="p-3 font-bold text-blue-700">{c.maCLO || c.maTieuChi}</td>
                  <td className="p-3">{c.tenTieuChi}</td>
                  <td className="p-3 text-center">{Number(c.diemToiDa).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max={c.diemToiDa}
                      step="0.05"
                      value={scores[c.maTieuChi] ?? 0}
                      onChange={(e) => changeScore(c, e.target.value)}
                      className="w-24 text-center border rounded-lg p-2"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CLO4.1 & CLO4.2: Lấy từ Phiếu nhận xét DN */}
      {needsEnterpriseSheet && (
        <section className="bg-white rounded-2xl border border-amber-300 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-amber-200 bg-amber-50 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-bold text-amber-900">CLO4: Điểm từ Phiếu nhận xét Doanh nghiệp (5.00 điểm)</h2>
              <p className="text-xs text-amber-700 mt-0.5">
                Chọn điểm đánh giá từ phiếu doanh nghiệp (thang 10) → Hệ thống tự động quy đổi:
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
              CLO = (Điểm DN / 10) × Tối đa
            </span>
          </div>

          <div className="p-5 grid md:grid-cols-2 gap-6">
            {/* CLO4.1 - Chuyên cần */}
            {clo41 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">CLO4.1 — Điểm chuyên cần, phong cách</p>
                  <p className="text-xs text-slate-500 mt-0.5">Ý thức, trách nhiệm, kỷ luật (Phiếu nhận xét DN)</p>
                </div>

                {/* Bảng chọn theo phiếu giấy */}
                <div className="border rounded-xl overflow-hidden text-sm">
                  <div className="bg-slate-50 px-3 py-1.5 font-semibold text-slate-600 text-xs uppercase">
                    Thang điểm 10 trên phiếu
                  </div>
                  {[
                    { label: 'Tốt', values: [10, 9] },
                    { label: 'Khá', values: [8, 7] },
                    { label: 'Trung bình', values: [6, 5] },
                    { label: 'Yếu (< 5)', values: [4, 3, 2, 1, 0] },
                  ].map(({ label, values }) => (
                    <div key={label} className="flex items-center border-t px-3 py-2 gap-3">
                      <span className="w-24 text-xs text-slate-500 font-medium">{label}:</span>
                      <div className="flex gap-2 flex-wrap">
                        {values.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setDnChuyenCan(String(v))}
                            className={`w-9 h-9 rounded-lg border text-sm font-bold transition-all ${
                              dnChuyenCan === String(v)
                                ? 'bg-amber-500 border-amber-600 text-white shadow-sm'
                                : 'border-slate-300 text-slate-600 hover:border-amber-400'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Kết quả quy đổi */}
                <div className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm font-semibold ${dnChuyenCan !== '' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <span className="text-slate-600">CLO4.1 quy đổi:</span>
                  <span className={`text-lg font-black ${dnChuyenCan !== '' ? 'text-amber-700' : 'text-slate-400'}`}>
                    {dnChuyenCan !== ''
                      ? `${convertDNScore(dnChuyenCan, Number(clo41.diemToiDa)).toFixed(2)} / ${Number(clo41.diemToiDa).toFixed(2)}`
                      : '— / ' + Number(clo41.diemToiDa).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* CLO4.2 - Chuyên môn */}
            {clo42 && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">CLO4.2 — Điểm chuyên môn</p>
                  <p className="text-xs text-slate-500 mt-0.5">Khả năng vận dụng kiến thức thực tiễn (Phiếu nhận xét DN)</p>
                </div>

                <div className="border rounded-xl overflow-hidden text-sm">
                  <div className="bg-slate-50 px-3 py-1.5 font-semibold text-slate-600 text-xs uppercase">
                    Thang điểm 10 trên phiếu
                  </div>
                  {[
                    { label: 'Tốt', values: [10, 9] },
                    { label: 'Khá', values: [8, 7] },
                    { label: 'Trung bình', values: [6, 5] },
                    { label: 'Yếu (< 5)', values: [4, 3, 2, 1, 0] },
                  ].map(({ label, values }) => (
                    <div key={label} className="flex items-center border-t px-3 py-2 gap-3">
                      <span className="w-24 text-xs text-slate-500 font-medium">{label}:</span>
                      <div className="flex gap-2 flex-wrap">
                        {values.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setDnChuyenMon(String(v))}
                            className={`w-9 h-9 rounded-lg border text-sm font-bold transition-all ${
                              dnChuyenMon === String(v)
                                ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                                : 'border-slate-300 text-slate-600 hover:border-blue-400'
                            }`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm font-semibold ${dnChuyenMon !== '' ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <span className="text-slate-600">CLO4.2 quy đổi:</span>
                  <span className={`text-lg font-black ${dnChuyenMon !== '' ? 'text-blue-700' : 'text-slate-400'}`}>
                    {dnChuyenMon !== ''
                      ? `${convertDNScore(dnChuyenMon, Number(clo42.diemToiDa)).toFixed(2)} / ${Number(clo42.diemToiDa).toFixed(2)}`
                      : '— / ' + Number(clo42.diemToiDa).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Xác nhận đối chiếu phiếu */}
          <div className="px-5 pb-5 pt-2 border-t border-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <label className="flex gap-2 items-center text-sm font-semibold text-amber-950 cursor-pointer">
              <input
                type="checkbox"
                checked={enterpriseConfirmed}
                onChange={(e) => setEnterpriseConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              Đã đối chiếu phiếu nhận xét gốc của doanh nghiệp
            </label>
            <input
              value={enterpriseNote}
              onChange={(e) => setEnterpriseNote(e.target.value)}
              className="border border-amber-200 rounded-lg px-3 py-1.5 text-xs md:w-80 bg-white placeholder:text-slate-400"
              placeholder="Ghi chú nguồn phiếu (số phiếu, ngày nhận...)"
            />
          </div>
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
            onChange={(e) => setGeneralReview(e.target.value)}
            rows="3"
            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal placeholder:text-slate-400"
            placeholder="Nhận xét tổng quát về tinh thần thái độ, ý thức kỷ luật và mức độ hoàn thành nhiệm vụ thực tập của sinh viên..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowPrint(true)}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span>Xem & In phiếu điểm PDF</span>
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !criteria.length}
            className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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
