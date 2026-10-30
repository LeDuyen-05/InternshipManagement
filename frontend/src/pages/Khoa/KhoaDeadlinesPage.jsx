import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import GradingDeadlineSettings from '../../components/common/GradingDeadlineSettings'
import ReportReopeningSettings from '../../components/common/ReportReopeningSettings'

const formatDateVN = (val) => {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val).slice(0, 10)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export default function KhoaDeadlinesPage() {
  const [rounds, setRounds] = useState([])
  const [round, setRound] = useState('')
  const [deadlines, setDeadlines] = useState([])
  const [dates, setDates] = useState({})
  const [reasons, setReasons] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState('')
  const [activeTab, setActiveTab] = useState('moc-dinh-ky') // 'moc-dinh-ky' | 'mo-bo-sung' | 'han-cham-clo'

  // Form tạo mốc báo cáo
  const [createRound, setCreateRound] = useState('')
  const [soTuan, setSoTuan] = useState(12)
  const [ngayBatDau, setNgayBatDau] = useState('')
  const [generating, setGenerating] = useState(false)
  const pagination = usePagination(deadlines, round)

  const handleSelectCreateRound = (selectedId) => {
    setCreateRound(selectedId)
    const target = rounds.find((r) => r.maSo === selectedId)
    if (target?.thoiGianBD) {
      setNgayBatDau(target.thoiGianBD.slice(0, 10))
    }
  }

  const load = async () => {
    try {
      const result = await apiClient.get('/khoa/han-bao-cao', {
        params: round ? { maDot: round } : {},
      })
      setDeadlines(result.data)
      setError('')
    } catch (e) {
      setError(e.response?.data?.message || 'Không tải được lịch hạn báo cáo.')
    }
  }

  useEffect(() => {
    load()
  }, [round])

  useEffect(() => {
    apiClient
      .get('/khoa/dot-thuc-tap')
      .then((r) => {
        const list = r.data || []
        setRounds(list)
        if (list.length > 0 && !createRound) {
          const active =
            list.find((x) => x.trangThai === 'DangDienRa') || list[0]
          setCreateRound(active.maSo)
          if (active.thoiGianBD) {
            setNgayBatDau(active.thoiGianBD.slice(0, 10))
          }
        }
      })
      .catch(() => {})
  }, [])

  const save = async (item) => {
    const key = `${item.maDot}|${item.mocThoiGian}`
    const next = dates[key] || item.mocThoiGian.slice(0, 10)
    if (next === item.mocThoiGian.slice(0, 10)) return
    if (!reasons[key]?.trim()) {
      setError('Nhập lý do thay đổi hạn báo cáo.')
      return
    }
    setSaving(item.mocThoiGian)
    try {
      await apiClient.put(
        `/khoa/han-bao-cao/${encodeURIComponent(item.maDot)}`,
        {
          hanCu: item.mocThoiGian,
          hanMoi: next,
          lyDo: reasons[key],
        }
      )
      setSuccess('Đã cập nhật hạn báo cáo thành công.')
      setTimeout(() => setSuccess(''), 4000)
      await load()
    } catch (e) {
      setError(e.response?.data?.message || 'Không cập nhật được hạn báo cáo.')
    } finally {
      setSaving('')
    }
  }

  const handleGenerateSlots = async (e) => {
    e.preventDefault()
    if (!createRound) {
      setError('Vui lòng chọn đợt thực tập.')
      return
    }
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      const res = await apiClient.post('/khoa/bao-cao/tao-moc', {
        maDot: createRound,
        soTuan: Number(soTuan) || 12,
        ngayBatDau: ngayBatDau ? new Date(ngayBatDau).toISOString() : null,
      })
      setSuccess(
        res.data?.message ||
          `Đã tạo ${res.data?.createdCount ?? 0} mốc báo cáo tiến độ.`
      )
      setTimeout(() => setSuccess(''), 5000)
      await load()
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Không thể tạo mốc báo cáo.'
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Bento Top Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="material-symbols-outlined text-[13px]">schedule</span>
              GIÁO VỤ KHOA
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Hạn nộp báo cáo & Tiến độ thực tập
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Quản lý lịch nộp báo cáo tuần theo đợt, mở nộp bổ sung cho sinh viên và điều chỉnh hạn chấm điểm CLO.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={load}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-slate-500">refresh</span>
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Thông báo lỗi & thành công */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5 shadow-xs text-xs font-medium"
          >
            <span className="material-symbols-outlined text-rose-600 text-xl shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
            <span>{success}</span>
          </div>
        )}

        {/* Thanh chuyển đổi 3 Tab Nghiệp vụ */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl w-fit overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('moc-dinh-ky')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'moc-dinh-ky'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">calendar_month</span>
            <span>1. Mốc báo cáo định kỳ theo đợt</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mo-bo-sung')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mo-bo-sung'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">lock_open</span>
            <span>2. Mở nộp bổ sung cho sinh viên</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('han-cham-clo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'han-cham-clo'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">timer</span>
            <span>3. Thời hạn chấm điểm CLO (GV & DN)</span>
          </button>
        </div>

        {/* TAB 1: Mốc báo cáo định kỳ */}
        {activeTab === 'moc-dinh-ky' && (
          <div className="space-y-6">
            {/* Form tạo mốc báo cáo tự động */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-lg">add_alarm</span>
                  Tạo mốc báo cáo định kỳ cho đợt
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Khởi tạo hàng loạt các mốc báo cáo tuần cho toàn bộ sinh viên có phân bổ hoặc đăng ký đã duyệt trong đợt.
                </p>
              </div>

              <form onSubmit={handleGenerateSlots} className="flex flex-wrap items-end gap-3.5">
                <div className="min-w-[240px] flex-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đợt thực tập <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createRound}
                    onChange={(e) => handleSelectCreateRound(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-slate-50 focus:bg-white"
                    required
                  >
                    {rounds.map((r) => (
                      <option key={r.maSo} value={r.maSo}>
                        {r.tenDot} ({r.namHoc})
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const activeRoundInfo = rounds.find((r) => r.maSo === createRound)
                    return activeRoundInfo ? (
                      <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-indigo-500">date_range</span>
                        <span>
                          Khung đợt: <strong>{formatDateVN(activeRoundInfo.thoiGianBD)}</strong> — <strong>{formatDateVN(activeRoundInfo.thoiGianKT)}</strong>
                        </span>
                      </p>
                    ) : null
                  })()}
                </div>

                <div className="w-40">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số tuần báo cáo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={soTuan}
                    onChange={(e) => setSoTuan(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-slate-50 focus:bg-white"
                    required
                  />
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Chuẩn đợt: 12 tuần</p>
                </div>

                <div className="w-52">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày bắt đầu tính tuần <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={ngayBatDau}
                    onChange={(e) => setNgayBatDau(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-semibold text-slate-900 bg-slate-50 focus:bg-white"
                    required
                  />
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    {ngayBatDau ? `Bắt đầu: ${formatDateVN(ngayBatDau)}` : 'Chưa chọn'}
                    {ngayBatDau && Number(soTuan) > 0 && (() => {
                      const d = new Date(ngayBatDau)
                      d.setDate(d.getDate() + Number(soTuan) * 7)
                      return ` → Kết thúc: ${formatDateVN(d.toISOString())}`
                    })()}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={generating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Đang tạo…</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">playlist_add</span>
                      <span>Tạo mốc báo cáo</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bảng danh sách mốc nộp báo cáo */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600">event_note</span>
                  <h3 className="text-sm font-bold text-slate-800">Danh sách mốc nộp báo cáo tiến độ</h3>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <span>Lọc đợt:</span>
                    <select
                      value={round}
                      onChange={(e) => setRound(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-semibold"
                    >
                      <option value="">Tất cả đợt</option>
                      {rounds.map((r) => (
                        <option key={r.maSo} value={r.maSo}>
                          {r.tenDot} · {r.namHoc}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/70">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="p-3">Đợt thực tập</th>
                      <th className="p-3">Hạn nộp mốc</th>
                      <th className="p-3 text-center">Tổng báo cáo</th>
                      <th className="p-3 text-center">Đã nộp</th>
                      <th className="p-3 text-center">Đã duyệt</th>
                      <th className="p-3 text-center">Quá hạn</th>
                      <th className="p-3 text-center">Nộp sau hạn</th>
                      <th className="p-3 min-w-[280px]">Điều chỉnh hạn mốc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagination.items.map((x) => (
                      <tr key={`${x.maDot}-${x.mocThoiGian}`} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-800">
                          {rounds.find((r) => r.maSo === x.maDot)?.tenDot || x.maDot}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {formatDateVN(x.mocThoiGian)}
                        </td>
                        <td className="p-3 text-center font-bold font-mono text-slate-700">
                          {x.reportCount}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 font-mono">
                            {x.submitted}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 font-mono">
                            {x.approved}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${x.overdue > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-500'}`}>
                            {x.overdue}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold font-mono ${x.late > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500'}`}>
                            {x.late ?? 0}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col sm:flex-row items-center gap-1.5">
                            <input
                              type="date"
                              value={
                                dates[`${x.maDot}|${x.mocThoiGian}`] ??
                                String(x.mocThoiGian).slice(0, 10)
                              }
                              onChange={(e) =>
                                setDates({
                                  ...dates,
                                  [`${x.maDot}|${x.mocThoiGian}`]: e.target.value,
                                })
                              }
                              className="px-2 py-1 text-xs rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
                            />
                            <input
                              aria-label="Lý do đổi hạn báo cáo"
                              maxLength={1000}
                              placeholder="Lý do đổi hạn..."
                              value={reasons[`${x.maDot}|${x.mocThoiGian}`] || ''}
                              onChange={(e) =>
                                setReasons({
                                  ...reasons,
                                  [`${x.maDot}|${x.mocThoiGian}`]: e.target.value,
                                })
                              }
                              className="px-2 py-1 text-xs rounded-lg border border-slate-300 text-slate-800 bg-white flex-1 min-w-[110px]"
                            />
                            <button
                              type="button"
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                              disabled={saving === x.mocThoiGian}
                              onClick={() => save(x)}
                            >
                              {saving === x.mocThoiGian ? 'Đang lưu…' : 'Cập nhật'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!deadlines.length && (
                      <tr>
                        <td colSpan="8" className="p-6 text-center text-slate-500 italic">
                          Chưa có mốc báo cáo để quản lý. Khoa có thể dùng form bên trên để tạo mốc tuần cho đợt.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination pagination={pagination} label="hạn nộp báo cáo" />
            </div>
          </div>
        )}

        {/* TAB 2: Mở nộp bổ sung cho sinh viên */}
        {activeTab === 'mo-bo-sung' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-800 flex items-start gap-2.5 leading-relaxed">
              <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">info</span>
              <div>
                <strong>Quy định nộp bổ sung:</strong> Hạn báo cáo tính hết ngày Việt Nam. Quá hạn hệ thống sẽ tự động khóa nộp; sinh viên phải lên Khoa trình bày lý do, được cán bộ Khoa chấp thuận mới mở hạn bổ sung cho đúng SV/mốc đó. Hết hạn bổ sung hệ thống tự khóa lại.
              </div>
            </div>

            <ReportReopeningSettings rounds={rounds} />
          </div>
        )}

        {/* TAB 3: Thời hạn chấm điểm CLO (GV & DN) */}
        {activeTab === 'han-cham-clo' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-800 flex items-start gap-2.5 leading-relaxed">
              <span className="material-symbols-outlined text-indigo-600 text-lg shrink-0 mt-0.5">verified</span>
              <div>
                <strong>Quy định chấm điểm CLO:</strong> Doanh nghiệp mở chấm lúc 00:00 ngày kế tiếp ngày kết thúc thực tập. Giảng viên hướng dẫn có cửa sổ chấm điểm riêng, được kéo dài sau khi kết thúc đợt. Hết hạn chấm phải được Khoa gia hạn và ghi rõ lý do.
              </div>
            </div>

            <GradingDeadlineSettings rounds={rounds} />
          </div>
        )}
      </div>
    </Layout>
  )
}
