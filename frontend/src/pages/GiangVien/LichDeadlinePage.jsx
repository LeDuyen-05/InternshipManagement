import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext.jsx'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { useIdentity } from '../../hooks/useIdentity'

export default function LichDeadlinePage() {
  const [searchParams] = useSearchParams()
  const { maGV: identityMaGV, role } = useIdentity() || {}
  const isStaff = role === 'VT01' || role === 'VT02'
  const currentMaGV = isStaff && searchParams.get('gv') ? searchParams.get('gv') : (identityMaGV || 'GV001')
  const { selectedDot, danhSachDot, changeDot } = useDotThucTap()

  const [profile, setProfile] = useState(null)
  const [svList, setSvList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [currentMaGV, selectedDot])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [resProfile, resSV] = await Promise.all([
        gvHuongDanService.getProfile(currentMaGV),
        gvHuongDanService.getSVTheoGiangVien(currentMaGV),
      ])
      setProfile(resProfile.data?.data || resProfile.data)

      const dataSV = resSV.data?.data || resSV.data || []
      setSvList(Array.isArray(dataSV) ? dataSV : [])
    } catch (err) {
      console.error('Lỗi tải dữ liệu lịch giảng viên:', err)
    } finally {
      setLoading(false)
    }
  }

  // Khung 12 tuần được chia theo chu kỳ báo cáo 2 tuần / lần
  const timelineWeeks = useMemo(() => {
    let baseDate = new Date(2026, 8, 14) // Mặc định 14/09/2026
    if (selectedDot?.thoiGianBD) {
      const parsed = new Date(selectedDot.thoiGianBD)
      if (!isNaN(parsed.getTime())) baseDate = parsed
    } else if (selectedDot?.thoiGian) {
      const startPart = selectedDot.thoiGian.split('-')[0].trim().split('/')
      if (startPart.length === 3) {
        const parsed = new Date(Number(startPart[2]), Number(startPart[1]) - 1, Number(startPart[0]))
        if (!isNaN(parsed.getTime())) baseDate = parsed
      }
    }

    const today = new Date()
    const list = []

    const weekConfigs = [
      {
        id: 1,
        tuanRange: 'Tuần 1 – 2',
        giaiDoan: 'Tiếp nhận đơn vị & Thống nhất kế hoạch',
        nvSinhVien: 'Nộp Giấy tiếp nhận DN & Đề cương công việc',
        nvGiangVien: 'Xác nhận sinh viên đã đến đơn vị nhận việc',
      },
      {
        id: 2,
        tuanRange: 'Tuần 3 – 4',
        giaiDoan: 'Tiến độ chuyên môn Đợt 1',
        nvSinhVien: 'Nộp Báo cáo tiến độ Tuần 3 – 4',
        nvGiangVien: 'Duyệt báo cáo tiến độ & góp ý chuyên môn',
      },
      {
        id: 3,
        tuanRange: 'Tuần 5 – 6',
        giaiDoan: 'Tiến độ chuyên môn Đợt 2 (Mốc giữa kỳ)',
        nvSinhVien: 'Nộp Báo cáo Tuần 5 – 6 & Báo cáo sơ kết giữa kỳ',
        nvGiangVien: 'Họp đối chiếu tiến độ giữa kỳ với SV và Cán bộ DN',
        isMilestone: true,
      },
      {
        id: 4,
        tuanRange: 'Tuần 7 – 8',
        giaiDoan: 'Tiến độ chuyên môn Đợt 3',
        nvSinhVien: 'Nộp Báo cáo tiến độ Tuần 7 – 8',
        nvGiangVien: 'Duyệt tiến độ & kiểm tra kết quả sản phẩm',
      },
      {
        id: 5,
        tuanRange: 'Tuần 9 – 10',
        giaiDoan: 'Hoàn thiện nhiệm vụ & Bàn giao tại DN',
        nvSinhVien: 'Nộp Báo cáo Tuần 9 – 10 & Bàn giao sản phẩm',
        nvGiangVien: 'Hướng dẫn hoàn thiện quyển báo cáo thực tập',
      },
      {
        id: 6,
        tuanRange: 'Tuần 11 – 12',
        giaiDoan: 'Tổng kết thực tập & Chấm điểm CLO',
        nvSinhVien: 'Nộp Phiếu nhận xét DN (mộc đỏ) + Quyển báo cáo',
        nvGiangVien: 'Chấm 10 tiêu chí CLO & Khóa sổ điểm gửi Khoa',
        isFinal: true,
      },
    ]

    for (let i = 0; i < 6; i++) {
      const startDayOffset = i * 14
      const endDayOffset = startDayOffset + 13

      const startDate = new Date(baseDate)
      startDate.setDate(baseDate.getDate() + startDayOffset)

      const endDate = new Date(baseDate)
      endDate.setDate(baseDate.getDate() + endDayOffset)
      endDate.setHours(23, 59, 59, 999)

      const deadlineSV = new Date(endDate)
      const deadlineGV = new Date(endDate)
      deadlineGV.setDate(deadlineGV.getDate() + 2)
      deadlineGV.setHours(17, 0, 0, 0)

      let status = 'ChuaDienRa'
      if (today > endDate) {
        status = 'DaKetThuc'
      } else if (today >= startDate && today <= endDate) {
        status = 'DangDienRa'
      }

      const formatShortDate = (d) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`

      list.push({
        ...weekConfigs[i],
        timeRangeStr: `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`,
        deadlineSVStr: `${formatShortDate(deadlineSV)} (23:59)`,
        deadlineGVStr: `${formatShortDate(deadlineGV)} (17:00)`,
        status,
      })
    }

    return list
  }, [selectedDot])

  return (
    <div className="space-y-5">
      {/* 1. Header tinh giản, thanh lịch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Lịch Trình & Deadline Thực Tập</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
              {selectedDot?.tenDot || 'Đợt 2 năm 2026'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Khung kế hoạch 12 tuần • Chu kỳ báo cáo tiến độ: <strong className="text-slate-700 font-semibold">2 tuần / lần</strong>
          </p>
        </div>

        {/* Thông tin GVHD & Dropdown Đợt */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium">
            <span className="material-symbols-outlined text-base text-blue-600">badge</span>
            <span>GVHD: <strong className="text-slate-900">{profile?.hoTen ? `ThS. ${profile.hoTen}` : 'ThS. Nguyễn Văn An'}</strong></span>
            <span className="text-slate-400 font-mono">({currentMaGV})</span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-700 font-bold">{svList.length} SV phụ trách</span>
          </div>

          <div className="relative flex items-center">
            <span className="material-symbols-outlined text-slate-400 text-sm absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              event
            </span>
            <select
              value={selectedDot?.maDot}
              onChange={(e) => {
                const allDots = danhSachDot?.flatMap((y) => y.dots) || []
                const dot = allDots.find((d) => d.maDot === e.target.value)
                if (dot) changeDot(dot)
              }}
              className="appearance-none pl-8 pr-8 py-1.5 min-w-[240px] bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs"
            >
              {(danhSachDot?.flatMap((y) => y.dots) || []).map((d) => (
                <option key={d.maDot} value={d.maDot}>
                  {d.tenDot}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-slate-400 text-sm absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              unfold_more
            </span>
          </div>
        </div>
      </div>

      {/* 2. 4 Mốc quan trọng cốt lõi (Đồng bộ số liệu, icon nổi bật) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-2 text-blue-600 mb-1.5">
            <span className="material-symbols-outlined text-xl">play_circle</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Khai mạc (Tuần 1)</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900">{timelineWeeks[0]?.timeRangeStr.split('–')[0]?.trim() || '14/09'}</span>
            <span className="text-xs font-medium text-slate-400">/ 2026</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tiếp nhận đơn vị thực tập</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-2 text-amber-600 mb-1.5">
            <span className="material-symbols-outlined text-xl">hourglass_bottom</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Giữa kỳ (Tuần 6)</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-amber-800">{timelineWeeks[2]?.timeRangeStr.split('–')[1]?.trim() || '25/10'}</span>
            <span className="text-xs font-medium text-amber-600/70">/ 2026</span>
          </div>
          <p className="text-[11px] text-amber-800/80 mt-1">Họp đối chiếu tiến độ</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-2 text-indigo-600 mb-1.5">
            <span className="material-symbols-outlined text-xl">verified</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Phiếu DN (Tuần 11)</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-indigo-900">{timelineWeeks[5]?.timeRangeStr.split('–')[0]?.trim() || '30/11'}</span>
            <span className="text-xs font-medium text-indigo-600/70">/ 2026</span>
          </div>
          <p className="text-[11px] text-indigo-800/80 mt-1">Thu phiếu nhận xét DN</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 bg-rose-50/20 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-2 text-rose-600 mb-1.5">
            <span className="material-symbols-outlined text-xl">gavel</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Chốt điểm CLO (Tuần 12)</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-rose-700">25/12</span>
            <span className="text-xs font-medium text-rose-600/70">/ 2026</span>
          </div>
          <p className="text-[11px] text-rose-700/80 mt-1">Khóa sổ điểm Khoa</p>
        </div>
      </div>

      {/* 3. Bảng Lịch Trình Báo Cáo Tiến Độ (Làm nổi bật mạnh mẽ Tuần hiện tại) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">calendar_month</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Lịch Trình Báo Cáo Tiến Độ (2 Tuần / Lần)
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-rose-700 font-semibold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
              Hạn nộp SV: Chủ nhật (23:59)
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              Hạn duyệt GV: Thứ Ba (17:00)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-36">Tuần</th>
                <th className="py-3 px-4 w-36">Khoảng thời gian</th>
                <th className="py-3 px-4 min-w-[200px]">Nội dung giai đoạn</th>
                <th className="py-3 px-4 min-w-[220px] bg-rose-50/30">Hạn nộp của Sinh viên</th>
                <th className="py-3 px-4 min-w-[220px] bg-blue-50/30">Nhiệm vụ của GVHD</th>
                <th className="py-3 px-4 w-28 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timelineWeeks.map((w) => {
                const isCurrent = w.status === 'DangDienRa'
                return (
                  <tr
                    key={w.id}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-blue-50/40 hover:bg-blue-50/60'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Tuần */}
                    <td className="py-3 px-4 align-top">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs ${isCurrent ? 'font-bold text-blue-900' : 'font-semibold text-slate-800'}`}>
                          {w.tuanRange}
                        </span>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                            Hiện tại
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Khoảng thời gian */}
                    <td className="py-3 px-4 align-top text-slate-600 font-medium whitespace-nowrap">
                      {w.timeRangeStr}
                    </td>

                    {/* Nội dung giai đoạn */}
                    <td className="py-3 px-4 align-top">
                      <div className="font-semibold text-slate-800 leading-snug">
                        {w.giaiDoan}
                      </div>
                    </td>

                    {/* Hạn nộp SV */}
                    <td className="py-3 px-4 align-top">
                      <p className="text-slate-700 leading-snug">{w.nvSinhVien}</p>
                      <p className="text-[11px] text-rose-600 font-mono mt-1">
                        Hạn: {w.deadlineSVStr}
                      </p>
                    </td>

                    {/* Nhiệm vụ GVHD */}
                    <td className="py-3 px-4 align-top">
                      <p className="text-slate-700 leading-snug">{w.nvGiangVien}</p>
                      <p className="text-[11px] text-blue-600 font-mono mt-1">
                        Hạn: {w.deadlineGVStr}
                      </p>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                      {w.isFinal ? (
                        <Link
                          to={`/giang-vien/cham-diem?gv=${currentMaGV}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors"
                        >
                          Chấm CLO
                        </Link>
                      ) : (
                        <Link
                          to={`/giang-vien/tien-do?gv=${currentMaGV}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:text-blue-600 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
                        >
                          Xem bài
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Nhóm sinh viên phụ trách (Thẻ gọn gàng, rõ ràng) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-lg">groups</span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Sinh Viên Thuộc Sự Phụ Trách Của Thầy/Cô ({svList.length})
            </h3>
          </div>
          <Link
            to={`/giang-vien/sinh-vien?gv=${currentMaGV}`}
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            Quản lý tất cả
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </Link>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 italic">Đang tải danh sách sinh viên...</p>
        ) : svList.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Chưa có sinh viên nào được phân công cho {profile?.hoTen || currentMaGV}.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {svList.map((sv, idx) => (
              <div
                key={sv.maSV || idx}
                className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all flex items-center justify-between gap-3 text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {(sv.hoTen || sv.tenSinhVien || 'SV').charAt(0)}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-slate-900 truncate">{sv.hoTen || sv.tenSinhVien}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{sv.maSV} • <span className="text-slate-600">{sv.tenCongTy || 'Chưa cập nhật'}</span></div>
                  </div>
                </div>
                <div className="shrink-0">
                  <Link
                    to={`/giang-vien/tien-do?gv=${currentMaGV}&sv=${sv.maSV}`}
                    className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold hover:bg-blue-100 transition-colors"
                  >
                    Tiến độ
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
