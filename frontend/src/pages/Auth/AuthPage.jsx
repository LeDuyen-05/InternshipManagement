import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ROLES = [
  { key: 'sv', label: 'Sinh viên' },
  { key: 'gv', label: 'Giảng viên' },
  { key: 'gv_tu', label: 'Giáo vụ' },
  { key: 'admin', label: 'Quản trị' },
]

export default function AuthPage() {
  const [roleTab, setRoleTab] = useState('sv')
  const [showPass, setShowPass] = useState(false)
  const [remember, setRemember] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const placeholderMap = {
    sv: 'Ví dụ: 21110045 hoặc sv@fit.edu.vn',
    gv: 'Ví dụ: gv001 hoặc gv@fit.edu.vn',
    gv_tu: 'Ví dụ: gv001 hoặc gv@fit.edu.vn',
    admin: 'Tên đăng nhập quản trị viên',
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login({ TenDangNhap: username.trim(), MatKhau: password.trim() })
      const role = u?.maVaiTro || u?.MaVaiTro
      if (role === 'VT01') navigate('/admin')
      else if (role === 'VT02') navigate('/khoa')
      else if (role === 'VT03') navigate('/gvhd/sinh-vien')
      else navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Tên đăng nhập hoặc mật khẩu không đúng.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fit-auth-shell">
      {/* Info alert */}
      <div className="fit-auth-alert-info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>
          <strong>Lưu ý hệ thống:</strong> Sinh viên đăng nhập bằng tài khoản email trường cấp (
          <a href="mailto:sv@fit.edu.vn">@fit.edu.vn</a>) hoặc mã số sinh viên. Nếu gặp sự cố, vui lòng liên hệ Văn phòng Khoa.
        </span>
      </div>

      <div className="fit-auth-card">
        {/* Brand */}
        <div className="fit-auth-brand">
          <div className="fit-auth-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <div>
            <div className="fit-auth-brand-name">KHOA CNTT</div>
            <div className="fit-auth-brand-sub">CÔNG THỰC TẬP TỐT NGHIỆP</div>
          </div>
        </div>

        <h1 className="fit-auth-title">Đăng nhập Cổng Thực tập Tốt nghiệp</h1>
        <p className="fit-auth-desc">Khoa Công nghệ Thông tin • Hệ thống Quản lý Khóa luận &amp; Thực tập</p>

        {/* Role tabs */}
        <div className="fit-role-tabs">
          {ROLES.map(r => (
            <button
              key={r.key}
              className={`fit-role-tab${roleTab === r.key ? ' active' : ''}`}
              onClick={() => setRoleTab(r.key)}
              type="button"
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="fit-auth-form">
          {error && <div className="fit-auth-error">{error}</div>}

          <div className="fit-field-group">
            <div className="fit-field-label-row">
              <label htmlFor="fit-username">Tài khoản / Mã số sinh viên / Email</label>
              <span className="fit-badge-khoa">Khóa 2021-2025</span>
            </div>
            <div className="fit-input-wrap">
              <svg className="fit-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input
                id="fit-username"
                type="text"
                className="fit-input"
                placeholder={placeholderMap[roleTab]}
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="fit-field-group">
            <div className="fit-field-label-row">
              <label htmlFor="fit-password">Mật khẩu</label>
              <a href="#" className="fit-forgot">Quên mật khẩu?</a>
            </div>
            <div className="fit-input-wrap">
              <svg className="fit-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input
                id="fit-password"
                type={showPass ? 'text' : 'password'}
                className="fit-input"
                placeholder="Nhập mật khẩu xác thực"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" className="fit-toggle-pass" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          <label className="fit-remember">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            <span>Ghi nhớ đăng nhập trên thiết bị này</span>
          </label>

          <button type="submit" className="fit-submit-btn" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : <>Đăng nhập vào hệ thống <span>→</span></>}
          </button>
        </form>

        {/* Stats bar */}
        <div className="fit-stats-bar">
          <div className="fit-stats-bar-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Chuẩn học thuật &amp; Kết nối công nghiệp FIT</span>
          </div>
          <div className="fit-stats-items">
            <div className="fit-stat-item">
              <strong>200+</strong>
              <span>Doanh nghiệp</span>
            </div>
            <div className="fit-stat-sep" />
            <div className="fit-stat-item">
              <strong>Online</strong>
              <span>Giám sát CLO</span>
            </div>
            <div className="fit-stat-sep" />
            <div className="fit-stat-item">
              <strong>ABET</strong>
              <span>Chuẩn đầu ra</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="fit-or-divider">
          <div className="fit-or-line" /><span>HOẶC ĐĂNG NHẬP NHANH</span><div className="fit-or-line" />
        </div>

        {/* SSO buttons */}
        <div className="fit-sso-btns">
          <button type="button" className="fit-sso-btn">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#ff5722" d="M6 6h17v17H6z"/><path fill="#4caf50" d="M25 6h17v17H25z"/><path fill="#2196f3" d="M6 25h17v17H6z"/><path fill="#ffc107" d="M25 25h17v17H25z"/></svg>
            Microsoft Office 365 Nhà trường
          </button>
          <button type="button" className="fit-sso-btn">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Google Workspace FIT
          </button>
        </div>

        {/* Footer */}
        <div className="fit-auth-footer">
          <a href="#">Hướng dẫn kỹ thuật</a>
          <span>•</span>
          <a href="#">Quy chế thực tập</a>
          <span>•</span>
          <div style={{ width: '100%', textAlign: 'center', marginTop: 4 }}>Hotline: (028) 3896 6780</div>
        </div>
        <div className="fit-auth-copy">Bản quyền © 2025 Khoa Công nghệ Thông tin. Mọi quyền được bảo lưu.</div>
      </div>
    </div>
  )
}
