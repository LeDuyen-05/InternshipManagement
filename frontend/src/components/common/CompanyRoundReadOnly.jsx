import { useEffect, useState } from 'react'
import apiClient from '../../services/api'
import { deadlineText } from '../../hooks/useGradeDeadline'
import { usePagination } from '../../hooks/usePagination'
import Pagination from './Pagination'
import { recruitmentStatusLabel } from '../../utils/recruitmentStatus'

export default function CompanyRoundReadOnly({ companyId, maDot }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const pagination = usePagination(rows, `${companyId}:${maDot}`)
  useEffect(() => {
    setRows([]); setError('')
    if (!companyId || !maDot) return
    let active = true
    apiClient.get('/doanh-nghiep-theo-dot', { params: { maDot } }).then(r => { if (active) setRows(r.data) })
      .catch(e => { if (active) setError(e.response?.data?.message || 'Không tải được kế hoạch theo đợt.') })
    return () => { active = false }
  }, [companyId, maDot])
  return <section className="rounded-xl border bg-white p-4">
    <h2 className="font-bold">Vị trí & chỉ tiêu đợt đang chọn — Khoa quản lý</h2>
    <p className="text-sm text-slate-500">Đây là kế hoạch công khai cho SV. Thông tin DN chung không thay chỉ tiêu/JD/thời hạn của từng đợt; cần thay đổi, phối hợp Khoa xác minh.</p>
    {error && <p role="alert">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Đợt</th><th>Vị trí</th><th>Chỉ tiêu / đã nhận</th><th>Nhận đăng ký (UTC+7)</th><th>Trạng thái</th></tr></thead><tbody>
      {pagination.items.map(x => <tr key={x.maDot}><td>{x.tenDot}</td><td>{(x.viTris || []).map(v => <details key={v.maViTri}><summary>{v.tenViTri}: {v.daTiepNhan}/{v.soLuongNhan} đã nhận — {v.daTiepNhan >= v.soLuongNhan ? 'Đủ chỉ tiêu — đóng nhận mới' : v.hoatDong ? 'Theo lịch DN' : 'Ngừng nhận'}</summary><p className="whitespace-pre-wrap">{v.yeuCau}</p></details>)}</td><td>{x.soLuongNhan} / {x.daTiepNhan}</td><td>{deadlineText(x.moDangKy)} → {deadlineText(x.hanDangKy)}</td><td>{recruitmentStatusLabel(x.trangThaiTuyen)}</td></tr>)}
      {!rows.length && <tr><td colSpan="5">Chưa có kế hoạch theo đợt được Khoa đưa lên hệ thống.</td></tr>}
    </tbody></table><Pagination pagination={pagination} label="kế hoạch DN theo đợt"/></div>
  </section>
}
