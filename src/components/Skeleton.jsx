// Skeleton loader components for better perceived performance

export function SkeletonBox({ className = '' }) {
  return (
    <div className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`} />
  )
}

export function SkeletonText({ lines = 1, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-700/50 rounded animate-pulse"
          style={{ width: i === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`glass rounded-2xl p-6 ${className}`}>
      <SkeletonBox className="h-6 w-3/4 mb-4" />
      <SkeletonText lines={2} />
    </div>
  )
}

export function SkeletonQuiz() {
  return (
    <div className="min-h-screen flex flex-col p-4">
      <SkeletonBox className="h-2 w-full mb-4" />
      <div className="text-center mb-6">
        <SkeletonBox className="h-4 w-24 mx-auto mb-2" />
        <SkeletonBox className="h-8 w-3/4 mx-auto" />
      </div>
      <div className="flex-grow grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <SkeletonBox key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function SkeletonLeaderboard() {
  return (
    <div className="glass rounded-3xl p-6 w-full max-w-2xl">
      <SkeletonBox className="h-6 w-40 mb-4" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 border-b border-slate-800 last:border-0">
          <SkeletonBox className="w-8 h-8 rounded-full" />
          <SkeletonBox className="flex-grow h-5" />
          <SkeletonBox className="w-16 h-5" />
        </div>
      ))}
    </div>
  )
}
