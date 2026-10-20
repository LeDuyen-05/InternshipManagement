import { useState, useEffect } from 'react'
import { useEnterprise } from '../../components/layout/EnterpriseLayout.jsx'
import doanhNghiepService from '../../services/doanhNghiepService.js'

export default function LichPhongVanDNPage() {
  const { activeCompany } = useEnterprise()
  const [interviews, setInterviews] = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedInterview, setSelectedInterview] = useState(null)
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [chiTieu, setChiTieu] = useState(null)

  // Form tạo lịch mới
  const [formSchedule, setFormSchedule] = useState({
    maSinhVien: '',
    maDaiDien: '',
    hinhThuc: 'Trực tuyến qua Google Meet',
    ngayPV: '',
    gioPV: '09:00',
  })

  // Form cập nhật kết quả
  const [resultChoice, setResultChoice] = useState('Dat')

  const fetchData = async () => {
      if (!activeCompany?.maCongTy) return
      try {
        setLoading(true)
        let [pvRes, uvRes, tqRes] = await Promise.all([
          doanhNghiepService.getPhongVan(activeCompany.maCongTy),
          doanhNghiepService.getUngVien(activeCompany.maCongTy),
          doanhNghiepService.getTongQuan(activeCompany.maCongTy),
        ])
        setInterviews(pvRes || [])
        // Chỉ hồ sơ còn hiệu lực và SV chưa được nơi nào tiếp nhận mới được xếp lịch phỏng vấn
        const eligible = (uvRes || []).filter((c) => c.trangThai !== 'TuChoi' && !c.daDuocTiepNhan)
        setCandidates(eligible)
        setChiTieu(tqRes?.chiTieu || null)
        uvRes = eligible

        if (uvRes?.length > 0 && !formSchedule.maSinhVien) {
          setFormSchedule((prev) => ({
            ...prev,
            maSinhVien: uvRes[0].maSV,
            maDaiDien: activeCompany?.daiDiens?.[0]?.maSo || '',
          }))
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu phỏng vấn:', err)
      } finally {
        setLoading(false)
      }
  }

  useEffect(() => {
    fetchData()
  }, [activeCompany?.maCongTy])

  const handleCreateSchedule = async (e) => {
    e.preventDefault()
    if (!formSchedule.maSinhVien || !formSchedule.maDaiDien) {
      setToast({ type: 'error', message: 'Vui lòng chọn Ứng viên và Người phỏng vấn.' })
      return
    }

    try {
      setSubmitting(true)
      const dateTimeStr = formSchedule.ngayPV
        ? `${formSchedule.ngayPV}T${formSchedule.gioPV || '09:00'}:00`
        : new Date(Date.now() + 2 * 86400000).toISOString()

      const res = await doanhNghiepService.taoLichPhongVan({
        maSinhVien: formSchedule.maSinhVien,
        maDaiDien: formSchedule.maDaiDien,
        hinhThuc: formSchedule.hinhThuc,
        ngayPV: dateTimeStr,
      })

      const sv = candidates.find((c) => c.maSV === formSchedule.maSinhVien)
      const dd = activeCompany?.daiDiens?.find((d) => d.maSo === formSchedule.maDaiDien)

      const newInterview = {
        maPV: res.phongVan?.maPV || 'PV_NEW',
        maSinhVien: formSchedule.maSinhVien,
        hoTenSV: sv?.hoTen || formSchedule.maSinhVien,
        lopSV: sv?.lop || '',
        gpaSV: sv?.gpa != null ? sv.gpa : null,
        maDaiDien: formSchedule.maDaiDien,
        tenNguoiPV: dd?.hoTen || '',
        chucVuNguoiPV: dd?.chucVu || '',
        emailNguoiPV: dd?.email || '',
        hinhThuc: formSchedule.hinhThuc,
        ngayPV: dateTimeStr,
        ketQua: res.phongVan?.ketQua || 'ChuaCoKetQua',
      }

      setInterviews((prev) => [newInterview, ...prev])
      setToast({ type: 'success', message: 'Lên lịch phỏng vấn thành công!' })
      setShowScheduleModal(false)
    } catch (err) {
      console.error('Lỗi tạo lịch phỏng vấn:', err)
      setToast({ type: 'error', message: err.response?.data?.message || 'Không thể tạo lịch phỏng vấn. Vui lòng thử lại.' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const handleUpdateResult = async (e) => {
    e.preventDefault()
    if (!selectedInterview) return

    try {
      setSubmitting(true)
      const res = await doanhNghiepService.capNhatKetQuaPhongVan(selectedInterview.maPV, {
        ketQua: resultChoice,
      })
      setToast({ type: 'success', message: res?.message || 'Đã ghi nhận kết quả phỏng vấn.' })
      setSelectedInterview(null)
      await fetchData()
    } catch (err) {
      console.error('Lỗi cập nhật kết quả PV:', err)
      setToast({ type: 'error', message: err.response?.data?.message || 'Lỗi cập nhật kết quả. Vui lòng thử lại.' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  const stats = {
    total: interviews.length,
    dat: interviews.filter((i) => i.ketQua === 'Dat').length,
    dangXuLy: interviews.filter((i) => i.ketQua === 'ChuaCoKetQua' || !i.ketQua).length,
    khongDat: interviews.filter((i) => i.ketQua === 'KhongDat').length,
  }

  const daDongTuyen = chiTieu?.daDuChiTieu

  return (
    <div className="space-y-6">
      {chiTieu && (
        <div className={`p-4 rounded-xl text-xs font-semibold border flex items-center gap-2 ${daDongTuyen ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>
          <span className="material-symbols-outlined text-[18px]">{daDongTuyen ? 'lock' : 'groups'}</span>
          {daDongTuyen
            ? `Đã đủ chỉ tiêu tiếp nhận (${chiTieu.daTiepNhan}/${chiTieu.soLuongNhan}) — đợt tuyển đã tự động đóng, không thể xếp thêm lịch phỏng vấn.`
            : `Chỉ tiêu tiếp nhận ${chiTieu.tenDot || ''}: đã nhận ${chiTieu.daTiepNhan}/${chiTieu.soLuongNhan}, còn ${chiTieu.conLai} chỗ.`}
        </div>
      )}
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Lịch Phỏng Vấn Tuyển Dụng</h1>
          <p className="text-xs text-slate-500 mt-1">
            Điều phối các buổi phỏng vấn đánh giá năng lực ứng viên và gửi thông báo tiếp nhận thực tập
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowScheduleModal(true)}
          disabled={daDongTuyen}
          title={daDongTuyen ? 'Đã đủ chỉ tiêu – đợt tuyển đã đóng' : undefined}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          <span>Lên lịch phỏng vấn mới</span>
        </button>
      </div>

      {/* 4 Bento Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng buổi phỏng vấn</div>
          <div className="text-2xl font-black text-slate-900 mt-2">{stats.total} <span className="text-xs font-normal text-slate-500">lịch hẹn</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Đợt HK2 (2026 - 2027)</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đã trúng tuyển (Đạt)</div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{stats.dat} <span className="text-xs font-normal text-slate-500">ứng viên</span></div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Xác nhận tiếp nhận vào công ty</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Đang chờ xử lý / Sắp tới</div>
          <div className="text-2xl font-black text-amber-600 mt-2">{stats.dangXuLy} <span className="text-xs font-normal text-slate-500">lịch hẹn</span></div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Chưa cập nhật kết quả</div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Không đạt</div>
          <div className="text-2xl font-black text-rose-600 mt-2">{stats.khongDat} <span className="text-xs font-normal text-slate-500">ứng viên</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Chưa đáp ứng tiêu chí</div>
        </div>
      </div>

      {/* Interview Schedule Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Danh sách lịch phỏng vấn tuyển dụng
          </h2>
          <span className="text-xs text-slate-500">Hiển thị {interviews.length} buổi phỏng vấn</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Ứng viên</th>
                <th className="py-3.5 px-3">Người phỏng vấn</th>
                <th className="py-3.5 px-3">Thời gian phỏng vấn</th>
                <th className="py-3.5 px-3">Hình thức</th>
                <th className="py-3.5 px-3">Kết quả</th>
                <th className="py-3.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interviews.length > 0 ? (
                interviews.map((item) => (
                  <tr key={item.maPV} className="hover:bg-indigo-50/30 transition-colors">
                    {/* Candidate */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                          {item.hoTenSV?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{item.hoTenSV}</div>
                          <div className="text-[11px] text-slate-400">
                            MSSV: {item.maSinhVien} • Lớp: {item.lopSV || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Interviewer */}
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-800 text-xs">{item.tenNguoiPV || '—'}</div>
                      <div className="text-[11px] text-slate-500">{item.chucVuNguoiPV || '—'}</div>
                    </td>

                    {/* Date Time */}
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-800 text-xs">
                        {item.ngayPV ? new Date(item.ngayPV).toLocaleDateString('vi-VN') : 'Chưa định ngày'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.ngayPV ? new Date(item.ngayPV).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </div>
                    </td>

                    {/* Mode */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-100">
                        <span className="material-symbols-outlined text-[14px]">
                          {item.hinhThuc?.includes('tuyến') ? 'videocam' : 'location_on'}
                        </span>
                        <span>{item.hinhThuc || 'Trực tuyến Meet'}</span>
                      </span>
                    </td>

                    {/* Result */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        item.ketQua === 'Dat'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.ketQua === 'KhongDat'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.ketQua === 'Dat' ? 'bg-emerald-500' : item.ketQua === 'KhongDat' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}></span>
                        {item.ketQua === 'Dat'
                          ? 'Đạt (Trúng tuyển)'
                          : item.ketQua === 'KhongDat'
                          ? 'Không đạt'
                          : 'Đang xử lý'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInterview(item)
                          setResultChoice(item.ketQua === 'Dat' || item.ketQua === 'KhongDat' ? item.ketQua : 'Dat')
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                      >
                        Ghi kết quả
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-xs text-slate-400">
                    Chưa có buổi phỏng vấn nào được thiết lập.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Lên lịch phỏng vấn mới */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Lên Lịch Phỏng Vấn Ứng Viên Mới</h3>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn Ứng viên *</label>
                <select
                  required
                  value={formSchedule.maSinhVien}
                  onChange={(e) => setFormSchedule({ ...formSchedule, maSinhVien: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="">-- Chọn sinh viên --</option>
                  {candidates.map((c) => (
                    <option key={c.maSV} value={c.maSV}>
                      {c.hoTen} ({c.maSV}) - GPA {c.gpa != null ? c.gpa : '—'} - Ưu tiên {c.thuTuUuTien}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Người đại diện phỏng vấn *</label>
                <select
                  required
                  value={formSchedule.maDaiDien}
                  onChange={(e) => setFormSchedule({ ...formSchedule, maDaiDien: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="">-- Chọn người phỏng vấn --</option>
                  {activeCompany?.daiDiens?.map((d) => (
                    <option key={d.maSo} value={d.maSo}>
                      {d.hoTen} - {d.chucVu} ({d.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày phỏng vấn *</label>
                  <input
                    type="date"
                    required
                    value={formSchedule.ngayPV}
                    onChange={(e) => setFormSchedule({ ...formSchedule, ngayPV: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giờ phỏng vấn</label>
                  <input
                    type="time"
                    value={formSchedule.gioPV}
                    onChange={(e) => setFormSchedule({ ...formSchedule, gioPV: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hình thức phỏng vấn</label>
                <select
                  value={formSchedule.hinhThuc}
                  onChange={(e) => setFormSchedule({ ...formSchedule, hinhThuc: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="Trực tuyến qua Google Meet">Trực tuyến qua Google Meet</option>
                  <option value="Trực tiếp tại văn phòng công ty">Trực tiếp tại văn phòng công ty</option>
                  <option value="Trực tuyến qua Zoom">Trực tuyến qua Zoom</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold transition-all flex items-center gap-1.5"
                >
                  {submitting ? 'Đang tạo...' : 'Lên lịch hẹn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cập nhật kết quả phỏng vấn */}
      {selectedInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Ghi Nhận Kết Quả Phỏng Vấn</h3>
              <button
                type="button"
                onClick={() => setSelectedInterview(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateResult} className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="font-bold text-slate-800 text-xs">{selectedInterview.hoTenSV}</div>
                <div className="text-slate-500">MSSV: {selectedInterview.maSinhVien} • Lớp: {selectedInterview.lopSV || '—'}</div>
                <div className="text-slate-500">Người PV: {selectedInterview.tenNguoiPV || '—'} {selectedInterview.chucVuNguoiPV ? `(${selectedInterview.chucVuNguoiPV})` : ''}</div>
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">Đánh giá kết quả tuyển dụng *</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 cursor-pointer">
                    <input
                      type="radio"
                      name="result"
                      value="Dat"
                      checked={resultChoice === 'Dat'}
                      onChange={() => setResultChoice('Dat')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="font-bold text-emerald-950">ĐẠT — Trúng tuyển & Tiếp nhận thực tập</div>
                      <div className="text-[11px] text-emerald-700">Tự động kích hoạt phân bổ thực tập chính thức tại doanh nghiệp</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50/50 cursor-pointer">
                    <input
                      type="radio"
                      name="result"
                      value="KhongDat"
                      checked={resultChoice === 'KhongDat'}
                      onChange={() => setResultChoice('KhongDat')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-bold text-rose-950">KHÔNG ĐẠT — Từ chối tiếp nhận</div>
                      <div className="text-[11px] text-rose-700">Ứng viên chưa đáp ứng yêu cầu kỹ năng trong buổi phỏng vấn</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedInterview(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold transition-all flex items-center gap-1.5"
                >
                  {submitting ? 'Đang lưu...' : 'Xác nhận kết quả'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
