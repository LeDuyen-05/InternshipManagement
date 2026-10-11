import { useState, useEffect } from 'react'
import { tienDoThucTapService } from '../../services/tienDoThucTapService'

const MA_SV_DEFAULT = 'SV001'
const MA_DOT_DEFAULT = 'DOT01'

// Danh mục 10 tuần chuẩn thực tập tốt nghiệp
const WEEKS_TEMPLATE = [
  { week: 1, title: 'Tuần 1: Onboarding, làm quen môi trường & tiếp nhận dự án', targetDate: '2026-03-02' },
  { week: 2, title: 'Tuần 2: Nghiên cứu kiến trúc hệ thống & UI Design System', targetDate: '2026-03-09' },
  { week: 3, title: 'Tuần 3: Thiết kế CSDL & cài đặt môi trường phát triển', targetDate: '2026-03-16' },
  { week: 4, title: 'Tuần 4: Xây dựng module nghiệp vụ cốt lõi & API nội bộ', targetDate: '2026-03-23' },
  { week: 5, title: 'Tuần 5: Phát triển giao diện người dùng & tích hợp API', targetDate: '2026-04-06' },
  { week: 6, title: 'Tuần 6: Kiểm thử đơn vị (Unit Test) & tối ưu hiệu năng', targetDate: '2026-04-13' },
  { week: 7, title: 'Tuần 7: Tích hợp dịch vụ bên thứ ba & bảo mật ứng dụng', targetDate: '2026-04-20' },
  { week: 8, title: 'Tuần 8: Triển khai thử nghiệm (Staging/Docker) & fix bugs', targetDate: '2026-04-27' },
  { week: 9, title: 'Tuần 9: Đánh giá kết quả cùng Mentor & viết tài liệu kỹ thuật', targetDate: '2026-05-04' },
  { week: 10, title: 'Tuần 10: Tổng kết thực tập, nghiệm thu & báo cáo đồ án', targetDate: '2026-05-10' },
]

