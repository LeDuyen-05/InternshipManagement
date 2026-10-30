import { useEffect, useState } from 'react'
import apiClient from '../services/api'
import { useRoundLock } from './useRoundLock'

export const deadlineText = value => value
  ? new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
    }).format(new Date(value))
  : 'Chưa cấu hình'

export function useGradeDeadline(maDot, group) {
  const lock = useRoundLock(maDot)
  const [state, setState] = useState(null)
  useEffect(() => {
    if (!maDot) return
    let active = true
    const load = () => apiClient.get(`/thoi-han/${encodeURIComponent(maDot)}`)
      .then(r => { if (active) setState({ maDot, data: r.data }) })
      .catch(() => { if (active) setState({ maDot, error: 'Không tải được thời hạn chấm; vui lòng làm mới hoặc thử lại.' }) })
    load()
    const timer = setInterval(load, 30000)
    window.addEventListener('focus', load)
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', load) }
  }, [maDot])
  const current = state?.maDot === maDot ? state : null
  const block = !maDot ? 'Chọn đợt để xem thời hạn chấm.' : !current ? 'Đang tải thời hạn chấm…'
    : current.error || (group === 'DN' ? current.data.lyDoKhoaDN : current.data.lyDoKhoaGV)
  const lockBlock = lock.blocked ? (lock.error || (lock.loading ? 'Đang kiểm tra khóa đợt…' : 'Đợt đã khóa/chờ chốt lại; cần Khoa mở lại điểm và cấu hình hạn phù hợp.')) : null
  return { data: current?.data, block: lockBlock || block, canGrade: !lockBlock && !block }
}
