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

const date = (value) => {
  if (!value) return 'Chưa cấu hình'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 'Chưa xác định' : parsed.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
}

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
      setData({ key, profile: profile.data?.data || profile.data,
        students: (students.data?.data || students.data || []).filter((student) => student.maDot === maDot),
        deadlines: deadlines.data,
        reports: (reports || []).filter((report) => report.maDot === maDot && !report.maPhanBoLuuTru),
      })
    }).catch((err) => {
      if (active) setError(err.response?.data?.message || err.message || 'Không thể tải kế hoạch thực tập.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [maGV, maDot, key, revision])

  const pendingIds = useMemo(() => new Set(current?.reports.map((report) => report.maSV) || []), [current])
  const filtered = (current?.students || []).filter((student) => {
    const keyword = search.trim().toLocaleLowerCase('vi-VN')
    return (!pendingOnly || pendingIds.has(student.maSV))
      && (!keyword || `${student.maSV} ${student.hoTen}`.toLocaleLowerCase('vi-VN').includes(keyword))
  })
  const pagination = usePagination(filtered, JSON.stringify([key, search, pendingOnly]))
  if (!maGV) return <NoLinkedAccount type="giảng viên" />

  const milestones = [
    ['Bắt đầu thực tập', selectedDot?.thoiGianBD],
    ['Kết thúc thực tập', selectedDot?.thoiGianKT],
    ['Mở chấm điểm giảng viên', current?.deadlines.moChamGV],
    ['Hạn chấm điểm giảng viên', current?.deadlines.hanChamGV],
    ['Hạn chấm điểm doanh nghiệp', current?.deadlines.hanChamDN],
  ]
  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <h1 className="text-xl font-bold text-slate-900">Kế hoạch và thời hạn thực tập</h1>
        <p className="text-sm text-slate-600">{current?.profile?.hoTen || 'Giảng viên hướng dẫn'} · Chọn đợt, kiểm tra thời hạn và xử lý báo cáo chờ duyệt.</p>
        <select aria-label="Đợt thực tập" value={maDot || ''} onChange={(event) => changeDot(danhSachNamHoc.flatMap((year) => year.dots).find((dot) => dot.maDot === event.target.value))} className="border rounded-lg p-2 text-sm">
          <option value="" disabled>Chọn đợt thực tập</option>
          {danhSachNamHoc.flatMap((year) => year.dots).map((dot) => <option key={dot.maDot} value={dot.maDot}>{dot.tenDot}</option>)}
        </select>
        <button type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading || !maDot} className="ml-3 text-blue-700 font-semibold disabled:opacity-50">Tải lại</button>
      </div>
      {loading && <p role="status">Đang tải kế hoạch thực tập…</p>}
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {!maDot && <p role="status">Chọn đợt thực tập để xem kế hoạch.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[['Sinh viên hướng dẫn', current?.students.length], ['Báo cáo chờ duyệt', current?.reports.length], ['Sinh viên có báo cáo chờ duyệt', current ? pendingIds.size : undefined]].map(([label, count]) => (
          <div key={label} className="bg-white p-4 border rounded-2xl"><p className="text-sm text-slate-600">{label}</p><strong className="text-2xl text-blue-800">{count ?? '—'}</strong></div>
        ))}
      </div>
      <section className="bg-white p-5 border rounded-2xl space-y-3">
        <h2 className="font-bold text-slate-900">Thời hạn do Khoa công bố</h2>
        <p className="text-sm text-slate-600">Hạn nộp từng báo cáo và hạn bổ sung được ghi tại hồ sơ tiến độ của sinh viên.</p>
        <dl className="grid sm:grid-cols-2 gap-4">
          {milestones.map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="font-semibold">{current ? date(value) : '—'}</dd></div>)}
        </dl>
        {current?.deadlines.lyDoKhoaGV && <p className="text-sm text-amber-800">{current.deadlines.lyDoKhoaGV}</p>}
      </section>
      <section className="bg-white p-5 border rounded-2xl space-y-4">
        <h2 className="font-bold text-slate-900">Sinh viên trong đợt</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <input aria-label="Tìm MSSV hoặc họ tên" placeholder="Tìm MSSV, họ tên…" value={search} onChange={(event) => setSearch(event.target.value)} className="border rounded-lg p-2 text-sm" />
          <label className="text-sm"><input type="checkbox" checked={pendingOnly} onChange={(event) => setPendingOnly(event.target.checked)} className="mr-2" />Có báo cáo chờ duyệt</label>
        </div>
        {pagination.items.map((student) => <div key={student.maSV} className="flex flex-wrap items-center justify-between gap-3 border-b py-3">
          <div><strong>{student.hoTen}</strong><p className="text-sm text-slate-500">{student.maSV} · {student.tenCongTy || 'Chưa có thông tin doanh nghiệp'}</p></div>
          <Link to={`/giang-vien/tien-do?sv=${encodeURIComponent(student.maSV)}`} className="text-blue-700 font-semibold text-sm">{pendingIds.has(student.maSV) ? 'Duyệt báo cáo' : 'Xem tiến độ'}</Link>
        </div>)}
        {current && !filtered.length && <p className="text-sm text-slate-500">Không có sinh viên phù hợp bộ lọc.</p>}
        <Pagination pagination={pagination} label="sinh viên" />
      </section>
    </div>
  )
}
