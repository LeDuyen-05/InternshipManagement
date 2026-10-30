import { recommendationScore } from '../../utils/recommendationScore'

export default function RecommendationScore({ item }) {
  const score = recommendationScore(item)
  return <span className="inline-flex flex-col gap-1">
    <strong className="font-mono">{score.value}</strong>
    <span className="text-[11px] text-slate-500">{score.label}</span>
  </span>
}
