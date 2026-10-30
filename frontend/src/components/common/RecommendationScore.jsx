import { recommendationScore } from '../../utils/recommendationScore'

export default function RecommendationScore({ item, index, total }) {
  const score = recommendationScore(item, index, total)
  return <span className="inline-flex flex-col gap-1 items-end">
    <strong className={score.isRanking ? 'text-lg font-bold text-violet-700' : 'font-mono'}>{score.value}</strong>
    <span className="text-[11px] text-slate-500">{score.label}</span>
  </span>
}
