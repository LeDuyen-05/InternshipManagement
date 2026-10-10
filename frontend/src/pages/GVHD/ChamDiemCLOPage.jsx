import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import apiClient from '../../services/api'

// ─── Sidebar GVHD ────────────────────────────────────────────────────────────
function GVHDSidebar() {
  const { user, logout } = useAuth()
  const loc = useLocation()
  const navigate = useNavigate()
  const links = [
    { to: '/gvhd/dashboard', label: 'Bảng điều khiển', icon: '⊞' },
    { to: '/gvhd/sinh-vien', label: 'Sinh viên hướng dẫn', icon: '👤' },
    { to: '/gvhd/tien-do', label: 'Theo dõi tiến độ', icon: '📈' },
    { to: '/gvhd/bao-cao', label: 'Báo cáo tuần & Phê duyệt', icon: '📋' },
    { to: '/gvhd/cham-diem', label: 'Đánh giá & Chấm điểm', icon: '✅' },
  ]
  return (
    <aside className="gvhd-sidebar">
      <div className="gvhd-sidebar-brand">
        <div className="gvhd-sidebar-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        </div>
        <div>
          <div className="gvhd-sidebar-brand-title">FIT Portal</div>
          <div className="gvhd-sidebar-brand-sub">Giảng viên Hướng dẫn</div>
        </div>
      </div>
      <div className="gvhd-sidebar-section-title">HỌC VỤ &amp; HƯỚNG DẪN</div>
      <nav className="gvhd-sidebar-nav">
        {links.map(l => (
          <Link key={l.to} to={l.to} className={`gvhd-nav-link${loc.pathname === l.to ? ' active' : ''}`}>
            <span className="gvhd-nav-icon">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="gvhd-sidebar-section-title" style={{ marginTop: 16 }}>TIỆN ÍCH &amp; TÀI KHOẢN</div>
      <nav className="gvhd-sidebar-nav">
        <Link to="/gvhd/lich" className="gvhd-nav-link"><span className="gvhd-nav-icon">📅</span>Lịch &amp; Deadline</Link>
        <Link to="/gvhd/thong-bao" className="gvhd-nav-link"><span className="gvhd-nav-icon">🔔</span>Thông báo</Link>
        <Link to="/gvhd/ho-so" className="gvhd-nav-link"><span className="gvhd-nav-icon">👤</span>Hồ sơ cá nhân</Link>
        <Link to="/gvhd/cai-dat" className="gvhd-nav-link"><span className="gvhd-nav-icon">⚙️</span>Cài đặt tài khoản</Link>
      </nav>
      <div className="gvhd-sidebar-footer">
        <div className="gvhd-session-badge">
          <div className="gvhd-session-dot" />
          <div>
            <div className="gvhd-session-label">HỌC VỤ HIỆN HÀNH</div>
            <div className="gvhd-session-value">Đợt 2 - HK2 (2024-2025)</div>
            <div className="gvhd-session-link">Đang diễn ra</div>
          </div>
        </div>
        <div className="gvhd-sidebar-actions">
          <button className="gvhd-action-btn" onClick={() => navigate('/gvhd/cham-diem')}>→ Đăng xuất / Chuyển vai trò</button>
          <button className="gvhd-action-btn" onClick={logout}>⇄</button>
        </div>
      </div>
    </aside>
  )
}

// ─── CLO Evaluation Page ──────────────────────────────────────────────────────
const CLO_DATA = [
  {
    id: 'CLO1', title: 'Áp dụng kiến thức nền tảng & chuyên ngành CNTT',
    desc: 'Vận dụng kỹ thuật, cấu trúc dữ liệu, framework hiện đại và kiến trúc phần mềm để giải quyết bài toán thực tế của doanh nghiệp.',
    weight: 35, maxScore: 3.5, score: 3.2,
    comment: 'Nắm vững ReactJS và TypeScript, áp dụng tốt mô hình Redux Toolkit và tối ưu component.',
    color: '#1a56db',
  },
  {
    id: 'CLO2', title: 'Kỹ năng làm việc nhóm & Giao tiếp kỹ thuật',
    desc: 'Phối hợp nhịp nhàng trong mô hình Agile/Scrum, báo cáo tiến độ rõ ràng, viết tài liệu kỹ thuật chuẩn xác.',
    weight: 25, maxScore: 2.5, score: 2.4,
    comment: 'Giao tiếp tốt, tham gia tích cực các buổi Daily Scrum, tài liệu chuẩn chi.',
    color: '#0e9f6e',
  },
  {
    id: 'CLO3', title: 'Kỷ luật lao động, Đạo đức & Bảo mật thông tin',
    desc: 'Tuân thủ quy định bảo mật NDA, đúng giờ, tôn trọng văn hoá doanh nghiệp.',
    weight: 20, maxScore: 2.0, score: 2.0,
    comment: 'Tinh thần trách nhiệm cao, bảo mật thông tin nghiêm ngặt.',
    color: '#e3a008',
  },
  {
    id: 'CLO4', title: 'Tự học, tiếp cận công nghệ mới & Tư duy giải quyết vấn đề',
    desc: 'Khả năng chủ động tìm kiếm giải pháp khi gặp sự cố, tự nghiên cứu công cụ mới.',
    weight: 20, maxScore: 2.0, score: 1.8,
    comment: 'Chủ động học Vitest và Docker trong thời gian rảnh.',
    color: '#7e3af2',
  },
]

export default function ChamDiemCLOPage() {
  const [scores, setScores] = useState({ CLO1: 3.2, CLO2: 2.4, CLO3: 2.0, CLO4: 1.8 })
  const [comment, setComment] = useState('Sinh viên Nguyễn Văn An có thái độ học tập và làm việc rất nghiêm túc, năng lực chuyên môn đáp ứng tốt yêu cầu kỹ thuật tại doanh nghiệp FPT Software. Đề xuất sinh viên được bảo vệ trước Hội đồng chấm điểm tốt nghiệp tại Giỏi.')
  const [confirmed, setConfirmed] = useState(true)
  const total = Object.values(scores).reduce((s, v) => s + (parseFloat(v) || 0), 0)

  return (
    <div className="gvhd-shell">
      <GVHDSidebar />
      <main className="gvhd-main">
        {/* Header */}
        <div className="gvhd-topbar">
          <div className="gvhd-breadcrumb">
            <span>FIT Portal</span><span className="gvhd-bc-sep">›</span>
            <span>Giảng viên</span><span className="gvhd-bc-sep">›</span>
            <span className="gvhd-bc-active">Đánh giá &amp; Chấm điểm</span>
          </div>
          <div className="gvhd-topbar-right">
            <div className="gvhd-notif-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span className="gvhd-notif-badge">4</span>
            </div>
            <div className="gvhd-user-chip">
              <div className="gvhd-user-avatar">LH</div>
              <div>
                <div className="gvhd-user-name">TS. Lê Hoàng Dũng</div>
                <div className="gvhd-user-role">Giảng viên Hướng dẫn • BM CN Phần mềm</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page title */}
        <div className="clo-page-header">
          <div>
            <h1 className="clo-page-title">Phiếu Đánh giá Thực tập Tốt nghiệp (Chuẩn đầu ra CLO)</h1>
            <p className="clo-page-desc">Quy trình chuẩn hoá học thuật theo Khung bảo đảm chất lượng AUN-QA &amp; ABET Khoa CNTT</p>
          </div>
          <div className="clo-page-actions">
            <button className="clo-btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
              Lưu bản nháp
            </button>
            <button className="clo-btn-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Xác nhận &amp; Khoá điểm (Xuất PDF)
            </button>
          </div>
        </div>

        {/* Student card */}
        <div className="clo-student-card">
          <div className="clo-student-info">
            <div className="clo-student-avatar">NVA</div>
            <div>
              <div className="clo-student-name">
                Nguyễn Văn An
                <span className="clo-badge-mssv">MSSV: 20110045</span>
                <span className="clo-badge-lop">Lớp 21DTH02</span>
              </div>
              <div className="clo-student-meta">
                <span>🏢 DN thực tập: FPT Software (F-Soft HCM)</span>
                <span>👨‍🏫 Mentor: Trần Đình Khoa [Tech Lead]</span>
              </div>
              <div className="clo-student-meta">
                <span>📅 Bắt đầu: 15/01/2025 – Thời gian: 10/04/2025</span>
                <span>📋 Hồ sơ: Hệ thống Quản lý Logistics &amp; Kho vận</span>
              </div>
            </div>
          </div>
          <div className="clo-score-summary">
            <div className="clo-score-main">
              <div className="clo-score-label">ĐIỂM GVHD DỰ TÍNH (THÁNG 10)</div>
              <div className="clo-score-value">9.4<span className="clo-score-max">/10.0</span></div>
              <div className="clo-score-sub">= Bằng: 2.82 điểm vào GPA thực tập trên 10</div>
              <div className="clo-score-tag">✨ XUẤT SẮC</div>
            </div>
            <div className="clo-score-dn">
              <div className="clo-score-label">DOANH NGHIỆP CHẤM (THAM KHẢO)</div>
              <div className="clo-score-value2">9.2<span className="clo-score-max">/10.0</span></div>
              <div className="clo-score-sub">Đã xác nhận bởi Mentor Trần Đình Khoa</div>
            </div>
            <div className="clo-score-weekly">
              <div className="clo-score-label">BÁO CÁO TUẦN &amp; NHẬT KÝ</div>
              <div className="clo-score-value2">12 <span className="clo-score-max">/ 12</span> <span className="clo-score-percent">100% Đạt</span></div>
              <div className="clo-score-sub">Đã duyệt đủ 12 tuần báo cáo lên nộp</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="clo-weight-bar-wrap">
          <div className="clo-weight-bar-label">
            <span>CƠ CẤU TRONG SỐ HỌC PHẦN THỰC TẬP TỐT NGHIỆP</span>
            <strong>100% TỔNG ĐIỂM</strong>
          </div>
          <div className="clo-weight-bar">
            <div className="clo-weight-seg" style={{ width: '36%', background: '#1a56db' }}>Điểm GV Hướng dẫn: 36% (Bạn chấm)</div>
            <div className="clo-weight-seg" style={{ width: '40%', background: '#0e9f6e' }}>Điểm Doanh nghiệp: 40%</div>
            <div className="clo-weight-seg" style={{ width: '24%', background: '#7e3af2' }}>Điểm Hội đồng: 20%</div>
          </div>
        </div>

        {/* CLO section */}
        <div className="clo-section-title">
          <h2>Bảng Đánh giá 4 Chuẩn đầu ra (Course Learning Outcomes - CLO)</h2>
          <div className="clo-section-total">Tổng điểm mục: <strong>{total.toFixed(1)} điểm</strong></div>
        </div>

        {CLO_DATA.map(clo => (
          <div key={clo.id} className="clo-item-card">
            <div className="clo-item-header">
              <div className="clo-item-badge" style={{ background: clo.color }}>{clo.id}</div>
              <div className="clo-item-title-wrap">
                <div className="clo-item-title">{clo.title}</div>
                <div className="clo-item-desc">{clo.desc}</div>
              </div>
              <div className="clo-item-score-wrap">
                <div className="clo-item-weight">TRỌNG SỐ {clo.weight}%<br /><span>tối đa: {clo.maxScore}đ</span></div>
                <div className="clo-item-score-input">
                  <input
                    type="number"
                    min="0"
                    max={clo.maxScore}
                    step="0.1"
                    className="clo-score-field"
                    value={scores[clo.id]}
                    onChange={e => setScores(s => ({ ...s, [clo.id]: e.target.value }))}
                  />
                  <span className="clo-score-divider">/ {clo.maxScore}</span>
                </div>
              </div>
            </div>
            <div className="clo-item-progress">
              <div className="clo-progress-bar">
                <div className="clo-progress-fill" style={{ width: `${(scores[clo.id] / clo.maxScore) * 100}%`, background: clo.color }} />
              </div>
            </div>
            <div className="clo-item-comment">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={clo.color} strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              <span>Nhận xét minh chứng {clo.id}:</span>
            </div>
            <div className="clo-item-comment-text">{clo.comment}</div>
          </div>
        ))}

        {/* Overall comment */}
        <div className="clo-overall-card">
          <div className="clo-overall-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <h3>Khung Đánh giá Chung &amp; Khuyến nghị của GVHD</h3>
          </div>
          <p className="clo-overall-sub">Nhận xét tổng thể về tiến độ, thái độ và chất lượng kết quả thực tập:</p>
          <textarea
            className="clo-overall-textarea"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
          />
          <label className="clo-confirm-check">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
            <span>Tôi xác nhận các điểm số trên đã được đánh giá khách quan dựa trên theo dõi 12 tuần và phản hội chính thức từ Mentor doanh nghiệp. Bảng điểm sau khi nộp sẽ được lưu trữ chính thức trên hệ thống Quản lý Đào tạo Khoa CNTT.</span>
          </label>
        </div>

        {/* Footer action */}
        <div className="clo-footer-actions">
          <div className="clo-footer-signer">
            <div className="clo-signer-avatar">LH</div>
            <div>
              <div className="clo-signer-name">TS. Lê Hoàng Dũng</div>
              <div className="clo-signer-info">Giảng viên hướng dẫn • Bộ môn Công nghệ Phần mềm</div>
              <div className="clo-signer-code">Mã chứng từ: VN-FIT-BQ-2025-1547</div>
            </div>
          </div>
          <button className="clo-submit-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 11 12 14 22 4"/></svg>
            Ký số &amp; Nộp bảng điểm về Giáo vụ Khoa
          </button>
        </div>
      </main>
    </div>
  )
}
