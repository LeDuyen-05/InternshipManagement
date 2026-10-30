export function validateEnterpriseCriteria(criteria) {
  const expected = { 'CLO4.1': 2, 'CLO4.2': 3 }
  if (criteria.length !== 2 || new Set(criteria.map(item => item.maCLO)).size !== 2
    || criteria.some(item => item.nhomDanhGia !== 'DN' || Number(item.diemToiDa) !== expected[item.maCLO])) {
    throw new Error('Đợt này chưa có đúng hai tiêu chí DN CLO4.1 (2 điểm) và CLO4.2 (3 điểm). Vui lòng liên hệ Khoa kiểm tra cấu hình.')
  }
  return criteria
}

export function toWeightedEnterpriseScore(rawScore, maximum) {
  if (rawScore == null || String(rawScore).trim() === '' || !Number.isFinite(Number(rawScore))
    || Number(rawScore) < 0 || Number(rawScore) > 10) {
    throw new Error('Mỗi tiêu chí doanh nghiệp phải có điểm cụ thể từ 0 đến 10.')
  }
  return Math.round(Number(rawScore) * Number(maximum) * 10 + 1e-9) / 100
}

export function restoreEnterpriseScores(criteria, savedScores) {
  return Object.fromEntries(criteria.map(criterion => {
    const saved = savedScores.find(item => item.maTieuChi === criterion.maTieuChi)
    return [criterion.maTieuChi, saved == null ? '' : Number((Number(saved.diemCham) / Number(criterion.diemToiDa) * 10).toFixed(6))]
  }))
}

export function enterpriseCriterionLabel(criterion) {
  return criterion.maCLO === 'CLO4.1' ? 'Điểm chuyên cần, phong cách' : 'Điểm chuyên môn'
}
