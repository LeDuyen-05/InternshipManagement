import { useCallback, useEffect, useRef, useState } from 'react'
import { dangKyThucTapService } from '../services/dangKyThucTapService'

// Cập nhật hạn đăng ký và số chỗ còn lại mỗi phút và khi quay lại tab.
export function useRecruitmentAvailability(student, round) {
  const key = JSON.stringify([student, round])
  const current = useRef(key)
  current.current = key
  const pending = useRef(null)
  const generation = useRef(0)
  const [state, setState] = useState({})
  const refresh = useCallback(() => {
    if (!student || !round) return Promise.resolve(null)
    if (pending.current?.key === key) return pending.current.promise
    const requestGeneration = generation.current
    setState(previous => ({ ...(previous.key === key ? previous : {}), key, checking: true }))
    const promise = dangKyThucTapService.getDanhSachCongTy(round)
      .then(offers => {
        if (!Array.isArray(offers)) throw new Error('Invalid offers response')
        if (current.current !== key || requestGeneration !== generation.current) return null
        setState({ key, offers, checking: false, error: '' })
        return offers
      })
      .catch(() => {
        if (current.current === key && requestGeneration === generation.current) setState(previous => ({ ...(previous.key === key ? previous : {}), key, checking: false,
          error: 'Chưa tải được thông tin tuyển dụng. Bạn hãy thử lại trước khi đăng ký.' }))
        return null
      })
      .finally(() => { if (pending.current?.promise === promise) pending.current = null })
    pending.current = { key, promise }
    return promise
  }, [student, round, key])

  useEffect(() => {
    const lifecycle = generation
    current.current = key
    refresh()
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    const timer = setInterval(onVisible, 60000)
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
      current.current = null
      lifecycle.current++
      pending.current = null
    }
  }, [refresh, key])

  return { ...(state.key === key ? state : {}), refresh }
}
