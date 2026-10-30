import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useState, useEffect, useCallback, useRef } from 'react'
import ModalOverlay from '../../components/common/ModalOverlay.jsx'
import DocumentAttachments from '../../components/common/DocumentAttachments'
import { tienDoThucTapService } from '../../services/tienDoThucTapService'
import { phongVanService } from '../../services/phongVanService'
import { useIdentity } from '../../hooks/useIdentity'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import NoLinkedAccount from '../../components/common/NoLinkedAccount'
import { BAO_CAO, PHAN_BO } from '../../utils/trangThai'
import { Link } from 'react-router-dom'
import { submissionBlock } from '../../utils/reportDeadline'

// Khung báo cáo tuần theo kế hoạch: công việc – kết quả – khó khăn – minh chứng
const MAU_BAO_CAO = `1. Công việc đã thực hiện trong tuần:
-

2. Kết quả đạt được:
-

3. Khó khăn / vấn đề cần GVHD hỗ trợ:
-

4. Minh chứng (link tài liệu, mã nguồn, hình ảnh):
- `

const nopTre = (r) => r.nopTre ?? (r.ngayNop && String(r.ngayNop).slice(0, 10) > String(r.mocThoiGian).slice(0, 10))

export default function NopTienDoSVPage() {
  const { maSV } = useIdentity()
  const { selectedDot, roundLock } = useDotThucTap()

  const [reports, setReports] = useState([])
  const pagination = usePagination(reports, JSON.stringify([maSV, selectedDot?.maDot]))
  const [placement, setPlacement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openSlotId, setOpenSlotId] = useState(null)
  const [toast, setToast] = useState(null)

  // Modal nộp báo cáo
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [reportContent, setReportContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const requestVersion = useRef(0)
  const maDot = selectedDot?.maDot
  const contextKey = `${maSV}|${maDot}`
  const currentContext = useRef(contextKey)
  currentContext.current = contextKey

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchReports = useCallback(async () => {
    if (!maSV || currentContext.current !== contextKey) return
    const version = ++requestVersion.current
    setLoading(true)
    try {
      const [data, pb] = await Promise.all([
        tienDoThucTapService.getTienDoBySinhVien(maSV),
        phongVanService.getPhanBoThucTap(maSV, maDot),
      ])
      if (version !== requestVersion.current || currentContext.current !== contextKey) return
      setPlacement(pb && (!maDot || pb.maDot === maDot) ? pb : null)
      const list = Array.isArray(data) ? data : []
      // Lọc theo đợt đang chọn nếu có
      const filtered = maDot ? list.filter((r) => r.maDot === maDot) : list
      // Sắp xếp theo mốc thời gian tăng dần
      filtered.sort((a, b) => new Date(a.mocThoiGian) - new Date(b.mocThoiGian))
      setReports(filtered)
      if (filtered.length > 0) setOpenSlotId(current => current || filtered[0].maTienDo)
    } catch (err) {
      if (version === requestVersion.current && currentContext.current === contextKey) {
        setPlacement(null); setReports([])
        setToast({ message: err.response?.data?.message || 'Không tải được tiến độ thực tập.', type: 'error' })
      }
    } finally {
      if (version === requestVersion.current && currentContext.current === contextKey) setLoading(false)
    }
  }, [maSV, maDot, contextKey])

  useEffect(() => {
    setPlacement(null); setReports([]); setModalOpen(false); setSelectedSlot(null); setOpenSlotId(null); setToast(null); setIsSubmitting(false)
    fetchReports()
    const version = requestVersion
    return () => { version.current++ }
  }, [fetchReports])

  if (!maSV) {
    return <NoLinkedAccount />
  }

  // Chỉ nộp báo cáo khi đã có quyết định tiếp nhận và đã xác nhận nhận việc (backend cũng kiểm tra)
  const lyDoChuaNop = !placement
    ? 'Bạn chưa có quyết định tiếp nhận thực tập trong đợt này nên chưa thể nộp báo cáo tiến độ.'
    : placement.trangThai === 'ChuaNhanViec'
      ? `Bạn cần xác nhận nhận quyết định tiếp nhận tại ${placement.tenCongTy} trước khi nộp báo cáo tiến độ.`
      : placement.trangThai !== 'DangThucTap' || placement.daDuocKhoaDuyet === false
        ? 'Bạn chỉ được nộp tiến độ khi đang thực tập và nơi thực tập đã được Khoa chốt.'
        : null

  // Mở modal nộp / sửa báo cáo
  const handleOpenSubmitModal = (slot) => {
    if (roundLock.blocked) return showToast('Đợt đã khóa hoặc chưa xác minh trạng thái khóa.', 'error')
    if (lyDoChuaNop || loading) return
    const block = submissionBlock(slot)
    if (block) { showToast(block, 'error'); return }
    setSelectedSlot(slot)
    setReportContent(slot.noiDungBaoCao || MAU_BAO_CAO)
    setModalOpen(true)
  }

  // Submit báo cáo
  const handleSubmitReport = async (e) => {
    e.preventDefault()
    if (roundLock.blocked) return showToast('Đợt đã khóa hoặc chưa xác minh trạng thái khóa.', 'error')
    if (lyDoChuaNop || loading || isSubmitting) return
    const block = submissionBlock(selectedSlot)
    if (block) { showToast(block, 'error'); return }
    if (!reportContent.trim() || reportContent.trim() === MAU_BAO_CAO.trim()) {
      showToast('Vui lòng nhập nội dung báo cáo!', 'error')
      return
    }

    if (!selectedSlot?.maTienDo) {
      showToast('Không tìm thấy mốc báo cáo hợp lệ!', 'error')
      return
    }

    setIsSubmitting(true)
    const version = requestVersion.current
    try {
      await tienDoThucTapService.nopBaoCao({
        maTienDo: selectedSlot.maTienDo,
        noiDungBaoCao: reportContent.trim(),
      })
      if (version !== requestVersion.current || currentContext.current !== contextKey) return

      showToast('Nộp báo cáo tiến độ thành công!')
      setModalOpen(false)
      fetchReports()
    } catch (err) {
      if (version !== requestVersion.current || currentContext.current !== contextKey) return
      console.error(err)
      showToast('Lỗi khi nộp báo cáo: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      if (version === requestVersion.current && currentContext.current === contextKey) setIsSubmitting(false)
    }
  }

  // Thống kê tiến độ
  const totalSlots = reports.length
  const approvedCount = reports.filter((r) => r.trangThaiDuyet === 'DaDuyet').length
  const pendingCount = reports.filter((r) => r.trangThaiDuyet === 'DaNop').length
  const needEditCount = reports.filter((r) => r.trangThaiDuyet === 'YeuCauSua').length
  const submittedCount = reports.filter((r) => r.trangThaiDuyet !== 'ChuaNop').length

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DaDuyet':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã duyệt ✓
          </span>
        )
      case 'DaNop':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </span>
        )
      case 'YeuCauSua':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Cần chỉnh sửa
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            Chưa nộp
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            THEO DÕI TIẾN ĐỘ • {selectedDot?.tenDot || 'ĐỢT THỰC TẬP'}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Theo dõi Tiến độ & Nộp Báo cáo Tuần
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cập nhật kết quả làm việc định kỳ hàng tuần, nhận đánh giá phản hồi từ Giảng viên hướng dẫn.
            {' '}Hạn tính hết ngày Việt Nam. Quá hạn bị khóa; lên Khoa trình bày lý do để được xem xét mở nộp bổ sung.
          </p>
        </div>
      </div>

      {!loading && lyDoChuaNop && (
        <div className="p-4 rounded-xl border bg-amber-50 border-amber-200 text-amber-800 text-sm font-medium flex flex-wrap items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">info</span>
          <span>{lyDoChuaNop}</span>
          {placement?.trangThai === 'ChuaNhanViec' && (
            <Link to="/sinh-vien/lich-trinh" className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
              Xác nhận nhận việc
            </Link>
          )}
        </div>
      )}
      {placement && placement.trangThai !== 'ChuaNhanViec' && (
        <div className="text-xs text-slate-500 -mt-3">
          Đơn vị thực tập: <strong className="text-slate-700">{placement.tenCongTy}</strong> • {PHAN_BO[placement.trangThai] || placement.trangThai}
        </div>
      )}

      {/* Bento Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Card */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tiến độ nộp</span>
            <span className="material-symbols-outlined text-blue-700 text-[22px]">trending_up</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">
              {submittedCount}
              <span className="text-lg text-slate-400 font-normal">/{totalSlots} tuần</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 mt-3 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${totalSlots > 0 ? Math.min(100, (submittedCount / totalSlots) * 100) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Approved Reports */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Báo cáo đã duyệt</span>
            <span className="material-symbols-outlined text-emerald-700 text-[22px]">verified</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-800">{approvedCount}</div>
            <div className="text-xs text-slate-500 mt-1">Đạt yêu cầu GVHD</div>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Chờ xem xét & duyệt</span>
            <span className="material-symbols-outlined text-amber-600 text-[22px]">schedule</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-amber-700">{pendingCount}</div>
            <div className="text-xs text-slate-500 mt-1">Đang chờ giảng viên kiểm tra</div>
          </div>
        </div>

        {/* Need Edit */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Yêu cầu chỉnh sửa</span>
            <span className="material-symbols-outlined text-rose-600 text-[22px]">edit_note</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-rose-700">{needEditCount}</div>
            <div className="text-xs text-rose-600 font-medium mt-1">Cần bổ sung/sửa lại nội dung</div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-700 text-[22px]">view_timeline</span>
            <h2 className="text-base font-bold text-slate-900">
              Lộ trình Báo cáo ({totalSlots} Mốc báo cáo)
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Đã duyệt
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Chờ duyệt
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Cần sửa
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Chưa nộp
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
            <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-slate-500 font-medium">Đang tải tiến độ thực tập...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
            <span className="material-symbols-outlined text-4xl text-slate-300">event_busy</span>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Khoa chưa tạo mốc báo cáo cho đợt này.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Vui lòng theo dõi thông báo từ Khoa hoặc liên hệ Văn phòng Khoa để được hỗ trợ.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">

            {pagination.items.map((rep, idx) => {
              const isOpen = openSlotId === rep.maTienDo
              const canSubmitOrEdit =
                !roundLock.blocked && !lyDoChuaNop && !submissionBlock(rep) && !rep.maPhanBoLuuTru && (rep.trangThaiDuyet === 'ChuaNop' || rep.trangThaiDuyet === 'YeuCauSua')

              let statusIcon = 'pending'
              let iconColor = 'bg-slate-100 text-slate-500'

              if (rep.trangThaiDuyet === 'DaDuyet') {
                statusIcon = 'check_circle'
                iconColor = 'bg-emerald-100 text-emerald-700'
              } else if (rep.trangThaiDuyet === 'DaNop') {
                statusIcon = 'schedule'
                iconColor = 'bg-amber-100 text-amber-700'
              } else if (rep.trangThaiDuyet === 'YeuCauSua') {
                statusIcon = 'error'
                iconColor = 'bg-rose-100 text-rose-700'
              }

              return (
                <div
                  key={rep.maTienDo}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => setOpenSlotId(isOpen ? null : rep.maTienDo)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 ${iconColor}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{statusIcon}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">Tuần {pagination.start + idx}</span>
                          {getStatusBadge(rep.trangThaiDuyet)}
                          {rep.maPhanBoLuuTru && <span className="hint">Lịch sử trước khi đổi nơi — chỉ xem</span>}
                          {nopTre(rep) && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                              {rep.hanNopBoSung ? 'Nộp bổ sung được Khoa mở' : 'Nộp sau hạn gốc — lịch sử'}
                            </span>
                          )}
                          {!rep.ngayNop && rep.trangThaiDuyet === 'ChuaNop' && new Date(rep.mocThoiGian) < new Date().setHours(0, 0, 0, 0) && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Quá hạn
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Hạn chót: {new Date(rep.mocThoiGian).toLocaleDateString('vi-VN')}
                          {rep.hanNopBoSung && <span> · Khoa mở bổ sung đến {new Date(rep.hanNopBoSung).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ Việt Nam)</span>}
                          {rep.ngayNop && (
                            <span className="text-slate-600 font-medium">
                              {' '}
                              • Nộp ngày: {new Date(rep.ngayNop).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </p>
                        {(rep.trangThaiDuyet === 'ChuaNop' || rep.trangThaiDuyet === 'YeuCauSua') && submissionBlock(rep) && <p className="text-xs text-rose-700">{submissionBlock(rep)}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400 text-[20px] transition-transform duration-200">
                        {isOpen ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                      {rep.noiDungBaoCao ? (
                        <div className="flex flex-col gap-3">
                          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                              <span>Nội dung báo cáo tuần:</span>
                              <span className="font-mono text-[11px] text-slate-400">Mã: {rep.maTienDo}</span>
                            </div>
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                              {rep.noiDungBaoCao}
                            </p>
                          </div>

                          {/* Nhận xét của giảng viên nếu có */}
                          {rep.nhanXet && (
                            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5">
                              <span className="material-symbols-outlined text-blue-700 text-[20px] shrink-0 mt-0.5">
                                rate_review
                              </span>
                              <div className="text-xs text-slate-700">
                                <span className="font-bold text-blue-900">
                                  Nhận xét của Giảng viên hướng dẫn:
                                </span>
                                <p className="mt-0.5 italic text-slate-800">{rep.nhanXet}</p>
                              </div>
                            </div>
                          )}

                          {/* Action button if editable */}
                          {canSubmitOrEdit && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => handleOpenSubmitModal(rep)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                Chỉnh sửa nội dung báo cáo
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300">
                          <span className="material-symbols-outlined text-[36px] text-slate-300">
                            upload_file
                          </span>
                          <p className="text-xs text-slate-500 mt-1">
                            Chưa có dữ liệu nộp cho tuần này. Vui lòng gửi báo cáo công việc đúng hạn.
                          </p>
                          {canSubmitOrEdit && (
                            <button
                              onClick={() => handleOpenSubmitModal(rep)}
                              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">post_add</span>
                              Nộp báo cáo tuần {pagination.start + idx}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <Pagination pagination={pagination} label="mốc báo cáo thực tập"/>
          </div>
        )}
      </div>

      {/* Modal Nộp Báo Cáo */}
      {modalOpen && selectedSlot && (
        <ModalOverlay onClose={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700 text-[24px]">post_add</span>
                <h3 className="text-base font-bold text-slate-900">
                  Nộp Báo Cáo Tiến Độ (Mã: {selectedSlot.maTienDo})
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <DocumentAttachments key={selectedSlot.maTienDo} kind="Progress" resourceId={selectedSlot.maTienDo} />
            <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex justify-between">
                <span>
                  Hạn chót: <strong>{new Date(selectedSlot.mocThoiGian).toLocaleDateString('vi-VN')}</strong>
                </span>
                <span>
                  Trạng thái hiện tại: <strong>{BAO_CAO[selectedSlot.trangThaiDuyet] || selectedSlot.trangThaiDuyet}</strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nội dung công việc & Kết quả đạt được trong tuần:
                </label>
                <textarea
                  rows={12}
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="Mô tả chi tiết: Nhiệm vụ được giao, công nghệ sử dụng, tiến độ hoàn thành, khó khăn gặp phải..."
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-2xs resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || roundLock.blocked}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>}
                  <span>Gửi báo cáo</span>
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
