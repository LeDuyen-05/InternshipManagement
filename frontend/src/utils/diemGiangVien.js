export const hasScore = value => value != null && String(value).trim() !== ''
export function summarizeCompletedForms(forms) {
  const completed = forms.filter(x => x.daDuDiem === true && hasScore(x.tongDiem) && Number.isFinite(Number(x.tongDiem)))
  return { count: completed.length, average: completed.length ? completed.reduce((sum, x) => sum + Number(x.tongDiem), 0) / completed.length : null }
}
const validPrecision = value => Math.abs(Number(value) * 100 - Math.round(Number(value) * 100)) < 1e-8

export function restoreLecturerScores(criteria, details = []) {
  return Object.fromEntries(criteria.map(criterion => {
    const detail = details.find(item => item.maTieuChi === criterion.maTieuChi)
    return [criterion.maTieuChi, detail == null ? '' : Number(detail.diemCham)]
  }))
}

export function buildLecturerDetails(criteria, scores) {
  return criteria.filter(criterion => criterion.nhomDanhGia === 'GV' && hasScore(scores[criterion.maTieuChi]))
    .map(criterion => {
      const value = Number(scores[criterion.maTieuChi])
      if (!Number.isFinite(value) || value < 0 || value > Number(criterion.diemToiDa)) {
        throw new Error(`Điểm ${criterion.maTieuChi} phải từ 0 đến ${criterion.diemToiDa}.`)
      }
      if (!validPrecision(value)) throw new Error(`Điểm ${criterion.maTieuChi} chỉ được có tối đa hai chữ số thập phân.`)
      return { maTieuChi: criterion.maTieuChi, diemCham: value }
    })
}

export function summarizeGrade(criteria, scores) {
  const complete = criteria.some(c => c.nhomDanhGia === 'GV') && criteria.some(c => c.nhomDanhGia === 'DN') && criteria.every(criterion => hasScore(scores[criterion.maTieuChi])
    && Number.isFinite(Number(scores[criterion.maTieuChi])) && Number(scores[criterion.maTieuChi]) >= 0
    && Number(scores[criterion.maTieuChi]) <= Number(criterion.diemToiDa) && validPrecision(scores[criterion.maTieuChi]))
  const total = criteria.reduce((sum, criterion) => sum + (Number(scores[criterion.maTieuChi]) || 0), 0)
  if (!complete) return { total, complete, ketQua: 'Chưa đủ điểm', xepLoai: 'Chưa đủ điểm thành phần', diemHe4: '—' }
  const rounded = Math.round(total * 10 + 1e-9) / 10
  const levels = [[8.5, 'A', 'Giỏi', 4], [8, 'B+', 'Khá', 3.5], [7, 'B', 'Khá', 3],
    [6.5, 'C+', 'Trung bình', 2.5], [5.5, 'C', 'Trung bình', 2], [5, 'D+', 'Trung bình yếu', 1.5],
    [4, 'D', 'Trung bình yếu', 1], [0, 'F', 'Kém', 0]]
  const [, diemChu, label, diemHe4] = levels.find(([minimum]) => rounded >= minimum)
  return { total, complete, diemChu, diemHe4: diemHe4.toFixed(1), xepLoai: `${label} (${diemChu})`, ketQua: rounded >= 4 ? 'Đạt' : 'Không đạt' }
}
