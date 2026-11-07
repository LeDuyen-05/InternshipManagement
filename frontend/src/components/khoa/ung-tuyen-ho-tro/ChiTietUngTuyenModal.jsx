import { useState, useEffect, useRef } from 'react'
import ModalOverlay from '../../common/ModalOverlay'
import { ungTuyenHoTroService } from '../../../services/ungTuyenHoTroService'
import { dangKyThucTapService } from '../../../services/dangKyThucTapService'
import SupplementalRegistrationPanel from './SupplementalRegistrationPanel'

export default function ChiTietUngTuyenModal({
  isOpen,
  onClose,
  maSV,
  maDot,
  onUpdated,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('history') // 'history' | 'support-history' | 'record-response' | 'recommend-company' | 'create-support' | 'confirm-refusal'
  const [submitting, setSubmitting] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')
  const [actionError, setActionError] = useState('')

  // Form states
  const [companiesInRound, setCompaniesInRound] = useState([])
  const [responseForm, setResponseForm] = useState({
    phanHoi: 'NhanHoTro',
    lyDo: '',
    maLan: '',
    phienBan: 0,
  })
  const [recommendForm, setRecommendForm] = useState({
    maLan: '',
    phienBan: 0,
    maCongTy: '',
    maViTri: '',
    ghiChu: '',
  })
  const [newSupportForm, setNewSupportForm] = useState({
    tenLan: '',
    ngayHoTro: new Date().toISOString().slice(0, 10),
    maLanTruoc: '',
  })
  const [confirmRefusalForm, setConfirmRefusalForm] = useState({
    lyDo: 'Sinh viên từ chối toàn bộ hỗ trợ và vẫn chưa có nơi thực tập hợp lệ.',
    canCu: 'Biên bản xác minh của Khoa và phản hồi từ chối của sinh viên.',
    maLanHoTro: '',
    phienBanHoTro: 0,
  })

  const modalRef = useRef(null)

  const loadDetail = async () => {
    if (!maSV || !maDot) return
    setLoading(true)
    setError('')
    try {
      const res = await ungTuyenHoTroService.getChiTiet(maSV, maDot)
      setData(res)

      // Set default support round in forms if available
      const latestSupport = res.cacLanHoTro?.[0]
      if (latestSupport) {
        setResponseForm((prev) => ({
          ...prev,
          maLan: latestSupport.maLan,
          phienBan: latestSupport.phienBan ?? 0,
        }))
        setRecommendForm((prev) => ({
          ...prev,
          maLan: latestSupport.maLan,
          phienBan: latestSupport.phienBan ?? 0,
        }))
        setConfirmRefusalForm((prev) => ({
          ...prev,
          maLanHoTro: latestSupport.maLan,
          phienBanHoTro: latestSupport.phienBan ?? 0,
        }))
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Không thể tải chi tiết sinh viên.')
    } finally {
      setLoading(false)
    }
  }

  // Load companies for the recommendation dropdown
  const loadCompanies = async () => {
    if (!maDot) return
    try {
      const comps = await dangKyThucTapService.getDanhSachCongTy(maDot)
      setCompaniesInRound(comps || [])
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadDetail()
      loadCompanies()
      setActiveTab('history')
      setActionSuccess('')
      setActionError('')
    } else {
      setData(null)
    }
  }, [isOpen, maSV, maDot])

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, submitting, onClose])

  if (!isOpen) return null

  const sv = data?.sinhVien
  const ungTuyens = data?.ungTuyens || []
  const cacLanHoTro = data?.cacLanHoTro || []
  const actions = data?.actions || sv?.actions || {}

  // Gửi phản hồi Khoa ghi thay
  const handleRecordResponse = async (e) => {
    e.preventDefault()
    if (!responseForm.maLan) {
      setActionError('Vui lòng chọn lần hỗ trợ.')
      return
    }
    if (!responseForm.lyDo.trim()) {
      setActionError('Vui lòng nhập lý do phản hồi.')
      return
    }

    setSubmitting(true)
    setActionError('')
    setActionSuccess('')
    try {
      await ungTuyenHoTroService.ghiNhanPhanHoi(maSV, responseForm.maLan, maDot, {
        phienBan: responseForm.phienBan,
        phanHoi: responseForm.phanHoi,
        lyDo: responseForm.lyDo.trim(),
      })
      setActionSuccess('Đã ghi nhận phản hồi hỗ trợ thành công!')
      await loadDetail()
      onUpdated?.()
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Ghi nhận phản hồi thất bại. Vui lòng tải lại.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Giới thiệu công ty
  const handleRecommendCompany = async (e) => {
    e.preventDefault()
    if (!recommendForm.maLan) {
      setActionError('Vui lòng chọn lần hỗ trợ.')
      return
    }
    if (!recommendForm.maCongTy) {
      setActionError('Vui lòng chọn công ty đối tác.')
      return
    }

    setSubmitting(true)
    setActionError('')
    setActionSuccess('')
    try {
      await ungTuyenHoTroService.gioiThieuCongTy(maSV, recommendForm.maLan, maDot, {
        phienBan: recommendForm.phienBan,
        maCongTy: recommendForm.maCongTy,
        maViTri: recommendForm.maViTri || null,
        ghiChu: recommendForm.ghiChu.trim(),
      })
      setActionSuccess('Đã lưu công ty giới thiệu cho sinh viên thành công!')
      setRecommendForm((prev) => ({ ...prev, maCongTy: '', maViTri: '', ghiChu: '' }))
      await loadDetail()
      onUpdated?.()
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Không thể giới thiệu công ty. Vui lòng tải lại.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Tạo lần hỗ trợ mới cho SV
  const handleCreateSupport = async (e) => {
    e.preventDefault()
    if (!newSupportForm.tenLan.trim()) {
      setActionError('Vui lòng nhập tên lần hỗ trợ (VD: Hỗ trợ đợt 2 - Lần 1).')
      return
    }

    setSubmitting(true)
    setActionError('')
    setActionSuccess('')
    try {
      await ungTuyenHoTroService.taoLanHoTro(maDot, {
        tenLan: newSupportForm.tenLan.trim(),
        ngayHoTro: newSupportForm.ngayHoTro,
        maSinhViens: [maSV],
        phienBan: 0,
        maLanTruoc: newSupportForm.maLanTruoc || null,
      })
      setActionSuccess('Đã tạo lần hỗ trợ và thêm sinh viên vào danh sách hỗ trợ thành công!')
      setNewSupportForm({
        tenLan: '',
        ngayHoTro: new Date().toISOString().slice(0, 10),
        maLanTruoc: '',
      })
      await loadDetail()
      onUpdated?.()
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Không thể tạo lần hỗ trợ. Vui lòng thử lại.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Xác nhận rớt đợt do từ chối hỗ trợ
  const handleConfirmRefusal = async (e) => {
    e.preventDefault()
    if (!confirmRefusalForm.maLanHoTro) {
      setActionError('Cần chọn lần hỗ trợ có phản hồi từ chối.')
      return
    }

    setSubmitting(true)
    setActionError('')
    setActionSuccess('')
    try {
      await ungTuyenHoTroService.xacNhanTuChoiHoTro(maSV, maDot, {
        phienBan: actions.phienBanChot ?? 0,
        lyDo: confirmRefusalForm.lyDo.trim(),
        canCu: confirmRefusalForm.canCu.trim(),
        maLanHoTro: confirmRefusalForm.maLanHoTro,
        phienBanHoTro: confirmRefusalForm.phienBanHoTro,
      })
      setActionSuccess('Đã xác nhận rớt thực tập do từ chối hỗ trợ thành công!')
      await loadDetail()
      onUpdated?.()
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Không thể xác nhận rớt do từ chối hỗ trợ.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const renderKetQuaBadge = (kq) => {
    switch (kq) {
      case 'Dat':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Trúng tuyển
          </span>
        )
      case 'KhongDat':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Không trúng tuyển
          </span>
        )
      case 'ChuaCoKetQua':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ kết quả
          </span>
        )
      case 'DaKetThuc':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Đã kết thúc / Hủy / Đóng
          </span>
        )
      case 'Vang':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            Vắng phỏng vấn
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {kq || 'Chưa ứng tuyển'}
          </span>
        )
    }
  }

  const renderTinhTrangNoiBadge = (tt) => {
    switch (tt) {
      case 'DaCoNoi':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã có nơi chính thức
          </span>
        )
      case 'ChoXacNhan':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Chờ xác nhận / Chốt nơi
          </span>
        )
      case 'ChuaCoNoi':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Chưa có nơi thực tập
          </span>
        )
      case 'KhongHoanTat':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
            Không hoàn tất đợt
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {tt || '—'}
          </span>
        )
    }
  }

  return (
    <ModalOverlay isOpen={isOpen} onClose={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-detail-title"
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col font-sans"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">assignment_ind</span>
            </div>
            <div>
              <h2 id="modal-detail-title" className="text-base font-bold text-slate-900">
                Theo dõi ứng tuyển &amp; hỗ trợ: {sv?.hoTen || maSV}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                MSSV: {sv?.maSV || maSV} • Lớp: {sv?.lop || '—'} • Đợt: {maDot} ({sv?.maLoaiThucTap || 'TTKS'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Đóng chi tiết"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <span className="material-symbols-outlined text-3xl animate-spin text-blue-600 mb-2">
                progress_activity
              </span>
              <p>Đang tải chi tiết hồ sơ sinh viên...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadDetail}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <>
              {/* Thẻ tóm tắt tình trạng */}
              <SupplementalRegistrationPanel key={`${maDot}|${maSV}`} maSV={maSV} maDot={maDot} sessions={cacLanHoTro} student={sv} onUpdated={async () => { await loadDetail(); onUpdated?.() }} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[['Số lượt ứng tuyển', sv?.soLanUngTuyen], ['Đạt ứng tuyển', sv?.soLanDatUngTuyen], ['Không đạt', sv?.soLanRotUngTuyen], ['Vắng phỏng vấn', sv?.soLanVangPhongVan]].map(([label, count]) => <div key={label} className="rounded-xl border bg-slate-50 p-3"><p>{label}</p><strong className="text-lg">{count ?? 0}</strong></div>)}
              </div>
              <p className="text-xs text-slate-500">* Lưu ý: Kết quả trúng tuyển cần được sinh viên xác nhận để hoàn tất thủ tục tiếp nhận chính thức.</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">
                    Nơi thực tập
                  </span>
                  <div className="mt-1">{renderTinhTrangNoiBadge(sv?.tinhTrangNoi)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">
                    Số lần không đạt
                  </span>
                  <div className="mt-1">
                    <span className="text-base font-black text-rose-600 font-mono">
                      {sv?.soLanRotUngTuyen ?? 0}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">lượt đã xác nhận</span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">
                    Lần hỗ trợ hiện tại
                  </span>
                  <div className="mt-1 text-xs font-bold text-purple-700">
                    {sv?.lanHoTroHienTai?.tenLan || (cacLanHoTro.length > 0 ? cacLanHoTro[0].tenLan : 'Chưa có')}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">
                    Tình trạng hỗ trợ
                  </span>
                  <div className="mt-1">
                    {sv?.canHoTroTiep ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Cần Khoa hỗ trợ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        Bình thường
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('history')
                    setActionError('')
                    setActionSuccess('')
                  }}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Lịch sử ứng tuyển ({ungTuyens.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('support-history')
                    setActionError('')
                    setActionSuccess('')
                  }}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'support-history'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Các lần hỗ trợ &amp; giới thiệu ({cacLanHoTro.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('record-response')
                    setActionError('')
                    setActionSuccess('')
                  }}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'record-response'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Ghi nhận phản hồi SV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('recommend-company')
                    setActionError('')
                    setActionSuccess('')
                  }}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'recommend-company'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Giới thiệu công ty
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('create-support')
                    setActionError('')
                    setActionSuccess('')
                  }}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'create-support'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tạo lần hỗ trợ tiếp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('confirm-refusal')
                    setActionError('')
                    setActionSuccess('')
                  }}
                  className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'confirm-refusal'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Xác nhận dừng thực tập (Từ chối hỗ trợ)
                </button>
              </div>

              {/* Thông báo kết quả thao tác */}
              {actionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{actionSuccess}</span>
                </div>
              )}
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{actionError}</span>
                </div>
              )}

              {/* Tab 1: Lịch sử ứng tuyển */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Lịch sử từng lượt đăng ký &amp; ứng tuyển trong đợt
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      * Bảng ghi nhận chi tiết từng lượt nộp hồ sơ và kết quả phỏng vấn của sinh viên.
                    </span>
                  </div>

                  {ungTuyens.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                      Sinh viên chưa nộp hồ sơ ứng tuyển nào trong đợt này.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-12">Lượt</th>
                            <th className="py-2.5 px-3">Công ty &amp; Vị trí</th>
                            <th className="py-2.5 px-3 text-center">Ngày ĐK</th>
                            <th className="py-2.5 px-3 text-center">Kết quả</th>
                            <th className="py-2.5 px-3">Lý do &amp; Nguồn</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ungTuyens.map((ut, idx) => (
                            <tr key={ut.maDK || idx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                                Lần {ut.lanDangKy || idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-slate-900">{ut.tenCongTy}</p>
                                <p className="text-[11px] text-slate-500">{ut.viTri || 'Vị trí chung'}</p>
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600">
                                {ut.ngayDangKy ? new Date(ut.ngayDangKy).toLocaleDateString('vi-VN') : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {renderKetQuaBadge(ut.ketQua)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                <p>{ut.lyDo || '—'}</p>
                                {ut.nguonKetQua && (
                                  <p className="text-[10px] text-slate-400 font-semibold uppercase">
                                    Nguồn: {ut.nguonKetQua}
                                  </p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Các lần hỗ trợ & Giới thiệu */}
              {activeTab === 'support-history' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Lịch sử các lần hỗ trợ của Khoa đối với sinh viên
                  </h3>

                  {cacLanHoTro.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                      Khoa chưa tạo lần hỗ trợ nào cho sinh viên này trong đợt.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cacLanHoTro.map((lh, idx) => {
                        const svInfo = lh.sinhVien || {}
                        const phanHoi = svInfo.phanHoi || lh.phanHoi
                        const congTys = svInfo.congTyGioiThieu || lh.congTyGioiThieu || []

                        return (
                          <div
                            key={lh.maLan || idx}
                            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                              <div>
                                <h4 className="font-bold text-slate-900 text-xs">{lh.tenLan}</h4>
                                <p className="text-[11px] text-slate-500">
                                  Ngày hỗ trợ: {lh.ngayHoTro ? new Date(lh.ngayHoTro).toLocaleDateString('vi-VN') : '—'} • Phiên bản: {lh.phienBan ?? 0}
                                </p>
                              </div>
                              <div>
                                {phanHoi === 'NhanHoTro' ? (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    SV nhận hỗ trợ
                                  </span>
                                ) : phanHoi === 'TuChoiHoTro' ? (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    SV từ chối hỗ trợ
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Chưa phản hồi
                                  </span>
                                )}
                              </div>
                            </div>

                            {svInfo.lyDoPhanHoi && (
                              <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100">
                                <span className="font-semibold text-slate-500">Lý do phản hồi: </span>
                                <span>{svInfo.lyDoPhanHoi}</span>
                              </div>
                            )}

                            {/* Danh sách công ty giới thiệu trong lần này */}
                            <div>
                              <p className="text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                                Doanh nghiệp Khoa đã giới thiệu ({congTys.length}):
                              </p>
                              {congTys.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">Chưa giới thiệu công ty nào trong lần này.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {congTys.map((c, cIdx) => (
                                    <div
                                      key={c.maGioiThieu || cIdx}
                                      className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1"
                                    >
                                      <p className="font-bold text-slate-900">{c.tenCongTy}</p>
                                      {c.tenViTri && <p className="text-slate-500 text-[11px]">Vị trí: {c.tenViTri}</p>}
                                      {c.ghiChu && <p className="text-slate-600 text-[11px] italic">Ghi chú: {c.ghiChu}</p>}
                                      <p className="text-[10px] text-slate-400">
                                        Giới thiệu: {c.ngayGioiThieu ? new Date(c.ngayGioiThieu).toLocaleDateString('vi-VN') : '—'}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Ghi nhận phản hồi trực tiếp */}
              {activeTab === 'record-response' && (
                <form onSubmit={handleRecordResponse} className="space-y-4 max-w-xl">
                  <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-2xl text-xs space-y-1">
                    <p className="font-bold">Ghi nhận phản hồi trực tiếp từ sinh viên:</p>
                    <p className="text-purple-700">
                      Khoa trực tiếp tiếp nhận ý kiến của SV (qua trao đổi, xác minh trực tiếp) và ghi nhận vào hệ thống.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chọn lần hỗ trợ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={responseForm.maLan}
                      onChange={(e) => {
                        const selectedLan = cacLanHoTro.find((l) => l.maLan === e.target.value)
                        setResponseForm({
                          ...responseForm,
                          maLan: e.target.value,
                          phienBan: selectedLan?.phienBan ?? 0,
                        })
                      }}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- Chọn lần hỗ trợ --</option>
                      {cacLanHoTro.map((l) => (
                        <option key={l.maLan} value={l.maLan}>
                          {l.tenLan} (Phiên bản: {l.phienBan ?? 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phản hồi của sinh viên <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                        <input
                          type="radio"
                          name="phanHoi"
                          value="NhanHoTro"
                          checked={responseForm.phanHoi === 'NhanHoTro'}
                          onChange={(e) =>
                            setResponseForm({ ...responseForm, phanHoi: e.target.value })
                          }
                        />
                        <span>Đồng ý nhận hỗ trợ (tiếp tục tìm công ty phù hợp)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-rose-700">
                        <input
                          type="radio"
                          name="phanHoi"
                          value="TuChoiHoTro"
                          checked={responseForm.phanHoi === 'TuChoiHoTro'}
                          onChange={(e) =>
                            setResponseForm({ ...responseForm, phanHoi: e.target.value })
                          }
                        />
                        <span>Từ chối nhận hỗ trợ</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Lý do &amp; Căn cứ trao đổi <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      maxLength={1000}
                      placeholder="Ghi rõ lý do tiếp nhận trực tiếp từ sinh viên..."
                      value={responseForm.lyDo}
                      onChange={(e) =>
                        setResponseForm({ ...responseForm, lyDo: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu phản hồi sinh viên'}
                  </button>
                </form>
              )}

              {/* Tab 4: Giới thiệu công ty */}
              {activeTab === 'recommend-company' && (
                <form onSubmit={handleRecommendCompany} className="space-y-4 max-w-xl">
                  <div className="p-3 bg-teal-50 border border-teal-200 text-teal-900 rounded-2xl text-xs space-y-1">
                    <p className="font-bold">Ghi nhận công ty Khoa giới thiệu cho sinh viên:</p>
                    <p className="text-teal-700">
                      Chọn công ty đối tác còn nhận hồ sơ trong đợt để giới thiệu cho sinh viên tiếp tục nộp nguyện vọng.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chọn lần hỗ trợ <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={recommendForm.maLan}
                      onChange={(e) => {
                        const selectedLan = cacLanHoTro.find((l) => l.maLan === e.target.value)
                        setRecommendForm({
                          ...recommendForm,
                          maLan: e.target.value,
                          phienBan: selectedLan?.phienBan ?? 0,
                        })
                      }}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- Chọn lần hỗ trợ --</option>
                      {cacLanHoTro.map((l) => (
                        <option key={l.maLan} value={l.maLan}>
                          {l.tenLan} (Phiên bản: {l.phienBan ?? 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chọn công ty đối tác trong đợt <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={recommendForm.maCongTy}
                      onChange={(e) => {
                        setRecommendForm({
                          ...recommendForm,
                          maCongTy: e.target.value,
                          maViTri: '',
                        })
                      }}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      <option value="">-- Chọn công ty --</option>
                      {companiesInRound.map((c) => (
                        <option key={c.maCongTy} value={c.maCongTy}>
                          {c.tenCongTy} (Chỉ tiêu còn: {c.soLuongNhan - (c.soLuongDaNhan || 0)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ghi chú / Định hướng cho sinh viên
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Phù hợp kỹ năng C#/React của SV..."
                      value={recommendForm.ghiChu}
                      onChange={(e) =>
                        setRecommendForm({ ...recommendForm, ghiChu: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? 'Đang lưu...' : 'Lưu công ty giới thiệu'}
                  </button>
                </form>
              )}

              {/* Tab 5: Tạo lần hỗ trợ tiếp */}
              {activeTab === 'create-support' && (
                <form onSubmit={handleCreateSupport} className="space-y-4 max-w-xl">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl text-xs space-y-1">
                    <p className="font-bold">Mở đợt hỗ trợ mới trong đợt:</p>
                    <p className="text-indigo-700">
                      Tạo đợt hỗ trợ để mở quyền nộp đơn ứng tuyển bổ sung cho sinh viên chưa có nơi tiếp nhận.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tên lần hỗ trợ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Hỗ trợ đợt 2 - Lần 2"
                      value={newSupportForm.tenLan}
                      onChange={(e) =>
                        setNewSupportForm({ ...newSupportForm, tenLan: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ngày hỗ trợ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={newSupportForm.ngayHoTro}
                      onChange={(e) =>
                        setNewSupportForm({ ...newSupportForm, ngayHoTro: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>

                  {cacLanHoTro.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kế thừa lần hỗ trợ trước (tùy chọn)
                      </label>
                      <select
                        value={newSupportForm.maLanTruoc}
                        onChange={(e) =>
                          setNewSupportForm({ ...newSupportForm, maLanTruoc: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                      >
                        <option value="">-- Không liên kết lần trước --</option>
                        {cacLanHoTro.map((l) => (
                          <option key={l.maLan} value={l.maLan}>
                            {l.tenLan}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {submitting ? 'Đang tạo...' : 'Tạo lần hỗ trợ cho sinh viên'}
                  </button>
                </form>
              )}

              {/* Tab 6: Xác nhận rớt đợt do từ chối hỗ trợ */}
              {activeTab === 'confirm-refusal' && (
                <div className="space-y-4 max-w-xl">
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs space-y-1">
                    <p className="font-bold">Quy tắc xác nhận rớt đợt do từ chối hỗ trợ:</p>
                    <p className="text-rose-700">
                      Chỉ xác nhận khi SV có phản hồi từ chối hỗ trợ hiệu lực, vẫn chưa có nơi thực tập hợp lệ, không còn hồ sơ tiếp nhận đang chờ xử lý và Khoa đã tiến hành xác minh.
                    </p>
                  </div>

                  {!actions.coTheXacNhanTuChoi ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold">
                        <span className="material-symbols-outlined text-[18px]">block</span>
                        <span>Thao tác chưa thể thực hiện</span>
                      </div>
                      <p className="text-amber-800">
                        Lý do bị chặn:{' '}
                        <strong>
                          {actions.lyDoBiChan ||
                            'Sinh viên chưa có phản hồi từ chối hỗ trợ hiệu lực, hoặc đã có nơi chính thức, hoặc còn hồ sơ đang xử lý.'}
                        </strong>
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleConfirmRefusal} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Lần hỗ trợ có phản hồi từ chối <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={confirmRefusalForm.maLanHoTro}
                          onChange={(e) => {
                            const selectedLan = cacLanHoTro.find((l) => l.maLan === e.target.value)
                            setConfirmRefusalForm({
                              ...confirmRefusalForm,
                              maLanHoTro: e.target.value,
                              phienBanHoTro: selectedLan?.phienBan ?? 0,
                            })
                          }}
                          required
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                        >
                          <option value="">-- Chọn lần hỗ trợ --</option>
                          {cacLanHoTro.map((l) => (
                            <option key={l.maLan} value={l.maLan}>
                              {l.tenLan} (Phiên bản: {l.phienBan ?? 0})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Lý do quyết định <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={confirmRefusalForm.lyDo}
                          onChange={(e) =>
                            setConfirmRefusalForm({ ...confirmRefusalForm, lyDo: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Căn cứ xác minh <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={confirmRefusalForm.canCu}
                          onChange={(e) =>
                            setConfirmRefusalForm({ ...confirmRefusalForm, canCu: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {submitting ? 'Đang xác nhận...' : 'Xác nhận rớt thực tập do từ chối hỗ trợ'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
