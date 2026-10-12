import { useState, useEffect } from 'react'
import { gioiThieuService } from '../../services/gioiThieuService'

export default function DuyetGioiThieuPage() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // ALL, ChoDuyet, DaDuyet, TuChoi

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await gioiThieuService.getAll()
      if (res.data?.success) {
        setList(res.data.data || [])
      } else {
        setList(res.data || [])
      }
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Đã duyệt
          </span>
        )
      case 'TuChoi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Từ chối
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Chờ xét duyệt
          </span>
        )
    }
  }

  // Lọc theo trạng thái
  const filteredList = list.filter((item) => {
    if (filterStatus === 'ALL') return true
    if (filterStatus === 'ChoDuyet') return item.trangThaiKetNoi !== 'DaDuyet' && item.trangThaiKetNoi !== 'TuChoi'
    return item.trangThaiKetNoi === filterStatus
  })

  // Đếm số lượng
  const countChoDuyet = list.filter((i) => i.trangThaiKetNoi !== 'DaDuyet' && i.trangThaiKetNoi !== 'TuChoi').length
  const countDaDuyet = list.filter((i) => i.trangThaiKetNoi === 'DaDuyet').length

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
            <span>FIT Portal</span>
            <span>/</span>
            <span>Văn phòng Khoa</span>
            <span>/</span>
            <span className="text-blue-700 font-bold">Xét duyệt Doanh nghiệp</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Xét duyệt Doanh nghiệp Thực tập
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cán bộ Khoa thẩm định các đề xuất công ty từ Giảng viên trước khi công khai cho sinh viên đăng ký
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Thẻ thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
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
            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Cần duyệt ngay</p>
            <p className="text-xl font-black text-amber-700">{countChoDuyet}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Đã tiếp nhận</p>
            <p className="text-xl font-black text-emerald-700">{countDaDuyet}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
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
        {/* Thanh lọc trạng thái */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 overflow-x-auto">
          <span className="text-xs font-semibold text-slate-500 mr-2">Bộ lọc:</span>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ChoDuyet', label: `Chờ duyệt (${countChoDuyet})` },
            { key: 'DaDuyet', label: `Đã duyệt (${countDaDuyet})` },
            { key: 'TuChoi', label: 'Đã từ chối' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterStatus === tab.key
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-24 text-center text-slate-400">
            <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-blue-600">
              progress_activity
            </span>
            <p className="text-xs">Đang tải danh sách đề xuất...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">inbox</span>
            <p className="text-xs">Không có doanh nghiệp nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Tên Doanh nghiệp</th>
                  <th className="py-3 px-4">Vị trí tuyển dụng</th>
                  <th className="py-3 px-4">Giảng viên đề xuất</th>
                  <th className="py-3 px-4">Ngày gửi</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Quyết định xét duyệt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredList.map((item) => (
                  <tr key={item.maSo} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 text-sm leading-tight">
                        {item.tenCongTy || item.maCongTy}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono">Mã: {item.maSo}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-blue-900">{item.viTriTuyen || 'Chưa cập nhật'}</p>
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
                      <div className="inline-flex items-center gap-2">
                        {item.trangThaiKetNoi !== 'DaDuyet' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.maSo, 'DaDuyet')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                            <span>Phê duyệt</span>
                          </button>
                        )}
                        {item.trangThaiKetNoi !== 'TuChoi' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(item.maSo, 'TuChoi')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-semibold transition border border-slate-200"
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
          </div>
        )}
      </div>
    </div>
  )
}
