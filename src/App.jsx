import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { sessionService } from './features/session/services/sessionService'
import { gameService } from './features/game/services/gameService'
import { syncServerClock } from './features/session/services/timeSyncService'
import { useAuth } from './features/auth/hooks/useAuth'
import { useQuizzes } from './features/quiz/hooks/useQuizzes'
import { useLeaderboards } from './features/leaderboard/hooks/useLeaderboards'
import { compareLiveLeaderboardPlayers } from './features/leaderboard/utils/ranking'
import { optionColors, categoryConfig } from './constants'
import { haptic } from './utils/haptic'
import Spinner from './components/Spinner'
import ConfirmModal from './components/ConfirmModal'
import Toast from './components/Toast'
import Confetti from './components/Confetti'
import HomePage from './views/HomePage'
import PlayerWaitPage from './views/PlayerWaitPage'
import QuizEditorPage from './views/QuizEditorPage'
import HostLobbyPage from './views/HostLobbyPage'
import HostGamePage from './views/HostGamePage'
import PlayerGamePage from './views/PlayerGamePage'
import DashboardPage from './views/DashboardPage'
import { getQuestionEndMs } from './features/game/utils/timeline'
import { IS_E2E_MODE } from './lib/firebase/config'

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3
}

const E2E_PLAYER_JOIN_EVENT_KEY = '__E2E_PLAYER_JOIN_EVENT__'
const E2E_HOST_START_EVENT_KEY = '__E2E_HOST_START_EVENT__'
const E2E_JOINED_PIN_PREFIX = '__E2E_JOINED_PIN__:'

const emitE2EEvent = (key, payload) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        ...payload,
        ts: Date.now(),
        nonce: Math.random().toString(36).slice(2)
      })
    )
  } catch {
    // Ignore localStorage failures in E2E fallback channel
  }
}

