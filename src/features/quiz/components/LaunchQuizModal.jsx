export default function LaunchQuizModal({
  quiz,
  leaderboards,
  selectedLeaderboard,
  setSelectedLeaderboard,
  onLaunch,
  onCancel
}) {
  if (!quiz) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
        <h3 className="text-2xl font-bold mb-2"><i className="fa fa-play text-green-500 mr-2"></i>Launch Quiz</h3>
        <p className="text-slate-400 mb-6">{quiz.title}</p>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-3">Track scores on leaderboard:</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800">
              <input type="radio" name="leaderboard" checked={selectedLeaderboard === null} onChange={() => setSelectedLeaderboard(null)} className="w-4 h-4 accent-blue-500" />
              <span className="text-slate-400">No leaderboard (standalone quiz)</span>
            </label>
            {leaderboards.map(lb => (
              <label key={lb.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800">
                <input type="radio" name="leaderboard" checked={selectedLeaderboard === lb.id} onChange={() => setSelectedLeaderboard(lb.id)} className="w-4 h-4 accent-purple-500" />
                <i className="fa fa-trophy text-purple-500"></i>
                <span>{lb.name}</span>
              </label>
            ))}
          </div>
          {leaderboards.length === 0 && (
            <p className="text-sm text-slate-500 mt-3"><i className="fa fa-info-circle mr-1"></i>Create a leaderboard in the Leaderboards tab to track cumulative scores.</p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Cancel</button>
          <button onClick={onLaunch} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 py-3 rounded-xl font-semibold hover:from-green-500 hover:to-emerald-500">
            <i className="fa fa-play mr-2"></i>Launch
          </button>
        </div>
      </div>
    </div>
  )
}
