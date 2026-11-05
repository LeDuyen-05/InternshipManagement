// New rubrics use internal criterion IDs; maCLO is the stable display code.
// Accept plain legacy IDs only when metadata is absent, without guessing a rubric.
export function enterprisePrintScore(details, maCLO, legacyMaximum) {
  const detail = (details || []).find(x => (x.maCLO || x.maTieuChi) === maCLO)
  const raw = detail?.diemCham
  const score = raw !== null && raw !== undefined && raw !== '' ? Number(raw) : null
  const maximum = Number(detail?.diemToiDa ?? legacyMaximum)
  if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || score < 0 || score > maximum) {
    return { score: null, maximum, scoreOutOfTen: '' }
  }
  return { score, maximum, scoreOutOfTen: (score / maximum * 10).toFixed(1) }
}

export function enterpriseGradeComplete(intern) {
  const details = intern.chiTietDiemDN || []
  return intern.daDanhGia === true && details.length > 0 && details.every(detail => {
    const raw = detail.diemCham
    const score = raw !== null && raw !== undefined && raw !== '' ? Number(raw) : NaN
    const maximum = Number(detail.diemToiDa)
    return Number.isFinite(score) && Number.isFinite(maximum) && maximum > 0 && score >= 0 && score <= maximum
  })
}
