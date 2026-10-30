import { interviewInstant } from './interviewTime.js'

export function confirmationExpired(placement, now = Date.now()) {
  if (!placement || placement.daDuocKhoaDuyet || placement.trangThai !== 'ChuaNhanViec') return false
  const deadline = interviewInstant(placement.hanXacNhanSV)
  return Number.isFinite(deadline) ? now >= deadline : !!placement.quaHanXacNhan
}
