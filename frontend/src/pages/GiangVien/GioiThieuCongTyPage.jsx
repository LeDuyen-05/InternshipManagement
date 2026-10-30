import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useState, useEffect, useCallback } from 'react'
import { gioiThieuService } from '../../services/gioiThieuService'
import { useIdentity } from '../../hooks/useIdentity'
import { extractJdText } from '../../utils/jdTextExtraction'

export default function GioiThieuCongTyPage() {
  const { maGV, user } = useIdentity() || {}
  const currentMaGV = maGV || user?.maGV || 'GV001'
  const [activeTab, setActiveTab] = useState('mine') // 'mine' | 'all'
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  const pagination = usePagination(list, `${currentMaGV}-${activeTab}`)

  // Form đề xuất công ty
  const [tenCongTy, setTenCongTy] = useState('')
  const [viTriTuyen, setViTriTuyen] = useState('')
  const [soLuongNhan, setSoLuongNhan] = useState(3)
  const [thoiGian, setThoiGian] = useState('Từ 15/10/2026 đến 15/01/2027')
  const [yeuCau, setYeuCau] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Khu vực Import / Paste JD
  const [showJdModal, setShowJdModal] = useState(false)
  const [jdRawText, setJdRawText] = useState('')
  const [parsingJd, setParsingJd] = useState(false)
  const [jdFileError, setJdFileError] = useState('')

  const loadData = useCallback(async (tab = activeTab) => {
    try {
      setLoading(true)
      setError(null)
      const res = tab === 'mine'
        ? await gioiThieuService.getByGiangVien(currentMaGV)
        : await gioiThieuService.getAll()
      if (res.data?.success) {
        setList(res.data.data || [])
      } else {
        setList(res.data || [])
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể tải danh sách giới thiệu')
    } finally {
      setLoading(false)
    }
  }, [activeTab, currentMaGV])

  useEffect(() => {
    loadData(activeTab)
  }, [activeTab, loadData])

  // Hàm bóc tách thông minh từ văn bản JD
  const parseJdText = (text) => {
    if (!text || text.trim() === '') return

    setParsingJd(true)
    try {
      // 1. Tìm tên công ty (tìm các dòng có từ "Công ty", "Company", "Tập đoàn")
      const companyMatch = text.match(/(?:Công ty|Tập đoàn|Company|Doanh nghiệp)\s+([^\n\r,.]+)/i)
      if (companyMatch) {
        setTenCongTy(companyMatch[0].trim())
      }

      // 2. Tìm vị trí tuyển dụng (tìm các từ Intern, Developer, Kỹ sư, Lập trình viên)
      const positionMatch = text.match(/(?:Vị trí|Position|Tuyển dụng|Tuyển)\s*:\s*([^\n\r]+)/i) ||
                            text.match(/(?:Thực tập sinh|Intern|Fresher|Junior|Lập trình viên|Kỹ sư)\s+([^\n\r,.]+)/i)
      if (positionMatch) {
        setViTriTuyen(positionMatch[1]?.trim() || positionMatch[0]?.trim())
      }

      // 3. Tìm số lượng nhận
      const quantityMatch = text.match(/(?:Số lượng|Chỉ tiêu|Target)\s*:\s*(\d+)/i)
      if (quantityMatch && quantityMatch[1]) {
        setSoLuongNhan(parseInt(quantityMatch[1], 10))
      }

      // 4. Tìm thời gian thực tập
      const timeMatch = text.match(/(?:Thời gian|Hạn chót|Duration)\s*:\s*([^\n\r]+)/i)
      if (timeMatch && timeMatch[1]) {
        setThoiGian(timeMatch[1].trim())
      }

      // 5. Yêu cầu / Kỹ năng (lấy phần có từ "Yêu cầu", "Requirements", "Kỹ năng")
      const reqMatch = text.match(/(?:Yêu cầu|Requirements|Kỹ năng|Mô tả công việc)[\s\S]{0,300}/i)
      if (reqMatch) {
        setYeuCau(reqMatch[0].trim())
      } else {
        setYeuCau(text.substring(0, 300) + '...')
      }

      setSuccessMsg('Đã trích xuất thông tin từ JD thành công! Vui lòng rà soát lại trước khi gửi.')
      setShowJdModal(false)
    } finally {
      setParsingJd(false)
    }
  }

  // Đọc file tải lên (hỗ trợ .txt, file văn bản)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setJdFileError('')
    setParsingJd(true)
    extractJdText(file)
      .then(content => {
        if (!content.trim()) {
          throw new Error('Không tìm thấy văn bản trong file. Nếu đây là PDF scan/ảnh, hãy dán nội dung hoặc dùng file có thể chọn văn bản.')
        }
        setJdRawText(content)
        parseJdText(content)
      })
      .catch(error => {
        setJdFileError(error.message || 'Không đọc được file JD. Vui lòng thử file khác hoặc dán nội dung.')
        setParsingJd(false)
      })
      .finally(() => {
        e.target.value = ''
      })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tenCongTy.trim()) {
      alert('Vui lòng nhập tên công ty')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccessMsg('')

      const res = await gioiThieuService.deXuatMoi({
        maGV: currentMaGV,
        tenCongTy: tenCongTy.trim(),
        viTriTuyen: viTriTuyen.trim(),
        soLuongNhan: Number(soLuongNhan) || 1,
        thoiGian: thoiGian.trim(),
        yeuCau: yeuCau.trim(),
      })

      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Đề xuất công ty mới thành công!')
        // Reset form
        setTenCongTy('')
        setViTriTuyen('')
        setYeuCau('')
        setActiveTab('mine')
        loadData('mine')
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi gửi đề xuất công ty')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      setError(null)
      await gioiThieuService.updateTrangThai(id, newStatus)
      loadData()
    } catch (err) {
      alert('Lỗi cập nhật: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi giới thiệu này?')) return
    try {
      setError(null)
      await gioiThieuService.delete(id)
      loadData()
    } catch (err) {
      alert('Lỗi khi xóa: ' + (err.response?.data?.message || err.message))
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DaDuyet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã duyệt
          </span>
        )
      case 'TuChoi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Từ chối
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ duyệt
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
            <span>FIT Portal</span>
            <span>/</span>
            <span>Giảng viên</span>
            <span>/</span>
            <span className="text-blue-700 font-bold">Đề xuất Doanh nghiệp</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Đề xuất Doanh nghiệp Thực tập
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kết nối doanh nghiệp tiếp nhận sinh viên thực tập tốt nghiệp
          </p>
        </div>

        {/* Nút Import JD thông minh */}
        <button
          type="button"
          onClick={() => setShowJdModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-sm transition hover:shadow-md"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>Tải lên JD / Mô tả công việc</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-3 shadow-sm">
          <span className="material-symbols-outlined text-rose-600">error</span>
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center gap-3 shadow-sm">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* CỘT TRÁI (5 phần): FORM NHẬP THÔNG TIN CÔNG TY MỚI */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sticky top-24">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700">add_business</span>
                <h2 className="text-sm font-bold text-slate-900">Thông tin Doanh nghiệp Đề xuất</h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Doanh nghiệp / Công ty <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Công ty Cổ phần Công nghệ ABC..."
                  value={tenCongTy}
                  onChange={(e) => setTenCongTy(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vị trí tuyển thực tập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Thực tập sinh ReactJS, Backend .NET..."
                  value={viTriTuyen}
                  onChange={(e) => setViTriTuyen(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chỉ tiêu tiếp nhận (SV)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={soLuongNhan}
                    onChange={(e) => setSoLuongNhan(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cán bộ đề xuất
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentMaGV}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-xs font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thời gian thực tập dự kiến
                </label>
                <input
                  type="text"
                  value={thoiGian}
                  onChange={(e) => setThoiGian(e.target.value)}
                  placeholder="VD: Từ 15/10/2026 đến 15/01/2027"
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Yêu cầu chuyên môn & Kỹ năng
                </label>
                <textarea
                  rows="3"
                  placeholder="VD: Nắm vững HTML/CSS/JavaScript, tư duy lập trình tốt, thái độ chăm chỉ, GPA >= 2.5..."
                  value={yeuCau}
                  onChange={(e) => setYeuCau(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                {submitting ? 'Đang gửi...' : 'Gửi Đề xuất Doanh nghiệp'}
              </button>
            </form>
          </div>
        </div>

        {/* CỘT PHẢI (7 phần): BẢNG DANH SÁCH DOANH NGHIỆP ĐÃ ĐỀ XUẤT */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-700">corporate_fare</span>
                  <span>{activeTab === 'mine' ? 'Doanh nghiệp tôi đã đề xuất' : 'Danh sách đề xuất toàn Khoa'}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeTab === 'mine' ? (
                    <>
                      Bạn đã đề xuất <strong className="text-slate-800">{list.length}</strong> công ty cho Khoa xét duyệt
                    </>
                  ) : (
                    <>
                      Tổng cộng <strong className="text-slate-800">{list.length}</strong> công ty do các giảng viên đề xuất
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* 2 Tabs chuyển đổi chế độ xem */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setActiveTab('mine')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'mine'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Đề xuất của tôi
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-white text-blue-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Toàn Khoa
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => loadData(activeTab)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  title="Làm mới danh sách"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                  <span className="hidden sm:inline">Làm mới</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-blue-600">
                  progress_activity
                </span>
                <p className="text-xs">Đang tải dữ liệu...</p>
              </div>
            ) : list.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-slate-300">
                  {activeTab === 'mine' ? 'contact_support' : 'domain_disabled'}
                </span>
                <p className="text-xs font-semibold text-slate-600">
                  {activeTab === 'mine'
                    ? 'Bạn chưa gửi đề xuất doanh nghiệp nào.'
                    : 'Chưa có giảng viên nào đề xuất doanh nghiệp.'}
                </p>
                {activeTab === 'mine' && (
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Điền form bên trái hoặc nhấn nút "Tải lên JD / Mô tả công việc" để gửi đề xuất doanh nghiệp đầu tiên cho Khoa xét duyệt.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3">Doanh nghiệp</th>
                      <th className="py-3 px-3">Vị trí tuyển</th>
                      {activeTab === 'all' && <th className="py-3 px-3">Người đề xuất</th>}
                      <th className="py-3 px-3">Trạng thái</th>
                      <th className="py-3 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {pagination.items.map((item) => {
                      const isOwner = item.maGV === currentMaGV
                      return (
                        <tr key={item.maSo} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900 leading-tight">
                              {item.tenCongTy || item.maCongTy}
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono">[{item.maSo}]</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-blue-900">
                              {item.viTriTuyen || 'Chưa cập nhật'}
                            </span>
                          </td>
                          {activeTab === 'all' && (
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-800">{item.tenGiangVien || item.maGV}</span>
                                {isOwner && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">[{item.maGV}]</span>
                            </td>
                          )}
                          <td className="py-3 px-3">
                            {getStatusBadge(item.trangThaiKetNoi)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {isOwner ? (
                              item.trangThaiKetNoi === 'DangXem' ? (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.maSo)}
                                  title="Hủy đề xuất này"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                  <span>Hủy</span>
                                </button>
                              ) : item.trangThaiKetNoi === 'DaDuyet' ? (
                                <span className="text-[11px] text-emerald-600 font-semibold">Khoa đã duyệt</span>
                              ) : (
                                <span className="text-[11px] text-rose-500 font-medium">Khoa từ chối</span>
                              )
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Đề xuất của GV khác</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <Pagination pagination={pagination} label="công ty giảng viên giới thiệu"/>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* POPUP (MODAL) BÓC TÁCH FILE JD HOẶC PASTE VĂN BẢN */}
      {showJdModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700">upload_file</span>
                <h3 className="text-sm font-bold text-slate-900">Tải lên Mô tả Công việc (JD)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowJdModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Tải file JD .txt, Word .docx, PDF hoặc dán nội dung bên dưới để hệ thống tự động điền nhanh các thông tin cần thiết.
            </p>

            {/* Tải file */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chọn file JD từ máy tính (.txt, .docx, .pdf)
              </label>
              <input
                type="file"
                accept=".txt,.docx,.pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                onChange={handleFileUpload}
                disabled={parsingJd}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              <p className="mt-1 text-[11px] text-slate-400">Tối đa 20 MB. PDF scan không có lớp văn bản cần OCR hoặc dán nội dung thủ công.</p>
              {jdFileError && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{jdFileError}</p>}
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-2 text-[10px] text-slate-400 uppercase font-bold">HOẶC DÁN VĂN BẢN</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Dán văn bản JD */}
            <div>
              <textarea
                rows="6"
                placeholder="Dán nội dung JD vào đây (VD: Tuyển dụng Thực tập sinh ReactJS tại Công ty ABC, yêu cầu...)"
                value={jdRawText}
                onChange={(e) => setJdRawText(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:ring-2 focus:ring-blue-600 outline-none resize-none font-sans"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowJdModal(false)}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={parsingJd || !jdRawText.trim()}
                onClick={() => parseJdText(jdRawText)}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">magic_button</span>
                {parsingJd ? 'Đang phân tích...' : 'Tự động bóc tách'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
