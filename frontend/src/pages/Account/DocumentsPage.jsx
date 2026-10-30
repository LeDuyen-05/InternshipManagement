import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useIdentity } from '../../hooks/useIdentity'
import apiClient from '../../services/api'
import DocumentAttachments from '../../components/common/DocumentAttachments'

const titles = {
  CV: 'CV sinh viên',
  Progress: 'Tệp báo cáo tiến độ',
  SelfPlacement: 'Giấy tiếp nhận bên ngoài',
  PlacementEvidence: 'Giấy tờ bố trí / hủy / đổi nơi',
  EnterpriseForm: 'Phiếu đánh giá DN có chữ ký',
  Notification: 'Tệp đính kèm thông báo',
  Template: 'Biểu mẫu thực tập',
}

export default function DocumentsPage() {
  const { user } = useIdentity()
  const [params] = useSearchParams()
  const [capability, setCapability] = useState(null)
  const [error, setError] = useState('')
  const role = user?.maVaiTro
  // Giữ liên kết tệp đã phát hành; không còn duyệt kho hồ sơ từ menu.
  const kind = params.get('kind') || 'Template'
  const resourceId = kind === 'Template' ? 'GLOBAL' : params.get('resourceId')
  const legacy = kind !== 'Template'
  const allowed = Boolean(capability && capability.role === role && capability.kinds.includes(kind))

  useEffect(() => {
    let active = true
    setCapability(null)
    setError('')
    apiClient.get('/documents/capabilities')
      .then(({ data }) => { if (active) setCapability({ role, kinds: data.kinds || [] }) })
      .catch(e => { if (active) setError(e.response?.data?.message || 'Không tải được quyền xem tệp. Hãy tải lại trang.') })
    return () => { active = false }
  }, [role])

  return <div className="max-w-4xl mx-auto space-y-5">
    <header className="space-y-2">
      <h1 className="text-2xl font-bold text-slate-900">{legacy ? 'Tệp đính kèm hồ sơ' : 'Biểu mẫu thực tập'}</h1>
      <p className="text-sm text-slate-600">{legacy
        ? 'Liên kết tệp của hồ sơ. Bạn cũng có thể xem tệp ngay tại màn hình xử lý hồ sơ tương ứng.'
        : 'Tải các mẫu thực tập do Khoa CNTT cung cấp. Điền mẫu và nộp tại hồ sơ hoặc mốc báo cáo tương ứng.'}</p>
      {legacy && <Link className="text-sm text-blue-700 underline" to={role === 'VT05' ? '/doanh-nghiep/tai-lieu' : '/tai-lieu'}>Biểu mẫu thực tập</Link>}
    </header>
    {error ? <p role="alert" className="text-rose-700">{error}</p>
      : capability?.role !== role ? <p role="status">Đang tải quyền xem tệp…</p>
        : !allowed || !titles[kind] ? <p role="alert">Bạn không có quyền xem nhóm tệp này.</p>
          : !resourceId ? <p role="alert">Liên kết thiếu hồ sơ. Hãy mở tệp từ màn hình xử lý hồ sơ.</p>
            : <DocumentAttachments key={`${role}|${kind}|${resourceId}`} kind={kind} resourceId={resourceId}
                title={titles[kind]} readOnly={kind === 'Template' ? role !== 'VT02' : role === 'VT03'} />}
  </div>
}
