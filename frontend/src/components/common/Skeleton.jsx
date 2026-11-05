export function SkeletonBox({ className = 'h-4 w-full' }) {
  return <div className={`bg-slate-200/80 animate-pulse rounded-lg ${className}`} />
}

export function SkeletonCard({ count = 4 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4 mb-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 bg-slate-200 rounded w-24" />
            <div className="w-8 h-8 bg-slate-100 rounded-xl" />
          </div>
          <div className="h-8 bg-slate-200 rounded w-16 mb-2" />
          <div className="h-3 bg-slate-100 rounded w-32" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-4 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-5 bg-slate-200 rounded w-48" />
        <div className="h-8 bg-slate-100 rounded-xl w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center py-2 border-b border-slate-50 last:border-none">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 bg-slate-200/70 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
