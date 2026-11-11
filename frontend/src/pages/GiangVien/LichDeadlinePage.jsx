import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDotThucTap } from '../../contexts/DotThucTapContext'
import { useIdentity } from '../../hooks/useIdentity'
import { gvHuongDanService } from '../../services/gvHuongDanService'
import { tienDoThucTapService } from '../../services/tienDoThucTapService'
import apiClient from '../../services/api'
import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import NoLinkedAccount from '../../components/common/NoLinkedAccount'
import { responseList, reportReviewUrl } from '../../utils/lecturerDashboard'
import { scheduleDate, scheduleRoster } from '../../utils/lecturerSchedule'
import { formatTenDot } from '../../utils/dotThucTap'

export default function LichDeadlinePage() {
  const { maGV } = useIdentity()
  const { selectedDot, danhSachNamHoc, changeDot } = useDotThucTap()
  const maDot = selectedDot?.maDot
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [revision, setRevision] = useState(0)
  const key = JSON.stringify([maGV, maDot])
  const current = data?.key === key ? data : null

  useEffect(() => {
    let active = true
    setData(null); setError('')
    if (!maGV || !maDot) { setLoading(false); return () => { active = false } }
    setLoading(true)
    Promise.all([
      gvHuongDanService.getProfile(maGV),
      gvHuongDanService.getSVTheoGiangVien(maGV, '', maDot),
      apiClient.get(`/thoi-han/${encodeURIComponent(maDot)}`),
      tienDoThucTapService.getBaoCaoChoDuyet(maGV),
    ]).then(([profile, students, deadlines, reports]) => {
      if (!active) return
      if (deadlines.data?.maSo !== maDot) throw new Error('Thông tin thời hạn không thuộc đợt đang chọn.')
      const roster = scheduleRoster(responseList(students), responseList(reports), maDot)
      setData({ key, profile: profile.data?.data || profile.data,
        students: roster.students,
        deadlines: deadlines.data,
        reports: roster.reports,
      })
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || err.message || 'Không thể tải kế hoạch thực tập.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [maGV, maDot, key, revision])

  const pendingIds = useMemo(() => new Set(current?.reports.map((report) => report.maSV) || []), [current])
  const reportsByStudent = useMemo(() => {
    const grouped = new Map()
    for (const report of current?.reports || []) {
      const list = grouped.get(report.maSV) || []
      list.push(report)
      grouped.set(report.maSV, list)
    }
    return grouped
  }, [current])
  const filtered = (current?.students || []).filter((student) => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN')
    return (!pendingOnly || pendingIds.has(student.maSV))
      && (!keyword || `${student.maSV} ${student.hoTen}`.toLocaleLowerCase('vi-VN').includes(keyword))
  })
  const pagination = usePagination(filtered, JSON.stringify([key, search, pendingOnly]))
  if (!maGV) return <NoLinkedAccount type="giảng viên" />

  const rounds = danhSachNamHoc.flatMap(year => year.dots)
  const gradingDates = [
    ['Mở chấm điểm giảng viên', current?.deadlines.moChamGV],
    ['Hạn chấm điểm giảng viên', current?.deadlines.hanChamGV],
    ['Mở chấm điểm doanh nghiệp', current?.deadlines.moChamDN],
    ['Hạn chấm điểm doanh nghiệp', current?.deadlines.hanChamDN],
  ]
  const summary = [
    { label: 'Sinh viên hướng dẫn', count: current?.students.length, icon: 'groups', color: 'bg-blue-50 text-blue-700', note: 'Đang hướng dẫn trong đợt' },
    { label: 'Báo cáo chờ duyệt', count: current?.reports.length, icon: 'assignment_late', color: 'bg-amber-50 text-amber-700', note: 'Báo cáo sinh viên đã nộp' },
    { label: 'Sinh viên cần duyệt báo cáo', count: current ? pendingIds.size : undefined, icon: 'person_search', color: 'bg-indigo-50 text-indigo-700', note: 'Mỗi sinh viên được tính một lần' },
  ]
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">event_note</span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1">Kế hoạch thực tập</p>
              <h1 className="text-xl font-bold text-slate-900">Lịch và thời hạn</h1>
              <p className="mt-1 text-sm text-slate-500">Theo dõi các mốc thực tập, hạn chấm điểm và báo cáo cần duyệt.</p>
            </div>
          </div>
          {current?.profile?.hoTen && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600"><span className="material-symbols-outlined text-base">school</span>{current.profile.hoTen}</span>}
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <div className="w-full sm:w-auto sm:min-w-72">
            <label htmlFor="lecturer-schedule-round" className="block text-xs font-semibold text-slate-600 mb-1.5">Đợt thực tập</label>
            <select id="lecturer-schedule-round" aria-label="Đợt thực tập" value={maDot || ''}
              onChange={event => { changeDot(rounds.find(dot => dot.maDot === event.target.value)); setSearch(''); setPendingOnly(false) }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="" disabled>Chọn đợt thực tập</option>
              {rounds.map(dot => <option key={dot.maDot} value={dot.maDot}>{formatTenDot(dot)}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading || !maDot}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>refresh</span>Tải lại
          </button>
          <span className="sm:ml-auto text-xs text-slate-400 pb-2">Thời gian hiển thị theo giờ Việt Nam</span>
        </div>
      </section>

      {loading && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">Đang tải kế hoạch thực tập…</p>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {!maDot && <p role="status" className="rounded-xl bg-slate-100 p-4 text-sm text-slate-600">Chọn đợt thực tập để xem kế hoạch.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summary.map(item => <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><p className="text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{item.count ?? '—'}</p><p className="mt-1 text-[11px] text-slate-400">{item.note}</p></div>
          <span className={`material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.color}`}>{item.icon}</span>
        </div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <section className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4"><span className="material-symbols-outlined text-blue-600">date_range</span><h2 className="font-bold text-slate-900">Thời gian thực tập</h2></div>
          <dl className="mt-5 space-y-5">
            {[
              ['Bắt đầu thực tập', selectedDot?.thoiGianBD, 'bg-blue-500'],
              ['Kết thúc thực tập', selectedDot?.thoiGianKT, 'bg-emerald-500'],
            ].map(([label, value, color]) => <div key={label} className="flex gap-3">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
              <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-lg font-bold text-slate-900">{current ? scheduleDate(value) : '—'}</dd></div>
            </div>)}
          </dl>
          <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">Hạn nộp và hạn nộp lại của từng báo cáo được hiển thị trong trang tiến độ của sinh viên.</p>
        </section>

        <section className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2"><span className="material-symbols-outlined text-indigo-600">fact_check</span><h2 className="font-bold text-slate-900">Lịch chấm điểm</h2></div>
            {current && <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${current.deadlines.lyDoKhoaGV ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{current.deadlines.lyDoKhoaGV ? 'Chưa mở hoặc đã đóng chấm điểm GV' : 'Trong thời hạn chấm điểm GV'}</span>}
          </div>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gradingDates.map(([label, value]) => <div key={label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1.5 text-sm font-bold text-slate-800">{current ? scheduleDate(value, true) : '—'}</dd></div>)}
          </dl>
          {current?.deadlines.lyDoKhoaGV && <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-800"><span className="material-symbols-outlined text-base">info</span>{current.deadlines.lyDoKhoaGV}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-400">Thời hạn do Khoa công bố</p>{maDot && <Link to={`/giang-vien/cham-diem?gv=${encodeURIComponent(maGV)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">Xem bảng điểm<span className="material-symbols-outlined text-base">arrow_forward</span></Link>}</div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:px-6">
          <div><h2 className="font-bold text-slate-900">Sinh viên hướng dẫn</h2><p className="mt-1 text-xs text-slate-500">Xem tiến độ và mở báo cáo đang chờ duyệt trong đợt.</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{current ? `${filtered.length} sinh viên` : '—'}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-slate-50/50 px-5 py-4 sm:px-6">
          <div className="relative w-full sm:max-w-xs"><span className="material-symbols-outlined absolute left-3 top-2.5 text-lg text-slate-400">search</span><input aria-label="Tìm MSSV hoặc họ tên" placeholder="Tìm MSSV hoặc họ tên…" value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={pendingOnly} onChange={event => setPendingOnly(event.target.checked)} className="h-4 w-4 rounded accent-blue-600" />Chỉ hiện sinh viên có báo cáo chờ duyệt</label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-5 py-3 sm:pl-6">Sinh viên</th><th scope="col" className="px-4 py-3">Nơi thực tập</th><th scope="col" className="px-4 py-3">Báo cáo chờ duyệt</th><th scope="col" className="px-5 py-3 text-right sm:pr-6">Thao tác</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {pagination.items.map(student => {
                const reports = reportsByStudent.get(student.maSV) || []
                return <tr key={student.maSV} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4 sm:pl-6"><p className="font-semibold text-slate-900">{student.hoTen}</p><p className="mt-1 text-xs text-slate-400">{student.maSV}{student.lop ? ` · ${student.lop}` : ''}</p></td>
                  <td className="max-w-xs px-4 py-4 text-xs text-slate-600">{student.tenCongTy || 'Chưa có thông tin doanh nghiệp'}</td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${reports.length ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>{reports.length ? `${reports.length} báo cáo` : 'Không có'}</span></td>
                  <td className="px-5 py-4 text-right sm:pr-6"><Link to={reports.length ? reportReviewUrl(maGV, reports[0]) : `/giang-vien/tien-do?gv=${encodeURIComponent(maGV)}&sv=${encodeURIComponent(student.maSV)}`} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold ${reports.length ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>{reports.length ? 'Duyệt báo cáo' : 'Xem tiến độ'}<span className="material-symbols-outlined text-sm">arrow_forward</span></Link></td>
                </tr>
              })}
              {!filtered.length && <tr><td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">{loading ? 'Đang tải danh sách sinh viên…' : error ? 'Chưa tải được danh sách. Bạn hãy thử tải lại.' : !maDot ? 'Chọn đợt thực tập để xem sinh viên.' : !current ? 'Đang chuẩn bị dữ liệu…' : !current.students.length ? 'Chưa có sinh viên đang được hướng dẫn trong đợt này.' : 'Không có sinh viên phù hợp bộ lọc.'}</td></tr>}
            </tbody>
          </table>
        </div>
        {current && <div className="px-5 py-3 sm:px-6"><Pagination pagination={pagination} label="sinh viên" /></div>}
      </section>
    </div>
  )
}