const markE2EJoinedPin = (pin) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${E2E_JOINED_PIN_PREFIX}${String(pin)}`, String(Date.now()))
  } catch {
    // Ignore localStorage failures in E2E fallback channel
  }
}

const clearE2EJoinedPin = (pin) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`${E2E_JOINED_PIN_PREFIX}${String(pin)}`)
  } catch {
    // Ignore localStorage failures in E2E fallback channel
  }
}

export default function App() {
  const [view, setView] = useState('home')
  const [session, setSession] = useState(null)
  const [joinForm, setJoinForm] = useState({ pin: '', name: '' })
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false })
  const [launchingQuiz, setLaunchingQuiz] = useState(null)
  const [joiningSession, setJoiningSession] = useState(false)

  const showToast = (message, type = "success") => setToast({ message, type })
  const closeConfirm = () => setConfirmModal({ isOpen: false })
  // Wrap the caller's handlers so the modal always closes — on confirm (after the
  // action resolves, even if it throws) and on cancel. Without this the backdrop
  // stays mounted after a delete and the app appears frozen.
  const showConfirm = (config) => setConfirmModal({
    isOpen: true,
    ...config,
    onConfirm: async () => {
      try {
        await config?.onConfirm?.()
      } finally {
        closeConfirm()
      }
    },
    onCancel: () => {
      config?.onCancel?.()
      closeConfirm()
    }
  })

  // Custom hooks - v1.0.1
  const auth = useAuth()
  const user = auth.user
  const isAdmin = auth.isAdmin
  const loading = auth.loading

  useEffect(() => {
    if (!IS_E2E_MODE || typeof window === 'undefined') return

    window.__E2E_APP__ = {
      goHome: () => setView('home'),
      goDashboard: () => setView('dash'),
      getState: () => ({
        view,
        isAdmin,
        loading,
        userEmail: user?.email || null
      })
    }

    return () => {
      delete window.__E2E_APP__
    }
  }, [view, isAdmin, loading, user?.email])

  // Wrap auth handlers with view navigation
  const handleSignInWithGoogle = () => auth.handleSignInWithGoogle(
    () => { setView('dash'); showToast("Welcome back, Admin!") },
    (error) => showToast(error, "error")
  )

  const signOutAdmin = () => auth.signOutAdmin(
    () => { setView('home'); showToast("Signed out successfully") }
  )

  const {
    quizzes,
    activeQuiz,
    setActiveQuiz,
    importText,
    setImportText,
    showImport,
    setShowImport,
    saving,
    handleImport,
    handleSave,
    handleDelete
  } = useQuizzes({
    user,
    isActive: view === 'dash',
    onToast: showToast,
    onConfirm: showConfirm
  })

  const {
    leaderboards,
    selectedLeaderboard,
    setSelectedLeaderboard,
    dashTab,
    setDashTab,
    showLeaderboardModal,
    setShowLeaderboardModal,
    newLeaderboardName,
    setNewLeaderboardName,
    newLeaderboardCourse,
    setNewLeaderboardCourse,
    newLeaderboardYear,
    setNewLeaderboardYear,
    renamingLeaderboard,
    setRenamingLeaderboard,
    renameLeaderboardName,
    setRenameLeaderboardName,
    viewingLeaderboard,
    setViewingLeaderboard,
    createLeaderboard,
    flushLeaderboard,
    deleteLeaderboard,
    renameLeaderboard,
    confirmRenameLeaderboard,
    saveToLeaderboard,
    getLeaderboardPlayers
  } = useLeaderboards({
    user,
    isAdmin,
    isActive: view === 'dash',
    onToast: showToast,
    onConfirm: showConfirm
  })

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [playerAnswer, setPlayerAnswer] = useState(null)
  const [scores, setScores] = useState({})
  const [streaks, setStreaks] = useState({})
  const [coldStreaks, setColdStreaks] = useState({})
  const [answered, setAnswered] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [gamePhase, setGamePhase] = useState('lobby')
  const [phaseState, setPhaseState] = useState({})
  const [phaseChannelHealthy, setPhaseChannelHealthy] = useState(false)
  const [clockOffsetMs, setClockOffsetMs] = useState(0)
  const [reactions, setReactions] = useState([])
  const [badges, setBadges] = useState({})
  const [myReactionCount, setMyReactionCount] = useState(0)
  const [shakeScreen, setShakeScreen] = useState(false)
  const [scorePopKey, setScorePopKey] = useState(0)
  const prevGamePhaseRef = useRef('lobby') // Track previous phase to detect transitions
  const scoresRef = useRef({})
  const gamePhaseRef = useRef('lobby')
  const phaseChannelHealthyRef = useRef(false)
  const lastPhaseSeqRef = useRef(-1)
  const clockOffsetRef = useRef(0)

  useEffect(() => {
    scoresRef.current = scores
  }, [scores])

  useEffect(() => {
    gamePhaseRef.current = gamePhase
  }, [gamePhase])

  useEffect(() => {
    phaseChannelHealthyRef.current = phaseChannelHealthy
  }, [phaseChannelHealthy])

  useEffect(() => {
    if (session?.pin) {
      setPhaseChannelHealthy(false)
    }
  }, [session?.pin])

  useEffect(() => {
    clockOffsetRef.current = clockOffsetMs
  }, [clockOffsetMs])

  useEffect(() => {
    lastPhaseSeqRef.current = -1
  }, [session?.pin])

  const getNowMs = () => Date.now() + clockOffsetRef.current

  useEffect(() => {
    if (view !== 'play-host' || !session?.pin) return

    const status = phaseChannelHealthy
      ? phaseState.status
      : (session?.status || gamePhase)
    const countdownEnd = phaseChannelHealthy
      ? phaseState.countdownEnd
      : (session?.countdownEnd ?? phaseState.countdownEnd)

    if (status !== 'countdown' || !Number.isFinite(countdownEnd)) return

    const msUntilQuestion = Math.max(0, countdownEnd - getNowMs())
    const timeoutId = setTimeout(() => {
      gameService.startQuestionTimer(session.pin).catch((error) => {
        console.error('Host countdown transition failed:', error)
      })
    }, msUntilQuestion + 50)

    return () => clearTimeout(timeoutId)
  }, [
    view,
    session?.pin,
    session?.status,
    session?.countdownEnd,
    phaseState.status,
    phaseState.countdownEnd,
    phaseChannelHealthy,
    gamePhase
  ])

  const toPhaseState = (data, fallbackStatus = 'lobby') => ({
    status: data?.status || fallbackStatus,
    currentQuestion: data?.currentQuestion ?? 0,
    countdownEnd: data?.countdownEnd ?? null,
    questionStartMs: data?.questionStartMs ?? data?.questionStartTimeFallback ?? null,
    questionEndMs: data?.questionEndMs ?? null,
    phaseSeq: Number.isFinite(data?.phaseSeq) ? data.phaseSeq : null
  })

  const shouldAcceptPhaseUpdate = (data) => {
    const incomingSeq = Number.isFinite(data?.phaseSeq) ? data.phaseSeq : null
    if (incomingSeq === null) {
      return true
    }
    if (incomingSeq < lastPhaseSeqRef.current) {
      return false
    }
    lastPhaseSeqRef.current = incomingSeq
    return true
  }

  const syncClock = async (options = {}) => {
    if (!user?.uid) {
      return { success: false, error: 'User not available' }
    }

    const result = await syncServerClock(user.uid, options)
    if (result.success && Number.isFinite(result.offsetMs)) {
      clockOffsetRef.current = result.offsetMs
      setClockOffsetMs(result.offsetMs)
    }
    return result
  }

  // Reaction config
  const reactionEmojis = ['🔥', '😎', '🤔', '😰', '👏', '😂', '🤯', '💀', '🎉', '❤️']
  const MAX_REACTIONS_PER_QUESTION = 5

  // Badge definitions
  const badgeTypes = {
    firstBlood: { icon: '🎯', name: 'First Blood', desc: 'First correct answer' },
    speedDemon: { icon: '⚡', name: 'Speed Demon', desc: 'Answered in under 3 seconds' },
    perfectStreak: { icon: '🔥', name: 'On Fire', desc: '4+ correct streak' },
    comeback: { icon: '🚀', name: 'Comeback', desc: 'Broke a 3+ wrong streak' },
    perfectGame: { icon: '👑', name: 'Perfect Game', desc: 'All answers correct' }
  }

  useEffect(() => {
    if (!user?.uid || !session?.pin) return

    let cancelled = false
    const runSync = async () => {
      const result = await syncServerClock(user.uid, { samples: 3 })
      if (cancelled || !result.success || !Number.isFinite(result.offsetMs)) {
        return
      }
      clockOffsetRef.current = result.offsetMs
      setClockOffsetMs(result.offsetMs)
    }

    runSync()
    const interval = setInterval(runSync, 120000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [user?.uid, session?.pin])



  // Session listeners
  useEffect(() => {
    if ((view === 'host' || view === 'play-host') && session?.pin) {
      return sessionService.subscribeToSession(
        session.pin,
        (data) => {
          if (!phaseChannelHealthyRef.current && !shouldAcceptPhaseUpdate(data)) {
            return
          }

          setSession(data)
          if (!phaseChannelHealthyRef.current) {
            const fallbackPhase = data.status || 'lobby'
            setGamePhase(fallbackPhase)
            if (data.currentQuestion !== undefined) setCurrentQuestion(data.currentQuestion)
            setPhaseState(toPhaseState(data, fallbackPhase))
          }
          if (data.scores) setScores(data.scores)
          if (data.streaks) setStreaks(data.streaks)
          if (data.coldStreaks) setColdStreaks(data.coldStreaks)
          if (data.reactions) setReactions(data.reactions)
          if (data.badges) setBadges(data.badges)
        },
        (error) => {
          setPhaseChannelHealthy(false)
          setPhaseState({})
          showToast("Session connection lost", "error")
        }
      )
    }
  }, [view, session?.pin])

  useEffect(() => {
    if ((view === 'wait' || view === 'play-player') && session?.pin) {
      return sessionService.subscribeToSession(
        session.pin,
        (data) => {
          // Check if player was kicked
          if (data.bannedUsers?.includes(user?.uid)) {
            localStorage.removeItem('quizSession')
            setSession(null)
            setPhaseChannelHealthy(false)
            setPhaseState({})
            setView('home')
            setJoinForm({ pin: '', name: '' })
            showToast("You have been removed from the game.", "error")
            return
          }

          if (!phaseChannelHealthyRef.current && !shouldAcceptPhaseUpdate(data)) {
            return
          }

          setSession(data)
          if (!phaseChannelHealthyRef.current) {
            const newPhase = data.status || 'lobby'
            if (
              (newPhase === 'countdown' || newPhase === 'question') &&
              prevGamePhaseRef.current !== 'countdown' &&
              prevGamePhaseRef.current !== 'question'
            ) {
              setAnswered(false)
              setPlayerAnswer(null)
              setMyReactionCount(0)
            }

            if (
              (newPhase === 'countdown' || newPhase === 'question') &&
              prevGamePhaseRef.current === 'lobby'
            ) {
              setView('play-player')
            }

            prevGamePhaseRef.current = newPhase
            setGamePhase(newPhase)
            if (data.currentQuestion !== undefined) setCurrentQuestion(data.currentQuestion)
            setPhaseState(toPhaseState(data, newPhase))
          }
          if (gamePhaseRef.current === 'results') {
            const myScore = data.scores?.[user?.uid] || 0
            const prevScore = scoresRef.current[user?.uid] || 0
            if (myScore > prevScore) {
              setShowConfetti(true)
              setTimeout(() => setShowConfetti(false), 2000)
            }
          }

          if (data.scores) setScores(data.scores)
          if (data.streaks) setStreaks(data.streaks)
          if (data.coldStreaks) setColdStreaks(data.coldStreaks)
          if (data.badges) setBadges(data.badges)
        },
        (error) => {
          // Session deleted or connection lost - clean up and redirect home
          localStorage.removeItem('quizSession')
          setSession(null)
          setPhaseChannelHealthy(false)
          setPhaseState({})
          setView('home')
          setJoinForm({ pin: '', name: '' })
          showToast("Quiz session ended by host", "info")
        }
      )
    }
  }, [view, session?.pin, user?.uid])

  useEffect(() => {
    if ((view === 'host' || view === 'play-host') && session?.pin) {
      return sessionService.subscribeToSessionPhase(
        session.pin,
        (data) => {
          if (!shouldAcceptPhaseUpdate(data)) {
            return
          }
          setPhaseChannelHealthy(true)
          const normalizedPhase = toPhaseState(data)
          setPhaseState(normalizedPhase)
          const newPhase = normalizedPhase.status || 'lobby'
          setGamePhase(newPhase)
          if (normalizedPhase.currentQuestion !== undefined) setCurrentQuestion(normalizedPhase.currentQuestion)
        },
        () => {
          setPhaseChannelHealthy(false)
          showToast("Session phase connection lost", "error")
        }
      )
    }
  }, [view, session?.pin])

  useEffect(() => {
    if ((view === 'wait' || view === 'play-player') && session?.pin) {
      return sessionService.subscribeToSessionPhase(
        session.pin,
        (data) => {
          if (!shouldAcceptPhaseUpdate(data)) {
            return
          }
          setPhaseChannelHealthy(true)
          const normalizedPhase = toPhaseState(data)
          setPhaseState(normalizedPhase)
          const newPhase = normalizedPhase.status || 'lobby'

          if (
            (newPhase === 'countdown' || newPhase === 'question') &&
            prevGamePhaseRef.current !== 'countdown' &&
            prevGamePhaseRef.current !== 'question'
          ) {
            setAnswered(false)
            setPlayerAnswer(null)
            setMyReactionCount(0)
          }

          if (
            (newPhase === 'countdown' || newPhase === 'question') &&
            prevGamePhaseRef.current === 'lobby'
          ) {
            setView('play-player')
          }

          prevGamePhaseRef.current = newPhase
          setGamePhase(newPhase)
          if (normalizedPhase.currentQuestion !== undefined) setCurrentQuestion(normalizedPhase.currentQuestion)
        },
        () => {
          setPhaseChannelHealthy(false)
          showToast("Session phase connection lost", "error")
        }
      )
    }
  }, [view, session?.pin])

  // E2E fallback: if backend updates are unavailable, host start signal moves players into gameplay.
  useEffect(() => {
    if (!IS_E2E_MODE || typeof window === 'undefined' || !session?.pin) return

    const onStorage = (event) => {
      if (event.key !== E2E_HOST_START_EVENT_KEY || !event.newValue) return

      try {
        const payload = JSON.parse(event.newValue)
        if (String(payload?.pin) !== String(session.pin)) return
      } catch {
        return
      }

      if (view === 'wait' || view === 'play-player') {
        setView('play-player')
        setGamePhase('question')
        setCurrentQuestion(0)
        setPhaseState((prev) => ({
          ...prev,
          status: 'question',
          currentQuestion: 0
        }))
        prevGamePhaseRef.current = 'question'
      }
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [session?.pin, view])


  const handleLaunch = (quiz) => {
    setLaunchingQuiz(quiz)
    setSelectedLeaderboard(null)
  }

  const effectiveSession = session ? { ...session, ...phaseState } : session

  const confirmLaunch = async () => {
    if (!launchingQuiz) return
    const leaderboardName = selectedLeaderboard ? leaderboards.find(lb => lb.id === selectedLeaderboard)?.name : null
    const result = await sessionService.createSession({
      quiz: launchingQuiz,
      leaderboardId: selectedLeaderboard || null,
      leaderboardName
    })
    if (result.success) {
      if (IS_E2E_MODE && result.session?.pin) {
        clearE2EJoinedPin(result.session.pin)
      }
      setSession(result.session)
      setPhaseChannelHealthy(false)
      const initialPhaseState = toPhaseState(result.session, result.session.status || 'lobby')
      setPhaseState(initialPhaseState)
      if (initialPhaseState.phaseSeq !== null) {
        lastPhaseSeqRef.current = initialPhaseState.phaseSeq
      }
      setScores({})
      setStreaks({})
      setColdStreaks({})
      setReactions([])
      setBadges({})
      setCurrentQuestion(0)
      setGamePhase('lobby')
      setLaunchingQuiz(null)
      setView('host')
    } else {
      showToast(result.error || "Failed to create session", "error")
    }
  }

  const toggleLateJoin = async () => {
    const result = await sessionService.toggleLateJoin(session.pin, !session.allowLateJoin)
    if (!result.success) {
      showToast(result.error || "Failed to toggle late join", "error")
    }
  }

  const kickPlayer = async (uid) => {
    if (!session?.pin) return
    const result = await sessionService.kickPlayer(session.pin, uid, session.bannedUsers)
    if (result.success) {
      showToast("Player kicked")
    } else {
      showToast(result.error || "Failed to kick player", "error")
    }
  }

  const handleJoin = async () => {
    if (!joinForm.pin || !joinForm.name.trim()) {
      showToast("Please enter PIN and name", "error")
      return
    }
    setJoiningSession(true)
    const result = await sessionService.joinSession({
      pin: joinForm.pin,
      userId: user.uid,
      name: joinForm.name
    })

    if (result.success) {
      setSession(result.session)
      setPhaseChannelHealthy(false)
      const initialPhaseState = toPhaseState(result.session, result.session.status || 'lobby')
      setPhaseState(initialPhaseState)
      if (initialPhaseState.phaseSeq !== null) {
        lastPhaseSeqRef.current = initialPhaseState.phaseSeq
      }
      setScores(result.session.scores || {})

      if (result.session.status !== 'lobby') {
        setView('play-player')
        prevGamePhaseRef.current = result.session.status
        setGamePhase(result.session.status)
        setCurrentQuestion(result.session.currentQuestion || 0)
        showToast("Joined! Catching up...", "info")
      } else {
        setView('wait')
        if (IS_E2E_MODE) {
          markE2EJoinedPin(joinForm.pin)
          emitE2EEvent(E2E_PLAYER_JOIN_EVENT_KEY, { pin: joinForm.pin })
        }
      }
    } else {
      showToast(result.error || "Failed to join session", "error")
    }
    setJoiningSession(false)
  }

  const tryRecoverSession = async () => {
    if (!user) return
    const result = await sessionService.recoverSession(user.uid)

    if (result.success) {
      setSession(result.session)
      setPhaseChannelHealthy(false)
      const initialPhaseState = toPhaseState(result.session, result.session.status || 'lobby')
      setPhaseState(initialPhaseState)
      if (initialPhaseState.phaseSeq !== null) {
        lastPhaseSeqRef.current = initialPhaseState.phaseSeq
      }
      setScores(result.session.scores || {})
      setJoinForm({ pin: result.pin, name: result.name })

      if (result.session.status === 'lobby') {
        setView('wait')
      } else if (result.session.status === 'final') {
        setView('play-player')
        prevGamePhaseRef.current = 'final'
        setGamePhase('final')
      } else {
        setView('play-player')
        prevGamePhaseRef.current = result.session.status
        setGamePhase(result.session.status)
      }
      showToast("Session restored!", "info")
    }
  }

  useEffect(() => {
    if (user && !isAdmin && view === 'home') tryRecoverSession()
  }, [user, isAdmin])

  const startGame = async () => {
    await syncClock({ samples: 2 })
    const result = await gameService.startGame(session.pin, { nowMs: getNowMs() })
    if (result.success) {
      if (IS_E2E_MODE) {
        emitE2EEvent(E2E_HOST_START_EVENT_KEY, { pin: session.pin, status: 'question' })
      }
      setView('play-host')
    } else if (IS_E2E_MODE) {
      emitE2EEvent(E2E_HOST_START_EVENT_KEY, { pin: session.pin, status: 'question' })
      setGamePhase('question')
      setCurrentQuestion(0)
      setView('play-host')
      showToast("E2E fallback: started locally", "info")
    } else {
      showToast(result.error || "Failed to start game", "error")
    }
  }

  const showQuestionResults = async () => {
    const result = await gameService.showQuestionResults(session.pin)
    if (!result.success) {
      showToast(result.error || "Failed to show results", "error")
    }
  }

  const nextQuestion = async () => {
    await syncClock({ samples: 2 })
    const result = await gameService.nextQuestion({
      pin: session.pin,
      currentQuestion,
      totalQuestions: session.quiz.questions.length,
      streaks: session.streaks,
      coldStreaks: session.coldStreaks,
      answers: session.answers,
      players: session.players,
      nowMs: getNowMs()
    })

    if (!result.success) {
      showToast(result.error || "Failed to move to next question", "error")
    }
  }

  const cancelSession = async () => {
    const result = await sessionService.deleteSession(session.pin)
    if (result.success) {
      setSession(null)
      setPhaseChannelHealthy(false)
      setPhaseState({})
      setView('dash')
    } else {
      showToast(result.error || "Failed to cancel session", "error")
    }
  }

  const leavePlayerSession = async () => {
    const pin = session?.pin
    const userId = user?.uid
    let leftRemotely = true

    if (pin && userId) {
      const result = await sessionService.leaveSession({ pin, userId })
      if (!result.success) {
        leftRemotely = false
      }
    }

    // Always recover UI locally, even if Firestore update fails
    localStorage.removeItem('quizSession')
    setSession(null)
    setJoinForm({ pin: '', name: '' })
    setScores({})
    setStreaks({})
    setColdStreaks({})
    setBadges({})
    setReactions([])
    setAnswered(false)
    setPlayerAnswer(null)
    setMyReactionCount(0)
    setCurrentQuestion(0)
    setGamePhase('lobby')
    setPhaseChannelHealthy(false)
    setPhaseState({})
    prevGamePhaseRef.current = 'lobby'
    setView('home')

    if (leftRemotely) {
      showToast('You left the session', 'info')
    } else {
      showToast("You left locally, but couldn't update the session", 'error')
    }
  }

  const abortGame = async () => {
    if (!confirm('Are you sure you want to stop the quiz? All players will be disconnected.')) {
      return
    }
    const result = await sessionService.deleteSession(session.pin)
    if (result.success) {
      setSession(null)
      setPhaseChannelHealthy(false)
      setPhaseState({})
      setView('dash')
      showToast("Quiz stopped", "info")
    } else {
      showToast(result.error || "Failed to stop quiz", "error")
    }
  }

  const endGame = async () => {
    if (session?.leaderboardId && session?.players && session?.scores) {
      await saveToLeaderboard(
        session.leaderboardId,
        session.players,
        session.scores,
        session.fairStats || {}
      )
      showToast(`Scores saved to ${session.leaderboardName}!`)
    }
    const result = await sessionService.deleteSession(session.pin)
    if (result.success) {
      setSession(null)
      setPhaseChannelHealthy(false)
      setPhaseState({})
      setView('dash')
      showToast("Session ended")
    } else {
      showToast(result.error || "Failed to end session", "error")
    }
  }

  const getStreakMultiplier = (streak) => {
    if (streak >= 4) return 4
    if (streak >= 3) return 3
    if (streak >= 2) return 2
    return 1
  }

  const sendReaction = async (emoji) => {
    if (!session?.pin || !user?.uid) return
    // Rate limit: max 5 reactions per question
    if (myReactionCount >= MAX_REACTIONS_PER_QUESTION) return

    setMyReactionCount(prev => prev + 1)
    const playerName = session.players?.[user.uid] || 'Player'
    const result = await gameService.sendReaction({
      pin: session.pin,
      emoji,
      playerName,
      userId: user.uid,
      currentReactions: session.reactions
    })

    if (!result.success) {
      showToast(result.error || "Failed to send reaction", "error")
      setMyReactionCount(prev => prev - 1) // Revert on error
    }
  }

  const submitAnswer = async (answerIndex, answerTime = null) => {
    if (answered) return

    // Grace period check - allow 3 seconds after timer ends
    const questionEndTime = getQuestionEndMs(effectiveSession)
    const GRACE_PERIOD = 3000  // 3 seconds grace
    const now = getNowMs()

    if (Number.isFinite(questionEndTime) && now > questionEndTime + GRACE_PERIOD) {
      showToast("Time's up! Answer not counted.", "error")
      setAnswered(true)
      return
    }

    setAnswered(true)
    setPlayerAnswer(answerIndex)
    haptic.medium()

    const question = session.quiz.questions[currentQuestion]
    const isCorrect = answerIndex === question.correct

    const currentStreak = streaks[user.uid] || 0
    const currentColdStreak = coldStreaks[user.uid] || 0

    let comebackBonus = 0
    let comebackMessage = null

    // Comeback bonus for breaking cold streak
    if (isCorrect && currentColdStreak >= 2) {
      if (currentColdStreak === 2) {
        comebackBonus = 50
        comebackMessage = "🔥 Warming Up!"
      } else if (currentColdStreak === 3) {
        comebackBonus = 100
        comebackMessage = "🚀 Comeback!"
      } else if (currentColdStreak >= 4) {
        comebackBonus = 200
        comebackMessage = "🔥 Phoenix Rising!"
      }
    }

    // Haptic and visual feedback based on answer
    if (isCorrect) {
      haptic.success()
      setScorePopKey(prev => prev + 1)
    } else {
      haptic.error()
      setShakeScreen(true)
      setTimeout(() => setShakeScreen(false), 500)
    }

    const newStreak = isCorrect ? currentStreak + 1 : 0
    const newColdStreak = isCorrect ? 0 : currentColdStreak + 1

    const multiplier = isCorrect ? getStreakMultiplier(newStreak) : 1
    const basePoints = isCorrect ? 100 : 0
    const points = basePoints * multiplier + comebackBonus

    const currentScore = scores[user.uid] || 0
    const currentCorrectCount = session.correctCounts?.[user.uid] || 0
    const newCorrectCount = isCorrect ? currentCorrectCount + 1 : currentCorrectCount

    // Calculate badges
    const newBadges = { ...(badges[user.uid] || {}) }
    const totalQuestions = session.quiz.questions.length

    // Speed Demon - answered correctly in under 3 seconds
    if (isCorrect && answerTime && answerTime < 3000) {
      newBadges.speedDemon = true
    }

    // On Fire - 4+ streak
    if (newStreak >= 4) {
      newBadges.perfectStreak = true
      haptic.streak()
    } else if (newStreak >= 2) {
      haptic.streak()
    }

    // Comeback badge - breaking 3+ wrong streak
    if (comebackBonus >= 100 && !newBadges.comeback) {
      newBadges.comeback = true
    }

    // Perfect Game - all correct (check on last question)
    if (currentQuestion === totalQuestions - 1 && isCorrect && newCorrectCount === totalQuestions) {
      newBadges.perfectGame = true
    }

    const result = await gameService.submitAnswer({
      pin: session.pin,
      userId: user.uid,
      updates: {
        [`answers.${user.uid}`]: { answerIndex, answerTime, timestamp: now },
        [`scores.${user.uid}`]: currentScore + points,
        [`streaks.${user.uid}`]: newStreak,
        [`coldStreaks.${user.uid}`]: newColdStreak,
        [`correctCounts.${user.uid}`]: newCorrectCount,
        [`badges.${user.uid}`]: newBadges
      }
    })

    if (result.success) {
      // Show comeback message
      if (comebackMessage) {
        showToast(comebackMessage, "success")
      }
    } else {
      showToast(result.error || "Failed to submit answer", "error")
    }
  }

  const leaderboard = Object.entries(scores)
    .map(([uid, score]) => ({
      uid,
      score,
      name: session?.players?.[uid] || 'Unknown',
      fairStats: session?.fairStats?.[uid] || {}
    }))
    .sort(compareLiveLeaderboardPlayers)


  // Render
  if (loading && view === 'home') {
    return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  }

  return (
    <div className={shakeScreen ? 'animate-shake' : ''}>
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <HomePage {...{ joinForm, setJoinForm, handleJoin, loading: joiningSession || loading, isAdmin, setView, handleSignInWithGoogle }} />
          </motion.div>
        )}
        {view === 'dash' && (
          <motion.div key="dash" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <DashboardPage {...{ user, isAdmin, handleSignInWithGoogle, signOutAdmin, dashTab, setDashTab, showImport, setShowImport, importText, setImportText, handleImport, quizzes, setActiveQuiz, setView, handleLaunch, handleDelete, leaderboards, setShowLeaderboardModal, showLeaderboardModal, newLeaderboardName, setNewLeaderboardName, newLeaderboardCourse, setNewLeaderboardCourse, newLeaderboardYear, setNewLeaderboardYear, createLeaderboard, setViewingLeaderboard, viewingLeaderboard, getLeaderboardPlayers, flushLeaderboard, deleteLeaderboard, renameLeaderboard, renamingLeaderboard, setRenamingLeaderboard, renameLeaderboardName, setRenameLeaderboardName, confirmRenameLeaderboard, launchingQuiz, setLaunchingQuiz, selectedLeaderboard, setSelectedLeaderboard, confirmLaunch, confirmModal, showToast }} />
          </motion.div>
        )}
        {view === 'edit' && (
          <motion.div key="edit" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <QuizEditorPage {...{ user, isAdmin, setView, activeQuiz, setActiveQuiz, handleSave, saving, showToast }} />
          </motion.div>
        )}
        {view === 'host' && (
          <motion.div key="host" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <HostLobbyPage {...{ user, isAdmin, setView, session: effectiveSession, startGame, toggleLateJoin, kickPlayer, cancelSession }} />
          </motion.div>
        )}
        {view === 'play-host' && (
          <motion.div key="play-host" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <HostGamePage {...{ user, isAdmin, setView, session: effectiveSession, gamePhase, currentQuestion, leaderboard, streaks, reactions, badges, badgeTypes, endGame, abortGame, showQuestionResults, nextQuestion, clockOffsetMs }} />
          </motion.div>
        )}
        {view === 'wait' && (
          <motion.div key="wait" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <PlayerWaitPage joinForm={joinForm} onLeaveSession={leavePlayerSession} />
          </motion.div>
        )}
        {view === 'play-player' && (
          <motion.div key="play-player" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <PlayerGamePage {...{ session: effectiveSession, gamePhase, currentQuestion, user, scores, streaks, coldStreaks, badges, badgeTypes, leaderboard, answered, setAnswered, submitAnswer, sendReaction, reactionEmojis, myReactionCount, MAX_REACTIONS_PER_QUESTION, showConfetti, setView, setSession, setJoinForm, shakeScreen, setShakeScreen, scorePopKey, showToast, onLeaveSession: leavePlayerSession, clockOffsetMs }} />
          </motion.div>
        )}
      </AnimatePresence>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <Confetti show={showConfetti} />
    </div>
  )
}
