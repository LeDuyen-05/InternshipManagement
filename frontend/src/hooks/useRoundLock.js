import { useCallback, useEffect, useState } from 'react'
import apiClient from '../services/api'
import { roundLockAccess } from '../utils/roundLock'

export function useRoundLock(maDot) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(x => x + 1), [])
  useEffect(() => {
    let active = true
    setData(null); setError(''); setLoading(true)
    if (!maDot) { setLoading(false); return () => { active = false } }
    apiClient.get(`/dot-thuc-tap/${encodeURIComponent(maDot)}/khoa`).then(({ data: response }) => {
      if (active) setData(response)
    }).catch(() => { if (active) setError('Không kiểm tra được trạng thái khóa đợt. Hãy tải lại trước khi sửa dữ liệu.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [maDot, revision])
  useEffect(() => {
    window.addEventListener('round-lock-changed', refresh)
    window.addEventListener('focus', refresh)
    return () => { window.removeEventListener('round-lock-changed', refresh); window.removeEventListener('focus', refresh) }
  }, [refresh])
  useEffect(() => {
    if (data?.trangThai !== 'MoLai' || !data.hanMoLai) return
    const timer = setTimeout(refresh, Math.min(2147483000, Math.max(20, new Date(data.hanMoLai).getTime() - Date.now() + 20)))
    return () => clearTimeout(timer)
  }, [data, refresh])
  return { data, loading, error, refresh, ...roundLockAccess(data, maDot) }
}

export function announceRoundLockChange() {
  window.dispatchEvent(new Event('round-lock-changed'))
}
