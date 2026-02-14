export default function LeaderboardCard({
  leaderboard,
  index,
  playerCount,
  onView,
  onRename,
  onFlush,
  onDelete
}) {
  const courseNames = {
    'devops': 'DevOps',
    'devops-intro': 'DevOps Intro',
    'devops-intro-rus': 'DevOps Intro (RU)',
    'devsecops-intro': 'DevSecOps Intro',
    'devsecops-intro-rus': 'DevSecOps Intro (RU)'
  }

  return (
    <div className="glass p-6 rounded-2xl card-hover flex justify-between items-center animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
          <i className="fa fa-trophy text-xl"></i>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-bold">{leaderboard.name}</span>
            {leaderboard.course && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-600/20 text-purple-400 rounded-lg">
                <i className="fa fa-book mr-1"></i>{courseNames[leaderboard.course] || leaderboard.course}
              </span>
            )}
            {leaderboard.year && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-600/20 text-blue-400 rounded-lg">
                <i className="fa fa-calendar mr-1"></i>{leaderboard.year}
              </span>
            )}
          </div>
          <span className="text-sm text-slate-500"><i className="fa fa-users mr-1"></i>{playerCount} players</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onView(leaderboard)} className="bg-slate-800 px-5 py-2 rounded-xl font-semibold hover:bg-slate-700 transition-colors">
          <i className="fa fa-eye mr-2"></i>View Top 20
        </button>
        <button onClick={() => onRename(leaderboard)} className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-600/30 transition-colors">
          <i className="fa fa-edit"></i>
        </button>
        <button onClick={() => onFlush(leaderboard)} className="bg-yellow-600/20 text-yellow-500 px-4 py-2 rounded-xl hover:bg-yellow-600/30 transition-colors">
          <i className="fa fa-redo"></i>
        </button>
        <button onClick={() => onDelete(leaderboard)} className="text-red-500 hover:text-red-400 p-2 px-3 transition-colors">
          <i className="fa fa-trash"></i>
        </button>
      </div>
    </div>
  )
}
