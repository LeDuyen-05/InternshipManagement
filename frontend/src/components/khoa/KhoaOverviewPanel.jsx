import { Link } from 'react-router-dom'

export default function KhoaOverviewPanel({ overview, notifications, noticeError, noticeLoading }) {
  const queues = [
    { to: '/khoa/dang-ky', title: 'Nguyện vọng chờ duyệt', value: overview.pendingRegistrations, action: 'Xét duyệt hồ sơ', icon: 'assignment_late', color: 'amber' },
    { to: '/khoa/dang-ky?loai=tu-tim', title: 'Hồ sơ tự tìm chờ công nhận', value: overview.pendingSelfArranged, action: 'Xem hồ sơ tự tìm', icon: 'domain_verification', color: 'indigo' },
    { to: '/khoa/doanh-nghiep', title: 'Doanh nghiệp chờ duyệt', value: overview.pendingCompanies, action: 'Xem danh mục toàn khoa', icon: 'corporate_fare', color: 'rose' },
    { to: '/khoa/phan-cong', title: 'Có nơi, chưa có GVHD', value: overview.unassignedSupervisors, action: 'Phân công GVHD', icon: 'person_alert', color: 'orange' },
    { to: '/khoa/theo-doi', title: 'Báo cáo chờ rà soát', value: overview.pendingReports, action: 'Theo dõi tiến độ', icon: 'rate_review', color: 'purple' },
  ]

  // Tính % hoàn thành học vụ theo đúng số SV tham gia đợt (không lấy toàn danh mục khi đợt trống)
  const baseStudents =
    Number.isFinite(overview.participatingStudents) && overview.participatingStudents >= 0
      ? overview.participatingStudents
      : 0
  const pctAllocated = baseStudents > 0
    ? Math.min(100, Math.round(((overview.allocatedStudents || 0) / baseStudents) * 100))
    : 0

  const allocated = overview.allocatedStudents || 0
  const pctAssigned = allocated > 0
    ? Math.min(100, Math.round(((overview.assignedSupervisors || 0) / allocated) * 100))
    : 0

  const normalizedGroups = (() => {
    if (!Array.isArray(overview.internshipGroups)) return null
    const extra =
      overview.internshipGroups.find((g) => g.ma === 'ChuaXacMinhThoiGian')
        ?.soLuong || 0
    const targetMa =
      overview.activeRound?.trangThai === 'ChuaBatDau'
        ? 'ChuaBatDau'
        : overview.activeRound?.trangThai === 'DaKetThuc'
        ? 'ChoHoanTat'
        : 'DangThucTap'
    return overview.internshipGroups
      .filter((g) => g.ma !== 'ChuaXacMinhThoiGian')
      .map((g) =>
        g.ma === targetMa && extra > 0
          ? { ...g, soLuong: (g.soLuong || 0) + extra }
          : g
      )
  })()

  return (
    <div className="space-y-6">
      {/* Cảnh báo chưa có đợt thực tập */}
      {!overview.activeRound && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0">warning</span>
          <div className="text-sm">
            <p className="font-semibold">Chưa có đợt thực tập đang hoạt động</p>
            <p className="text-amber-700 mt-0.5">
              Chưa có đợt thực tập. <Link to="/khoa/dot-thuc-tap" className="font-bold underline hover:text-amber-900">Tạo hoặc chọn đợt thực tập</Link> để theo dõi nghiệp vụ.
            </p>
          </div>
        </div>
      )}

      {/* Thông tin SV tham gia đợt theo nhóm thời gian tại DN */}
      {overview.internshipGroups && (
        <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">groups</span>
                <h2 className="text-base font-bold text-slate-800">
                  SV tham gia đợt: <span className="text-indigo-600">{overview.participatingStudents}</span>
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">

              </p>
            </div>
            <Link
              to="/khoa/sinh-vien-theo-dot"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors shrink-0"
            >
              <span>Xem danh sách sinh viên trong đợt</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-2 pt-4 mt-3 border-t border-slate-100">
            {normalizedGroups.map((x) => (
              <span
                key={x.ma}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>{x.ten}:</span>
                <strong className="font-bold text-slate-900">{x.soLuong}</strong>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Bento Row 1: 4 Thẻ KPI chính */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="SV có nơi thực tập"
          value={overview.allocatedStudents}
          note="Phân bổ còn hiệu lực trong đợt"
          icon="apartment"
          color="indigo"
        />
        <KpiCard
          label="Đã phân công GVHD"
          value={overview.assignedSupervisors}
          note="SV có nơi thực tập trong đợt"
          icon="school"
          color="emerald"
        />
        <KpiCard
          label="Nguyện vọng chờ duyệt"
          value={overview.pendingRegistrations}
          note="Đăng ký trên hệ thống trong đợt"
          icon="pending_actions"
          color="amber"
        />
        <KpiCard
          label="Báo cáo chờ xử lý"
          value={overview.pendingReports}
          note="Báo cáo trong đợt được chọn"
          icon="rate_review"
          color="purple"
        />
      </div>

      {/* Bento Row 2: 2 Thanh tiến độ % hoàn thành học vụ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tiến độ 1: % Có nơi thực tập */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">domain_verification</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Tỷ lệ SV có nơi thực tập</h3>
                  <p className="text-[11px] text-slate-400">Tiến độ tiếp nhận vào các doanh nghiệp</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-600 font-mono">{pctAllocated}%</span>
              <p className="text-[11px] text-slate-400 font-medium">
                {overview.allocatedStudents ?? 0} / {baseStudents} SV
              </p>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-4">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pctAllocated >= 90
                  ? 'bg-emerald-500'
                  : pctAllocated >= 50
                  ? 'bg-indigo-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${pctAllocated}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Dựa trên {baseStudents} SV tham gia đợt</span>
            <span className="font-semibold text-slate-700">
              {baseStudents === 0
                ? 'Chưa có SV tham gia đợt'
                : baseStudents - (overview.allocatedStudents || 0) > 0
                ? `Còn ${baseStudents - (overview.allocatedStudents || 0)} SV chưa có nơi`
                : 'Đã hoàn tất 100%'}
            </span>
          </p>
        </div>

        {/* Tiến độ 2: % Đã phân công GVHD */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-lg">person_celebrate</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Tỷ lệ phân công GVHD</h3>
                  <p className="text-[11px] text-slate-400">Gán giảng viên hướng dẫn cho SV đã có nơi</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-600 font-mono">{pctAssigned}%</span>
              <p className="text-[11px] text-slate-400 font-medium">
                {overview.assignedSupervisors ?? 0} / {allocated} SV
              </p>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-4">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pctAssigned >= 90
                  ? 'bg-emerald-500'
                  : pctAssigned >= 50
                  ? 'bg-emerald-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${pctAssigned}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
            <span>Dựa trên {allocated} SV đã có nơi thực tập</span>
            <span className="font-semibold text-slate-700">
              {allocated === 0 && !(overview.unassignedSupervisors > 0)
                ? 'Chưa có SV có nơi thực tập'
                : overview.unassignedSupervisors > 0
                ? `Còn ${overview.unassignedSupervisors} SV chờ gán GV`
                : 'Đã gán đủ GVHD'}
            </span>
          </p>
        </div>
      </div>

      {/* Bento Row 3: Việc cần Khoa xử lý (Action queues) */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">notification_important</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Việc cần Khoa xử lý</h2>
              <p className="text-xs text-slate-500">

              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {queues.map((item) => {
            const count = item.value ?? 0
            const hasUrgent = count > 0

            return (
              <Link
                key={item.title}
                to={item.to}
                className={`group flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  hasUrgent
                    ? 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50 hover:border-rose-300 hover:shadow-xs'
                    : 'bg-slate-50/60 border-slate-200/70 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`material-symbols-outlined text-lg ${hasUrgent ? 'text-rose-600' : 'text-slate-400'}`}>
                      {item.icon}
                    </span>
                    {hasUrgent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        Chờ xử lý
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        Đã xong
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 line-clamp-2 min-h-[32px]">
                    {item.title}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200/50 flex items-end justify-between">
                  <span className={`text-2xl font-black font-mono ${hasUrgent ? 'text-rose-600' : 'text-slate-700'}`}>
                    {count}
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-600 group-hover:text-indigo-800 flex items-center gap-0.5">
                    {item.action}
                    <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Bento Row 4: Điều hành nhanh */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">bolt</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Điều hành nhanh</h2>
              <p className="text-xs text-slate-500">
                Toàn khoa: {overview.totalStudents ?? 0} hồ sơ sinh viên · {overview.approvedCompanies ?? 0} doanh nghiệp đã duyệt.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['/khoa/dot-thuc-tap', 'Quản lý đợt thực tập', 'date_range', 'text-blue-600 bg-blue-50'],
            ['/khoa/doanh-nghiep', 'Doanh nghiệp liên kết', 'domain', 'text-cyan-600 bg-cyan-50'],
            ['/khoa/dang-ky', 'Xét duyệt hồ sơ thực tập', 'how_to_reg', 'text-indigo-600 bg-indigo-50'],
            ['/khoa/phan-cong', 'Phân công GVHD mới', 'person_add', 'text-emerald-600 bg-emerald-50'],
            ['/khoa/phan-bo', 'Danh sách & điều chỉnh GVHD', 'swap_horiz', 'text-violet-600 bg-violet-50'],
            ['/khoa/theo-doi', 'Theo dõi tiến độ', 'trending_up', 'text-amber-600 bg-amber-50'],
            ['/khoa/thong-ke-clo', 'Thống kê CLO', 'bar_chart', 'text-sky-600 bg-sky-50'],
            ['/khoa/tieu-chi', 'Tiêu chí CLO', 'rule', 'text-teal-600 bg-teal-50'],
          ].map(([to, label, icon, iconStyle]) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg ${iconStyle} flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined text-base">{icon}</span>
                </div>
                <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {label}
                </span>
              </div>
              <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 shrink-0">
                arrow_forward
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Bento Row 5: Thông báo toàn khoa */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">campaign</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Thông báo toàn khoa</h2>
              <p className="text-xs text-slate-500">Các thông báo mới nhất gửi đến giảng viên, doanh nghiệp và sinh viên</p>
            </div>
          </div>
        </div>

        {noticeLoading ? (
          <div role="status" className="p-6 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl animate-pulse">
            <span className="material-symbols-outlined text-2xl text-slate-400 animate-spin mb-1">sync</span>
            <p>Đang tải thông báo…</p>
          </div>
        ) : noticeError ? (
          <div role="alert" className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
            <span>{noticeError}</span>
          </div>
        ) : notifications && notifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {notifications.slice(0, 5).map((item) => (
              <article key={item.maThongBao} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <strong className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer">
                    {item.tieuDe}
                  </strong>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.noiDung}</p>
                </div>
                <time className="text-[11px] font-mono text-slate-400 shrink-0">
                  {String(item.ngayTao || '').replace('T', ' ').slice(0, 16)}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl">
            <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">notifications_off</span>
            <p>Chưa có thông báo.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function KpiCard({ label, value, note, icon, color }) {
  const colorMap = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', valText: 'text-indigo-700' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', valText: 'text-emerald-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', valText: 'text-amber-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', valText: 'text-purple-700' },
  }
  const theme = colorMap[color] || colorMap.indigo

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs transition-all hover:shadow-sm hover:border-slate-300 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-3 mb-3">
        <small className="text-xs font-bold text-slate-600 uppercase tracking-wider">{label}</small>
        <div className={`w-8 h-8 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center shrink-0`}>
          <span className="material-symbols-outlined text-lg">{icon}</span>
        </div>
      </div>
      <div>
        <strong className={`text-3xl font-black font-mono ${theme.valText}`}>
          {value ?? 0}
        </strong>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">{note}</p>
      </div>
    </div>
  )
}
