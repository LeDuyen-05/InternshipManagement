import { useState, useEffect } from 'react'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'

export default function QuanLyUngVienPage() {
  const { activeCompany } = useEnterprise()
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    async function fetchCandidates() {
      if (!activeCompany?.maCongTy) return
      try {
        setLoading(true)
        const res = await doanhNghiepService.getUngVien(activeCompany.maCongTy)
        setCandidates(res || [])
      } catch (err) {
        console.error('Lỗi lấy danh sách ứng viên:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCandidates()
  }, [activeCompany?.maCongTy])

  const handleUpdateStatus = async (maDK, newStatus) => {
    try {
      setProcessingId(maDK)
      await doanhNghiepService.capNhatTrangThaiUngVien(maDK, newStatus)
      setCandidates((prev) =>
        prev.map((c) => (c.maDK === maDK ? { ...c, trangThai: newStatus } : c))
      )
      if (selectedCandidate?.maDK === maDK) {
        setSelectedCandidate((prev) => ({ ...prev, trangThai: newStatus }))
      }
      setToast({
        type: 'success',
        message:
          newStatus === 'DaDuyet'
            ? 'Đã duyệt hồ sơ & chuyển ứng viên vào danh sách phỏng vấn!'
            : 'Đã từ chối hồ sơ ứng viên.',
      })
    } catch (err) {
      console.error('Lỗi duyệt hồ sơ:', err)
      setToast({ type: 'error', message: 'Không thể cập nhật trạng thái. Vui lòng thử lại.' })
    } finally {
      setProcessingId(null)
      setTimeout(() => setToast(null), 4000)
    }
  }

  // Filter & Search logic
  const filteredCandidates = candidates.filter((c) => {
    const matchesStatus = filterStatus === 'ALL' || c.trangThai === filterStatus
    const matchesSearch =
      c.hoTen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.maSV?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.kyNang?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.congNghe?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const stats = {
    total: candidates.length,
    choDuyet: candidates.filter((c) => c.trangThai === 'ChoDuyet' || !c.trangThai).length,
    daDuyet: candidates.filter((c) => c.trangThai === 'DaDuyet').length,
    tuChoi: candidates.filter((c) => c.trangThai === 'TuChoi').length,
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between border shadow-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản lý Ứng Viên & Sàng Lọc CV</h1>
          <p className="text-xs text-slate-500 mt-1">
            Đánh giá năng lực hồ sơ, kỹ năng chuyên môn và duyệt sinh viên ứng tuyển vào vị trí thực tập
          </p>
        </div>
      </div>

      {/* 4 Bento Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng ứng viên nộp</div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.total} <span className="text-xs font-normal text-slate-500">hồ sơ</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Đợt HK2 (2026 - 2027)</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hồ sơ chờ duyệt</div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.choDuyet} <span className="text-xs font-normal text-slate-500">hồ sơ</span></div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Cần xem xét sớm</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã duyệt (Mời PV)</div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{stats.daDuyet} <span className="text-xs font-normal text-slate-500">ứng viên</span></div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Sẵn sàng lên lịch phỏng vấn</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã từ chối</div>
          <div className="text-2xl font-black text-rose-600 mt-2">{stats.tuChoi} <span className="text-xs font-normal text-slate-500">hồ sơ</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Không đáp ứng yêu cầu</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Tất cả ứng viên', count: stats.total },
            { id: 'ChoDuyet', label: 'Chờ duyệt', count: stats.choDuyet },
            { id: 'DaDuyet', label: 'Đã duyệt (Mời PV)', count: stats.daDuyet },
            { id: 'TuChoi', label: 'Đã từ chối', count: stats.tuChoi },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filterStatus === tab.id ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, MSSV, kỹ năng..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Applicant Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ứng viên</th>
                <th className="py-3.5 px-3">Học vấn / GPA</th>
                <th className="py-3.5 px-3">Kỹ năng tiêu biểu</th>
                <th className="py-3.5 px-3">Dự án đã làm</th>
                <th className="py-3.5 px-3">Nguyện vọng</th>
                <th className="py-3.5 px-3">Trạng thái</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map((c) => {
                  const isProcessing = processingId === c.maDK
                  return (
                    <tr key={c.maDK} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Candidate Avatar & Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                            {c.hoTen?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{c.hoTen}</div>
                            <div className="text-[11px] text-slate-400">
                              MSSV: {c.maSV} • Lớp: {c.lop}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* GPA & Level */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-800 text-xs">{c.gpa}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            c.gpa >= 3.2
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {c.gpa >= 3.2 ? 'Giỏi' : 'Khá'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{c.chuyenNganh}</div>
                      </td>

                      {/* Skills */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {c.kyNang?.split(/[,;]+/).slice(0, 3).map((k, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                            >
                              {k.trim()}
                            </span>
                          ))}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]">{c.congNghe}</div>
                      </td>

                      {/* Projects */}
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-slate-700 text-xs truncate max-w-[180px] block" title={c.duAnDaThucHien}>
                          {c.duAnDaThucHien}
                        </span>
                      </td>

                      {/* Priority Preference */}
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          <span className="material-symbols-outlined text-[12px] text-amber-500">star</span>
                          Ưu tiên {c.thuTuUuTien || 1}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          c.trangThai === 'DaDuyet'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.trangThai === 'TuChoi'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            c.trangThai === 'DaDuyet' ? 'bg-emerald-500' : c.trangThai === 'TuChoi' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}></span>
                          {c.trangThai === 'DaDuyet'
                            ? 'Đã duyệt (Mời PV)'
                            : c.trangThai === 'TuChoi'
                            ? 'Đã từ chối'
                            : 'Chờ duyệt'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCandidate(c)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                          >
                            Xem CV
                          </button>

                          {c.trangThai !== 'DaDuyet' && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(c.maDK, 'DaDuyet')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                              title="Duyệt hồ sơ và mời phỏng vấn"
                            >
                              Duyệt
                            </button>
                          )}

                          {c.trangThai !== 'TuChoi' && (
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleUpdateStatus(c.maDK, 'TuChoi')}
                              className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 font-semibold text-[11px] transition-colors"
                              title="Từ chối hồ sơ này"
                            >
                              Từ chối
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-xs text-slate-400">
                    <span className="material-symbols-outlined text-[36px] text-slate-300 block mb-1">
                      person_search
                    </span>
                    Không tìm thấy ứng viên nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal chi tiết hồ sơ & CV ứng viên */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {selectedCandidate.hoTen?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{selectedCandidate.hoTen}</h3>
                  <div className="text-[11px] text-slate-500">
                    MSSV: {selectedCandidate.maSV} • Lớp: {selectedCandidate.lop} • Khóa: {selectedCandidate.khoaHoc}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Điểm GPA tích lũy</div>
                  <div className="text-base font-black text-indigo-700 mt-0.5">{selectedCandidate.gpa} / 4.0</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Nguyện vọng</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">Ưu tiên {selectedCandidate.thuTuUuTien}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Trạng thái hồ sơ</div>
                  <div className="text-xs font-bold text-emerald-700 mt-1">
                    {selectedCandidate.trangThai === 'DaDuyet'
                      ? 'Đã duyệt (Mời PV)'
                      : selectedCandidate.trangThai === 'TuChoi'
                      ? 'Đã từ chối'
                      : 'Đang chờ duyệt'}
                  </div>
                </div>
              </div>

              {/* Skills & Technologies */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">code</span>
                  <span>Kỹ năng & Công nghệ thành thạo</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCandidate.kyNang?.split(/[,;]+/).map((k, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-semibold text-[11px] border border-indigo-100"
                    >
                      {k.trim()}
                    </span>
                  ))}
                  {selectedCandidate.congNghe?.split(/[,;]+/).map((c, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-semibold text-[11px] border border-blue-100"
                    >
                      {c.trim()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experience & Projects */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">terminal</span>
                  <span>Dự án thực tế đã thực hiện</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 font-medium leading-relaxed">
                  {selectedCandidate.duAnDaThucHien}
                </div>
              </div>

              {/* Introduction Profile */}
              <div className="space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-indigo-600">description</span>
                  <span>Thư tự giới thiệu & Mục tiêu thực tập</span>
                </div>
                <p className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 leading-relaxed italic">
                  "{selectedCandidate.ndHoSo}"
                </p>
              </div>

              {/* CV File Attachment Link */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">File CV Năng lực Sinh viên</div>
                    <div className="text-[11px] text-indigo-700 truncate max-w-[280px]">
                      {selectedCandidate.fileCV || 'Chưa đính kèm đường dẫn CV'}
                    </div>
                  </div>
                </div>
                {selectedCandidate.fileCV && (
                  <a
                    href={selectedCandidate.fileCV}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all"
                  >
                    <span>Mở xem CV</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs"
              >
                Đóng
              </button>
              <div className="flex items-center gap-2">
                {selectedCandidate.trangThai !== 'TuChoi' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedCandidate.maDK, 'TuChoi')}
                    className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs border border-rose-200 transition-colors"
                  >
                    Từ chối hồ sơ
                  </button>
                )}
                {selectedCandidate.trangThai !== 'DaDuyet' && (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedCandidate.maDK, 'DaDuyet')}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Duyệt hồ sơ & Mời PV</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
