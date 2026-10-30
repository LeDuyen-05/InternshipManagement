// Chuỗi DATETIME2 cũ không có offset được hiểu là giờ Việt Nam.
// API mới và form gửi rõ +07:00 để không phụ thuộc múi giờ trình duyệt/máy chủ.
export function interviewInstant(value) {
  if (value == null || value === '') return NaN
  if (typeof value === 'string' && value.startsWith('0001-01-01')) return NaN
  let normalized = value
  if (typeof value === 'string' && !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    normalized = `${value.length === 10 ? `${value}T00:00:00` : value}+07:00`
  }
  return new Date(normalized).getTime()
}

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function vietnamDateTimeParts(value = Date.now()) {
  const instant = interviewInstant(value)
  if (!Number.isFinite(instant)) return { date: '', time: '' }
  const parts = Object.fromEntries(partsFormatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

export function interviewFormTimestamp(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) return ''
  const result = `${date}T${time}:00+07:00`
  const parts = vietnamDateTimeParts(result)
  return parts.date === date && parts.time === time ? result : ''
}

export function hasInterviewStarted(value, now = Date.now()) {
  const instant = interviewInstant(value)
  return Number.isFinite(instant) && instant <= now
}

export function isFutureInterview(value, now = Date.now()) {
  const instant = interviewInstant(value)
  return Number.isFinite(instant) && instant > now
}

export function formatInterviewDate(value) {
  const instant = interviewInstant(value)
  return Number.isFinite(instant)
    ? new Date(instant).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
    : 'Chưa định ngày'
}

export function formatInterviewTime(value) {
  return vietnamDateTimeParts(value).time || 'Chưa hẹn giờ'
}
