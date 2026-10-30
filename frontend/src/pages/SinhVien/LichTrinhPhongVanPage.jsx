import { usePagination } from '../../hooks/usePagination'
import DocumentAttachments from '../../components/common/DocumentAttachments'
import Pagination from '../../components/common/Pagination'
import { useState, useEffect, useCallback, useRef } from 'react'
import { phongVanService } from '../../services/phongVanService'
import { useIdentity } from '../../hooks/useIdentity'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import NoLinkedAccount from '../../components/common/NoLinkedAccount'
import { PHAN_BO } from '../../utils/trangThai'

import { formatInterviewDate, formatInterviewTime } from '../../utils/interviewTime'
import { confirmationExpired } from '../../utils/confirmationDeadline'

export default function LichTrinhPhongVanPage() {
  const { maSV: currentMaSV } = useIdentity()
  const { selectedDot, roundLock } = useDotThucTap()

  const [interviews, setInterviews] = useState([])
  const [legacyCount, setLegacyCount] = useState(0)
  const pagination = usePagination(interviews, JSON.stringify([currentMaSV, selectedDot?.maDot]))
  const [placement, setPlacement] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [message, setMessage] = useState(null)
  const requestVersion = useRef(0)
  const maDot = selectedDot?.maDot
  const contextKey = `${currentMaSV}|${maDot}`
  const currentContext = useRef(contextKey)
  currentContext.current = contextKey
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  const confirmationBlocked = confirmationExpired(placement, now)

  const fetchData = useCallback(async () => {
    const version = ++requestVersion.current
    if (!currentMaSV) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [pvData, pbData] = await Promise.all([
        phongVanService.getLichPhongVan(currentMaSV),
        phongVanService.getPhanBoThucTap(currentMaSV, maDot),
      ])
      if (version !== requestVersion.current || currentContext.current !== contextKey) return
      setLegacyCount((pvData || []).filter(p => !p.maDot).length)
      setInterviews((pvData || []).filter(p => !maDot || p.maDot === maDot))
      setPlacement(pbData || null)
    } catch (err) {
      if (version === requestVersion.current && currentContext.current === contextKey) setMessage({ type: 'error', text: err.response?.data?.message || 'Không tải được thông tin tiếp nhận.' })
    } finally {
      if (version === requestVersion.current && currentContext.current === contextKey) setLoading(false)
    }
  }, [currentMaSV, maDot, contextKey])

  useEffect(() => {
    setPlacement(null); setMessage(null); setConfirming(false)
    fetchData()
    const version = requestVersion
    return () => { version.current++ }
  }, [fetchData])

  const handleXacNhan = async () => {
    if (!placement?.maPhanBo) return
    if (confirming || roundLock.structureBlocked || confirmationExpired(placement) || placement.trangThai !== 'ChuaNhanViec') return
    if (!window.confirm(`Xác nhận nhận việc tại "${placement.tenCongTy}"?`)) return
    const version = requestVersion.current
    try {
      setConfirming(true)
      const res = await phongVanService.xacNhanTiepNhan(placement.maPhanBo)
      if (version !== requestVersion.current || currentContext.current !== contextKey) return
      setPlacement(res.data || placement)
      setMessage({ type: 'success', text: res.data?.trangThai === 'ChoKhoaDuyet' ? 'Đã xác nhận nhận việc. Hồ sơ đang chờ Khoa chốt phân bổ.' : res.message || 'Đã xác nhận nhận việc.' })
    } catch (err) {
      if (version === requestVersion.current && currentContext.current === contextKey) setMessage({ type: 'error', text: err.response?.data?.message || 'Không thể xác nhận. Vui lòng thử lại.' })
    } finally {
      if (version === requestVersion.current && currentContext.current === contextKey) setConfirming(false)
    }
  }

  if (!currentMaSV) {
    return <NoLinkedAccount type="sinh viên" />
  }

  return (
    <div className="flex flex-col gap-6">
      {legacyCount > 0 && <p className="alert">Có {legacyCount} lịch cũ chưa xác định đợt. Liên hệ Khoa đối chiếu; chưa tính các lịch này vào đợt đang chọn.</p>}
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
            Theo dõi phỏng vấn, xác nhận nhận việc và kết quả Khoa chốt phân bổ theo đợt thực tập.
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
              {interviews.filter((p) => !p.daThayThe && p.ketQua === 'Dat').length}
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
          {/* Hồ sơ tiếp nhận có thể đang chờ SV hoặc Khoa xác nhận. */}
          {placement && (
            <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[28px]">domain_verification</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {placement.daDuocKhoaDuyet ? 'Nơi thực tập đã được công nhận' : 'Hồ sơ tiếp nhận — đăng ký trên hệ thống'}
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
                      disabled={confirming || roundLock.structureBlocked || confirmationBlocked}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      {confirming ? 'Đang xác nhận...' : 'Xác nhận nhận việc'}
                    </button>
                  )}
                </div>
              </div>
              {placement.maPhanBo && <div className="space-y-2 mb-4">
                <DocumentAttachments key={`evidence|${placement.maPhanBo}`} kind="PlacementEvidence" resourceId={placement.maPhanBo} title="Giấy tờ bố trí / hủy / đổi nơi" readOnly defer />
                <DocumentAttachments key={`form|${placement.maPhanBo}`} kind="EnterpriseForm" resourceId={placement.maPhanBo} title="Phiếu đánh giá DN có chữ ký" readOnly defer />
              </div>}
              {placement.trangThai === 'ChuaNhanViec' && (
                <p className="-mt-2 mb-4 text-xs text-slate-500">
                  {placement.daDuocKhoaDuyet ? 'Nơi thực tập đã được công nhận. Xác nhận nhận việc để bắt đầu thực tập.' : 'Doanh nghiệp đã đồng ý tiếp nhận. Hãy xác nhận nhận việc để gửi Khoa chốt phân bổ.'}
                </p>
              )}
              {placement.trangThai === 'ChuaNhanViec' && !placement.daDuocKhoaDuyet && <p role="status" className="mb-4 text-sm text-amber-700">{placement.hanXacNhanSV ? `Hạn xác nhận: ${new Date(placement.hanXacNhanSV).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (giờ Việt Nam).` : 'Khoa chưa cấu hình hạn xác nhận.'} {confirmationBlocked && 'Đã quá hạn. Liên hệ Khoa rà soát; hồ sơ vẫn giữ chỗ, chưa bị hủy.'}</p>}
              {placement.trangThai === 'ChoKhoaDuyet' && <p className="mb-4 text-sm text-amber-700">Bạn đã xác nhận nhận việc. Chờ Khoa chốt phân bổ trước khi được phân công GVHD và nộp tiến độ.</p>}

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
                    {pagination.items.map((pv) => {
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
                      } else if (pv.ketQua === 'Vang') {
                        badge = <span className="text-amber-800">Vắng/bỏ phỏng vấn</span>
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
                            {pv.maPV}{pv.daThayThe && <p>Buổi cũ đã được thay thế</p>}{pv.maPVTruoc && <p>Thay thế: {pv.maPVTruoc}</p>}<p>{pv.maDot || 'Chưa xác định đợt'}</p>
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
                              {formatInterviewDate(pv.ngayPV)} • {formatInterviewTime(pv.ngayPV)} (UTC+7)
                            </div>
                            <div className="text-xs text-blue-700 font-medium mt-0.5 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                {/trực tuyến|online|meet|zoom/i.test(pv.hinhThuc || '') ? 'videocam' : 'location_on'}
                              </span>
                              {pv.hinhThuc || 'Trực tiếp'}
                            </div>
                          </td>
                          <td className="px-5 py-4">{badge}{pv.lyDoKetQua && <p>{pv.lyDoKetQua}</p>}{pv.nguonKetQua && <p>Nguồn: {pv.nguonKetQua}</p>}{pv.lichSu?.length > 0 && <details><summary>Lịch sử ghi nhận/điều chỉnh</summary>{pv.lichSu.map((n, i) => <p key={i}>{formatInterviewDate(n.thoiDiem)} {formatInterviewTime(n.thoiDiem)} · {n.loai === 'XepLai' ? 'Xếp buổi thay thế' : n.loai === 'SuaKetQua' ? 'Sửa kết quả' : 'Ghi kết quả'}: {n.ketQuaCu || 'Chưa có'} → {n.ketQuaMoi} · {n.lyDo}</p>)}</details>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <Pagination pagination={pagination} label="lịch phỏng vấn của sinh viên"/>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
