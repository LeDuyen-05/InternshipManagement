import { deadlineText } from '../../hooks/useGradeDeadline'

export default function GradeDeadlineNotice({ deadline, group }) {
  const data = deadline.data
  const isLoading = !data && (deadline.block === 'Đang kiểm tra khóa đợt…' || deadline.block === 'Đang tải thời hạn chấm…')
  const isDuplicateLockError = deadline.block === 'Không kiểm tra được trạng thái khóa đợt. Hãy tải lại trước khi sửa dữ liệu.'
  const isActualBlock = deadline.block && deadline.block !== 'Đang kiểm tra khóa đợt…' && deadline.block !== 'Đang tải thời hạn chấm…'

  return (
    <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700 flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="material-symbols-outlined text-base text-blue-600">schedule</span>
        <span>
          Chấm phần {group === 'DN' ? 'doanh nghiệp' : 'giảng viên'} (giờ Việt Nam):{' '}
          {isLoading ? (
            <span className="text-slate-500 italic text-xs">Đang đồng bộ thời hạn từ máy chủ…</span>
          ) : (
            <>
              <strong className="text-slate-900">{deadlineText(group === 'DN' ? data?.moChamDN : data?.moChamGV)}</strong>
              {' → '}
              <strong className="text-slate-900">{deadlineText(group === 'DN' ? data?.hanChamDN : data?.hanChamGV)}</strong>.
            </>
          )}
        </span>
      </div>
      {isActualBlock && !isDuplicateLockError && (
        <p className="text-amber-800 text-xs font-medium pl-6">{deadline.block}</p>
      )}
      {isDuplicateLockError && (
        <p className="text-amber-800 text-xs font-medium pl-6">
          Chưa tải được cấu hình thời hạn chấm điểm từ máy chủ (tạm khóa chỉnh sửa điểm để bảo vệ dữ liệu).
        </p>
      )}
    </div>
  )
}
