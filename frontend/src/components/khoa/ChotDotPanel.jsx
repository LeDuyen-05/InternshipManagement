import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import Pagination from '../common/Pagination'
import { usePagination } from '../../hooks/usePagination'
import { announceRoundLockChange } from '../../hooks/useRoundLock'

const roundStatusLabels = {
  ChuaChot: 'Chưa chốt sổ',
  DaChot: 'Đã chốt & Khóa sổ',
  MoLai: 'Đang mở lại điều chỉnh',
  ChoChotLai: 'Hết hạn mở, chờ chốt lại',
}

const roundStatusColors = {
  ChuaChot: 'bg-amber-50 text-amber-800 border-amber-200',
  DaChot: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  MoLai: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  ChoChotLai: 'bg-rose-50 text-rose-800 border-rose-200',
}

export default function ChotDotPanel({ maDot, onChanged, onViewScoreDetail }) {
  const current = useRef(maDot)
  current.current = maDot

  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [busy, setBusy] = useState(false)

  // Form states
  const [student, setStudent] = useState('')
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState('')
  const [verified, setVerified] = useState(false)
  const [until, setUntil] = useState('')

  // Bộ lọc & Tìm kiếm (Quy mô hàng trăm nghìn sinh viên)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL') // 'ALL' | 'BLOCKED' | 'ELIGIBLE' | 'NON_COMPLETE'

  const nonCompleteFormRef = useRef(null)

  const load = useCallback(async () => {
    if (!maDot) return
    try {
      setErrorMsg('')
      const [preview, log] = await Promise.all([
        apiClient.get(`/khoa/chot-dot/${encodeURIComponent(maDot)}`),
        apiClient.get(`/khoa/chot-dot/${encodeURIComponent(maDot)}/lich-su`),
      ])
      if (current.current !== maDot) return
      setData(preview.data)
      setHistory(log.data || [])
    } catch (e) {
      if (current.current === maDot) {
        setErrorMsg(e.response?.data?.message || 'Không tải được dữ liệu rà soát chốt đợt.')
      }
    }
  }, [maDot])

  useEffect(() => {
    setData(null)
    setHistory([])
    setMessage('')
    setErrorMsg('')
    setStudent('')
    setReason('')
    setEvidence('')
    setVerified(false)
    setUntil('')
    setSearchQuery('')
    setFilterStatus('ALL')
    load()
  }, [load])

  // Tính toán KPI số liệu
  const totalStudents = data?.sinhViens?.length || 0
  const blockedStudents = useMemo(() => {
    return (data?.sinhViens || []).filter((x) => x.loi && x.loi.length > 0)
  }, [data?.sinhViens])

  const blockedCount = blockedStudents.length
  const pendingAppStudents = useMemo(() => {
    return (data?.sinhViens || []).filter((s) => s.loi?.some((e) => e.includes('chờ xử lý')))
  }, [data?.sinhViens])

  const missingGradeStudents = useMemo(() => {
    return (data?.sinhViens || []).filter(
      (s) => (s.thieuDN || s.thieuGV || (!s.duDiem && !s.khongHoanTat)) && !s.loi?.some((e) => e.includes('chờ xử lý'))
    )
  }, [data?.sinhViens])

  const nonCompleteCount = useMemo(() => {
    return (data?.sinhViens || []).filter((x) => x.khongHoanTat).length
  }, [data?.sinhViens])

  const eligibleCount = totalStudents - blockedCount

  // Lọc dữ liệu sinh viên theo ô tìm kiếm và tab trạng thái
  const filteredStudents = useMemo(() => {
    if (!data?.sinhViens) return []
    return data.sinhViens.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          s.maSV.toLowerCase().includes(q) ||
          s.hoTen.toLowerCase().includes(q) ||
          (s.lop && s.lop.toLowerCase().includes(q))
        if (!match) return false
      }

      if (filterStatus === 'BLOCKED') {
        return s.loi && s.loi.length > 0
      }
      if (filterStatus === 'ELIGIBLE') {
        return (!s.loi || s.loi.length === 0) && !s.khongHoanTat
      }
      if (filterStatus === 'NON_COMPLETE') {
        return s.khongHoanTat
      }
      return true
    })
  }, [data?.sinhViens, searchQuery, filterStatus])

  const pages = usePagination(filteredStudents, `${maDot}-${filterStatus}-${searchQuery}`)
  const logPages = usePagination(history, `${maDot}-chot-log`)

  async function act(action, body) {
    const round = maDot
    if (busy || !data || data.maDot !== round) return
    setBusy(true)
    setMessage('')
    setErrorMsg('')
    try {
      const url = `/khoa/chot-dot/${encodeURIComponent(round)}/${action}`
      const response = action.startsWith('sinh-vien/')
        ? await apiClient.put(url, body)
        : await apiClient.post(url, body)

      announceRoundLockChange()
      if (current.current !== round) return
      setMessage(response.data.message || 'Thực hiện thao tác thành công.')
      setReason('')
      setEvidence('')
      setVerified(false)
      await load()
      onChanged?.()
    } catch (e) {
      if (current.current === round) {
        setErrorMsg(e.response?.data?.message || 'Không thể thực hiện thao tác.')
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  async function download(item) {
    try {
      const response = await apiClient.get(
        `/khoa/chot-dot/${encodeURIComponent(maDot)}/lich-su/${item.maNhatKy}`,
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `lich-su-${maDot}-${item.phienBan}-${item.loai}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setErrorMsg('Không tải được bản lưu trữ lịch sử.')
    }
  }

  const row = data?.sinhViens.find((x) => x.maSV === student)
  const locked = !data || data.khoa.trangThai === 'DaChot' || data.khoa.trangThai === 'ChoChotLai'

  const handlePickNonComplete = (svMa) => {
    setStudent(svMa)
    setVerified(false)
    setEvidence('')
    if (nonCompleteFormRef.current) {
      nonCompleteFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Bento Top Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="material-symbols-outlined text-[13px]">gavel</span>
              HỌC VỤ & CHỐT ĐỢT
            </span>
            {data && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${
                  roundStatusColors[data.khoa.trangThai] || 'bg-slate-100 text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">
                  {locked ? 'lock' : 'lock_open'}
                </span>
                {roundStatusLabels[data.khoa.trangThai] || data.khoa.trangThai} — Phiên bản {data.khoa.phienBan}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight m-0">
            Rà soát, chốt điểm và khóa đợt thực tập
          </h2>
          <p className="text-xs text-slate-500 font-medium m-0">
            {data
              ? `Đợt: ${data.tenDot} (${data.maDot}). Đánh giá điều kiện hoàn tất của sinh viên và quyết định khóa sổ học vụ.`
              : 'Đang tải dữ liệu rà soát chốt đợt...'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base text-slate-500">refresh</span>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo tin nhắn phản hồi */}
      {message && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-xs"
        >
          <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
          <span>{message}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 shadow-xs"
        >
          <span className="material-symbols-outlined text-rose-600 text-base">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {data && (
        <>
          {/* 2. Khối 4 Thẻ KPI Tổng quan (Thiết kế cho quy mô hàng trăm nghìn sinh viên) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tổng sinh viên trong đợt
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{totalStudents}</span>
                <span className="text-xs text-slate-500 font-semibold">sinh viên</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Danh sách chính thức của đợt</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Đủ điều kiện chốt sổ
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">{eligibleCount}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  {totalStudents > 0 ? Math.round((eligibleCount / totalStudents) * 100) : 0}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Đủ điểm DN, GV & rubric CLO</p>
            </div>

            <div
              className={`rounded-2xl border p-4 shadow-xs transition-colors ${
                blockedCount > 0
                  ? 'bg-rose-50/60 border-rose-200'
                  : 'bg-white border-slate-200/80'
              }`}
            >
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Vấn đề còn chặn (Cần xử lý)
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-black ${
                    blockedCount > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {blockedCount}
                </span>
                <span className="text-xs text-slate-500 font-semibold">trường hợp</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {blockedCount > 0 ? 'Chặn chốt đợt — Cần giải quyết' : 'Không có vấn đề cản trở'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Xác nhận không hoàn tất
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-700">{nonCompleteCount}</span>
                <span className="text-xs text-slate-500 font-semibold">sinh viên</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Bỏ/dừng có xác minh của Khoa</p>
            </div>
          </div>

          {/* 3. Thanh Chỉ dẫn Quy trình Học vụ 3 Bước */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-white to-slate-50 border border-indigo-100/90 rounded-2xl p-4 sm:p-5 shadow-xs">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-indigo-600 text-sm">route</span>
              Chỉ dẫn quy trình rà soát và chốt sổ học vụ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-slate-800 block mb-0.5">Rà soát vấn đề còn chặn</strong>
                  <p className="text-slate-500 text-[11px] leading-relaxed m-0">
                    Bấm vào bộ lọc <span className="font-bold text-rose-600">"Cần xử lý"</span> bên dưới để xem các sinh viên chưa đủ điều kiện.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-slate-800 block mb-0.5">Xử lý hồ sơ & điểm số</strong>
                  <p className="text-slate-500 text-[11px] leading-relaxed m-0">
                    Giải quyết hồ sơ chờ duyệt, đôn đốc chấm điểm CLO hoặc xác nhận SV dừng thực tập (không tự cho điểm 0).
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-indigo-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-slate-800 block mb-0.5">Chốt điểm & Khóa đợt</strong>
                  <p className="text-slate-500 text-[11px] leading-relaxed m-0">
                    Khi số vấn đề chặn về 0, nhập số quyết định/căn cứ và bấm nút <strong>Chốt điểm và khóa đợt</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lỗi chung của đợt (nếu có) */}
          {data.loi && data.loi.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1 shadow-xs">
              <strong className="font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">warning</span>
                Các điều kiện chung của đợt chưa thỏa mãn để chốt sổ:
              </strong>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                {data.loi.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Hướng dẫn tháo gỡ vấn đề học vụ khi bị chặn */}
          {blockedCount > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">psychology_alt</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900 m-0">
                    Hướng dẫn tháo gỡ vấn đề học vụ để đủ điều kiện chốt đợt
                  </h3>
                  <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                    Hệ thống ghi nhận <strong>{blockedCount} sinh viên</strong> chưa đủ điều kiện khóa sổ. Theo quy chế học vụ, hệ thống không tự động ép điểm 0 khi chưa chấm nhằm bảo đảm tính chính xác và quyền lợi của sinh viên. Khoa vui lòng xử lý theo các hướng giải pháp sau:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 pt-1">
                {/* Vấn đề 1: Hồ sơ chờ duyệt */}
                <div className="bg-white/95 p-4 rounded-xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-indigo-600">assignment_late</span>
                      Hồ sơ đăng ký / Tự tìm chờ xử lý
                    </span>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                      {pendingAppStudents.length} sinh viên
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed m-0">
                    Sinh viên đã nộp nguyện vọng hoặc hồ sơ tự tìm nhưng Khoa chưa phê duyệt hoặc từ chối chính thức.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/khoa/dang-ky"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors border border-indigo-200"
                    >
                      <span>Đến trang Xét duyệt hồ sơ</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                {/* Vấn đề 2: Đang chờ chấm điểm CLO */}
                <div className="bg-white/95 p-4 rounded-xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-emerald-600">rate_review</span>
                      Đang chờ chấm điểm Chuẩn đầu ra (CLO)
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {missingGradeStudents.length} sinh viên
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed m-0">
                    Sinh viên đã hoàn thành thực tập nhưng GVHD hoặc Doanh nghiệp chưa gửi đủ điểm rubric. 
                    Khoa có thể <strong>đôn đốc chấm online</strong>, <strong>nhập điểm từ phiếu giấy</strong> bằng nút <span className="font-semibold text-emerald-700">"Nhập điểm học vụ"</span>, hoặc <strong>gia hạn chấm điểm</strong> nếu đã hết hạn.
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Link
                      to="/khoa/han-bao-cao"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-colors border border-emerald-200"
                    >
                      <span>Điều chỉnh hạn chấm điểm CLO</span>
                      <span className="material-symbols-outlined text-sm">event_repeat</span>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/70 rounded-xl border border-amber-200/60 text-[11px] text-slate-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">info</span>
                <div>
                  <strong>Quy định học vụ về nút "Xét dừng TT":</strong> Chỉ áp dụng cho các trường hợp sinh viên thực tế đã bỏ học, dừng thực tập hoặc chuyển đợt có xác nhận / biên bản của Khoa. Tuyệt đối không dùng nút này để giải quyết các trường hợp sinh viên đang chờ GV/DN hoàn thành chấm điểm.
                </div>
              </div>
            </div>
          )}


          {/* 4. Bộ lọc & Bảng Danh sách Sinh viên Rà soát */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Thanh công cụ tìm kiếm và lọc trạng thái */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({totalStudents})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('BLOCKED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterStatus === 'BLOCKED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>Cần xử lý ({blockedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('ELIGIBLE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'ELIGIBLE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80'
                  }`}
                >
                  Đủ điều kiện ({eligibleCount})
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('NON_COMPLETE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === 'NON_COMPLETE'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Không hoàn tất ({nonCompleteCount})
                </button>
              </div>

              <div className="relative min-w-[240px]">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm MSSV, họ tên, lớp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-hidden font-medium"
                />
              </div>
            </div>

            {/* Bảng dữ liệu chi tiết */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">MSSV</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-3 text-center">Kết quả</th>
                    <th className="py-3 px-3 text-center">Tổng điểm</th>
                    <th className="py-3 px-4">Tình trạng rà soát & Vấn đề còn chặn</th>
                    <th className="py-3 px-4 text-center">Thao tác hỗ trợ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pages.items.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                        Không có sinh viên nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    pages.items.map((x) => {
                      const isBlocked = x.loi && x.loi.length > 0
                      return (
                        <tr
                          key={x.maSV}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isBlocked ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {x.maSV}
                            {x.lop && <span className="block text-[10px] text-slate-400 font-normal">{x.lop}</span>}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {x.hoTen}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                x.ketQua === 'Đạt'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {x.ketQua || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 text-sm">
                            {x.tongDiem !== null && x.tongDiem !== undefined ? x.tongDiem : '—'}
                          </td>
                          <td className="py-3 px-4">
                            {isBlocked ? (
                              <div className="space-y-1">
                                {x.loi.map((err, i) => (
                                  <div
                                    key={i}
                                    className="text-rose-700 font-medium text-[11px] flex items-start gap-1"
                                  >
                                    <span className="material-symbols-outlined text-[13px] text-rose-500 shrink-0 mt-0.5">
                                      error
                                    </span>
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            ) : x.khongHoanTat ? (
                              <div className="text-amber-800 font-medium text-[11px] bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                                Khoa xác nhận không hoàn tất: {x.lyDoKhongHoanTat || 'Theo biên bản xác minh'}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                <span className="material-symbols-outlined text-[13px]">check</span>
                                Đủ điều kiện chốt sổ
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {/* Xem chi tiết điểm CLO */}
                              {onViewScoreDetail && (
                                <button
                                  type="button"
                                  onClick={() => onViewScoreDetail(x)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="Xem bảng điểm chi tiết Chuẩn đầu ra (CLO) của sinh viên"
                                >
                                  <span className="material-symbols-outlined text-[13px]">visibility</span>
                                  <span>Xem CLO</span>
                                </button>
                              )}

                              {/* Nếu có hồ sơ chờ xử lý: Dẫn link sang trang Xét duyệt hồ sơ */}
                              {x.loi?.some((e) => e.includes('chờ xử lý')) && (
                                <Link
                                  to={`/khoa/dang-ky?maSV=${x.maSV}`}
                                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
                                >
                                  <span>Xử lý hồ sơ</span>
                                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                </Link>
                              )}

                              {/* Nếu thiếu điểm: Cho phép Khoa nhập điểm học vụ từ phiếu điểm giấy */}
                              {(x.thieuGV || x.thieuDN || (!x.duDiem && !x.khongHoanTat)) && (
                                <Link
                                  to={`/khoa/cham-diem?sv=${x.maSV}`}
                                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1"
                                  title="Nhập điểm học vụ từ phiếu đánh giá bản cứng"
                                >
                                  <span className="material-symbols-outlined text-[13px]">edit_note</span>
                                  <span>Nhập điểm học vụ</span>
                                </Link>
                              )}

                              {/* Nếu có thể xác nhận không hoàn tất */}
                              {!locked && (x.coTheXacNhanKhongHoanTat || x.khongHoanTat) && (
                                <button
                                  type="button"
                                  onClick={() => handlePickNonComplete(x.maSV)}
                                  className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="Chỉ sử dụng khi sinh viên thực tế đã bỏ/dừng thực tập có xác minh của Khoa"
                                >
                                  <span>{x.khongHoanTat ? 'Xem xác nhận' : 'Xét dừng TT'}</span>
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

            {/* Phân trang danh sách rà soát */}
            <div className="p-4 border-t border-slate-100">
              <Pagination pagination={pages} label="sinh viên rà soát chốt" />
            </div>
          </div>

          {/* 5. Khối Quyết định Chốt điểm & Khóa đợt */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="material-symbols-outlined text-indigo-600">verified</span>
              <h3 className="text-sm font-bold text-slate-900 m-0">
                Quyết định chốt điểm và khóa đợt thực tập
              </h3>
            </div>

            {/* Banner đánh giá sẵn sàng chốt */}
            {!data.coTheChot ? (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-lg shrink-0">info</span>
                <span>
                  <strong>Chưa đủ điều kiện chốt:</strong> Còn <strong>{blockedCount}</strong> sinh viên có vấn đề cản trở cần được xử lý phía trên, hoặc đợt chưa hết ngày thực tập thực tế theo quy định.
                </span>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0">check_circle</span>
                <span>
                  <strong>Đủ điều kiện chốt khóa:</strong> Tất cả <strong>{eligibleCount}</strong> sinh viên đã hoàn tất điểm số và tiêu chuẩn CLO hợp lệ. Vui lòng nhập lý do/căn cứ để thực hiện khóa sổ học vụ.
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lý do / Căn cứ quyết định chốt hoặc mở đợt <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="2"
                maxLength={1000}
                placeholder="VD: Căn cứ biên bản họp Hội đồng xét điểm thực tập tốt nghiệp Đợt 2 năm 2026 ngày 30/10/2026..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 bg-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={busy || !data.coTheChot || !reason.trim()}
                onClick={() =>
                  window.confirm(`Xác nhận chốt điểm và khóa đợt ${data.tenDot}? Sau khi chốt, toàn bộ điểm và báo cáo trong đợt sẽ bị khóa sổ.`) &&
                  act('chot', { phienBan: data.khoa.phienBan, lyDo: reason })
                }
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-base">lock</span>
                <span>Chốt điểm và khóa đợt</span>
              </button>

              {locked && (
                <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700">Hạn mở lại:</span>
                  <input
                    type="datetime-local"
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                  <button
                    type="button"
                    disabled={busy || !reason.trim() || !until}
                    onClick={() =>
                      act('mo-lai', {
                        phienBan: data.khoa.phienBan,
                        lyDo: reason,
                        hanMoLai: `${until}:00+07:00`,
                      })
                    }
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Mở lại điểm/báo cáo có thời hạn
                  </button>
                </div>
              )}
            </div>

            {data.khoa.hanMoLai && (
              <p className="text-xs text-amber-700 font-medium m-0 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>
                  Đang mở lại đến: {new Date(data.khoa.hanMoLai).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} (Giờ Việt Nam). Sau thời hạn này đợt sẽ tự khóa lại.
                </span>
              </p>
            )}
          </div>

          {/* 6. Khối Xác nhận / Thu hồi kết quả Không hoàn tất */}
          {!locked && (
            <div
              ref={nonCompleteFormRef}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="material-symbols-outlined text-slate-600">person_cancel</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 m-0">
                    Xác nhận / Thu hồi kết quả Không hoàn tất
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    Dành cho SV từng có nơi thực tập nhưng thực tế đã bỏ/dừng có xác minh của Khoa. Giữ lịch sử học vụ, tuyệt đối không tự cho 0 điểm.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Chọn sinh viên cần xác minh <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={student}
                    onChange={(e) => {
                      setStudent(e.target.value)
                      setVerified(false)
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-900"
                  >
                    <option value="">— Chọn sinh viên trong đợt —</option>
                    {data.sinhViens
                      .filter((x) => !x.truocChotDanhSach && (x.coTheXacNhanKhongHoanTat || x.khongHoanTat))
                      .map((x) => (
                        <option key={x.maSV} value={x.maSV}>
                          {x.maSV} — {x.hoTen} {x.khongHoanTat ? '(Đã xác nhận không hoàn tất)' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Căn cứ hồ sơ / Biên bản xác minh <span className="text-rose-500">*</span>
                  </label>
                  <input
                    placeholder="VD: Biên bản xác nhận dừng thực tập ngày 20/10/2026..."
                    maxLength={1000}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={(e) => setVerified(e.target.checked)}
                  className="rounded text-indigo-600 w-4 h-4"
                />
                <span className="font-medium">
                  Khoa xác nhận sinh viên này thực tế đã bỏ hoặc dừng thực tập (không phải chỉ đang thiếu điểm chờ chấm).
                </span>
              </label>

              <div className="pt-1">
                <button
                  type="button"
                  disabled={!row || !reason.trim() || !evidence.trim() || (!row.khongHoanTat && !verified)}
                  onClick={() =>
                    act(`sinh-vien/${encodeURIComponent(student)}/khong-hoan-tat`, {
                      phienBan: data.khoa.phienBan,
                      lyDo: reason,
                      canCu: evidence,
                      thuHoi: row.khongHoanTat,
                      daXacMinhKhongHoanTat: verified,
                    })
                  }
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs ${
                    row?.khongHoanTat
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  } disabled:opacity-40`}
                >
                  {row?.khongHoanTat ? 'Thu hồi xác nhận không hoàn tất' : 'Xác nhận không hoàn tất'}
                </button>
              </div>
            </div>
          )}

          {/* 7. Khối Lịch sử Chốt, Mở lại và Điều chỉnh (Audit Log) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <details className="group">
              <summary className="font-bold text-sm text-slate-800 cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-500">history</span>
                  <span>Nhật ký chốt sổ, mở lại và lưu trữ phiên bản ({history.length} sự kiện)</span>
                </div>
                <span className="text-xs text-indigo-600 group-open:rotate-180 transition-transform material-symbols-outlined">
                  expand_more
                </span>
              </summary>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                {logPages.items.length === 0 ? (
                  <p className="text-xs text-slate-400">Chưa có bản lưu lịch sử chốt nào cho đợt này.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-xs">
                    {logPages.items.map((x) => (
                      <li key={x.maNhatKy} className="py-2.5 flex items-center justify-between gap-3">
                        <div>
                          <strong className="text-slate-800">
                            Phiên bản {x.phienBan}: {x.loai}
                          </strong>
                          <span className="text-slate-400 ml-2">
                            ({new Date(x.thoiDiem).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })})
                          </span>
                          <p className="text-slate-600 text-[11px] mt-0.5 m-0">
                            Người thực hiện: <strong>{x.nguoiThucHien}</strong> — Căn cứ: {x.lyDo}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => download(x)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors shrink-0"
                        >
                          Tải bản snapshot
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <Pagination pagination={logPages} label="lịch sử chốt" />
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  )
}
