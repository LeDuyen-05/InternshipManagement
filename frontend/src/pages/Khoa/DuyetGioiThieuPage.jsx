import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { gioiThieuService } from '../../services/gioiThieuService'

export default function DuyetGioiThieuPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // ALL, ChoDuyet, DaDuyet, TuChoi
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProposal, setSelectedProposal] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await gioiThieuService.getAll()
      const data = res.data?.success ? res.data.data : res.data
      setList(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Không thể tải danh sách đề xuất')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUpdateStatus = async (id, newStatus) => {
    const actionName = newStatus === 'DaDuyet' ? 'Phê duyệt' : 'Từ chối'
    if (!window.confirm(`Xác nhận ${actionName} đề xuất doanh nghiệp này?`)) return

    try {
      setError(null)
      setSuccessMsg('')
      await gioiThieuService.updateTrangThai(id, newStatus)
      setSuccessMsg(`Đã ${actionName.toLowerCase()} thành công!`)
      if (selectedProposal && selectedProposal.maSo === id) {
        setSelectedProposal((prev) => (prev ? { ...prev, trangThaiKetNoi: newStatus } : null))
      }
      loadData()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi cập nhật trạng thái')
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DaDuyet':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Đã duyệt
          </span>
        )
      case 'TuChoi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="material-symbols-outlined text-[14px]">cancel</span>
            Đã từ chối
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Chờ xét duyệt
          </span>
        )
    }
  }

  // Lọc theo trạng thái và từ khóa tìm kiếm
  const filteredList = list.filter((item) => {
    if (filterStatus === 'ChoDuyet' && (item.trangThaiKetNoi === 'DaDuyet' || item.trangThaiKetNoi === 'TuChoi')) {
      return false
    }
    if (filterStatus === 'DaDuyet' && item.trangThaiKetNoi !== 'DaDuyet') {
      return false
    }
    if (filterStatus === 'TuChoi' && item.trangThaiKetNoi !== 'TuChoi') {
      return false
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      const matchCompany = (item.tenCongTy || '').toLowerCase().includes(q)
      const matchPosition = (item.viTriTuyen || '').toLowerCase().includes(q)
      const matchLecturer = (item.tenGiangVien || item.maGV || '').toLowerCase().includes(q)
      const matchCode = (item.maSo || item.maCongTy || '').toLowerCase().includes(q)
      if (!matchCompany && !matchPosition && !matchLecturer && !matchCode) return false
    }
    return true
  })

  // Đếm số lượng
  const countChoDuyet = list.filter((i) => i.trangThaiKetNoi !== 'DaDuyet' && i.trangThaiKetNoi !== 'TuChoi').length
  const countDaDuyet = list.filter((i) => i.trangThaiKetNoi === 'DaDuyet').length
  const countTuChoi = list.filter((i) => i.trangThaiKetNoi === 'TuChoi').length
  const pagination = usePagination(filteredList, `${filterStatus}-${searchTerm}`)

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Điều hướng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
            <span>FIT Portal</span>
            <span>/</span>
            <span>Văn phòng Khoa</span>
            <span>/</span>
            <span className="text-indigo-600 font-bold">Duyệt công ty đề xuất</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Xét duyệt Doanh nghiệp do Giảng viên đề xuất
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thẩm định các đề xuất kết nối doanh nghiệp mới từ Giảng viên. Sau khi Khoa duyệt, doanh nghiệp sẽ sẵn sàng trong danh bạ để đưa vào kế hoạch các đợt thực tập tại trang{' '}
            <Link to="/khoa/doanh-nghiep" className="text-indigo-600 underline font-medium">
              Doanh nghiệp liên kết
            </Link>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/khoa/doanh-nghiep"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">business</span>
            <span>Kế hoạch DN theo đợt</span>
          </Link>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thẻ thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng số đề xuất</p>
            <p className="text-xl font-black text-slate-900">{list.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">pending_actions</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Cần duyệt ngay</p>
            <p className="text-xl font-black text-amber-700">{countChoDuyet}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Đã tiếp nhận</p>
            <p className="text-xl font-black text-emerald-700">{countDaDuyet}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">cancel</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Đã từ chối</p>
            <p className="text-xl font-black text-rose-700">{countTuChoi}</p>
          </div>
        </div>
      </div>

      {/* Thông báo */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-3 shadow-xs">
          <span className="material-symbols-outlined text-rose-600">error</span>
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm flex items-center gap-3 shadow-xs">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Bảng danh sách & Bộ lọc */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
        {/* Thanh lọc & tìm kiếm */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0">Bộ lọc:</span>
            {[
              { key: 'ALL', label: `Tất cả (${list.length})` },
              { key: 'ChoDuyet', label: `Chờ duyệt (${countChoDuyet})` },
              { key: 'DaDuyet', label: `Đã duyệt (${countDaDuyet})` },
              { key: 'TuChoi', label: `Đã từ chối (${countTuChoi})` },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
                  filterStatus === tab.key
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên DN, vị trí, GV đề xuất…"
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-indigo-600">
              progress_activity
            </span>
            <p className="text-xs">Đang tải danh sách đề xuất...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">inbox</span>
            <p className="text-xs">Không có doanh nghiệp nào phù hợp với điều kiện tìm kiếm.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Tên Doanh nghiệp</th>
                  <th className="py-3 px-4">Vị trí & Chỉ tiêu</th>
                  <th className="py-3 px-4">Giảng viên đề xuất</th>
                  <th className="py-3 px-4">Ngày gửi</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác xét duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pagination.items.map((item) => (
                  <tr key={item.maSo} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => setSelectedProposal(item)}
                        className="text-left font-bold text-slate-900 hover:text-indigo-600 text-sm leading-tight transition cursor-pointer"
                        title="Bấm để xem chi tiết hồ sơ đề xuất & JD"
                      >
                        {item.tenCongTy || item.maCongTy}
                      </button>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Mã đề xuất: {item.maSo} {item.maCongTy ? `· Mã DN: ${item.maCongTy}` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{item.viTriTuyen || 'Chưa cập nhật'}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Chỉ tiêu: <strong className="text-slate-700">{item.soLuongNhan ? `${item.soLuongNhan} SV` : 'Chưa giới hạn'}</strong>
                        {item.thoiGian && ` · ${item.thoiGian}`}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-900">{item.tenGiangVien || item.maGV}</p>
                      <span className="text-[10px] text-slate-400 font-mono">[{item.maGV}]</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {item.ngayGioiThieu ? new Date(item.ngayGioiThieu).toLocaleDateString('vi-VN') : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(item.trangThaiKetNoi)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedProposal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                          title="Xem thông tin chi tiết đề xuất và bản mô tả công việc (JD)"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Xem chi tiết</span>
                        </button>

                        {item.trangThaiKetNoi !== 'DaDuyet' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.maSo, 'DaDuyet')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            <span>Phê duyệt</span>
                          </button>
                        )}

                        {item.trangThaiKetNoi !== 'TuChoi' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.maSo, 'TuChoi')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 rounded-lg text-xs font-semibold transition border border-rose-200 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                            <span>Từ chối</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination pagination={pagination} label="công ty đề xuất" />
          </div>
        )}
      </div>

      {/* Modal Xem chi tiết thông tin công ty đề xuất */}
      {selectedProposal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn"
        >
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <span className="material-symbols-outlined text-[13px]">business</span>
                  CHI TIẾT ĐỀ XUẤT DOANH NGHIỆP
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {selectedProposal.tenCongTy || selectedProposal.maCongTy}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Mã đề xuất: {selectedProposal.maSo} · Mã doanh nghiệp: {selectedProposal.maCongTy || 'Chưa cấp'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                aria-label="Đóng"
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Nội dung thông tin đề xuất */}
            <div className="space-y-4 text-xs">
              {/* Khối Giảng viên & Ngày gửi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-500 font-medium block">Giảng viên đề xuất:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedProposal.tenGiangVien || selectedProposal.maGV}{' '}
                    <span className="text-slate-400 font-normal font-mono">[{selectedProposal.maGV}]</span>
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Ngày gửi đề xuất:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedProposal.ngayGioiThieu
                      ? new Date(selectedProposal.ngayGioiThieu).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Khối Vị trí & Chỉ tiêu tiếp nhận */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <div>
                  <span className="text-indigo-600 font-medium block">Vị trí tuyển dụng:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedProposal.viTriTuyen || 'Chưa cập nhật'}
                  </p>
                </div>
                <div>
                  <span className="text-indigo-600 font-medium block">Chỉ tiêu nhận dự kiến:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedProposal.soLuongNhan ? `${selectedProposal.soLuongNhan} sinh viên` : 'Chưa giới hạn'}
                  </p>
                </div>
                <div>
                  <span className="text-indigo-600 font-medium block">Thời gian thực tập:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedProposal.thoiGian || 'Theo khung kế hoạch đợt'}
                  </p>
                </div>
              </div>

              {/* Bản mô tả công việc / Yêu cầu năng lực (JD) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-indigo-600">description</span>
                    Mô tả công việc & Yêu cầu năng lực (JD)
                  </span>
                  <span className="text-[11px] text-slate-400">Nội dung từ giảng viên đề xuất</span>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-mono text-[11.5px]">
                  {selectedProposal.yeuCau ? (
                    selectedProposal.yeuCau
                  ) : (
                    <span className="text-slate-400 italic">
                      Giảng viên chưa nhập mô tả chi tiết yêu cầu công việc. Vị trí tiếp nhận: {selectedProposal.viTriTuyen || 'Chưa cập nhật'}.
                    </span>
                  )}
                </div>
              </div>

              {/* Trạng thái xét duyệt hiện tại */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Trạng thái hồ sơ:</span>
                  {getStatusBadge(selectedProposal.trangThaiKetNoi)}
                </div>
                <span className="text-[11px] text-slate-500">
                  {selectedProposal.trangThaiKetNoi === 'DaDuyet'
                    ? 'Doanh nghiệp đã sẵn sàng trong danh bạ Khoa.'
                    : selectedProposal.trangThaiKetNoi === 'TuChoi'
                    ? 'Đề xuất đã bị từ chối tiếp nhận.'
                    : 'Đang chờ Khoa thẩm định và phê duyệt.'}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>

              {selectedProposal.trangThaiKetNoi !== 'TuChoi' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedProposal.maSo, 'TuChoi')}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>Từ chối đề xuất</span>
                </button>
              )}

              {selectedProposal.trangThaiKetNoi !== 'DaDuyet' && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedProposal.maSo, 'DaDuyet')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Phê duyệt đề xuất</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
