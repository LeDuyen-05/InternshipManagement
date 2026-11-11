import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../../components/Layout'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import { ungTuyenHoTroService } from '../../services/ungTuyenHoTroService'
import BoLocUngTuyen from '../../components/khoa/ung-tuyen-ho-tro/BoLocUngTuyen'
import ThongKeCards from '../../components/khoa/ung-tuyen-ho-tro/ThongKeCards'
import ChiTietUngTuyenModal from '../../components/khoa/ung-tuyen-ho-tro/ChiTietUngTuyenModal'
import Pagination from '../../components/common/Pagination'

export default function TheoDoiUngTuyenHoTroPage() {
  const { selectedDot, danhSachNamHoc } = useDotThucTap()

  const [filters, setFilters] = useState(() => ({
    namHoc: selectedDot?.namHoc || danhSachNamHoc[0]?.namHoc || '',
    maLoaiThucTap: selectedDot?.maLoaiThucTap || 'ALL',
    maDot: selectedDot?.maDot || '',
    search: '',
    lop: '',
    ketQua: 'ALL',
    tinhTrangNoi: 'ALL',
    canHoTro: 'ALL',
  }))

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal chi tiết
  const [selectedMaSV, setSelectedMaSV] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  // Ngăn chặn race condition khi đổi đợt nhanh
  const requestVersion = useRef(0)

  // Đồng bộ đợt từ context khi người dùng đổi đợt ở header
  useEffect(() => {
    if (selectedDot?.maDot && selectedDot.maDot !== filters.maDot) {
      setFilters((prev) => ({
        ...prev,
        namHoc: selectedDot.namHoc || prev.namHoc,
        maLoaiThucTap: selectedDot.maLoaiThucTap || prev.maLoaiThucTap,
        maDot: selectedDot.maDot,
      }))
      setPage(1)
    }
  }, [selectedDot?.maDot, selectedDot?.namHoc, selectedDot?.maLoaiThucTap])

  const loadData = useCallback(async () => {
    if (!filters.maDot) {
      setData(null)
      setLoading(false)
      return
    }

    const currentReq = ++requestVersion.current
    setLoading(true)
    setError('')

    try {
      const res = await ungTuyenHoTroService.getDanhSach({
        maDot: filters.maDot,
        search: filters.search.trim(),
        lop: filters.lop.trim(),
        ketQua: filters.ketQua,
        tinhTrangNoi: filters.tinhTrangNoi,
        canHoTro: filters.canHoTro === 'ALL' ? undefined : filters.canHoTro,
        page,
        pageSize,
      })

      if (currentReq === requestVersion.current) {
        setData(res)
      }
    } catch (err) {
      if (currentReq === requestVersion.current) {
        setError(
          err.response?.data?.message ||
            'Không thể kết nối đến API theo dõi ứng tuyển & hỗ trợ. Vui lòng thử lại.'
        )
        setData(null)
      }
    } finally {
      if (currentReq === requestVersion.current) {
        setLoading(false)
      }
    }
  }, [filters, page, pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleResetFilters = () => {
    setFilters({
      namHoc: selectedDot?.namHoc || danhSachNamHoc[0]?.namHoc || '',
      maLoaiThucTap: selectedDot?.maLoaiThucTap || 'ALL',
      maDot: selectedDot?.maDot || '',
      search: '',
      lop: '',
      ketQua: 'ALL',
      tinhTrangNoi: 'ALL',
      canHoTro: 'ALL',
    })
    setPage(1)
  }

  const openDetail = (maSV) => {
    setSelectedMaSV(maSV)
    setModalOpen(true)
  }

  const renderKetQuaBadge = (kq) => {
    switch (kq) {
      case 'Dat':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Trúng tuyển
          </span>
        )
      case 'KhongDat':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Không trúng tuyển
          </span>
        )
      case 'ChuaCoKetQua':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Chờ kết quả
          </span>
        )
      case 'DaKetThuc':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Đã kết thúc / Rút
          </span>
        )
      case 'Vang':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            Vắng phỏng vấn
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
            Chưa ứng tuyển
          </span>
        )
    }
  }

  const renderTinhTrangNoiBadge = (tt) => {
    switch (tt) {
      case 'DaCoNoi':
        return (
          <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Đã có nơi chính thức
          </span>
        )
      case 'ChoXacNhan':
        return (
          <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Chờ xác nhận / Chốt
          </span>
        )
      case 'ChuaCoNoi':
        return (
          <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Chưa có nơi thực tập
          </span>
        )
      case 'KhongHoanTat':
        return (
          <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
            Không hoàn tất đợt
          </span>
        )
      case 'CanKiemTra':
        return (
          <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Cần kiểm tra
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {tt || '—'}
          </span>
        )
    }
  }

  const items = data?.items || []
  const thongKe = data?.thongKe
  const totalCount = data?.totalCount || 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const start = totalCount > 0 ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, totalCount)

  const pagination = {
    page,
    pageSize,
    totalItems: totalCount,
    totalPages,
    start,
    end,
    setPage: (p) => setPage(Number(p) || 1),
    setPageSize: (s) => {
      setPageSize(Number(s) || 20)
      setPage(1)
    },
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              <span className="material-symbols-outlined text-[18px]">support_agent</span>
              <span>Quản lý &amp; Giám sát thực tập</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Theo dõi ứng tuyển &amp; hỗ trợ sinh viên
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi kết quả tuyển dụng, tình trạng hỗ trợ và tiếp nhận thực tập của sinh viên trong đợt.
            </p>
          </div>
        </div>

        {/* Bộ lọc tìm kiếm */}
        <BoLocUngTuyen
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          onReload={loadData}
          danhSachNamHoc={danhSachNamHoc}
          loading={loading}
        />

        {/* Thẻ thống kê */}
        <ThongKeCards thongKe={thongKe} loading={loading} />

        {/* Lỗi */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={loadData}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Bảng sinh viên */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">
                Danh sách sinh viên trong phạm vi lọc
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {totalCount} sinh viên
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="min-w-[180px] py-3 px-4">Sinh viên</th>
                  <th className="min-w-[240px] py-3 px-4">Công ty (lượt gần nhất)</th>
                  <th className="min-w-[160px] py-3 px-4 text-center">Kết quả ứng tuyển</th>
                  <th className="min-w-[112px] py-3 px-4 text-center">Đạt / Không đạt</th>
                  <th className="min-w-[130px] py-3 px-4 text-center">Lần hỗ trợ</th>
                  <th className="min-w-[190px] py-3 px-4 text-center">Nơi thực tập</th>
                  <th className="min-w-[120px] py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!filters.maDot ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 font-bold">
                        <span className="material-symbols-outlined text-[32px]">event_busy</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800">Không có đợt phù hợp</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Không tìm thấy đợt thực tập nào thuộc năm học và loại thực tập đang chọn. Vui lòng chọn năm học khác hoặc chọn tất cả loại thực tập.
                      </p>
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-2xl animate-spin text-blue-600 mb-2">
                        progress_activity
                      </span>
                      <p>Đang tải dữ liệu theo dõi ứng tuyển...</p>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">
                        search_off
                      </span>
                      <p>Không tìm thấy sinh viên nào phù hợp với bộ lọc hiện tại.</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const ungTuyen = item.ungTuyenGanNhat
                    const actions = item.actions || {}

                    return (
                      <tr key={item.maSV} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 text-sm">{item.hoTen}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            MSSV: {item.maSV} • Lớp: {item.lop || '—'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          {ungTuyen ? (
                            <div>
                              <p className="font-bold text-slate-800">{ungTuyen.tenCongTy}</p>
                              <p className="text-[11px] text-slate-500">
                                {ungTuyen.viTri || 'Vị trí chung'} (Lần {ungTuyen.lanDangKy || 1})
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa nộp hồ sơ</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {renderKetQuaBadge(ungTuyen?.ketQua)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-bold text-emerald-700" title="Số lần đạt ứng tuyển">{item.soLanDatUngTuyen ?? 0}</span><span className="mx-1">/</span>
                          {item.soLanRotUngTuyen > 0 ? (
                            <span className="font-bold font-mono px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-200">
                              {item.soLanRotUngTuyen}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.lanHoTroHienTai ? (
                            <span className="text-purple-700 font-semibold">
                              {item.lanHoTroHienTai.tenLan}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa có</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {renderTinhTrangNoiBadge(item.tinhTrangNoi)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openDetail(item.maSV)}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition-all text-xs cursor-pointer"
                            >
                              Chi tiết
                            </button>
                            {actions.coTheHoTroTiep && (
                              <button
                                type="button"
                                onClick={() => openDetail(item.maSV)}
                                title="Mở thao tác hỗ trợ tiếp theo"
                                className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold transition-all text-xs cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  support_agent
                                </span>
                                <span>Hỗ trợ tiếp</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <Pagination
              pagination={pagination}
              label="sinh viên theo dõi & hỗ trợ"
            />
          )}
        </div>
      </div>

      {/* Modal chi tiết & tương tác hỗ trợ */}
      <ChiTietUngTuyenModal
        key={`${filters.maDot}|${selectedMaSV}|${modalOpen}`}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        maSV={selectedMaSV}
        maDot={filters.maDot}
        onUpdated={loadData}
      />
    </Layout>
  )
}
