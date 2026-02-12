export default function QuizCard({ quiz, categoryConfig, onLaunch, onEdit, onDelete }) {
  const catConf = categoryConfig[quiz.category] || categoryConfig.pre

  return (
    <div className={`p-4 rounded-xl border ${catConf.borderClass} bg-slate-900/50 flex justify-between items-center group hover:bg-slate-800/50 transition-colors`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className={`px-2 py-1 rounded text-xs font-medium ${catConf.bgClass} ${catConf.textClass} shrink-0`}>
          {catConf.label}
        </span>
        <div className="min-w-0">
          <span className="font-medium block truncate">{quiz.title}</span>
          <span className="text-xs text-slate-500">{quiz.questions?.length || 0} questions</span>
        </div>
      </div>
      <div className="flex gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onLaunch(quiz)}
          className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-1.5 rounded-lg font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all"
        >
          <i className="fa fa-play mr-1"></i>Launch
        </button>
        <button
          onClick={() => onEdit(quiz)}
          className="bg-slate-700 p-1.5 px-3 rounded-lg hover:bg-slate-600 transition-colors text-sm"
        >
          <i className="fa fa-edit"></i>
        </button>
        <button
          onClick={() => onDelete(quiz)}
          className="text-red-500 hover:text-red-400 p-1.5 px-2 transition-colors text-sm"
        >
          <i className="fa fa-trash"></i>
        </button>
      </div>
    </div>
  )
}
