import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AuthPage() {
  const [showPass, setShowPass] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const u = await login({ TenDangNhap: username.trim(), MatKhau: password.trim() })
      const role = u?.maVaiTro || u?.MaVaiTro
      if (role === 'VT01') navigate('/admin')
      else if (role === 'VT02') navigate('/khoa')
      else if (role === 'VT03') navigate('/giang-vien/dashboard')
      else if (role === 'VT04') navigate('/sinh-vien')
      else if (role === 'VT05') navigate('/doanh-nghiep')
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
          <strong>Lưu ý hệ thống:</strong> Đăng nhập bằng tài khoản được cấp bởi Khoa Công nghệ Thông tin. Nếu gặp sự cố, vui lòng liên hệ Văn phòng Khoa.
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
            <div className="fit-auth-brand-sub">CỔNG THỰC TẬP TỐT NGHIỆP</div>
          </div>
        </div>

        <h1 className="fit-auth-title">Đăng nhập Cổng Thực tập Tốt nghiệp</h1>
        <p className="fit-auth-desc">Khoa Công nghệ Thông tin • Hệ thống Quản lý Khóa luận &amp; Thực tập</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="fit-auth-form">
          {error && <div className="fit-auth-error">{error}</div>}

          <div className="fit-field-group">
            <div className="fit-field-label-row">
              <label htmlFor="fit-username">Tên đăng nhập / Mã số</label>
            </div>
            <div className="fit-input-wrap">
              <svg className="fit-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input
                id="fit-username"
                type="text"
                className="fit-input"
                placeholder="Nhập tên đăng nhập hoặc mã số..."
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
            </div>
            <div className="fit-input-wrap">
              <svg className="fit-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input
                id="fit-password"
                type={showPass ? 'text' : 'password'}
                className="fit-input"
                placeholder="Nhập mật khẩu..."
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

          <button type="submit" className="fit-submit-btn" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : <>Đăng nhập vào hệ thống <span>→</span></>}
          </button>
        </form>

        {/* Footer */}
        <div className="fit-auth-footer">
          <span>Hệ thống Quản lý Thực tập Tốt nghiệp</span>
          <span>•</span>
          <span>FIT Portal</span>
        </div>
      </div>
    </div>
  )
}
