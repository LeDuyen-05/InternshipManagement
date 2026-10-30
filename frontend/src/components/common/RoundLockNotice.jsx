export default function RoundLockNotice({ lock }) {
  if (lock.loading) return null
  if (lock.error) {
    return (
      <div role="alert" className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
          <span>{lock.error}</span>
        </div>
        <button
          type="button"
          onClick={lock.refresh}
          className="px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
        >
          Tải lại
        </button>
      </div>
    )
  }
  if (lock.status === 'ChuaChot') return null
  const label = lock.status === 'MoLai' ? 'Đang mở lại để sửa điểm/báo cáo; dữ liệu điều chỉnh phải được Khoa chốt lại.'
    : lock.status === 'ChoChotLai' ? 'Đã hết hạn mở lại, đang chờ Khoa chốt lại. Dữ liệu hiện chỉ xem.'
      : 'Đợt đã chốt điểm và khóa. Chỉ xem, tải minh chứng và xuất báo cáo theo quyền.'
  return <p role="status" className="p-3 mb-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm">{label}</p>
}
