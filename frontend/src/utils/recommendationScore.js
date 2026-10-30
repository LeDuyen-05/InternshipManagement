export function recommendationScore(item) {
  if (typeof item?.rankingScore === 'number' && Number.isFinite(item.rankingScore)) {
    return { value: item.rankingScore.toFixed(4), label: 'Điểm xếp hạng', isRanking: true }
  }
  const value = item?.tiLeTuongThich
  return { value: typeof value === 'number' && Number.isFinite(value) ? `${value}%` : '—', label: 'Tương đồng nội dung', isRanking: false }
}
