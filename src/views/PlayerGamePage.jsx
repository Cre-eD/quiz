import { useState, useEffect, useRef } from 'react'
import Confetti from '@/components/Confetti'
import TimerBar from '@/components/TimerBar'
import MyBadges from '@/features/game/components/MyBadges'
import { optionColors } from '@/constants'
import { haptic } from '@/utils/haptic'

export default function PlayerGamePage({ session, gamePhase, currentQuestion, user, scores, streaks, coldStreaks, badges, badgeTypes, leaderboard, answered, setAnswered, submitAnswer, sendReaction, reactionEmojis, myReactionCount, MAX_REACTIONS_PER_QUESTION, showConfetti, setView, setSession, setJoinForm, shakeScreen, setShakeScreen, scorePopKey, showToast }) {
  const [countdown, setCountdown] = useState(3)
  const [canSubmit, setCanSubmit] = useState(true)
  const localQuestionStartTime = useRef(null)

  const reactionsLeft = MAX_REACTIONS_PER_QUESTION - myReactionCount
  const canReact = reactionsLeft > 0
  const question = session?.quiz?.questions?.[currentQuestion]
  const myStreak = streaks?.[user?.uid] || 0
  const myColdStreak = coldStreaks?.[user?.uid] || 0
  const myBadges = badges?.[user?.uid] || {}
  const getMultiplier = (s) => s >= 4 ? 4 : s >= 3 ? 3 : s >= 2 ? 2 : 1

  // Capture local time immediately when question phase starts (fixes Firestore propagation delay)
  // This ensures timer starts immediately without waiting for server timestamp
  useEffect(() => {
    if (gamePhase === 'question') {
      // Only set once per question
      if (!localQuestionStartTime.current) {
        localQuestionStartTime.current = Date.now()
      }
    } else {
      // Reset when leaving question phase
      localQuestionStartTime.current = null
    }
  }, [gamePhase, currentQuestion])

  // Use server timestamp for accuracy, but fall back to local time if not available yet
  const questionStartTime = session?.questionStartTime || session?.questionStartTimeFallback || localQuestionStartTime.current
  const myScore = scores?.[user?.uid] || 0

  // Countdown timer for countdown phase
  useEffect(() => {
    if (gamePhase === 'countdown' && session?.countdownEnd) {
      const updateCountdown = () => {
        const remaining = Math.ceil((session.countdownEnd - Date.now()) / 1000)
        setCountdown(Math.max(0, remaining))
      }

      // Update immediately
      updateCountdown()

      const interval = setInterval(updateCountdown, 100)
      return () => clearInterval(interval)
    } else {
      setCountdown(3) // Reset to default when not in countdown
    }
  }, [gamePhase, session?.countdownEnd])

  // Button disable logic - sync with TimerBar
  useEffect(() => {
    if (gamePhase !== 'question' || !questionStartTime) {
      setCanSubmit(true)
      return
    }

    // Allow submissions until timer fully expires
    setCanSubmit(true)
  }, [gamePhase, questionStartTime, answered])


  if (gamePhase === 'final') {
    const myRank = leaderboard.findIndex(p => p.uid === user?.uid) + 1
    const myScore = scores[user?.uid] || 0

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Confetti show={myRank <= 3} />
        <div className="mb-8">
          {myRank === 1 ? (
            <div className="w-32 h-32 mx-auto rounded-full bg-yellow-500 flex items-center justify-center animate-bounce-in">
              <i className="fa fa-crown text-6xl text-black"></i>
            </div>
          ) : myRank <= 3 ? (
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center animate-bounce-in">
              <i className="fa fa-medal text-6xl"></i>
            </div>
          ) : (
            <div className="w-32 h-32 mx-auto rounded-full bg-slate-800 flex items-center justify-center animate-bounce-in">
              <i className="fa fa-star text-6xl text-slate-600"></i>
            </div>
          )}
        </div>

        <h2 className="text-5xl font-black gradient-text mb-4">
          {myRank === 1 ? 'You Won!' : myRank <= 3 ? 'Great Job!' : 'Game Over!'}
        </h2>
        <p className="text-3xl text-slate-300 mb-2">#{myRank} Place</p>
        <p className="text-xl text-slate-500 mb-4">{myScore} points</p>
        <MyBadges badges={myBadges} badgeTypes={badgeTypes} />

        <button onClick={() => {localStorage.removeItem('quizSession'); setView('home'); setSession(null); setJoinForm({ pin: '', name: '' });}} className="btn-gradient px-8 py-4 rounded-2xl font-bold">
          <i className="fa fa-home mr-2"></i>Back to Home
        </button>
      </div>
    )
  }

  if (gamePhase === 'results') {
    const myAnswer = session?.answers?.[user?.uid]
    const wasCorrect = myAnswer?.answerIndex === question?.correct
    const multiplier = getMultiplier(myStreak)

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Confetti show={showConfetti} />
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-bounce-in ${wasCorrect ? 'bg-green-600 animate-correct-glow' : 'bg-red-600 animate-wrong-flash'}`}>
          <i className={`fa ${wasCorrect ? 'fa-check' : 'fa-times'} text-5xl`}></i>
        </div>
        <h2 className="text-3xl font-bold mb-2">{wasCorrect ? 'Correct!' : 'Wrong!'}</h2>
        {!wasCorrect && (
          <p className="text-slate-400 mb-2">Correct answer: <span className="text-green-400">{question?.options[question?.correct]}</span></p>
        )}
        {wasCorrect && myStreak >= 2 && (
          <div className="flex items-center gap-2 mb-2 animate-bounce-in">
            <i className="fa fa-fire text-orange-500 text-2xl animate-fire-glow"></i>
            <span className="text-orange-400 font-bold text-xl animate-fire-glow">{myStreak} streak! {multiplier}x points!</span>
            <i className="fa fa-fire text-orange-500 text-2xl animate-fire-glow"></i>
          </div>
        )}
        {!wasCorrect && (
          <p className="text-slate-500 text-sm mb-2">Streak reset</p>
        )}
        <p key={scorePopKey} className="text-2xl text-blue-400 font-bold mb-4 animate-number-pop">{myScore} pts</p>

        {question?.explanation && (
          <div className="glass rounded-2xl p-4 w-full max-w-md text-left border border-yellow-500/30 animate-slide-up mb-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <i className="fa fa-lightbulb text-yellow-500 text-sm"></i>
              </div>
              <div>
                <p className="text-yellow-500 text-xs font-semibold mb-1">Did you know?</p>
                <p className="text-slate-300 text-sm">{question.explanation}</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-slate-500 text-sm">Waiting for next question...</p>
      </div>
    )
  }

  // Countdown phase - sleek loading state
  if (gamePhase === 'countdown') {
    const progress = countdown > 0 ? ((3 - countdown) / 3) * 100 : 100

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full">
          {/* Question preview */}
          <div className="mb-8">
            <p className="text-slate-500 text-sm mb-3">Question {currentQuestion + 1}</p>
            <h2 className="text-xl font-semibold text-slate-300 mb-6">{question?.text}</h2>
          </div>

          {/* Animated ready indicator */}
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center animate-pulse">
              <i className="fa fa-bolt text-4xl"></i>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          <p className="text-slate-400 text-lg">
            {countdown > 0 ? 'Get ready...' : 'Starting...'}
          </p>
        </div>
      </div>
    )
  }

  if (answered) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center mb-6 animate-pulse">
          <i className="fa fa-check text-4xl"></i>
        </div>
        <h2 className="text-3xl font-bold mb-2">Answer Submitted!</h2>
        <p className="text-slate-500 mb-4">Let's see if you got it right...</p>

        {/* Reaction buttons while waiting */}
        {canReact ? (
          <>
            <p className="text-slate-600 text-sm mb-2">Send a reaction ({reactionsLeft} left):</p>
            <div className="flex flex-wrap justify-center gap-2">
              {reactionEmojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={(e) => { e.stopPropagation(); haptic.light(); sendReaction(emoji); }}
                  className="text-2xl p-2 hover:scale-125 transition-transform active:scale-90 bg-slate-800/50 rounded-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="text-slate-600 text-sm">Reaction limit reached for this question</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="mb-4">
        <TimerBar duration={25} isRunning={gamePhase === 'question'} onComplete={() => {}} startTime={questionStartTime} />
      </div>

      {myStreak >= 2 && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <i className="fa fa-fire text-orange-500 text-xl animate-fire-glow"></i>
          <span className="text-orange-400 font-bold animate-fire-glow">{myStreak} streak! Next: {getMultiplier(myStreak + 1)}x</span>
          <i className="fa fa-fire text-orange-500 text-xl animate-fire-glow"></i>
        </div>
      )}

      {/* Cold streak indicator */}
      {myColdStreak >= 2 && (
        <div className="mb-3 bg-orange-500/20 border border-orange-500/50 rounded-xl p-3 text-center">
          <span className="text-orange-400 text-sm">
            ❄️ {myColdStreak} wrong in a row - break the streak for bonus points!
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <p className="text-slate-400 mb-2">Question {currentQuestion + 1}</p>
        <h2 className="text-2xl font-bold">{question?.text}</h2>
      </div>

      <div className="flex-grow grid grid-cols-2 gap-3">
        {question?.options.map((opt, idx) => (
          <button
            key={idx}
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return
              haptic.light()
              // Handle both Firestore Timestamp objects and regular numbers
              const startTimeMs = questionStartTime?.toMillis ? questionStartTime.toMillis() : questionStartTime
              const answerTime = Date.now() - startTimeMs
              submitAnswer(idx, answerTime)
            }}
            className={`${optionColors[idx].bg} rounded-2xl flex flex-col items-center justify-center p-4 option-btn active:scale-95 animate-option-reveal ${!canSubmit ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <i className={`fa ${optionColors[idx].icon} text-3xl mb-2 opacity-75`}></i>
            <span className="text-lg font-semibold text-center">{opt}</span>
          </button>
        ))}
      </div>

      {!canSubmit && (
        <div className="text-center mt-2 text-red-400 text-sm">
          <i className="fa fa-clock mr-1"></i>Time's up!
        </div>
      )}

      {/* Reaction buttons - compact bar at bottom */}
      {canReact && (
        <div className="flex justify-center gap-1 mt-3 pt-2 border-t border-slate-800/50 overflow-x-auto">
          {reactionEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={(e) => { e.stopPropagation(); haptic.light(); sendReaction(emoji); }}
              className="text-xl p-1.5 hover:scale-110 transition-transform active:scale-90 flex-shrink-0 opacity-60 hover:opacity-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
