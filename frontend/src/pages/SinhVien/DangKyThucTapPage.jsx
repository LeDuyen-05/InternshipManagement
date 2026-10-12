import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { dangKyThucTapService } from '../../services/dangKyThucTapService'

export default function DangKyThucTapPage() {
  const { user } = useAuth()
  const { selectedDot } = useDotThucTap()
  const currentMaSV = user?.maSV || (user?.tenDangNhap?.toLowerCase().startsWith('sv') ? user.tenDangNhap.toUpperCase() : 'SV001')
  const currentMaDot = selectedDot?.maDot || 'DOT02'

  const [activeTab, setActiveTab] = useState('companies') // 'companies' | 'my-applications'
  const [companies, setCompanies] = useState([])
  const [myApplications, setMyApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)

  // Modal Đăng ký nguyện vọng
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [applyPriority, setApplyPriority] = useState(1)
  const [isSubmittingApply, setIsSubmittingApply] = useState(false)

  // Modal Đề xuất công ty mới
  const [proposalModalOpen, setProposalModalOpen] = useState(false)
  const [proposalForm, setProposalForm] = useState({
    tenCongTy: '',
    viTriTuyen: '',
    soLuongNhan: 2,
    thoiGian: '3 tháng',
    yeuCau: '',
  })
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [compRes, appRes] = await Promise.all([
        dangKyThucTapService.getDanhSachCongTy(),
        dangKyThucTapService.getDangKyBySinhVien(currentMaSV),
      ])
      setCompanies(compRes || [])
      setMyApplications(appRes || [])
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu thực tập:', err)
      showToast('Không thể kết nối đến máy chủ API', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentMaSV])

  // Mở modal đăng ký cho 1 công ty
  const handleOpenApply = (company) => {
    setSelectedCompany(company)
    // Tự động tính số thứ tự ưu tiên tiếp theo
    const nextPriority = myApplications.length > 0
      ? Math.max(...myApplications.map((a) => a.thuTuUuTien || 1)) + 1
      : 1
    setApplyPriority(nextPriority)
    setApplyModalOpen(true)
  }

  // Submit đăng ký nguyện vọng
  const handleSubmitApply = async (e) => {
    e.preventDefault()
    if (!selectedCompany) return

    setIsSubmittingApply(true)
    try {
      await dangKyThucTapService.dangKyThucTap({
        maSV: currentMaSV,
        maCongTy: selectedCompany.maCongTy,
        maDot: currentMaDot,
        thuTuUuTien: parseInt(applyPriority, 10),
      })
      showToast(`Đã nộp nguyện vọng vào "${selectedCompany.tenCongTy}" thành công!`)
      setApplyModalOpen(false)
      fetchData()
      setActiveTab('my-applications')
    } catch (err) {
      console.error(err)
      showToast('Lỗi khi nộp nguyện vọng: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setIsSubmittingApply(false)
    }
  }

  // Hủy nguyện vọng
  const handleCancelApplication = async (maDK, tenCongTy) => {
    if (!window.confirm(`Bạn có chắc muốn hủy đăng ký vào "${tenCongTy}"?`)) return

    try {
      await dangKyThucTapService.huyDangKyThucTap(maDK)
      showToast(`Đã hủy đăng ký vào "${tenCongTy}" thành công!`)
      fetchData()
    } catch (err) {
      console.error(err)
      showToast('Lỗi khi hủy đăng ký: ' + (err.response?.data?.message || err.message), 'error')
    }
  }

  // Submit đề xuất công ty
  const handleSubmitProposal = async (e) => {
    e.preventDefault()
    if (!proposalForm.tenCongTy.trim()) {
      showToast('Vui lòng nhập tên công ty!', 'error')
      return
    }

    setIsSubmittingProposal(true)
    try {
      await dangKyThucTapService.deXuatCongTy({
        ...proposalForm,
        soLuongNhan: parseInt(proposalForm.soLuongNhan, 10) || 1,
        maSV: currentMaSV,
      })
      showToast('Đã gửi đề xuất doanh nghiệp thành công! Đang chờ Khoa duyệt.')
      setProposalModalOpen(false)
      setProposalForm({
        tenCongTy: '',
        viTriTuyen: '',
        soLuongNhan: 2,
        thoiGian: '3 tháng',
        yeuCau: '',
      })
      fetchData()
    } catch (err) {
      console.error(err)
      showToast('Lỗi khi gửi đề xuất: ' + (err.response?.data?.message || err.message), 'error')
    } finally {
      setIsSubmittingProposal(false)
    }
  }

  // Filter companies theo từ khóa
  const filteredCompanies = companies.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      c.tenCongTy?.toLowerCase().includes(q) ||
      c.viTriTuyen?.toLowerCase().includes(q) ||
      c.yeuCau?.toLowerCase().includes(q)
    )
  })

  // Kiểm tra công ty đã được SV đăng ký chưa
  const isAlreadyApplied = (maCongTy) => {
    return myApplications.some((a) => a.maCongTy === maCongTy)
  }

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
            HỌC VỤ & ĐĂNG KÝ THỰC TẬP • ĐỢT 1 NĂM 2026
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Đăng ký Nguyện vọng Thực tập & Khám phá Doanh nghiệp
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Chọn doanh nghiệp phù hợp với định hướng nghề nghiệp của bạn hoặc tự đề xuất đơn vị thực tập ngoài danh sách.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setProposalModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-blue-700">add_business</span>
            Đề xuất doanh nghiệp mới
          </button>
        </div>
      </div>

      {/* Bento Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Doanh nghiệp tuyển</span>
            <span className="material-symbols-outlined text-blue-700 text-[22px]">apartment</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">{companies.length}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">Đã kiểm duyệt</span> bởi Khoa CNTT
            </div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Nguyện vọng đã nộp</span>
            <span className="material-symbols-outlined text-indigo-700 text-[22px]">playlist_add_check</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-indigo-900">{myApplications.length}</div>
            <div className="text-xs text-indigo-600 font-semibold mt-1">
              Tối đa 3 nguyện vọng ưu tiên
            </div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tiếp nhận trúng tuyển</span>
            <span className="material-symbols-outlined text-emerald-700 text-[22px]">verified</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-800">
              {myApplications.filter((a) => a.trangThai === 'DaDuyet').length}
            </div>
            <div className="text-xs text-emerald-600 font-medium mt-1">
              {myApplications.some((a) => a.trangThai === 'DaDuyet')
                ? 'Đã có công ty tiếp nhận'
                : 'Chờ xét duyệt kết quả'}
            </div>
          </div>
        </div>

        <div className="p-5 bg-blue-50/70 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">Thời hạn đợt này</span>
            <span className="material-symbols-outlined text-blue-800 text-[22px]">schedule</span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-blue-950">25/10/2026</div>
            <div className="text-xs text-blue-800 mt-1 font-medium">
              Vui lòng hoàn tất nộp trước 23:59
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('companies')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'companies'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">business_center</span>
            Doanh nghiệp tuyển dụng
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'companies' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {companies.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my-applications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'my-applications'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
            Nguyện vọng của tôi
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === 'my-applications' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {myApplications.length}
            </span>
          </button>
        </div>

        {activeTab === 'companies' && (
          <div className="relative min-w-[280px]">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên công ty, vị trí, công nghệ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none transition-all"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500 font-medium">Đang tải danh sách dữ liệu...</p>
        </div>
      ) : activeTab === 'companies' ? (
        /* Tab 1: Danh sách công ty */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCompanies.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              <span className="material-symbols-outlined text-[48px] text-slate-300">manage_search</span>
              <p className="mt-2 text-sm font-medium">Không tìm thấy doanh nghiệp phù hợp với từ khóa.</p>
            </div>
          ) : (
            filteredCompanies.map((c) => {
              const applied = isAlreadyApplied(c.maCongTy)
              return (
                <div
                  key={c.maCongTy}
                  className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 flex-1 flex flex-col">
                    {/* Header card */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0 font-bold">
                        <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Tuyển dụng: {c.soLuongNhan || 0} chỉ tiêu
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base group-hover:text-blue-700 transition-colors line-clamp-1">
                      {c.tenCongTy}
                    </h3>
                    <div className="text-xs font-semibold text-blue-800 mt-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">work</span>
                      {c.viTriTuyen || 'Thực tập sinh Công nghệ'}
                    </div>

                    {/* Timeline */}
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_month</span>
                      Thời gian: {c.thoiGian || 'Học kỳ 1 năm 2026'}
                    </div>

                    {/* Requirements box */}
                    <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100 flex-1">
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Yêu cầu & Tiêu chí:
                      </div>
                      <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
                        {c.yeuCau || 'Chăm chỉ, ham học hỏi, có kiến thức cơ bản về lập trình.'}
                      </p>
                    </div>
                  </div>

                  {/* Footer button */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">Mã: {c.maCongTy}</span>
                    {applied ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        Đã đăng ký
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenApply(c)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        Nộp nguyện vọng
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      ) : (
        /* Tab 2: Nguyện vọng của tôi */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Danh sách Nguyện vọng Đã Nộp</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các nguyện vọng thực tập đã gửi đến Khoa và Doanh nghiệp xét duyệt.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {myApplications.length} nguyện vọng
            </span>
          </div>

          {myApplications.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <span className="material-symbols-outlined text-[48px] text-slate-300">drafts</span>
              <p className="mt-2 text-sm font-medium">Bạn chưa đăng ký nguyện vọng thực tập nào.</p>
              <button
                onClick={() => setActiveTab('companies')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors"
              >
                Khám phá doanh nghiệp ngay
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Ưu tiên</th>
                    <th className="px-5 py-3.5">Doanh nghiệp & Vị trí</th>
                    <th className="px-5 py-3.5">Đợt thực tập</th>
                    <th className="px-5 py-3.5">Ngày nộp</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myApplications.map((app) => {
                    let statusBadge = (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Chờ duyệt
                      </span>
                    )
                    if (app.trangThai === 'DaDuyet') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Đã trúng tuyển
                        </span>
                      )
                    } else if (app.trangThai === 'TuChoi') {
                      statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          Từ chối
                        </span>
                      )
                    }

                    return (
                      <tr key={app.maDK} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                            NV{app.thuTuUuTien}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{app.tenCongTy}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{app.viTriTuyen}</div>
                        </td>
                        <td className="px-5 py-4 text-xs font-medium text-slate-600">
                          {app.tenDot || 'Đợt 1 năm 2026'}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {app.ngayDangKy ? new Date(app.ngayDangKy).toLocaleDateString('vi-VN') : '—'}
                        </td>
                        <td className="px-5 py-4">{statusBadge}</td>
                        <td className="px-5 py-4 text-right">
                          {app.trangThai === 'ChoDuyet' ? (
                            <button
                              onClick={() => handleCancelApplication(app.maDK, app.tenCongTy)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">cancel</span>
                              Hủy nguyện vọng
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Đã chốt kết quả</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal 1: Nộp nguyện vọng */}
      {applyModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Đăng ký Nguyện vọng Thực tập</h3>
              </div>
              <button
                onClick={() => setApplyModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitApply} className="flex flex-col gap-4">
              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-800">
                  Doanh nghiệp tiếp nhận
                </div>
                <div className="text-base font-bold text-slate-900 mt-1">{selectedCompany.tenCongTy}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Vị trí: <span className="font-semibold text-blue-700">{selectedCompany.viTriTuyen}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Thứ tự ưu tiên nguyện vọng
                </label>
                <select
                  value={applyPriority}
                  onChange={(e) => setApplyPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none bg-white"
                >
                  <option value={1}>Nguyện vọng 1 (Ưu tiên cao nhất)</option>
                  <option value={2}>Nguyện vọng 2</option>
                  <option value={3}>Nguyện vọng 3</option>
                  <option value={4}>Nguyện vọng 4</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Hệ thống sẽ ưu tiên xét tuyển theo thứ tự từ Nguyện vọng 1 trở đi.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-700 text-[18px] shrink-0 mt-0.5">
                  info
                </span>
                <span>
                  Hồ sơ năng lực hiện tại (CV, kỹ năng, dự án) của bạn sẽ được gửi trực tiếp kèm theo đơn ứng tuyển này đến hội đồng xét duyệt.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApply}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingApply ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">done</span>
                      Xác nhận đăng ký
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Đề xuất công ty mới */}
      {proposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">add_business</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Đề xuất Doanh nghiệp Mới</h3>
              </div>
              <button
                onClick={() => setProposalModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Doanh nghiệp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Công ty Cổ phần Công nghệ ABC"
                  value={proposalForm.tenCongTy}
                  onChange={(e) => setProposalForm({ ...proposalForm, tenCongTy: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vị trí thực tập
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Backend Developer"
                    value={proposalForm.viTriTuyen}
                    onChange={(e) => setProposalForm({ ...proposalForm, viTriTuyen: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chỉ tiêu tiếp nhận
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={proposalForm.soLuongNhan}
                    onChange={(e) => setProposalForm({ ...proposalForm, soLuongNhan: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Thời gian thực tập
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 3 tháng (15/09 - 15/12/2026)"
                  value={proposalForm.thoiGian}
                  onChange={(e) => setProposalForm({ ...proposalForm, thoiGian: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Yêu cầu kỹ năng & Công nghệ
                </label>
                <textarea
                  rows="3"
                  placeholder="Mô tả kỹ năng, ngoại ngữ hoặc yêu cầu dự án..."
                  value={proposalForm.yeuCau}
                  onChange={(e) => setProposalForm({ ...proposalForm, yeuCau: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProposalModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProposal}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingProposal ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang gửi...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Gửi đề xuất tới Khoa
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
