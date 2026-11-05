import { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../services/api'

export function useDebouncedValue(value, milliseconds = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), milliseconds)
    return () => clearTimeout(timer)
  }, [value, milliseconds])
  return debounced
}

export function usePagedApi(path, filters, { enabled = true, itemsKey = 'items', initialSize = 10 } = {}) {
  const filterKey = JSON.stringify(filters)
  const resetKey = JSON.stringify([path, filterKey])
  const [settings, setSettings] = useState({ resetKey, page: 1, pageSize: initialSize })
  const current = settings.resetKey === resetKey ? settings : { ...settings, resetKey, page: 1 }
  if (settings.resetKey !== resetKey) setSettings(current)
  const { page, pageSize } = current
  const key = JSON.stringify([resetKey, page, pageSize, enabled])
  const active = useRef(key); active.current = key
  const version = useRef(0)
  const pending = useRef(null)
  const [result, setResult] = useState({ key: '', data: null, error: '', loading: false })
  const load = useCallback(async () => {
    if (!enabled || active.current !== key) return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    const request = ++version.current
    const valid = () => active.current === key && request === version.current
    setResult(previous => ({ key, data: previous.key === key ? previous.data : null, error: '', loading: true }))
    try {
      const response = await apiClient.get(path, { params: { ...JSON.parse(filterKey), page, pageSize }, signal: controller.signal })
      if (valid()) setResult({ key, data: response.data, error: '', loading: false })
    } catch (error) {
      if (valid() && !controller.signal.aborted)
        setResult({ key, data: null, error: error.response?.data?.message || 'Không tải được danh sách. Vui lòng thử lại.', loading: false })
    }
  }, [enabled, key, path, filterKey, page, pageSize])
  useEffect(() => {
    load()
    const requests = version
    const operation = pending
    return () => { requests.current++; operation.current?.abort() }
  }, [load])
  const setError = useCallback(message => {
    if (active.current === key) setResult(previous => ({ ...previous, key, error: message }))
  }, [key])
  const data = enabled && result.key === key ? result.data : null
  const retained = useRef(null)
  if (data) retained.current = data
  const round = JSON.parse(filterKey).maDot
  const summaryData = data || (retained.current?.maDot === round ? retained.current : null)
  const count = data?.totalCount || 0
  const currentPage = data?.page || page
  return {
    data, summaryData, load,
    loading: enabled && (result.key !== key || result.loading),
    error: result.key === key ? result.error : '',
    setError,
    pagination: {
      items: data?.[itemsKey] || [], page: currentPage, pageSize, totalItems: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
      start: count ? (currentPage - 1) * pageSize + 1 : 0, end: Math.min(currentPage * pageSize, count),
      setPage: next => setSettings(previous => ({ ...previous, resetKey, page: Math.max(1, Number(next) || 1) })),
      setPageSize: next => setSettings(previous => ({ ...previous, resetKey, page: 1, pageSize: Number(next) })),
    },
  }
}
