export default function HostLobbyPage({ user, isAdmin, setView, session, startGame, toggleLateJoin, kickPlayer, db, deleteDoc, doc }) {
  if (!user?.email || !isAdmin) { setView('home'); return null }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      <div className="relative z-10">
        <p className="text-slate-400 uppercase tracking-[0.2em] text-sm mb-2">Join at devops-quiz-2c930.web.app</p>
        <p className="text-slate-500 uppercase tracking-widest text-sm mb-6">Game PIN</p>
        <div className="glow rounded-3xl p-4 mb-8">
          <h2 className="text-[10rem] leading-none font-black gradient-text animate-float">{session?.pin}</h2>
        </div>

        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="bg-blue-600 px-4 py-2 rounded-full flex items-center gap-2">
            <i className="fa fa-users"></i>
            <span className="text-2xl font-bold">{Object.keys(session?.players || {}).length}</span>
          </div>
          <span className="text-slate-400">players joined</span>
        </div>
        {session?.leaderboardName && (
          <p className="text-purple-400 mb-4 flex items-center justify-center gap-2">
            <i className="fa fa-trophy"></i>
            <span>Tracking on: <strong>{session.leaderboardName}</strong></span>
          </p>
        )}

        <div className="glass rounded-2xl p-4 mb-8 w-full max-w-4xl max-h-48 overflow-y-auto">
          {Object.keys(session?.players || {}).length === 0 ? (
            <p className="text-slate-500 text-center py-4">Waiting for players to join...</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {Object.entries(session?.players || {}).map(([uid, name], i) => (
                <div
                  key={uid}
                  className="bg-slate-800/60 px-3 py-2 rounded-lg text-sm truncate flex items-center justify-between gap-1 group hover:bg-slate-700/60 transition-colors"
                  title={name}
                >
                  <span className="truncate">{name}</span>
                  <button
                    onClick={() => kickPlayer(uid)}
                    className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs flex-shrink-0"
                    title="Kick player"
                  >
                    <i className="fa fa-times text-[10px]"></i>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Control bar */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => {setView('dash'); deleteDoc(doc(db, 'sessions', session.pin));}}
            className="glass px-6 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:border-red-500/50 transition-all flex items-center gap-2"
          >
            <i className="fa fa-times"></i>
            <span>Cancel</span>
          </button>

          <button
            onClick={toggleLateJoin}
            className={`glass px-5 py-3 rounded-xl transition-all flex items-center gap-3 ${session?.allowLateJoin ? 'text-green-400 border-green-500/30' : 'text-slate-500'}`}
          >
            <i className={`fa ${session?.allowLateJoin ? 'fa-door-open' : 'fa-door-closed'}`}></i>
            <span className="text-sm">{session?.allowLateJoin ? 'Late Join On' : 'Late Join Off'}</span>
            <div className={`w-10 h-6 rounded-full p-1 ${session?.allowLateJoin ? 'bg-green-600' : 'bg-slate-700'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${session?.allowLateJoin ? 'translate-x-4' : ''}`}></div>
            </div>
          </button>

          <button
            onClick={startGame}
            disabled={Object.keys(session?.players || {}).length === 0}
            className="btn-gradient px-10 py-4 rounded-xl font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            <i className="fa fa-play"></i>
            <span>Start Game</span>
          </button>
        </div>
      </div>
    </div>
  )
}
