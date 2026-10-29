import { useState, useEffect } from 'react'
import { phongVanService } from '../../services/phongVanService'
import { useIdentity } from '../../hooks/useIdentity'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import NoLinkedAccount from '../../components/common/NoLinkedAccount'
import { PHAN_BO } from '../../utils/trangThai'

const coGio = (d) => {
  const t = new Date(d)
  return t.getHours() !== 0 || t.getMinutes() !== 0
}

export default function LichTrinhPhongVanPage() {
  const { maSV: currentMaSV } = useIdentity()
  const { selectedDot } = useDotThucTap()

  const [interviews, setInterviews] = useState([])
  const [placement, setPlacement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchData = async () => {
    if (!currentMaSV) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [pvData, pbData] = await Promise.all([
        phongVanService.getLichPhongVan(currentMaSV),
        phongVanService.getPhanBoThucTap(currentMaSV),
      ])
      setInterviews(pvData || [])
      setPlacement(pbData || null)
    } catch (err) {
      console.error('Lỗi khi tải lịch phỏng vấn và phân bổ:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [currentMaSV])

  const handleXacNhan = async () => {
    if (!placement?.maPhanBo) return
    if (!window.confirm(`Xác nhận nhận quyết định thực tập tại "${placement.tenCongTy}"?`)) return
    try {
      setConfirming(true)
      const res = await phongVanService.xacNhanTiepNhan(placement.maPhanBo)
      setPlacement(res.data || placement)
      setMessage({ type: 'success', text: res.message || 'Đã xác nhận nhận quyết định tiếp nhận.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Không thể xác nhận. Vui lòng thử lại.' })
    } finally {
      setConfirming(false)
    }
  }

  if (!currentMaSV) {
    return <NoLinkedAccount type="sinh viên" />
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            HỌC VỤ & TUYỂN DỤNG • {selectedDot?.tenDot || 'LỊCH PHỎNG VẤN'}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Lịch Phỏng Vấn & Phân Bổ Tiếp Nhận
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Theo dõi tiến trình phỏng vấn cùng doanh nghiệp đối tác và quyết định phân bổ giảng viên hướng dẫn của Khoa CNTT.
          </p>
        </div>

        {placement && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {PHAN_BO[placement.trangThai] || 'Đã có quyết định tiếp nhận'}
          </div>
        )}
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
          {message.text}
        </div>
      )}

      {/* Bento Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Lịch phỏng vấn</span>
            <span className="material-symbols-outlined text-blue-700 text-[22px]">calendar_month</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">{interviews.length}</div>
            <div className="text-xs text-slate-500 mt-1">Buổi phỏng vấn đã được xếp lịch</div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Kết quả phỏng vấn</span>
            <span className="material-symbols-outlined text-emerald-700 text-[22px]">verified</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-emerald-800">
              {interviews.filter((p) => p.ketQua === 'Dat').length}
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1">Đạt yêu cầu doanh nghiệp</div>
          </div>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Đơn vị tiếp nhận</span>
            <span className="material-symbols-outlined text-indigo-700 text-[22px]">corporate_fare</span>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-slate-900 truncate">
              {placement ? placement.tenCongTy : 'Chờ phân bổ'}
            </div>
            <div className="text-xs text-indigo-700 font-medium mt-1 truncate">
              {placement ? placement.viTriTuyen : 'Chưa xếp công ty'}
            </div>
          </div>
        </div>

        <div className="p-5 bg-blue-50/70 rounded-xl border border-blue-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-900">
            <span className="text-xs font-bold uppercase tracking-wider">GV Hướng dẫn Khoa</span>
            <span className="material-symbols-outlined text-blue-800 text-[22px]">school</span>
          </div>
          <div className="mt-3">
            <div className="text-base font-bold text-blue-950 truncate">
              {placement?.giangVienHD || 'Khoa chưa phân công'}
            </div>
            <div className="text-xs text-blue-800 mt-1 font-medium truncate">
              {placement?.chuyenMonGV || '—'}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500 font-medium">Đang tải lịch trình và kết quả...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Card 1: Official Placement Box */}
          {placement && (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[28px]">domain_verification</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Quyết định tiếp nhận chính thức
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 mt-0.5">{placement.tenCongTy}</h2>
                    <p className="text-xs text-slate-500">
                      Vị trí thực tập: <strong className="text-slate-800">{placement.viTriTuyen}</strong> • {placement.thoiGianThucTap}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {PHAN_BO[placement.trangThai] || placement.trangThai}
                  </span>
                  {placement.trangThai === 'ChuaNhanViec' && (
                    <button
                      type="button"
                      onClick={handleXacNhan}
                      disabled={confirming}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      {confirming ? 'Đang xác nhận...' : 'Xác nhận nhận quyết định'}
                    </button>
                  )}
                </div>
              </div>
              {placement.trangThai === 'ChuaNhanViec' && (
                <p className="-mt-2 mb-4 text-xs text-slate-500">
                  Doanh nghiệp đã đồng ý tiếp nhận bạn. Hãy xác nhận để bắt đầu thực tập và nộp báo cáo tiến độ.
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mentor Doanh Nghiệp */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">badge</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Cố vấn doanh nghiệp (Mentor)
                    </span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {placement.mentorDoanhNghiep || '—'}
                    </div>
                    <div className="text-xs text-slate-500">{placement.chucVuMentor || '—'}</div>
                    {placement.danhGiaMentor && (
                      <div className="mt-2 text-xs italic text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60">
                        "{placement.danhGiaMentor}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Giảng Viên Hướng Dẫn */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">school</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Giảng viên hướng dẫn Khoa CNTT
                    </span>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      {placement.giangVienHD || 'Khoa chưa phân công'}
                    </div>
                    <div className="text-xs text-slate-500">
                      Chuyên môn: {placement.chuyenMonGV || '—'}
                    </div>
                    <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/60">
                      Theo dõi tiến độ báo cáo tuần, định hướng đồ án và chấm điểm nghiệm thu cuối kỳ.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Interview Schedules Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Lịch Trình Phỏng Vấn Doanh Nghiệp</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh sách các buổi phỏng vấn tuyển dụng thực tập sinh.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {interviews.length} buổi
              </span>
            </div>

            {interviews.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <span className="material-symbols-outlined text-[48px] text-slate-300">event_busy</span>
                <p className="mt-2 text-sm font-medium">Chưa có lịch phỏng vấn nào được lên lịch.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">Mã PV</th>
                      <th className="px-5 py-3.5">Doanh nghiệp & Vị trí</th>
                      <th className="px-5 py-3.5">Người phỏng vấn</th>
                      <th className="px-5 py-3.5">Thời gian & Hình thức</th>
                      <th className="px-5 py-3.5">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {interviews.map((pv) => {
                      let badge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Chờ kết quả
                        </span>
                      )
                      if (pv.ketQua === 'Dat') {
                        badge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Đạt
                          </span>
                        )
                      } else if (pv.ketQua === 'KhongDat') {
                        badge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Không đạt
                          </span>
                        )
                      }

                      return (
                        <tr key={pv.maPV} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4 font-mono font-bold text-xs text-blue-700">
                            {pv.maPV}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900">{pv.tenCongTy}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{pv.viTriTuyen}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-800">{pv.nguoiPhongVan}</div>
                            <div className="text-xs text-slate-500">{pv.chucVuNguoiPV}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-bold text-slate-800">
                              {new Date(pv.ngayPV).toLocaleDateString('vi-VN')}
                              {coGio(pv.ngayPV) &&
                                ` • ${new Date(pv.ngayPV).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                            </div>
                            <div className="text-xs text-blue-700 font-medium mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                {/trực tuyến|online|meet|zoom/i.test(pv.hinhThuc || '') ? 'videocam' : 'location_on'}
                              </span>
                              {pv.hinhThuc || 'Trực tiếp'}
                            </div>
                          </td>
                          <td className="px-5 py-4">{badge}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
