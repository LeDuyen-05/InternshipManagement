import { useState, useEffect, useRef } from 'react'
import { roundStudentImportService } from '../../services/roundStudentImportService'
import ModalOverlay from './ModalOverlay'

export default function ImportHistoryPanel({ initialMaDot }) {
  const [rounds, setRounds] = useState([])
  const [selectedMaDot, setSelectedMaDot] = useState(initialMaDot || '')
  const [historyData, setHistoryData] = useState({ items: [], totalCount: 0, page: 1, pageSize: 20 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // State Modal Chi tiết phiên
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [sessionDetail, setSessionDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [errorDetail, setErrorDetail] = useState('')

  const requestVersion = useRef(0)

  // Load danh sách đợt
  useEffect(() => {
    async function loadRounds() {
      try {
        const list = await roundStudentImportService.getRounds()
        setRounds(list || [])
        if (!selectedMaDot && list?.length > 0) {
          const current = list.find((r) => r.trangThai === 'DangDienRa') || list[0]
          setSelectedMaDot(current?.maSo || '')
        }
      } catch {
        // ignore
      }
    }
    loadRounds()
  }, [])

  // Load lịch sử các phiên của đợt đang chọn
  useEffect(() => {
    if (!selectedMaDot) {
      setHistoryData({ items: [], totalCount: 0, page: 1, pageSize: 20 })
      return
    }

    const v = ++requestVersion.current
    async function fetchHistory() {
      setLoading(true)
      setError('')
      try {
        const res = await roundStudentImportService.getHistory(selectedMaDot, page)
        if (v === requestVersion.current) {
          setHistoryData(res || { items: [], totalCount: 0, page: 1, pageSize: 20 })
        }
      } catch (err) {
        if (v === requestVersion.current) {
          setError(err.response?.data?.message || 'Không thể tải lịch sử phiên import.')
          setHistoryData({ items: [], totalCount: 0, page: 1, pageSize: 20 })
        }
      } finally {
        if (v === requestVersion.current) {
          setLoading(false)
        }
      }
    }

    fetchHistory()
  }, [selectedMaDot, page])

  // Xem chi tiết phiên
  const handleOpenDetail = async (id) => {
    setSelectedSessionId(id)
    setSessionDetail(null)
    setLoadingDetail(true)
    setErrorDetail('')
    try {
      const data = await roundStudentImportService.getSession(id)
      setSessionDetail(data)
    } catch (err) {
      setErrorDetail(err.response?.data?.message || 'Không thể tải thông tin chi tiết phiên import.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil((historyData.totalCount || 0) / 20))

  const CHE_DO_LABEL = {
    NhapHoSo: 'Nhập hồ sơ & Thêm vào đợt',
    ThemVaoDot: 'Chỉ thêm SV có sẵn',
    DoiSoatKhongThamGia: 'Đối soát không tham gia',
  }

  const TRANG_THAI_BADGE = {
    DaNhap: { label: 'Đã ghi nhận', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    ChoNhap: { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    DaHetHan: { label: 'Hết hạn', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  }

  return (
    <div className="space-y-4">
      {/* Thanh chọn đợt thực tập */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-lg">history</span>
          <label className="text-xs font-bold text-slate-700">Đợt thực tập:</label>
          <select
            value={selectedMaDot}
            onChange={(e) => {
              setSelectedMaDot(e.target.value)
              setPage(1)
            }}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
          >
            {rounds.map((r) => (
              <option key={r.maSo} value={r.maSo}>
                {r.tenDot} [{r.trangThai}]
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Tổng cộng: <strong>{historyData.totalCount}</strong> phiên của tài khoản này
        </span>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Bảng danh sách phiên */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Mã phiên</th>
                <th className="py-2.5 px-3">Nguồn tệp</th>
                <th className="py-2.5 px-3">Chế độ</th>
                <th className="py-2.5 px-3">Trạng thái</th>
                <th className="py-2.5 px-3">Ngày tạo</th>
                <th className="py-2.5 px-3">Ngày nhập</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    Đang tải lịch sử phiên import...
                  </td>
                </tr>
              ) : historyData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 italic">
                    Chưa có phiên import nào của bạn trong đợt này.
                  </td>
                </tr>
              ) : (
                historyData.items.map((row) => {
                  const badge = TRANG_THAI_BADGE[row.trangThai] || {
                    label: row.trangThai,
                    cls: 'bg-slate-100 text-slate-700 border-slate-200',
                  }
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {row.id?.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{row.tenNguon}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {CHE_DO_LABEL[row.cheDo] || row.cheDo}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {row.ngayTao ? new Date(row.ngayTao).toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {row.ngayNhap ? new Date(row.ngayNhap).toLocaleString('vi-VN') : 'Chưa nhập'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(row.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Trang {page} / {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-50 cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-50 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Chi tiết phiên */}
      {selectedSessionId && (
        <ModalOverlay isOpen={true} onClose={() => setSelectedSessionId(null)}>
          <div className="bg-white rounded-3xl p-6 shadow-2xl font-sans max-w-3xl w-full max-h-[88vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  CHI TIẾT PHIÊN IMPORT
                </span>
                <h3 className="text-base font-black text-slate-900 m-0">
                  {sessionDetail?.tenNguon || selectedSessionId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-10 text-center text-xs text-slate-400 italic">
                Đang tải thông tin chi tiết phiên...
              </div>
            ) : errorDetail ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {errorDetail}
              </div>
            ) : sessionDetail ? (
              <div className="space-y-4 text-xs">
                {/* Thông tin chung */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Mã đợt</span>
                    <span className="font-bold text-slate-900">{sessionDetail.maDot}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Chế độ</span>
                    <span className="font-bold text-slate-900">
                      {CHE_DO_LABEL[sessionDetail.cheDo] || sessionDetail.cheDo}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Trạng thái</span>
                    <span className="font-bold text-slate-900">{sessionDetail.trangThai}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Phiên bản</span>
                    <span className="font-bold text-slate-900">v{sessionDetail.phienBan ?? 0}</span>
                  </div>
                </div>

                {/* Kết quả ghi nhận */}
                {sessionDetail.ketQua ? (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] m-0">
                      Kết quả nhập cơ sở dữ liệu
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">
                          Hồ sơ tạo mới
                        </span>
                        <span className="text-xl font-black text-emerald-950">
                          {sessionDetail.ketQua.soHoSoTaoMoi ?? 0}
                        </span>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <span className="text-[10px] font-bold text-blue-700 uppercase block">
                          Thêm vào đợt
                        </span>
                        <span className="text-xl font-black text-blue-950">
                          {sessionDetail.ketQua.soThemVaoDot ?? 0}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-600 uppercase block">
                          Đã tham gia
                        </span>
                        <span className="text-xl font-black text-slate-800">
                          {sessionDetail.ketQua.soDaThamGia ?? 0}
                        </span>
                      </div>
                    </div>

                    {sessionDetail.ketQua.doiSoat?.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                        <span className="font-bold block">Danh sách đối soát không tham gia:</span>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {sessionDetail.ketQua.doiSoat.map((ds, idx) => (
                            <div key={idx} className="text-[11px] flex items-center justify-between">
                              <span className="font-mono font-bold">{ds.maSV} - {ds.hoTen}</span>
                              <span className="text-amber-700">{ds.canhBao?.join('; ') || 'Đã đối soát'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-xl text-slate-500 text-center italic">
                    Phiên này chưa hoàn tất xác nhận ghi vào cơ sở dữ liệu.
                    {sessionDetail.hetHan && (
                      <span className="block mt-1">
                        Hạn xác nhận: {new Date(sessionDetail.hetHan).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
