export default function ThongKeCards({ thongKe, loading }) {
  const stats = [
    {
      key: 'tongSinhVien',
      label: 'Tổng sinh viên',
      value: thongKe?.tongSinhVien ?? 0,
      icon: 'groups',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      textColor: 'text-blue-900',
    },
    {
      key: 'chuaCoNoi',
      label: 'Chưa có nơi thực tập',
      value: thongKe?.chuaCoNoi ?? 0,
      icon: 'warning',
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      textColor: 'text-rose-900',
    },
    {
      key: 'choKetQua',
      label: 'Chờ kết quả ứng tuyển',
      value: thongKe?.choKetQua ?? 0,
      icon: 'hourglass_top',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      textColor: 'text-amber-900',
    },
    {
      key: 'datChoXacNhan',
      label: 'Trúng tuyển chờ xác nhận',
      value: thongKe?.datChoXacNhan ?? 0,
      icon: 'pending',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      textColor: 'text-indigo-900',
    },
    {
      key: 'canHoTroTiep',
      label: 'Cần Khoa hỗ trợ',
      value: thongKe?.canHoTroTiep ?? 0,
      icon: 'support_agent',
      color: 'bg-purple-50 text-purple-700 border-purple-200',
      textColor: 'text-purple-900',
    },
    {
      key: 'daCoNoi',
      label: 'Đã có nơi chính thức',
      value: thongKe?.daCoNoi ?? 0,
      icon: 'check_circle',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      textColor: 'text-emerald-900',
    },
  ]

  return (
    <div className="space-y-2 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div
            key={s.key}
            className={`p-3.5 rounded-2xl border ${s.color} bg-white flex flex-col justify-between transition-all shadow-xs`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight">
                {s.label}
              </span>
              <span className={`material-symbols-outlined text-[20px] ${s.textColor}`}>
                {s.icon}
              </span>
            </div>
            <div className="mt-2">
              <span className={`text-2xl font-black ${s.textColor}`}>
                {loading ? '—' : s.value}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 italic">
        * Dữ liệu phản ánh tình trạng ứng tuyển và nơi thực tập theo thời gian thực trong đợt.
      </p>
    </div>
  )
}
