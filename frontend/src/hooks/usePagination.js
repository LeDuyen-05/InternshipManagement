import { useState } from 'react'
import { paginate } from '../utils/pagination'

export function usePagination(items, resetKey = '') {
  const [settings, setSettings] = useState({ page: 1, pageSize: 10, resetKey })
  // A changed filter must reset synchronously, including when toggling A -> B -> A.
  const current = settings.resetKey === resetKey ? settings : { ...settings, page: 1, resetKey }
  const result = paginate(items, current.page, current.pageSize)
  if (settings.resetKey !== resetKey || settings.page !== result.page) {
    setSettings({ ...current, page: result.page })
  }
  return {
    ...result,
    setPage: page => setSettings(previous => ({ ...previous, resetKey, page })),
    setPageSize: pageSize => setSettings(previous => ({ ...previous, resetKey, page: 1, pageSize: Number(pageSize) })),
  }
}
