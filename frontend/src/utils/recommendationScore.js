export function recommendationScore(item, index, total) {
  if (typeof item?.rankingScore === 'number' && Number.isFinite(item.rankingScore)) {
    const rank = (typeof index === 'number' ? index : 0) + 1
    const value = typeof total === 'number' && total > 0 ? `${rank} / ${total}` : `#${rank}`
    return { value, label: 'Thứ hạng phù hợp', isRanking: true }
  }
  const value = item?.tiLeTuongThich
  return { value: typeof value === 'number' && Number.isFinite(value) ? `${value}%` : '—', label: 'Tương đồng nội dung', isRanking: false }
}
