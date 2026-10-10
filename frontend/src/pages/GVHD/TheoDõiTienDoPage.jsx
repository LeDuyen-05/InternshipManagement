import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

function GVHDSidebar() {
  const { logout } = useAuth()
  const loc = useLocation()
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
        <div className="gvhd-sidebar-logo"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>
        <div><div className="gvhd-sidebar-brand-title">FIT Portal</div><div className="gvhd-sidebar-brand-sub">Giảng viên Hướng dẫn</div></div>
      </div>
      <div className="gvhd-sidebar-section-title">HỌC VỤ &amp; HƯỚNG DẪN</div>
      <nav className="gvhd-sidebar-nav">
        {links.map(l => (
          <Link key={l.to} to={l.to} className={`gvhd-nav-link${loc.pathname === l.to ? ' active' : ''}`}>
            <span className="gvhd-nav-icon">{l.icon}</span>{l.label}
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
          <button className="gvhd-action-btn" onClick={logout}>→ Chuyển vai trò</button>
          <button className="gvhd-action-btn" onClick={logout}>⇄</button>
        </div>
      </div>
    </aside>
  )
}

const WEEKLY_HISTORY = [
  { tuan: 'Tuần 4', ngay: '24/03 – 30/03/2025', topic: 'Redux Toolkit & JWT Authentication\nTích hợp Axios Interceptors & Refresh Token Flow', score: 9.0, comment: 'Xử lý token an toàn, cấu trúc slice chuẩn pattern RTK. Cần chú ý bảo mật cookie HttpOnly.', status: 'Đã duyệt' },
  { tuan: 'Tuần 3', ngay: '17/03 – 23/03/2025', topic: 'User Management Module & CRUD\nXây dựng form dynamic với React Hook Form và Zod', score: 9.5, comment: 'Schema validation xuất sắc, xử lý UX form tối ưu và cơ chế báo lỗi trường rộng.', status: 'Đã duyệt' },
  { tuan: 'Tuần 2', ngay: '10/03 – 16/03/2025', topic: 'UI Design System F-Town & Ant Design\nSetup Component Lib, Atomic Design Architecture', score: 8.5, comment: 'Phân ra component tốt. Đề nghị áp dụng Storybook để test các trang thay thế UI.', status: 'Đã duyệt' },
  { tuan: 'Tuần 1', ngay: '03/03 – 09/03/2025', topic: 'Onboarding & Tìm hiểu kiến trúc dự án\nLàm quen codebase, quy trình Jira Scrum Bus', score: 9.0, comment: 'Nắm bắt nhanh quy trình Scrum của FPT Software. Tốc phong làm việc chuyên nghiệp.', status: 'Đã duyệt' },
]

export default function TheoDõiTienDoPage() {
  const [activeTab, setActiveTab] = useState('tong-quan')
  const [reviewComment, setReviewComment] = useState('')
  const [weekScore, setWeekScore] = useState(1)

  const tabs = [
    { key: 'tong-quan', label: '1. Tổng quan', icon: '📊' },
    { key: 'lo-trinh', label: '2. Lộ trình tiến độ 12 tuần', icon: '📈' },
    { key: 'bao-cao', label: '3. Báo cáo & Phê duyệt', icon: '📋', badge: 1 },
    { key: 'clo', label: '4. Đánh giá & CLO', icon: '✅' },
    { key: 'tai-lieu', label: '5. Tài liệu & Minh chứng', icon: '📁' },
  ]

  return (
    <div className="gvhd-shell">
      <GVHDSidebar />
      <main className="gvhd-main">
        {/* Topbar */}
        <div className="gvhd-topbar">
          <div className="gvhd-breadcrumb">
            <button className="td-back-btn" onClick={() => window.history.back()}>← Quay lại danh sách sinh viên</button>
            <span className="gvhd-bc-sep">|</span>
            <span>HK2 (2024-2025)</span>
            <span className="gvhd-bc-sep">|</span>
            <span>MSSV: 20110045</span>
            <span className="td-tag-dn">● ĐANG THỰC TẬP (TUẦN 5/12)</span>
            <span className="td-tag-company">🏢 FPT Software</span>
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

        {/* Student header */}
        <div className="td-student-header">
          <div className="td-student-left">
            <div className="td-student-avatar">NVA</div>
            <div>
              <h1 className="td-student-title">Hồ sơ thực tập: Nguyễn Văn An</h1>
              <div className="td-student-meta-row">
                <span className="td-meta-badge">MSSV: 20110045</span>
                <span className="td-meta-text">• Lớp 21DTH02 • Kỹ thuật Phần mềm •</span>
                <span className="td-meta-text">GVHD: TS. Lê Hoàng Dũng</span>
                <span className="td-meta-text">🏢 Frontend Intern @ F-Town 3</span>
              </div>
            </div>
          </div>
          <div className="td-student-actions">
            <button className="td-btn-blue">📨 Gửi phản hồi</button>
            <button className="td-btn-outline">📝 Nhập điểm giữa kỳ</button>
            <button className="td-btn-green">✅ Duyệt báo cáo Tuần 5</button>
          </div>
        </div>

        {/* Tab nav */}
        <div className="td-tabs">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`td-tab${activeTab === t.key ? ' active' : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.icon} {t.label}
              {t.badge && <span className="td-tab-badge">{t.badge}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="td-content">
          {activeTab === 'tong-quan' && (
            <div className="td-tong-quan">
              {/* Stats */}
              <div className="td-stats-row">
                <div className="td-stat-card">
                  <div className="td-stat-label">THÔNG TIN SINH VIÊN <span className="td-stat-khoa">Khóa 2021</span></div>
                  <div className="td-stat-fields">
                    <div><span>Họ tên &amp; MSSV</span><strong>Nguyễn Văn An<br />MSSV: 20110045 • Lớp 21DTH02</strong></div>
                    <div><span>Chuyên ngành</span><strong>CN Kỹ thuật PM</strong></div>
                    <div><span>Điểm tích lũy (GPA)</span><strong>3.42 / 4.0</strong></div>
                    <div><span>Email sinh viên</span><strong>20110045@fit.edu.vn</strong></div>
                    <div><span>Điện thoại di động</span><strong>0912 345 678</strong></div>
                  </div>
                </div>
                <div className="td-stat-card">
                  <div className="td-stat-label">TIẾN ĐỘ KỸ THUẬT</div>
                  <div className="td-progress-center">
                    <div className="td-progress-ring-wrap">
                      <svg width="90" height="90" viewBox="0 0 90 90">
                        <circle cx="45" cy="45" r="36" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                        <circle cx="45" cy="45" r="36" fill="none" stroke="#1a56db" strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 36 * 0.416} ${2 * Math.PI * 36}`}
                          strokeLinecap="round" transform="rotate(-90 45 45)"/>
                      </svg>
                      <div className="td-progress-center-text">
                        <strong>5/12</strong><span>Tuần</span>
                      </div>
                    </div>
                    <div>
                      <div className="td-progress-pct">41.6%</div>
                      <div className="td-progress-sub">Hoàn thành</div>
                    </div>
                  </div>
                </div>
                <div className="td-stat-card">
                  <div className="td-stat-label">ĐIỂM TUẦN TRUNG BÌNH</div>
                  <div className="td-score-display">
                    <div className="td-score-big">9.0</div>
                    <div className="td-score-sub">/ 10 điểm (4 báo cáo)</div>
                    <div className="td-score-tag">✨ Xuất sắc</div>
                  </div>
                </div>
                <div className="td-stat-card td-stat-warn">
                  <div className="td-stat-label">TRẠNG THÁI HIỆN TẠI</div>
                  <div className="td-status-display">
                    <div className="td-status-num">1</div>
                    <div className="td-status-label">Báo cáo<br />chờ GVHD duyệt</div>
                    <div className="td-deadline-warn">Deadline đánh giá: Hôm nay 23:59</div>
                  </div>
                </div>
              </div>

              {/* DN Info */}
              <div className="td-dn-card">
                <div className="td-dn-header">
                  <span>📋 ĐƠN VỊ THỰC TẬP TIẾP NHẬN</span>
                  <span className="td-dn-contract">Hợp đồng hợp lệ</span>
                </div>
                <div className="td-dn-info">
                  <div>
                    <div className="td-dn-company">Công ty Cổ phần FPT Software</div>
                    <div className="td-dn-addr">📍 Tòa nhà F-Town 3, Đường D1, Khu Công nghệ cao, TP. Thủ Đức, TP. HCM</div>
                    <div className="td-dn-position">Vị trí thực tập: <span className="td-tag-role">ReactJS / TypeScript</span></div>
                    <div className="td-dn-mentor">Cán bộ hướng dẫn DN (Mentor)<br />Trần Đình Khoa &nbsp; Tech Lead • 8/9<br />khoatd@fsoft.com.vn</div>
                  </div>
                  <div>
                    <div className="td-dn-dates">Ngày bắt đầu: 03/03/2025<br />Dự kiến kết thúc: 25/05/2025</div>
                    <div className="td-dn-outline">
                      ĐỀ CƯƠNG THỰC TẬP TỐT NGHIỆP<br />
                      <span className="td-file-link">📄 DeCuong_ThucTap_NguyenVanA… • Đã được duyệt 2/03</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report week 5 */}
              <div className="td-report-card">
                <div className="td-report-header">
                  <div className="td-report-badge">📝 Báo cáo Tuần 5 <span className="td-report-status-waiting">Chờ giảng viên duyệt</span></div>
                  <div className="td-report-date">📅 Nộp ngày 06/04/2025 lúc 21:36 (Đúng hạn)</div>
                </div>
                <div className="td-report-summary-title">TÓM TẮT KẾT QUẢ CÔNG VIỆC ĐÃ THỰC HIỆN</div>
                <div className="td-report-summary">
                  Trong tuần 5, em đã hoàn thành các hạng mục theo phân công của Tech Lead Trần Đình Khoa:
                  <ul>
                    <li><strong>Unit Testing:</strong> Đã hoàn thiện 45 test cases cho toàn bộ Redux Thunks &amp; Reducer module Quản lý kho bằng Vitest và React Testing Library. Mức độ bao phủ (Coverage) hiện tại đạt 84%.</li>
                    <li><strong>Tối ưu hiệu năng:</strong> Áp dụng kỹ thuật react.memo, useCallback và windowing cho bảng dữ liệu Data Grid trên 1,600 bản ghi, giảm thời gian render từ 320ms xuống còn 45ms.</li>
                    <li><strong>Code Review:</strong> Đã Mentor approve 2 Pull Requests (#142, #145) trên hệ thống GitLab doanh nghiệp.</li>
                  </ul>
                </div>
                <div className="td-report-file">
                  <div className="td-file-card">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a56db" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    BaoCao_Tuan5_NguyenVanAn.docx &nbsp; 2.4 MB
                    <span className="td-file-note">Đã có chữ ký xác nhận Mentor Trần Đình Khoa (FPT Software)</span>
                  </div>
                  <div className="td-file-actions">
                    <button className="td-btn-text">🔍 Xem trực tuyến</button>
                    <button className="td-btn-text">⬇️ Tải về</button>
                  </div>
                </div>
                <div className="td-review-section">
                  <div className="td-review-title">✏️ Nhận xét &amp; Đánh giá của Giảng viên hướng dẫn (TS. Lê Hoàng Dũng)</div>
                  <div className="td-review-sub">NỘI DUNG PHẢN HỒI / ĐỀP / KHUYẾN NGHỊ</div>
                  <textarea
                    className="td-review-textarea"
                    placeholder="Nhập nhận xét về chất lượng báo cáo, thái độ thực tập, đồ sáu kỹ thuật hoặc yêu cầu bổ sung minh chứng..."
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    rows={3}
                  />
                  <div className="td-review-score-row">
                    <div className="td-review-score-label">Điểm đánh giá Tuần 5:</div>
                    <input
                      type="number"
                      min={0} max={10} step={0.5}
                      className="td-score-input"
                      value={weekScore}
                      onChange={e => setWeekScore(e.target.value)}
                    />
                    <span className="td-score-denom">/ 10</span>
                    <span className="td-score-thang">Thang điểm 10</span>
                    <span className="td-warn-label">⚠️ Yêu cầu chỉnh sửa</span>
                    <div className="td-review-btns">
                      <button className="td-btn-outline-sm">Yêu cầu chỉnh sửa</button>
                      <button className="td-btn-approve">✅ Duyệt &amp; Cho điểm tuần</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* History */}
              <div className="td-history-card">
                <div className="td-history-header">
                  <span>📋 Lịch sử đánh giá 4 tuần trước</span>
                  <span className="td-history-check">✅ Đã hoàn tất kiểm tra hồ sơ</span>
                </div>
                <table className="td-history-table">
                  <thead>
                    <tr>
                      <th>TUẦN &amp; THỜI GIAN</th>
                      <th>CHỦ ĐỀ &amp; NHIỆM VỤ TRỌNG TÂM</th>
                      <th>ĐIỂM SỐ</th>
                      <th>NHẬN XÉT CỦA GVHD</th>
                      <th>TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {WEEKLY_HISTORY.map((w, i) => (
                      <tr key={i}>
                        <td>
                          <strong>{w.tuan}</strong>
                          <div className="td-hist-date">{w.ngay}</div>
                        </td>
                        <td style={{ whiteSpace: 'pre-line' }}>{w.topic}</td>
                        <td><div className="td-hist-score">{w.score}</div></td>
                        <td>{w.comment}</td>
                        <td><span className="td-hist-status">{w.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab !== 'tong-quan' && (
            <div className="td-placeholder">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚧</div>
              <h3>Tab này đang được phát triển</h3>
              <p>Chọn tab "1. Tổng quan" để xem dữ liệu đầy đủ.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
