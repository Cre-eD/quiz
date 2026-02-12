import QuizCard from './QuizCard'

export default function QuizLevelGroup({
  level,
  quizzes,
  isExpanded,
  onToggle,
  categoryConfig,
  onLaunch,
  onEdit,
  onDelete
}) {
  const firstQuiz = quizzes[0]
  const levelTitle = firstQuiz?.title?.match(/L\d+:\s*([^—]+)/)?.[1]?.trim() || `Lecture ${level}`

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Level Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-sm">
            L{level}
          </div>
          <div className="text-left">
            <span className="font-semibold block">{levelTitle}</span>
            <span className="text-xs text-slate-500">{quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Category badges preview */}
          <div className="hidden sm:flex gap-1">
            {['pre', 'mid', 'post'].map(cat => {
              const hasCategory = quizzes.some(q => q.category === cat)
              if (!hasCategory) return null
              return (
                <span key={cat} className={`px-2 py-0.5 rounded text-xs ${categoryConfig[cat].bgClass} ${categoryConfig[cat].textClass}`}>
                  {categoryConfig[cat].label}
                </span>
              )
            })}
          </div>
          <i className={`fa fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-500 ml-2`}></i>
        </div>
      </button>

      {/* Level Quizzes */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              categoryConfig={categoryConfig}
              onLaunch={onLaunch}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
