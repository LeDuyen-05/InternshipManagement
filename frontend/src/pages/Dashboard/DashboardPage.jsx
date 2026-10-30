import { usePagination } from '../../hooks/usePagination'
import Pagination from '../../components/common/Pagination'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../../services/api'
import Layout from '../../components/Layout'
import { useAuth } from '../../contexts/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState({ sv: 0, ct: 0, dot: 0 })
  const [notices, setNotices] = useState([])
  const [error, setError] = useState('')
  const pagination = usePagination(notices, user?.maVaiTro)

  useEffect(() => {
    if (user?.maVaiTro === 'VT02') {
      Promise.all([
        apiClient.get('/khoa/sinh-vien'),
        apiClient.get('/khoa/cong-ty'),
        apiClient.get('/khoa/dot-thuc-tap'),
      ])
        .then(([s, c, d]) => setData({ sv: s.data.length, ct: c.data.length, dot: d.data.length }))
        .catch(() => setError('Không tải được thống kê.'))
    }
    apiClient
      .get('/thong-bao')
      .then((r) => setNotices(r.data || []))
      .catch(() => {})
  }, [user?.maVaiTro])

  return (
    <Layout>
      <div className="page-head">
        <div>
          <span className="eyebrow">TỔNG QUAN</span>
          <h2>Hệ thống quản lý thực tập</h2>
          <p>Thông tin học vụ và thông báo mới nhất.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {user?.maVaiTro === 'VT02' && (
        <div className="stat-grid">
          <div className="stat-card">
            <span>Sinh viên</span>
            <strong>{data.sv}</strong>
          </div>
          <div className="stat-card">
            <span>Doanh nghiệp</span>
            <strong>{data.ct}</strong>
          </div>
          <div className="stat-card">
            <span>Đợt thực tập</span>
            <strong>{data.dot}</strong>
          </div>
          <div className="stat-card">
            <Link to="/khoa" className="secondary-link font-semibold text-blue-700">
              Tổng quan điều hành →
            </Link>
          </div>
        </div>
      )}

      <section className="khoa-panel">
        <div className="khoa-panel-head">
          <div>
            <h2>Thông báo toàn khoa</h2>
            <p>Thông báo do giáo vụ khoa gửi đến người dùng trong cổng.</p>
          </div>
        </div>
        {pagination.items.map((x) => (
          <article className="notice-item" key={x.maThongBao}>
            <div>
              <strong>{x.tieuDe}</strong>
              <p>{x.noiDung}</p>
            </div>
            <time>{String(x.ngayTao).replace('T', ' ').slice(0, 16)}</time>
          </article>
        ))}
        {!notices.length && <p className="empty-state">Chưa có thông báo.</p>}
        <Pagination pagination={pagination} label="thông báo tổng quan" />
      </section>
    </Layout>
  )
}
