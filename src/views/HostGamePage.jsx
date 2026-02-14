import { useState, useEffect, useRef } from 'react'
import Confetti from '@/components/Confetti'
import TimerBar from '@/components/TimerBar'
import { optionColors } from '@/constants'

export default function HostGamePage({ user, isAdmin, setView, session, gamePhase, currentQuestion, leaderboard, streaks, reactions, badges, badgeTypes, endGame, abortGame, showQuestionResults, nextQuestion }) {
  // ALL HOOKS MUST BE AT THE TOP - React requires this!
  const [countdown, setCountdown] = useState(3)
  const reactionsContainerRef = useRef(null)
  const processedIdsRef = useRef(new Set())
  const localQuestionStartTime = useRef(null)

  // Process new reactions and add them directly to DOM (no React state)
  useEffect(() => {
    const container = reactionsContainerRef.current
    if (!container) return

    const allReactions = reactions || []

    allReactions.forEach(r => {
      if (!r.id || processedIdsRef.current.has(r.id)) return
      processedIdsRef.current.add(r.id)

      // Create reaction element directly in DOM
      const el = document.createElement('div')
      const seed = r.id.toString().split('').reduce((a, c) => a + c.charCodeAt(0), 0)
      el.className = 'reaction-bubble'
      el.style.left = `${10 + (seed % 80)}%`
      el.style.setProperty('--drift', `${-30 + (seed % 60)}px`)
      el.innerHTML = `<span class="text-5xl drop-shadow-lg">${r.emoji}</span>`

      container.appendChild(el)

      // Remove after animation completes
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el)
      }, 3000)
    })
  }, [reactions])

  // Reset on new question
  useEffect(() => {
    processedIdsRef.current = new Set()
    const container = reactionsContainerRef.current
    if (container) container.innerHTML = ''
  }, [currentQuestion])

  // Predict question start time based on countdown end (fixes Firestore propagation delay)
  // Host knows countdownEnd in advance, so use that as question start time prediction
  useEffect(() => {
    if (gamePhase === 'countdown' && session?.countdownEnd) {
      // Capture the countdown end time as the predicted question start time
      localQuestionStartTime.current = session.countdownEnd
    } else if (gamePhase !== 'question') {
      localQuestionStartTime.current = null
    }
  }, [gamePhase, session?.countdownEnd, currentQuestion])

  // Countdown timer effect
  useEffect(() => {
    if (gamePhase === 'countdown' && session?.countdownEnd) {
      const updateCountdown = () => {
        const remaining = Math.ceil((session.countdownEnd - Date.now()) / 1000)
        setCountdown(Math.max(0, remaining))
      }

      updateCountdown()

      const interval = setInterval(updateCountdown, 100)
      return () => clearInterval(interval)
    }
  }, [gamePhase, session?.countdownEnd])

  // Derived values (can be after hooks, before conditionals)
  const question = session?.quiz?.questions?.[currentQuestion]
  const answeredCount = Object.keys(session?.answers || {}).length
  const totalPlayers = Object.keys(session?.players || {}).length

  // Auth check AFTER all hooks to prevent hooks violation
  if (!user?.email || !isAdmin) { setView('home'); return null }

  // Player badges display
  const PlayerBadges = ({ uid }) => {
    const playerBadges = badges?.[uid] || {}
    const earnedBadges = Object.keys(playerBadges).filter(k => playerBadges[k])
    if (earnedBadges.length === 0) return null
    return (
      <span className="flex gap-1">
        {earnedBadges.map(badge => (
          <span key={badge} title={badgeTypes[badge]?.name} className="text-lg">{badgeTypes[badge]?.icon}</span>
        ))}
      </span>
    )
  }

  if (gamePhase === 'final') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Confetti show={true} />
        <h2 className="text-5xl font-black gradient-text mb-8 animate-bounce-in">Final Results!</h2>
        <div className="glass rounded-3xl p-8 w-full max-w-2xl mb-8">
          {leaderboard.slice(0, 5).map((player, idx) => {
            const playerStreak = streaks?.[player.uid] || 0
            return (
              <div key={player.uid} className="flex items-center gap-4 p-4 border-b border-slate-800 last:border-0 animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                <span className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-700' : 'bg-slate-800'}`}>
                  {idx === 0 ? <i className="fa fa-crown"></i> : idx + 1}
                </span>
                <span className="flex-grow text-left text-xl font-semibold flex items-center gap-2">
                  {player.name}
                  {playerStreak >= 2 && <i className="fa fa-fire text-orange-500" title={`${playerStreak} streak`}></i>}
                  <PlayerBadges uid={player.uid} />
                </span>
                <span className="text-2xl font-bold text-blue-400">{player.score}</span>
              </div>
            )
          })}
        </div>
        <button onClick={endGame} className="btn-gradient px-12 py-4 rounded-2xl font-bold text-xl">
          <i className="fa fa-home mr-2"></i>End Session
        </button>
      </div>
    )
  }

  if (gamePhase === 'results') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div ref={reactionsContainerRef} className="fixed inset-0 pointer-events-none z-50 overflow-hidden" />
        <button
          onClick={abortGame}
          className="absolute top-4 right-4 glass px-4 py-2 rounded-xl text-red-400 hover:text-red-300 hover:border-red-500/50 transition-all flex items-center gap-2"
          title="Stop quiz and disconnect all players"
        >
          <i className="fa fa-stop-circle"></i>
          <span className="hidden sm:inline">Stop Quiz</span>
        </button>
        <h2 className="text-3xl font-bold mb-2">Question {currentQuestion + 1} Results</h2>
        <p className="text-slate-400 mb-4">Correct answer: <span className="text-green-400 font-semibold">{question?.options[question?.correct]}</span></p>

        {question?.explanation && (
          <div className="glass rounded-2xl p-5 w-full max-w-2xl mb-6 text-left border border-yellow-500/30 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <i className="fa fa-lightbulb text-yellow-500"></i>
              </div>
              <div>
                <p className="text-yellow-500 text-sm font-semibold mb-1">Did you know?</p>
                <p className="text-slate-300">{question.explanation}</p>
              </div>
            </div>
          </div>
        )}

        <div className="glass rounded-3xl p-6 w-full max-w-2xl mb-8">
          <h3 className="text-xl font-bold mb-4"><i className="fa fa-trophy text-yellow-500 mr-2"></i>Leaderboard</h3>
          {leaderboard.slice(0, 5).map((player, idx) => {
            const playerStreak = streaks?.[player.uid] || 0
            return (
              <div key={player.uid} className="flex items-center gap-4 p-3 border-b border-slate-800 last:border-0">
                <span className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold">{idx + 1}</span>
                <span className="flex-grow text-left font-semibold flex items-center gap-2">
                  {player.name}
                  {playerStreak >= 2 && <i className="fa fa-fire text-orange-500 animate-pulse" title={`${playerStreak} streak`}></i>}
                  <PlayerBadges uid={player.uid} />
                </span>
                <span className="font-bold text-blue-400">{player.score} pts</span>
              </div>
            )
          })}
        </div>

        <button onClick={nextQuestion} className="btn-gradient px-12 py-4 rounded-2xl font-bold text-xl">
          {currentQuestion + 1 >= session?.quiz?.questions?.length ? (
            <><i className="fa fa-flag-checkered mr-2"></i>Final Results</>
          ) : (
            <><i className="fa fa-arrow-right mr-2"></i>Next Question</>
          )}
        </button>
      </div>
    )
  }

  // Countdown phase for host
  if (gamePhase === 'countdown') {

    return (
      <div className="min-h-screen flex flex-col p-6">
        <div ref={reactionsContainerRef} className="fixed inset-0 pointer-events-none z-50 overflow-hidden" />
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-400">Question {currentQuestion + 1} of {session?.quiz?.questions?.length}</span>
          <div className="flex items-center gap-3">
            <span className="text-slate-400"><i className="fa fa-users mr-2"></i>{totalPlayers} players</span>
            <button
              onClick={abortGame}
              className="glass px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:border-red-500/50 transition-all flex items-center gap-2"
              title="Stop quiz and disconnect all players"
            >
              <i className="fa fa-stop-circle"></i>
              <span className="hidden sm:inline text-sm">Stop</span>
            </button>
          </div>
        </div>

        <div className="flex-grow flex flex-col items-center justify-center text-center py-8 relative">
          <h2 className="text-4xl font-bold mb-12 max-w-4xl">{question?.text}</h2>

          <div className="grid grid-cols-2 gap-4 w-full max-w-4xl opacity-30">
            {question?.options.map((opt, idx) => (
              <div key={idx} className={`${optionColors[idx].bg} p-6 rounded-2xl flex flex-col items-center justify-center gap-3`}>
                <i className={`fa ${optionColors[idx].icon} text-3xl opacity-75`}></i>
                <span className="text-xl font-semibold text-center">{opt}</span>
              </div>
            ))}
          </div>

          {/* Countdown overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-slate-900/95 px-16 py-10 rounded-3xl border-2 border-blue-500/50 shadow-2xl">
              <div className="text-9xl font-black gradient-text animate-pulse mb-2">
                {countdown}
              </div>
              <p className="text-slate-400 text-xl text-center">Starting...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col p-6">
      <div ref={reactionsContainerRef} className="fixed inset-0 pointer-events-none z-50 overflow-hidden" />
      <div className="flex justify-between items-center mb-4">
        <span className="text-slate-400">Question {currentQuestion + 1} of {session?.quiz?.questions?.length}</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-400"><i className="fa fa-users mr-2"></i>{answeredCount}/{totalPlayers} answered</span>
          <button
            onClick={abortGame}
            className="glass px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:border-red-500/50 transition-all flex items-center gap-2"
            title="Stop quiz and disconnect all players"
          >
            <i className="fa fa-stop-circle"></i>
            <span className="hidden sm:inline text-sm">Stop</span>
          </button>
        </div>
      </div>

      <TimerBar duration={25} isRunning={gamePhase === 'question'} onComplete={showQuestionResults} startTime={session?.questionStartTime || session?.questionStartTimeFallback || localQuestionStartTime.current} />

      <div className="flex-grow flex flex-col items-center justify-center text-center py-8">
        <h2 className="text-4xl font-bold mb-12 max-w-4xl">{question?.text}</h2>

        <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
          {question?.options.map((opt, idx) => (
            <div key={idx} className={`${optionColors[idx].bg} p-6 rounded-2xl flex flex-col items-center justify-center gap-3`}>
              <i className={`fa ${optionColors[idx].icon} text-3xl opacity-75`}></i>
              <span className="text-xl font-semibold text-center">{opt}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={showQuestionResults} className="glass px-8 py-3 rounded-xl font-semibold self-center hover:bg-slate-800">
        <i className="fa fa-forward mr-2"></i>Show Results
      </button>
    </div>
  )
}
