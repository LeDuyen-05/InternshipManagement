import { useEffect, useRef, useState } from 'react'
import apiClient from '../../services/api'
import DocumentAttachments from '../common/DocumentAttachments'
import ModalOverlay from '../common/ModalOverlay'

export default function StudentEnterpriseDocuments({ maSV, maDot }) {
  const [opened, setOpened] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const key = `${maDot}|${maSV}`
  const current = useRef(key)
  current.current = key

  useEffect(() => {
    let active = true
    setResult(null)
    setError('')
    if (!opened || !maSV || !maDot) return
    apiClient.get('/khoa/phan-bo/lich-su', { params: { maSV, maDot } })
      .then(({ data }) => {
        if (active && current.current === key) {
          if (!Array.isArray(data?.phanBos)) throw new Error('Hồ sơ nơi thực tập chưa đúng định dạng.')
          setResult({ key, rows: data.phanBos.filter(row => row.maDot === maDot) })
        }
      })
      .catch(e => { if (active && current.current === key) setError(e.response?.data?.message || e.message || 'Không tải được phiếu DN.') })
    return () => { active = false }
  }, [opened, maSV, maDot, key, retry])

  return <div className="space-y-2 text-left min-w-[160px]">
    <button type="button" className="text-blue-700 underline text-xs" onClick={() => setOpened(value => !value)}>
      {opened ? 'Đóng phiếu DN' : 'Xem phiếu DN đã ký'}
    </button>
    {opened && <ModalOverlay onClose={() => setOpened(false)}><section className="bg-white rounded-2xl p-5 space-y-4 w-full max-w-2xl max-h-[85vh] overflow-y-auto">
      <div className="flex justify-between items-center gap-4"><h2 className="font-bold">Phiếu đánh giá DN · {maSV}</h2><button type="button" onClick={() => setOpened(false)}>Đóng</button></div>
      {error ? <div role="alert" className="text-rose-700">{error} <button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div>
      : result?.key !== key ? <p role="status">Đang tải hồ sơ…</p>
        : !result.rows.length ? <p>Chưa có nơi thực tập trong đợt này.</p>
          : result.rows.map(row => <div key={row.maPhanBo} className="space-y-1">
              <p className="font-semibold">{row.tenCongTy}{row.trangThai === 'Huy' ? ' · Nơi cũ đã hủy' : ''}</p>
              <DocumentAttachments kind="EnterpriseForm" resourceId={row.maPhanBo} title="Phiếu đánh giá DN có chữ ký" readOnly={true} />
            </div>)}
    </section></ModalOverlay>}
  </div>
}
