import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import { phieuChamDiemService } from '../../services/phieuChamDiemService'
import doanhNghiepService from '../../services/doanhNghiepService'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useGradeDeadline } from '../../hooks/useGradeDeadline'
import GradeDeadlineNotice from '../../components/common/GradeDeadlineNotice'
import ModalOverlay from '../../components/common/ModalOverlay'
import DocumentAttachments from '../../components/common/DocumentAttachments'

// Gợi ý nhận xét học vụ chuẩn mực giúp người hướng dẫn điền nhanh
const QUICK_REMARKS = [
  'Sinh viên có tinh thần kỷ luật tốt, chấp hành nghiêm quy định và hoàn thành tốt nhiệm vụ được giao.',
  'Chủ động học hỏi, nắm bắt công nghệ nhanh và hòa nhập hiệu quả với môi trường dự án thực tế.',
  'Kỹ năng chuyên môn tốt, có trách nhiệm cao trong công việc và phối hợp làm việc nhóm tích cực.',
  'Thái độ làm việc chuyên nghiệp, tiếp thu nhanh các góp ý và có tiến bộ rõ rệt trong kỳ thực tập.',
]

// Modal Xác Nhận Nộp & Khóa Điểm Chính Thức
function ConfirmLockModal({ intern, totalScore, onConfirm, onCancel, busy }) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">lock</span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Nộp & Khóa điểm chính thức
            </h3>
            <p className="text-xs text-slate-500">Xác nhận gửi điểm đến Khoa CNTT</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
            <span className="text-slate-500 font-medium">Sinh viên:</span>
            <span className="font-bold text-slate-900">{intern.hoTenSV}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
            <span className="text-slate-500 font-medium">Mã số sinh viên:</span>
            <span className="font-bold text-indigo-700">{intern.maSinhVien}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Tổng điểm DN (CLO4):</span>
            <span className="text-sm font-black text-emerald-700">{totalScore.toFixed(2)} / 5.00 đ</span>
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs leading-relaxed flex items-start gap-2">
          <span className="material-symbols-outlined text-[18px] text-amber-700 shrink-0 mt-0.5">info</span>
          <div>
            <span className="font-bold">Lưu ý quan trọng:</span> Sau khi nộp và khóa điểm, doanh nghiệp sẽ <strong>không thể tự điều chỉnh lại</strong>. Bảng đánh giá sẽ được ghi nhận chính thức vào hệ thống học vụ của Khoa CNTT và GVHD để tổng kết điểm thực tập.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">{busy ? 'sync' : 'lock'}</span>
            <span>{busy ? 'Đang khóa điểm…' : 'Đồng ý nộp & Khóa điểm'}</span>
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// Modal Xem Trước & In Phiếu Nhận Xét Sinh Viên Thực Tập Chuẩn HUIT
function PrintHuitEvaluationModal({ intern, activeCompany, onClose }) {
  const score41 = (intern.chiTietDiemDN || []).find((x) => x.maTieuChi === 'CLO4.1')?.diemCham
  const score42 = (intern.chiTietDiemDN || []).find((x) => x.maTieuChi === 'CLO4.2')?.diemCham

  const num41 = score41 !== undefined ? Number(score41) : null
  const num42 = score42 !== undefined ? Number(score42) : null
  // Quy đổi ngược về thang 10 tương ứng trên phiếu giấy
  const scorePhongCach10 = num41 !== null ? (num41 * 5).toFixed(1) : ''
  const scoreChuyenMon10 = num42 !== null ? (num42 * (10 / 3)).toFixed(1) : ''

  const handlePrint = () => {
    window.print()
  }

  const currentDate = new Date()
  const ngay = currentDate.getDate()
  const thang = currentDate.getMonth() + 1
  const nam = currentDate.getFullYear()

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal - Ẩn khi In */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-indigo-700">print</span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">
                Phiếu Nhận Xét Sinh Viên Thực Tập (Mẫu Chuẩn HUIT)
              </h3>
              <p className="text-[11px] text-slate-500">Xem trước và in ấn để ký tên, đóng dấu xác nhận</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>In Phiếu Nhận Xét</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Nội dung Phiếu Nhận Xét Chuẩn HUIT (Khổ giấy A4 hiển thị/in) */}
        <div className="p-8 overflow-y-auto bg-slate-100 text-slate-900 print:p-0 print:bg-white print:overflow-visible">
          <div className="max-w-[760px] mx-auto bg-white p-8 sm:p-12 shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0 font-serif leading-relaxed text-[13px]">
            {/* Header Trường & Khoa */}
            <div className="text-center pb-4 border-b border-slate-300">
              <h4 className="font-bold uppercase tracking-wider text-[14px]">
                TRƯỜNG ĐẠI HỌC CÔNG THƯƠNG TP.HCM (HUIT)
              </h4>
              <h3 className="font-bold uppercase text-[15px] mt-0.5">
                KHOA CÔNG NGHỆ THÔNG TIN
              </h3>
              <p className="text-[11px] text-slate-600 mt-1 italic">
                Địa chỉ: 140 Lê Trọng Tấn, Phường Tây Thạnh, Quận Tân Phú, TP.HCM • Điện thoại: (028).38161673 - 136
              </p>
            </div>

            {/* Tiêu đề phiếu */}
            <div className="text-center my-5">
              <h2 className="font-bold uppercase text-lg tracking-wide text-slate-900">
                PHIẾU NHẬN XÉT SINH VIÊN THỰC TẬP
              </h2>
            </div>

            {/* Thông tin sinh viên & Đơn vị */}
            <div className="space-y-1.5 mb-5 text-[13px]">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  Họ và tên sinh viên: <strong className="font-bold underline">{intern.hoTenSV}</strong>
                </div>
                <div>
                  Lớp: <span className="font-medium underline">{intern.lopSV || 'Chưa cập nhật'}</span>
                </div>
              </div>
              <div>
                Mã số sinh viên: <strong className="font-bold">{intern.maSinhVien}</strong>
                {intern.chuyenNganhSV && <span> — Chuyên ngành: <span className="italic">{intern.chuyenNganhSV}</span></span>}
              </div>
              <div>
                Công ty thực tập: <strong className="font-bold">{activeCompany?.tenCongTy || '—'}</strong>
              </div>
              <div>
                Địa chỉ: <span>{activeCompany?.diaChi || 'Trụ sở công ty'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>Email: <span className="italic">{activeCompany?.daiDienChinh?.email || activeCompany?.email || '—'}</span></div>
                <div>Điện thoại: <span>{activeCompany?.soDienThoai || '—'}</span></div>
              </div>
              <div>
                Người hướng dẫn (Mentor): <strong className="font-semibold">{intern.tenMentor || activeCompany?.daiDienChinh?.hoTen || 'Cán bộ hướng dẫn chuyên môn'}</strong>
                {intern.chucVuMentor && <span> ({intern.chucVuMentor})</span>}
              </div>
            </div>

            {/* Lời ngỏ từ Khoa */}
            <p className="text-[12px] italic text-slate-700 mb-5 leading-normal text-justify">
              Nhằm mục đích đánh giá kết quả thực tập của sinh viên và chất lượng đào tạo của Nhà trường, Khoa Công nghệ Thông tin trường Đại học Công Thương (HUIT) rất mong nhận được những thông tin phản hồi của quý công ty. Chúng tôi xin ghi nhận tất cả những ý kiến đóng góp của quý doanh nghiệp.
            </p>

            {/* Mục 1: Chất lượng công việc */}
            <div className="space-y-2 mb-4">
              <h5 className="font-bold text-[13px]">
                1. Nhận xét của cơ quan về chất lượng công việc được giao:
              </h5>
              <div className="pl-4 space-y-1.5">
                <div>
                  - Hoàn thành công việc được giao:
                  <span className="ml-4 font-semibold text-indigo-900">
                    {num42 && num42 >= 2.5 ? '☑ Hoàn thành tốt' : num42 && num42 >= 1.5 ? '☑ Hoàn thành' : '☐ Hoàn thành tốt  ☐ Hoàn thành  ☐ Không hoàn thành'}
                  </span>
                </div>
                <div>
                  - Tính hữu hiệu của đợt thực tập đối với cơ quan:
                  <span className="ml-4 font-semibold text-indigo-900">
                    ☑ Có giúp ích nhiều &nbsp;&nbsp; ☐ Có giúp ích &nbsp;&nbsp; ☐ Không giúp ích gì nhiều
                  </span>
                </div>
              </div>
            </div>

            {/* Mục 2: Bản thân sinh viên */}
            <div className="space-y-2 mb-4">
              <h5 className="font-bold text-[13px]">
                2. Nhận xét của cơ quan về bản thân sinh viên:
              </h5>
              <div className="pl-4 space-y-1.5">
                <div>
                  - Năng lực chuyên môn sử dụng vào công việc:
                  <span className="ml-4 font-semibold text-indigo-900">
                    {num42 && num42 >= 2.5 ? '☑ Giỏi / Khá' : num42 && num42 >= 1.5 ? '☑ Khá / Trung bình' : '☐ Giỏi  ☐ Khá  ☐ Trung bình  ☐ Yếu'}
                  </span>
                </div>
                <div>
                  - Tinh thần, thái độ đối với công việc:
                  <span className="ml-4 font-semibold text-indigo-900">
                    {num41 && num41 >= 1.5 ? '☑ Tích cực' : '☑ Bình thường'}
                  </span>
                </div>
                <div>
                  - Đảm bảo kỷ luật lao động (giờ giấc, nghỉ làm...):
                  <span className="ml-4 font-semibold text-indigo-900">
                    {num41 && num41 >= 1.5 ? '☑ Tốt' : '☑ Trung bình'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mục 3 - 6: Nhận xét chi tiết */}
            <div className="space-y-3 mb-5">
              <div>
                <h5 className="font-bold text-[13px]">
                  3. Nhận xét về tinh thần, thái độ làm việc & kỷ luật (CLO4.1):
                </h5>
                <p className="pl-4 text-[12px] italic text-slate-800 mt-1 min-h-[36px] bg-slate-50/50 p-2 border-b border-dashed border-slate-300">
                  {intern.danhGia ? intern.danhGia : 'Sinh viên có ý thức kỷ luật tốt, chấp hành nghiêm túc quy định làm việc và hòa nhập tốt với tập thể.'}
                </p>
              </div>

              <div>
                <h5 className="font-bold text-[13px]">
                  4. Nhận xét về trình độ chuyên môn & khả năng vận dụng thực tiễn (CLO4.2):
                </h5>
                <p className="pl-4 text-[12px] italic text-slate-800 mt-1 min-h-[36px] bg-slate-50/50 p-2 border-b border-dashed border-slate-300">
                  Nắm vững kiến thức nền tảng, chủ động nghiên cứu công nghệ mới, hoàn thành tốt các nhiệm vụ được giao tại dự án thực tế của công ty.
                </p>
              </div>
            </div>

            {/* Mục 7: Đánh giá chung & Cho điểm */}
            <div className="space-y-3 pt-2 border-t border-slate-300">
              <h5 className="font-bold text-[13px]">
                7. Đánh giá chung & Cho điểm (Chuẩn Khoa CNTT - HUIT):
              </h5>

              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="p-3 border border-slate-300 rounded-lg text-center">
                  <div className="font-bold text-[12px] uppercase text-slate-700">
                    Điểm chuyên cần, phong cách (CLO4.1)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Thang 10 tương ứng: {scorePhongCach10 ? `${scorePhongCach10} / 10đ` : '—'}</div>
                  <div className="text-base font-black text-indigo-950 mt-1">
                    Điểm chuẩn CLO4.1: {num41 !== null ? `${num41.toFixed(2)} / 2.00đ` : '—'}
                  </div>
                </div>

                <div className="p-3 border border-slate-300 rounded-lg text-center">
                  <div className="font-bold text-[12px] uppercase text-slate-700">
                    Điểm chuyên môn (CLO4.2)
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Thang 10 tương ứng: {scoreChuyenMon10 ? `${scoreChuyenMon10} / 10đ` : '—'}</div>
                  <div className="text-base font-black text-indigo-950 mt-1">
                    Điểm chuẩn CLO4.2: {num42 !== null ? `${num42.toFixed(2)} / 3.00đ` : '—'}
                  </div>
                </div>
              </div>

              <div className="text-right font-black text-sm text-slate-900 pr-2">
                TỔNG ĐIỂM DOANH NGHIỆP: {(num41 !== null && num42 !== null) ? `${(num41 + num42).toFixed(2)} / 5.00 điểm` : '—'}
              </div>
            </div>

            {/* Ký tên đóng dấu */}
            <div className="grid grid-cols-2 gap-4 mt-8 pt-4">
              <div className="text-center">
                <p className="font-bold text-[12px]">NGƯỜI HƯỚNG DẪN TẠI DOANH NGHIỆP</p>
                <p className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                <div className="h-20"></div>
                <p className="font-bold text-[12px]">{intern.tenMentor || activeCompany?.daiDienChinh?.hoTen || '—'}</p>
              </div>

              <div className="text-center">
                <p className="text-[12px] italic text-slate-600">
                  Ngày {ngay} tháng {thang} năm {nam}
                </p>
                <p className="font-bold text-[12px]">XÁC NHẬN CỦA ĐƠN VỊ THỰC TẬP</p>
                <p className="text-[11px] text-slate-500 italic mt-0.5">(Đóng dấu, ký và ghi rõ họ tên)</p>
                <div className="h-20"></div>
                <p className="font-bold text-[12px]">{activeCompany?.tenCongTy || 'Đại diện đơn vị'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}

// Modal Đánh giá & Nhập điểm chuẩn mực cho 1 sinh viên
function GradeInternModal({
  intern,
  onClose,
  onSaved,
  onNavigate,
  onOpenPrint,
  hasPrev,
  hasNext,
  currentIndex,
  totalCount,
  drafts,
  deadline,
}) {
  const isLocked = Boolean(intern.daKhoaDiem)
  const [criteria, setCriteria] = useState([])
  const [scores, setScores] = useState(() => drafts.current[intern.maPhanBo]?.scores || {})
  const [review, setReview] = useState(() => drafts.current[intern.maPhanBo]?.review ?? intern.danhGia ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saveToast, setSaveToast] = useState('')
  const [showConfirmLock, setShowConfirmLock] = useState(false)

  useEffect(() => {
    let active = true
    phieuChamDiemService
      .getDanhSachTieuChi(intern.maDot, 'DN')
      .then((r) => {
        if (!active) return
        const list = r.data?.data || []
        setCriteria(list)
        const initialScores = drafts.current[intern.maPhanBo]?.scores ??
          Object.fromEntries((intern.chiTietDiemDN || []).map((x) => [x.maTieuChi, x.diemCham]))
        setScores(initialScores)
        setReview(drafts.current[intern.maPhanBo]?.review ?? intern.danhGia ?? '')
      })
      .catch(() => {
        if (active) setError('Không tải được danh mục tiêu chí đánh giá từ Khoa CNTT.')
      })
    return () => {
      active = false
    }
  }, [intern, drafts])

  const updateDraft = (nextScores, nextReview) => {
    if (isLocked) return
    setScores(nextScores)
    setReview(nextReview)
    drafts.current[intern.maPhanBo] = { scores: nextScores, review: nextReview }
  }

  const handleScoreChange = (maTieuChi, value, maxScore) => {
    if (isLocked) return
    const num = parseFloat(value)
    if (value !== '' && !isNaN(num)) {
      if (num < 0 || num > maxScore) return
    }
    updateDraft({ ...scores, [maTieuChi]: value }, review)
  }

  const handleSetQuickScore = (maTieuChi, val) => {
    if (isLocked) return
    updateDraft({ ...scores, [maTieuChi]: String(val) }, review)
  }

  const handleAddRemark = (text) => {
    if (isLocked) return
    const updated = review ? `${review.trim()} ${text}` : text
    updateDraft(scores, updated)
  }

  const validateAndPrepare = () => {
    if (!deadline.canGrade) {
      throw new Error(deadline.block || 'Hiện không trong thời hạn cho phép nhập điểm.')
    }
    const chiTiets = criteria
      .filter((c) => scores[c.maTieuChi] !== undefined && scores[c.maTieuChi] !== '')
      .map((c) => ({
        maTieuChi: c.maTieuChi,
        diemCham: Number(scores[c.maTieuChi]),
      }))

    if (chiTiets.length === 0) {
      throw new Error('Vui lòng nhập điểm ít nhất một tiêu chí đánh giá.')
    }

    // Kiểm tra điểm hợp lệ
    for (const ct of chiTiets) {
      const matchCri = criteria.find((x) => x.maTieuChi === ct.maTieuChi)
      if (matchCri && (ct.diemCham < 0 || ct.diemCham > matchCri.diemToiDa)) {
        throw new Error(`Điểm tiêu chí ${matchCri.maCLO} không được vượt quá ${matchCri.diemToiDa} điểm.`)
      }
    }

    return chiTiets
  }

  // Lưu điểm tạm (khoaChinhThuc = false)
  const performSave = async (khoaChinhThuc = false) => {
    const chiTiets = validateAndPrepare()
    await doanhNghiepService.danhGia({
      maPhanBo: intern.maPhanBo,
      chiTiets,
      nhanXet: review.trim(),
      khoaChinhThuc,
    })
    delete drafts.current[intern.maPhanBo]
    await onSaved()
  }

  const handleSaveOnly = async (e) => {
    if (e) e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await performSave(false)
      setSaveToast('Đã lưu điểm và nhận xét thành công (lưu tạm)!')
      setTimeout(() => setSaveToast(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể lưu kết quả đánh giá.')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveAndNext = async () => {
    setBusy(true)
    setError('')
    try {
      await performSave(false)
      if (hasNext) {
        onNavigate(1)
      } else {
        setSaveToast('Đã lưu điểm thành công! Đã là sinh viên cuối danh sách.')
        setTimeout(() => setSaveToast(''), 3000)
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể lưu kết quả đánh giá.')
    } finally {
      setBusy(false)
    }
  }

  // Mở popup xác nhận nộp & khóa chính thức
  const handleOpenLockConfirm = () => {
    setError('')
    if (!isFullGraded) {
      setError('Vui lòng nhập đầy đủ điểm cho tất cả tiêu chí CLO trước khi nộp và khóa điểm chính thức.')
      return
    }
    setShowConfirmLock(true)
  }

  // Xác nhận nộp & khóa chính thức
  const handleConfirmLock = async () => {
    setBusy(true)
    setError('')
    try {
      await performSave(true)
      setShowConfirmLock(false)
      setSaveToast('Đã nộp và khóa điểm đánh giá chính thức thành công!')
      setTimeout(() => setSaveToast(''), 4000)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể khóa điểm đánh giá.')
      setShowConfirmLock(false)
    } finally {
      setBusy(false)
    }
  }

  const currentTotal = criteria.reduce((sum, c) => sum + (Number(scores[c.maTieuChi]) || 0), 0)
  const isFullGraded = criteria.length > 0 && criteria.every(
    (c) => scores[c.maTieuChi] !== undefined && scores[c.maTieuChi] !== '' && !isNaN(scores[c.maTieuChi])
  )

  return (
    <>
      <ModalOverlay onClose={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Modal & Điều hướng chuyển sinh viên */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                {(intern.hoTenSV || 'S').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {intern.hoTenSV}
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700 font-bold text-[11px]">
                    {intern.maSinhVien}
                  </span>
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-200">
                      <span className="material-symbols-outlined text-[13px]">lock</span>
                      Đã nộp & Khóa điểm
                    </span>
                  )}
                </div>
                <div className="text-xs text-indigo-700 font-medium mt-0.5">
                  {intern.viTriThucTap || 'Vị trí thực tập sinh'}
                  {intern.chuyenNganhSV ? ` • Ngành ${intern.chuyenNganhSV}` : ''}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Nút Xem / In phiếu nhận xét HUIT */}
              <button
                type="button"
                onClick={() => onOpenPrint(intern)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                title="Xem trước & In Phiếu nhận xét chuẩn mẫu Khoa CNTT HUIT"
              >
                <span className="material-symbols-outlined text-[16px] text-indigo-600">print</span>
                <span className="hidden sm:inline">In Phiếu HUIT</span>
              </button>

              {/* Bộ điều hướng Next/Prev */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onNavigate(-1)}
                  disabled={!hasPrev || busy}
                  title="Sinh viên trước"
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="text-[11px] font-bold text-slate-600 px-2 select-none">
                  {currentIndex + 1} / {totalCount}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(1)}
                  disabled={!hasNext || busy}
                  title="Sinh viên tiếp theo"
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="Đóng"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 text-xs">
            {/* Cảnh báo khóa điểm chính thức */}
            {isLocked && (
              <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 flex items-center gap-2.5 shadow-2xs">
                <span className="material-symbols-outlined text-[22px] text-indigo-700 shrink-0">lock</span>
                <div>
                  <div className="font-bold text-slate-900">
                    Kết quả đánh giá đã được nộp và khóa chính thức
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    Bảng điểm đã được chuyển đến Khoa CNTT và GVHD để tính điểm học phần. Điểm số ở chế độ chỉ xem (Read-only), không thể chỉnh sửa.
                  </div>
                </div>
              </div>
            )}

            {/* Toast thông báo lưu thành công */}
            {saveToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold flex items-center gap-2 text-xs shadow-xs animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                <span>{saveToast}</span>
              </div>
            )}

            {/* Lỗi cảnh báo nếu có */}
            {error && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2 text-xs shadow-xs">
                <span className="material-symbols-outlined text-[18px] text-rose-600">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Banner tổng điểm tức thì */}
            <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border border-indigo-100 rounded-xl">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                  isLocked
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : isFullGraded
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-emerald-600' : isFullGraded ? 'bg-blue-600' : 'bg-amber-600'}`}></span>
                  <span>{isLocked ? 'Đã khóa điểm chính thức' : isFullGraded ? 'Đã nhập đủ tiêu chí' : 'Chưa hoàn tất điểm'}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  Chuẩn đầu ra CLO4 (Khoa CNTT - HUIT)
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider mr-2">Tổng điểm DN:</span>
                <span className="text-base font-black text-indigo-950">
                  {currentTotal.toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-indigo-600 ml-1">/ 5.00 đ</span>
              </div>
            </div>

            {/* Danh sách tiêu chí CLO với chú thích chuẩn HUIT */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-600">fact_check</span>
                <span>Tiêu chí đánh giá của doanh nghiệp (Tối đa 5.00 điểm):</span>
              </div>

              {criteria.length === 0 && !error && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 animate-pulse flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-indigo-600 animate-spin">sync</span>
                  <span>Đang tải danh mục tiêu chí đánh giá...</span>
                </div>
              )}

              <div className="space-y-3">
                {criteria.map((c) => {
                  const maxVal = Number(c.diemToiDa) || (c.maCLO === 'CLO4.1' ? 2 : 3)
                  const quickPills = maxVal === 2 ? [1.0, 1.5, 1.8, 2.0] : [1.5, 2.0, 2.5, 2.8, 3.0]
                  const curVal = scores[c.maTieuChi] ?? ''
                  const is41 = c.maCLO === 'CLO4.1'

                  return (
                    <div
                      key={c.maTieuChi}
                      className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl hover:bg-slate-50 transition-colors space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-extrabold text-[11px]">
                              {c.maCLO}
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {c.tenTieuChi}
                            </span>
                          </div>
                          {/* Chú giải học vụ chuẩn HUIT */}
                          <div className="text-[11px] text-indigo-800 font-medium">
                            {is41
                              ? '📌 Tương ứng mục "Điểm chuyên cần, phong cách" trên phiếu nhận xét HUIT (Quy đổi tối đa 2.00đ)'
                              : '📌 Tương ứng mục "Điểm chuyên môn" trên phiếu nhận xét HUIT (Quy đổi tối đa 3.00đ)'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Thang điểm chuẩn: <span className="font-semibold text-slate-700">0.00 — {maxVal.toFixed(2)} điểm</span>
                          </div>
                        </div>

                        {/* Input nhập điểm */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className="text-xs text-slate-500 font-semibold">Điểm chấm:</span>
                          <input
                            type="number"
                            min="0"
                            max={maxVal}
                            step="0.05"
                            disabled={isLocked || busy || !deadline.canGrade}
                            value={curVal}
                            onChange={(e) => handleScoreChange(c.maTieuChi, e.target.value, maxVal)}
                            placeholder={`0 - ${maxVal}`}
                            className="w-24 px-3 py-1.5 text-right font-black text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                          />
                          <span className="text-xs font-bold text-slate-400 w-8">/ {maxVal}đ</span>
                        </div>
                      </div>

                      {/* Nút bấm chọn điểm nhanh (ẩn khi đã khóa) */}
                      {!isLocked && deadline.canGrade && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/50 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-medium">Chọn nhanh:</span>
                          {quickPills.map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleSetQuickScore(c.maTieuChi, val)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                parseFloat(curVal) === val
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'
                              }`}
                            >
                              {val.toFixed(1)}đ
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Nhận xét & Đánh giá quá trình */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">rate_review</span>
                  <span>Nhận xét quá trình thực tập & đóng góp:</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {review.length} ký tự
                </span>
              </div>

              <textarea
                rows={3}
                disabled={isLocked || busy || !deadline.canGrade}
                value={review}
                onChange={(e) => updateDraft(scores, e.target.value)}
                placeholder="Nhận xét cụ thể về tinh thần kỷ luật, thái độ làm việc, kỹ năng chuyên môn và kết quả đóng góp của sinh viên tại công ty..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-2xs disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed leading-relaxed"
              />

              {/* Gợi ý nhận xét mẫu (ẩn khi đã khóa) */}
              {!isLocked && deadline.canGrade && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-slate-500">Gợi ý nhận xét nhanh:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_REMARKS.map((rm, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddRemark(rm)}
                        className="text-left px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-800 border border-slate-200 rounded-lg text-[11px] text-slate-600 transition-colors cursor-pointer"
                      >
                        + {rm.slice(0, 48)}…
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Đính kèm tài liệu đánh giá có chữ ký */}
            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">attach_file</span>
                  <span>Phiếu nhận xét có chữ ký / đóng dấu (Tùy chọn):</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Sau khi in và đóng dấu, có thể scan đính kèm tại đây
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200/70">
                <DocumentAttachments
                  kind="EnterpriseForm"
                  resourceId={intern.maPhanBo}
                  title="Phiếu đánh giá DN có chữ ký"
                  defer
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="text-[11px] text-slate-500 italic">
              {isLocked
                ? 'Bảng điểm đã được khóa chính thức và đồng bộ học vụ Khoa CNTT.'
                : 'Điểm và nhận xét sẽ được đồng bộ trực tiếp sang hệ thống quản lý học vụ Khoa CNTT.'}
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>

              {!isLocked && (
                <>
                  <button
                    type="button"
                    onClick={handleSaveOnly}
                    disabled={busy || !deadline.canGrade}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Lưu điểm tạm (vẫn có thể chỉnh sửa lại)"
                  >
                    <span className="material-symbols-outlined text-[16px]">{busy ? 'sync' : 'save'}</span>
                    <span>{busy ? 'Đang lưu…' : 'Lưu tạm'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenLockConfirm}
                    disabled={busy || !deadline.canGrade}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 active:bg-indigo-900 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Nộp bảng điểm chính thức và khóa không cho chỉnh sửa thêm"
                  >
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                    <span>Nộp & Khóa điểm chính thức</span>
                  </button>

                  {hasNext && (
                    <button
                      type="button"
                      onClick={handleSaveAndNext}
                      disabled={busy || !deadline.canGrade}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Lưu tạm và chuyển sinh viên tiếp theo"
                    >
                      <span>Lưu & Tiếp</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </ModalOverlay>

      {/* Popup Xác Nhận Khóa Điểm */}
      {showConfirmLock && (
        <ConfirmLockModal
          intern={intern}
          totalScore={currentTotal}
          onConfirm={handleConfirmLock}
          onCancel={() => setShowConfirmLock(false)}
          busy={busy}
        />
      )}
    </>
  )
}

export default function DanhGiaThucTapSinhPage() {
  const { activeCompany, maDot, loading: companyLoading } = useEnterprise()
  const globalDeadline = useGradeDeadline(maDot, 'DN')
  const [interns, setInterns] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'PENDING' | 'DRAFT' | 'LOCKED'
  const [activeModalIntern, setActiveModalIntern] = useState(null)
  const [printIntern, setPrintIntern] = useState(null) // Dùng để mở modal in mẫu HUIT
  const [lockingIntern, setLockingIntern] = useState(null) // Dùng để xác nhận khóa trực tiếp từ hàng của bảng
  const [lockRowBusy, setLockRowBusy] = useState(false)
  const drafts = useRef({})
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const requestVersion = useRef(0)

  const loadInterns = useCallback(async () => {
    if (companyLoading) return
    const version = ++requestVersion.current
    if (!activeCompany?.maCongTy) {
      setInterns([])
      setError('Tài khoản doanh nghiệp chưa được gắn với công ty. Vui lòng liên hệ Khoa để kiểm tra tài khoản.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const data = await doanhNghiepService.getThucTapSinh(activeCompany.maCongTy, maDot)
      if (version === requestVersion.current) {
        const list = Array.isArray(data) ? data : []
        setInterns(list)
        if (activeModalIntern) {
          const updated = list.find((x) => x.maPhanBo === activeModalIntern.maPhanBo)
          if (updated) setActiveModalIntern(updated)
        }
      }
    } catch (err) {
      if (version === requestVersion.current) {
        setInterns([])
        setError(err.response?.data?.message || 'Không tải được danh sách thực tập sinh. Vui lòng làm mới trang.')
      }
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [activeCompany?.maCongTy, maDot, companyLoading, activeModalIntern])

  useEffect(() => {
    const activeRequestVersion = requestVersion
    loadInterns()
    return () => {
      activeRequestVersion.current++
    }
  }, [loadInterns])

  // Lọc theo tìm kiếm và trạng thái
  const filteredInterns = useMemo(() => {
    return interns.filter((item) => {
      const matchSearch =
        !searchTerm ||
        (item.hoTenSV && item.hoTenSV.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.maSinhVien && item.maSinhVien.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.viTriThucTap && item.viTriThucTap.toLowerCase().includes(searchTerm.toLowerCase()))

      const isGraded = item.chiTietDiemDN && item.chiTietDiemDN.length >= 2
      const isLocked = Boolean(item.daKhoaDiem)

      if (statusFilter === 'LOCKED') return matchSearch && isLocked
      if (statusFilter === 'DRAFT') return matchSearch && isGraded && !isLocked
      if (statusFilter === 'PENDING') return matchSearch && !isGraded
      return matchSearch
    })
  }, [interns, searchTerm, statusFilter])

  const pagination = usePagination(filteredInterns, `${activeCompany?.maCongTy}|${statusFilter}|${searchTerm}`)

  // Thống kê nhanh
  const totalCount = interns.length
  const lockedCount = interns.filter((x) => x.daKhoaDiem).length
  const draftCount = interns.filter((x) => x.chiTietDiemDN && x.chiTietDiemDN.length >= 2 && !x.daKhoaDiem).length
  const pendingCount = totalCount - (lockedCount + draftCount)
  const gradedCount = lockedCount + draftCount

  const avgScore =
    gradedCount > 0
      ? (
          interns.reduce((sum, x) => {
            const s = (x.chiTietDiemDN || []).reduce((acc, c) => acc + (Number(c.diemCham) || 0), 0)
            return sum + s
          }, 0) / gradedCount
        ).toFixed(2)
      : '0.00'

  const progressPercent = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0

  // Khóa điểm trực tiếp từ hàng của bảng
  const handleConfirmRowLock = async () => {
    if (!lockingIntern) return
    setLockRowBusy(true)
    try {
      const chiTiets = (lockingIntern.chiTietDiemDN || []).map((x) => ({
        maTieuChi: x.maTieuChi,
        diemCham: Number(x.diemCham),
      }))
      await doanhNghiepService.danhGia({
        maPhanBo: lockingIntern.maPhanBo,
        chiTiets,
        nhanXet: lockingIntern.danhGia || '',
        khoaChinhThuc: true,
      })
      setLockingIntern(null)
      await loadInterns()
      setToastMessage(`Đã nộp và khóa điểm chính thức cho sinh viên ${lockingIntern.hoTenSV} thành công!`)
      setTimeout(() => setToastMessage(''), 4000)
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể khóa điểm.')
    } finally {
      setLockRowBusy(false)
    }
  }

  // Điều hướng sinh viên trong modal
  const handleNavigateModal = (direction) => {
    if (!activeModalIntern) return
    const curIdx = filteredInterns.findIndex((x) => x.maPhanBo === activeModalIntern.maPhanBo)
    const nextIdx = curIdx + direction
    if (nextIdx >= 0 && nextIdx < filteredInterns.length) {
      setActiveModalIntern(filteredInterns[nextIdx])
    }
  }

  const modalIndex = activeModalIntern
    ? filteredInterns.findIndex((x) => x.maPhanBo === activeModalIntern.maPhanBo)
    : -1

  return (
    <div className="space-y-6">
      {/* Toast thông báo toàn trang */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
            <span>{toastMessage}</span>
          </div>
          <button type="button" onClick={() => setToastMessage('')} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Bento Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 lg:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <span className="material-symbols-outlined text-[16px] text-indigo-600">corporate_fare</span>
              <span>Cổng Doanh nghiệp</span>
              <span>/</span>
              <span className="text-slate-800 font-semibold">Đánh giá thực tập sinh</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">
                Đánh giá thực tập sinh
              </h1>
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                {activeCompany?.tenCongTy || 'Doanh nghiệp'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
              Doanh nghiệp nhập và cập nhật điểm đánh giá chuẩn đầu ra CLO4 (CLO4.1 & CLO4.2, tối đa 5.00 điểm) theo quy định của Khoa CNTT - HUIT. Sau khi hoàn tất, vui lòng <strong>Nộp & Khóa điểm chính thức</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={loadInterns}
              disabled={loading || companyLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>{loading ? 'Đang tải…' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        {/* 4 Thẻ Bento KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Tổng thực tập sinh</span>
              <span className="material-symbols-outlined text-[18px] text-indigo-600">groups</span>
            </div>
            <div className="text-2xl font-black text-slate-900">{totalCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Phân bổ tại công ty</div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Đã khóa chính thức</span>
              <span className="material-symbols-outlined text-[18px] text-emerald-600">lock</span>
            </div>
            <div className="text-2xl font-black text-emerald-900">{lockedCount}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">Đã nộp kết quả đến Khoa</div>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Đang lưu tạm</span>
              <span className="material-symbols-outlined text-[18px] text-blue-600">edit_note</span>
            </div>
            <div className="text-2xl font-black text-blue-900">{draftCount}</div>
            <div className="text-[10px] text-blue-700 mt-0.5">Chưa bấm khóa chính thức</div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Chờ đánh giá</span>
              <span className="material-symbols-outlined text-[18px] text-amber-600">pending</span>
            </div>
            <div className="text-2xl font-black text-amber-900">{pendingCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">Cần nhập điểm CLO</div>
          </div>
        </div>
      </div>

      {/* Thông báo thời hạn chấm điểm duy nhất cho toàn trang */}
      <GradeDeadlineNotice deadline={globalDeadline} group="DN" />

      {/* Thông báo lỗi nếu có */}
      {error && (
        <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Thanh công cụ tìm kiếm, lọc & tiến độ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo họ tên sinh viên, mã sinh viên, vị trí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs transition-all"
            />
          </div>

          {/* Bộ lọc trạng thái */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'PENDING'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chờ đánh giá ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('DRAFT')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'DRAFT'
                    ? 'bg-white text-blue-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lưu tạm ({draftCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('LOCKED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'LOCKED'
                    ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đã khóa ({lockedCount})
              </button>
            </div>

            {/* Tiến độ đánh giá */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-[11px] font-semibold text-slate-500">Tiến độ:</span>
              <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="font-extrabold text-slate-800 text-[11px]">{progressPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Trạng thái tải */}
      {loading || companyLoading ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
          <div className="inline-block animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách thực tập sinh…</p>
        </div>
      ) : null}

      {/* Trạng thái rỗng */}
      {!loading && !companyLoading && !error && filteredInterns.length === 0 && (
        <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
          <span className="material-symbols-outlined text-[36px] text-slate-300">person_off</span>
          <p className="text-xs font-semibold text-slate-700">
            {activeCompany?.maCongTy
              ? searchTerm || statusFilter !== 'ALL'
                ? 'Không tìm thấy thực tập sinh nào phù hợp với bộ lọc.'
                : `Chưa có sinh viên được phân bổ thực tập tại ${activeCompany.tenCongTy || 'doanh nghiệp này'}.`
              : 'Chưa xác định được công ty của tài khoản doanh nghiệp.'}
          </p>
          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('ALL')
              }}
              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          )}
        </div>
      )}

      {/* BẢNG TỔNG HỢP DUY NHẤT (MASTER TABLE) */}
      {!loading && !companyLoading && filteredInterns.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-12 text-center">STT</th>
                  <th className="py-3.5 px-4">Sinh viên</th>
                  <th className="py-3.5 px-4">Vị trí & Chuyên ngành</th>
                  <th className="py-3.5 px-3 text-center">
                    <div>CLO4.1 (2.0đ)</div>
                    <div className="text-[9px] text-slate-400 font-normal">Phong cách / Kỷ luật</div>
                  </th>
                  <th className="py-3.5 px-3 text-center">
                    <div>CLO4.2 (3.0đ)</div>
                    <div className="text-[9px] text-slate-400 font-normal">Chuyên môn / Thực tế</div>
                  </th>
                  <th className="py-3.5 px-3 text-center">Tổng điểm DN</th>
                  <th className="py-3.5 px-4">Nhận xét của DN</th>
                  <th className="py-3.5 px-3 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagination.items.map((intern, idx) => {
                  const score41 = (intern.chiTietDiemDN || []).find((x) => x.maTieuChi === 'CLO4.1')?.diemCham
                  const score42 = (intern.chiTietDiemDN || []).find((x) => x.maTieuChi === 'CLO4.2')?.diemCham
                  const total = (Number(score41) || 0) + (Number(score42) || 0)
                  const isGraded = score41 !== undefined && score42 !== undefined
                  const isLocked = Boolean(intern.daKhoaDiem)

                  return (
                    <tr key={intern.maPhanBo} className="hover:bg-slate-50/80 transition-colors">
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {pagination.startIndex + idx + 1}
                      </td>

                      {/* Thông tin Sinh viên */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                            {(intern.hoTenSV || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              {intern.hoTenSV}
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              MSSV: {intern.maSinhVien}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Vị trí & Chuyên ngành */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 truncate max-w-[220px]" title={intern.viTriThucTap || ''}>
                          {intern.viTriThucTap || 'Thực tập sinh'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {intern.chuyenNganhSV || 'Công nghệ thông tin'}
                        </div>
                      </td>

                      {/* CLO4.1 */}
                      <td className="py-3.5 px-3 text-center font-bold">
                        {score41 !== undefined ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold">
                            {Number(score41).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>

                      {/* CLO4.2 */}
                      <td className="py-3.5 px-3 text-center font-bold">
                        {score42 !== undefined ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold">
                            {Number(score42).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </td>

                      {/* Tổng điểm DN */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black ${
                            isLocked
                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                              : isGraded
                              ? 'bg-blue-50 text-blue-900 border border-blue-200'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {total.toFixed(2)}
                          <span className="text-[10px] font-normal text-slate-400 ml-1">/ 5.0</span>
                        </span>
                      </td>

                      {/* Nhận xét */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        {intern.danhGia ? (
                          <p className="text-slate-700 text-xs truncate" title={intern.danhGia}>
                            {intern.danhGia}
                          </p>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa có nhận xét</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-3 text-center">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <span className="material-symbols-outlined text-[13px] text-emerald-700">lock</span>
                            <span>Đã khóa chính thức</span>
                          </span>
                        ) : isGraded ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span>Đã lưu tạm</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Chờ đánh giá</span>
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Nút Xem / In Phiếu Nhận Xét HUIT */}
                          <button
                            type="button"
                            onClick={() => setPrintIntern(intern)}
                            className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                            title="In Phiếu nhận xét (Mẫu chuẩn HUIT)"
                          >
                            <span className="material-symbols-outlined text-[16px]">print</span>
                          </button>

                          {/* Nút Xem chi tiết / Chấm điểm */}
                          <button
                            type="button"
                            onClick={() => setActiveModalIntern(intern)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-all cursor-pointer ${
                              isLocked
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : isGraded
                                ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {isLocked ? 'visibility' : isGraded ? 'edit' : 'edit_square'}
                            </span>
                            <span>{isLocked ? 'Xem chi tiết' : isGraded ? 'Sửa điểm' : 'Chấm điểm'}</span>
                          </button>

                          {/* Nút Khóa nhanh từ bảng nếu đã có đủ điểm nhưng chưa khóa */}
                          {!isLocked && isGraded && (
                            <button
                              type="button"
                              onClick={() => setLockingIntern(intern)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                              title="Nộp & Khóa điểm chính thức"
                            >
                              <span className="material-symbols-outlined text-[14px]">lock</span>
                              <span>Khóa</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Phân trang đầy đủ */}
          <Pagination pagination={pagination} label="thực tập sinh" />
        </div>
      )}

      {/* MODAL ĐÁNH GIÁ TẬP TRUNG */}
      {activeModalIntern && (
        <GradeInternModal
          intern={activeModalIntern}
          onClose={() => setActiveModalIntern(null)}
          onSaved={loadInterns}
          onNavigate={handleNavigateModal}
          onOpenPrint={(item) => setPrintIntern(item)}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex < filteredInterns.length - 1}
          currentIndex={modalIndex}
          totalCount={filteredInterns.length}
          drafts={drafts}
          deadline={globalDeadline}
        />
      )}

      {/* POPUP XÁC NHẬN KHÓA NHANH TỪ HÀNG CỦA BẢNG */}
      {lockingIntern && (
        <ConfirmLockModal
          intern={lockingIntern}
          totalScore={(lockingIntern.chiTietDiemDN || []).reduce((acc, c) => acc + (Number(c.diemCham) || 0), 0)}
          onConfirm={handleConfirmRowLock}
          onCancel={() => setLockingIntern(null)}
          busy={lockRowBusy}
        />
      )}

      {/* MODAL XEM TRƯỚC & IN PHIẾU NHẬN XÉT HUIT */}
      {printIntern && (
        <PrintHuitEvaluationModal
          intern={printIntern}
          activeCompany={activeCompany}
          onClose={() => setPrintIntern(null)}
        />
      )}
    </div>
  )
}
