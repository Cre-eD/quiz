export default function ViewLeaderboardModal({
  leaderboard,
  players,
  onFlush,
  onClose
}) {
  if (!leaderboard) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass p-8 rounded-3xl max-w-2xl w-full mx-4 animate-bounce-in max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold"><i className="fa fa-trophy text-yellow-500 mr-2"></i>{leaderboard.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><i className="fa fa-times text-xl"></i></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {players.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <i className="fa fa-users text-4xl mb-4 block"></i>
              <p>No players yet. Launch a quiz with this leaderboard to start tracking scores!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {players.map((player, idx) => (
                <div key={player.key} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
                  <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-700' : 'bg-slate-700'}`}>
                    {idx === 0 ? <i className="fa fa-crown"></i> : idx + 1}
                  </span>
                  <div className="flex-grow">
                    <span className="font-semibold block">{player.displayName}</span>
                    <span className="text-sm text-slate-500">{player.quizzesTaken} quiz{player.quizzesTaken !== 1 ? 'zes' : ''}</span>
                  </div>
                  <span className="text-xl font-bold text-blue-400">{player.totalScore} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
          <button onClick={() => onFlush(leaderboard)} className="flex-1 bg-yellow-600/20 text-yellow-500 py-3 rounded-xl font-semibold hover:bg-yellow-600/30">
            <i className="fa fa-redo mr-2"></i>Flush Scores
          </button>
          <button onClick={onClose} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Close</button>
        </div>
      </div>
    </div>
  )
}