export default function NopTienDoSVPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [openWeek, setOpenWeek] = useState(1) // Tuần đang mở accordion
  const [toast, setToast] = useState(null)

  // Modal nộp báo cáo
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedWeekData, setSelectedWeekData] = useState(null)
  const [reportContent, setReportContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchReports = async () => {
    setLoading(true)
    try {
      const data = await tienDoThucTapService.getTienDoBySinhVien(MA_SV_DEFAULT)
      setReports(data || [])
    } catch (err) {
      console.error('Lỗi khi tải tiến độ thực tập:', err)
      showToast('Không thể kết nối đến máy chủ API', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  // Tìm báo cáo tương ứng với tuần theo thứ tự hoặc ID
  const getReportForWeek = (weekIndex) => {
    if (!reports || reports.length === 0) return null
    return reports[weekIndex] || null
  }

  // Mở modal nộp báo cáo
  const handleOpenSubmitModal = (wItem, existingReport) => {
    setSelectedWeekData(wItem)
    setReportContent(existingReport?.noiDungBaoCao || '')
    setModalOpen(true)
  }

  // Submit báo cáo
  const handleSubmitReport = async (e) => {
    e.preventDefault()
    if (!reportContent.trim()) {
      showToast('Vui lòng nhập nội dung báo cáo!', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const existingReport = reports.find((r) =>
        r.mocThoiGian?.startsWith(selectedWeekData.targetDate) ||
        r.noiDungBaoCao?.includes(`Tuần ${selectedWeekData.week}`)
      )

      await tienDoThucTapService.nopBaoCao({
        maTienDo: existingReport?.maTienDo || null,
        maSV: MA_SV_DEFAULT,
        maDot: MA_DOT_DEFAULT,
        mocThoiGian: selectedWeekData.targetDate,
        noiDungBaoCao: reportContent,
      })

      showToast(`Nộp báo cáo ${selectedWeekData.title.split(':')[0]} thành công!`)
      setModalOpen(false)
      fetchReports()
    } catch (err) {
      console.error(err)
      showToast('Lỗi khi nộp báo cáo: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Tính thống kê
  const approvedCount = reports.filter((r) => r.trangThaiDuyet === 'DaDuyet').length
  const pendingCount = reports.filter((r) => r.trangThaiDuyet === 'DaNop' || r.trangThaiDuyet === 'ChoDuyet').length
  const totalCompleted = reports.length

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-bounce ${
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
            THEO DÕI TIẾN ĐỘ • THỰC TẬP TỐT NGHIỆP ĐỢT 1 NĂM 2026
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Theo dõi Tiến độ & Nộp Báo cáo Tuần
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cập nhật kết quả làm việc định kỳ hàng tuần, nhận đánh giá phản hồi từ Giảng viên hướng dẫn và Mentor doanh nghiệp.
          </p>
        </div>

        <button
          onClick={() => {
            const nextWeek = WEEKS_TEMPLATE[reports.length] || WEEKS_TEMPLATE[0]
            handleOpenSubmitModal(nextWeek, null)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold shadow-xs transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add_task</span>
          Nộp báo cáo tuần mới
        </button>
      </div>

      {/* Bento Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Card */}
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tiến độ kỳ thực tập</span>
            <span className="material-symbols-outlined text-blue-700 text-[22px]">trending_up</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">
              {totalCompleted}<span className="text-lg text-slate-400 font-normal">/10 tuần</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 mt-3 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalCompleted / 10) * 100)}%` }}
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
            <div className="text-xs text-emerald-600 font-semibold mt-1">
              Điểm trung bình GVHD: 9.0/10
            </div>
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
            <div className="text-xs text-slate-500 mt-1">Phản hồi dự kiến: trong 48h</div>
          </div>
        </div>

        {/* Compliance */}
        <div className="p-5 bg-emerald-50/60 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-xs font-bold uppercase tracking-wider">Đúng hạn & Kỷ luật</span>
            <span className="material-symbols-outlined text-emerald-700 text-[22px]">bolt</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-900">100%</div>
            <div className="text-xs text-emerald-700 font-medium mt-1">Không có báo cáo trễ hạn</div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-700 text-[22px]">view_timeline</span>
            <h2 className="text-base font-bold text-slate-900">Lộ trình Báo cáo Chi tiết 10 Tuần</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Đã duyệt
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Đã nộp chờ duyệt
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
        ) : (
          <div className="flex flex-col gap-3">
            {WEEKS_TEMPLATE.map((wItem, idx) => {
              const rep = getReportForWeek(idx)
              const isOpen = openWeek === wItem.week

              let badge = (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                  Chưa nộp
                </span>
              )
              let statusIcon = 'pending'
              let iconColor = 'bg-slate-100 text-slate-500'

              if (rep) {
                if (rep.trangThaiDuyet === 'DaDuyet') {
                  badge = (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đã duyệt ✓ • 9.0/10
                    </span>
                  )
                  statusIcon = 'check_circle'
                  iconColor = 'bg-emerald-100 text-emerald-700'
                } else if (rep.trangThaiDuyet === 'DaNop' || rep.trangThaiDuyet === 'ChoDuyet') {
                  badge = (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Đã nộp • Chờ GVHD duyệt
                    </span>
                  )
                  statusIcon = 'schedule'
                  iconColor = 'bg-amber-100 text-amber-700'
                }
              }

              return (
                <div
                  key={wItem.week}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => setOpenWeek(isOpen ? null : wItem.week)}
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
                          <span className="font-bold text-sm text-slate-900">{wItem.title}</span>
                          {badge}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Hạn chót: {new Date(wItem.targetDate).toLocaleDateString('vi-VN')}
                          {rep?.ngayNop && (
                            <span className="text-slate-600 font-medium">
                              {' '}
                              • Nộp ngày: {new Date(rep.ngayNop).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </p>
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
                      {rep ? (
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

                          {/* Mentor review comment */}
                          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5">
                            <span className="material-symbols-outlined text-blue-700 text-[20px] shrink-0 mt-0.5">
                              rate_review
                            </span>
                            <div className="text-xs text-slate-700">
                              <span className="font-bold text-blue-900">
                                Nhận xét của Giảng viên hướng dẫn & Mentor:
                              </span>
                              <p className="mt-0.5 italic">
                                {rep.trangThaiDuyet === 'DaDuyet'
                                  ? 'Sinh viên nắm vững tiến độ, hoàn thành đúng chỉ tiêu kỹ thuật được giao. Đạt yêu cầu.'
                                  : 'Đã tiếp nhận báo cáo. Giảng viên đang tiến hành kiểm tra mã nguồn và sản phẩm.'}
                              </p>
                            </div>
                          </div>

                          {/* Edit button */}
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleOpenSubmitModal(wItem, rep)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit_note</span>
                              Cập nhật lại báo cáo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300">
                          <span className="material-symbols-outlined text-[36px] text-slate-300">
                            upload_file
                          </span>
                          <p className="text-xs text-slate-500 mt-1">
                            Chưa có dữ liệu nộp cho tuần này. Vui lòng gửi báo cáo công việc đúng hạn.
                          </p>
                          <button
                            onClick={() => handleOpenSubmitModal(wItem, null)}
                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">post_add</span>
                            Nộp báo cáo tuần {wItem.week}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal: Nộp Báo Cáo */}
      {modalOpen && selectedWeekData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">assignment</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Nộp Báo cáo Tiến độ Tuần</h3>
                  <p className="text-xs text-slate-500">{selectedWeekData.title}</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nội dung báo cáo chi tiết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="5"
                  required
                  placeholder="Mô tả công việc đã hoàn thành, công nghệ sử dụng, kết quả demo hoặc khó khăn cần GVHD hỗ trợ..."
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                ></textarea>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-700 text-[18px] shrink-0 mt-0.5">
                  info
                </span>
                <span>
                  Báo cáo sau khi nộp sẽ được chuyển trực tiếp đến Giảng viên hướng dẫn và Mentor tại doanh nghiệp để chấm điểm và nghiệm thu.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Gửi báo cáo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
