import { toast } from "../../../contexts/ToastContext.jsx"
import { useState, useEffect, useRef } from 'react'
import ModalOverlay from '../../common/ModalOverlay'
import { failedInternshipService } from '../../../services/failedInternshipService'
import apiClient from '../../../services/api'

const NGUYEN_NHAN_MAP = {
  RotDiem: {
    label: 'Rớt do điểm đánh giá',
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: 'sentiment_very_dissatisfied',
  },
  KhongHoanTat: {
    label: 'Không hoàn tất đợt thực tập',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'running_with_errors',
  },
  TuChoiHoTro: {
    label: 'Rớt do từ chối nhận hỗ trợ',
    tone: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'person_cancel',
  },
}

export default function ChiTietHoSoRotModal({ maSV, maDot, initialNguon = 'TuDong', onClose }) {
  const [nguon, setNguon] = useState(initialNguon)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [downloadingDocId, setDownloadingDocId] = useState(null)

  const requestVersion = useRef(0)

  const fetchData = async () => {
    const v = ++requestVersion.current
    setLoading(true)
    setError('')
    try {
      const res = await failedInternshipService.getChiTietHoSo(maSV, maDot, nguon)
      if (v === requestVersion.current) {
        setData(res)
      }
    } catch (err) {
      if (v === requestVersion.current) {
        setError(err.response?.data?.message || err.message || 'Không thể tải chi tiết hồ sơ.')
      }
    } finally {
      if (v === requestVersion.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (maSV && maDot) {
      fetchData()
    }
  }, [maSV, maDot, nguon])

  const handleDownloadDoc = async (docId, fileName) => {
    try {
      setDownloadingDocId(docId)
      const res = await apiClient.get(`/documents/${encodeURIComponent(docId)}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName || `minh-chung-${docId}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể tải xuống tài liệu minh chứng.')
    } finally {
      setDownloadingDocId(null)
    }
  }

  const ketQua = data?.ketQua || {}
  const hoSoHienHanh = data?.hoSoHienHanh || {}
  const banChot = data?.banChot || null
  const luuY = data?.luuY || ''

  const nguyenNhanInfo = NGUYEN_NHAN_MAP[ketQua.nguyenNhan] || {
    label: ketQua.nguyenNhan || 'Không đạt',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'info',
  }

  return (
    <ModalOverlay isOpen={true} onClose={onClose}>
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl font-sans max-h-[90vh] overflow-y-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">folder_off</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 m-0">
                  Hồ sơ rớt thực tập: {ketQua.hoTen || maSV}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-700">
                  {maSV}
                </span>
                {ketQua.lop && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700">
                    Lớp: {ketQua.lop}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 m-0">
                Đợt: <strong className="text-slate-700">{ketQua.tenDot || maDot}</strong>
                {ketQua.namHoc && ` • Năm học: ${ketQua.namHoc}`}
                {ketQua.tenLoaiThucTap && ` • Loại: ${ketQua.tenLoaiThucTap}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Nguồn dữ liệu & Tùy chọn nguồn */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase">Nguồn dữ liệu đối chiếu:</span>
            <div className="flex items-center bg-white rounded-xl p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setNguon('TuDong')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  nguon === 'TuDong' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tự động
              </button>
              <button
                type="button"
                onClick={() => setNguon('HienHanh')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  nguon === 'HienHanh' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dữ liệu hiện hành
              </button>
              <button
                type="button"
                onClick={() => setNguon('BanChot')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  nguon === 'BanChot' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dữ liệu bản chốt
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                ketQua.nguonDuLieu === 'BanChot'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {ketQua.nguonDuLieu === 'BanChot'
                ? `Bản chốt v${ketQua.phienBanChot ?? 1}`
                : 'Đang hiển thị: Hiện hành'}
            </span>
            {banChot?.url && (
              <a
                href={banChot.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>Tải JSON bản chốt</span>
              </a>
            )}
          </div>
        </div>

        {luuY && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0">info</span>
            <span>{luuY}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 font-medium">Đang tải hồ sơ rớt thực tập...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
            <p className="text-xs font-bold text-rose-800">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 1. Quyết định kết quả rớt */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-[20px] ${nguyenNhanInfo.tone.split(' ')[1]}`}>
                    {nguyenNhanInfo.icon}
                  </span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Quyết định Kết quả Thực tập
                  </h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${nguyenNhanInfo.tone}`}>
                  {nguyenNhanInfo.label}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px] font-semibold">Tổng điểm kết luận:</span>
                  <span className="text-lg font-black text-rose-600">
                    {ketQua.tongDiem != null ? ketQua.tongDiem.toFixed(2) : '—'}
                  </span>
                  {hoSoHienHanh.tongDiemDaLuu != null && (
                    <span className="block text-[10px] text-slate-400">
                      Cache điểm lưu: {hoSoHienHanh.tongDiemDaLuu.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px] font-semibold">Đơn vị tiếp nhận:</span>
                  <span className="font-bold text-slate-800">
                    {ketQua.tenCongTy || hoSoHienHanh.phanBo?.tenCongTy || 'Chưa có nơi tiếp nhận'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px] font-semibold">Người xác nhận:</span>
                  <span className="font-semibold text-slate-800">{ketQua.nguoiXacNhan || 'Hệ thống'}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px] font-semibold">Ngày xác nhận:</span>
                  <span className="font-semibold text-slate-800">
                    {ketQua.ngayXacNhan ? new Date(ketQua.ngayXacNhan).toLocaleString('vi-VN') : '—'}
                  </span>
                </div>
              </div>

              {(ketQua.lyDo || ketQua.canCu) && (
                <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 space-y-1.5 text-xs text-rose-950">
                  {ketQua.lyDo && (
                    <div>
                      <strong className="text-rose-900">Lý do ghi nhận: </strong>
                      <span>{ketQua.lyDo}</span>
                    </div>
                  )}
                  {ketQua.canCu && (
                    <div>
                      <strong className="text-rose-900">Căn cứ quyết định: </strong>
                      <span>{ketQua.canCu}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Chi tiết điểm theo bộ rubric (nếu rớt điểm hoặc có điểm) */}
            {hoSoHienHanh.chiTietDiem && hoSoHienHanh.chiTietDiem.length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Chi tiết điểm theo bộ tiêu chí ({ketQua.tenRubric || 'Rubric áp dụng'})
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {hoSoHienHanh.chiTietDiem.length} tiêu chí
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-3.5 py-2.5">CLO / Tiêu chí</th>
                        <th className="px-3.5 py-2.5">Nội dung</th>
                        <th className="px-3.5 py-2.5 text-center">Bên chấm</th>
                        <th className="px-3.5 py-2.5 text-right">Điểm tối đa</th>
                        <th className="px-3.5 py-2.5 text-right">Điểm đạt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hoSoHienHanh.chiTietDiem.map((c, idx) => (
                        <tr key={c.maTieuChi || idx} className="hover:bg-slate-50/70">
                          <td className="px-3.5 py-2 font-mono font-bold text-slate-800">
                            {c.maCLO || c.maTieuChi}
                          </td>
                          <td className="px-3.5 py-2">{c.tenTieuChi}</td>
                          <td className="px-3.5 py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.nhomDanhGia === 'DN'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {c.nhomDanhGia || 'GV'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 text-right font-medium text-slate-500">
                            {c.diemToiDa ?? '—'}
                          </td>
                          <td className="px-3.5 py-2 text-right font-bold text-slate-900">
                            {c.diemCham != null ? c.diemCham.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. Lịch sử ứng tuyển & hỗ trợ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lịch sử ứng tuyển */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Lịch sử ứng tuyển ({hoSoHienHanh.ungTuyens?.length || 0})
                  </h3>
                </div>
                {(!hoSoHienHanh.ungTuyens || hoSoHienHanh.ungTuyens.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">Chưa có lượt ứng tuyển nào trong đợt.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {hoSoHienHanh.ungTuyens.map((ut, idx) => (
                      <div
                        key={ut.maDK || idx}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{ut.tenCongTy}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-200 text-slate-700">
                            NV{ut.thuTuUuTien}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Vị trí: {ut.viTriTuyen || '—'}</span>
                          <span>{ut.ngayDangKy ? new Date(ut.ngayDangKy).toLocaleDateString('vi-VN') : ''}</span>
                        </div>
                        {ut.lyDoKetThuc && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5 m-0">Lý do: {ut.lyDoKetThuc}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lịch sử hỗ trợ của Khoa */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Lịch sử hỗ trợ ({hoSoHienHanh.cacLanHoTro?.length || 0})
                  </h3>
                </div>
                {(!hoSoHienHanh.cacLanHoTro || hoSoHienHanh.cacLanHoTro.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">Chưa có lần hỗ trợ nào được ghi nhận.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {hoSoHienHanh.cacLanHoTro.map((lan, idx) => (
                      <div
                        key={lan.maLan || idx}
                        className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-950">{lan.tenLan}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              lan.phanHoi === 'NhanHoTro'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : lan.phanHoi === 'TuChoiHoTro'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {lan.phanHoi === 'NhanHoTro'
                              ? 'Đã nhận hỗ trợ'
                              : lan.phanHoi === 'TuChoiHoTro'
                                ? 'Từ chối hỗ trợ'
                                : 'Chưa phản hồi'}
                          </span>
                        </div>
                        {lan.lyDoPhanHoi && (
                          <p className="text-[11px] text-slate-600 m-0">
                            <strong>Ý kiến SV:</strong> {lan.lyDoPhanHoi}
                          </p>
                        )}
                        {lan.congTyGioiThieu && lan.congTyGioiThieu.length > 0 && (
                          <div className="mt-1 pt-1 border-t border-purple-100 text-[10px] text-purple-900">
                            <strong>Công ty giới thiệu: </strong>
                            {lan.congTyGioiThieu.map((c) => c.tenCongTy).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Tài liệu minh chứng & Báo cáo */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Tài liệu minh chứng đính kèm
                </h3>
              </div>

              {(() => {
                const docs = hoSoHienHanh.taiLieus || hoSoHienHanh.minhChungs || []
                if (docs.length === 0) {
                  return <p className="text-xs text-slate-400 italic">Không có tài liệu minh chứng nào đính kèm.</p>
                }
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {docs.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate m-0">
                            {doc.ten || doc.tenTep || `Tài liệu ${doc.id}`}
                          </p>
                          <p className="text-[10px] text-slate-500 m-0">
                            {doc.kind || 'Minh chứng'}
                            {doc.dungLuong ? ` • ${(doc.dungLuong / 1024).toFixed(1)} KB` : ''}
                            {doc.ngayTao ? ` • ${new Date(doc.ngayTao).toLocaleDateString('vi-VN')}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(doc.id, doc.ten || doc.tenTep)}
                          disabled={downloadingDocId === doc.id}
                          className="shrink-0 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          {downloadingDocId === doc.id ? 'Đang tải...' : 'Tải xuống'}
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}