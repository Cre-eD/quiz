import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authService } from './features/auth/services/authService'
import { sessionService } from './features/session/services/sessionService'
import { quizService } from './features/quiz/services/quizService'
import { gameService } from './features/game/services/gameService'
import { leaderboardService } from './features/leaderboard/services/leaderboardService'
import { optionColors } from './constants'
import { haptic } from './utils/haptic'
import Spinner from './components/Spinner'
import ConfirmModal from './components/ConfirmModal'
import Toast from './components/Toast'
import Confetti from './components/Confetti'
import TimerBar from './components/TimerBar'
import HomePage from './views/HomePage'
import PlayerWaitPage from './views/PlayerWaitPage'
import QuizEditorPage from './views/QuizEditorPage'
import HostLobbyPage from './views/HostLobbyPage'
import HostGamePage from './views/HostGamePage'
import PlayerGamePage from './views/PlayerGamePage'
import DashboardPage from './views/DashboardPage'

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

export default function App() {
  const [view, setView] = useState('home')
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  const [activeQuiz, setActiveQuiz] = useState({ title: '', questions: [] })
  const [session, setSession] = useState(null)
  const [joinForm, setJoinForm] = useState({ pin: '', name: '' })
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ isOpen: false })
  const [saving, setSaving] = useState(false)

  // Leaderboard state
  const [leaderboards, setLeaderboards] = useState([])
  const [selectedLeaderboard, setSelectedLeaderboard] = useState(null)
  const [dashTab, setDashTab] = useState('quizzes')
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [newLeaderboardName, setNewLeaderboardName] = useState('')
  const [renamingLeaderboard, setRenamingLeaderboard] = useState(null)
  const [renameLeaderboardName, setRenameLeaderboardName] = useState('')
  const [viewingLeaderboard, setViewingLeaderboard] = useState(null)
  const [launchingQuiz, setLaunchingQuiz] = useState(null)

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [playerAnswer, setPlayerAnswer] = useState(null)
  const [scores, setScores] = useState({})
  const [streaks, setStreaks] = useState({})
  const [coldStreaks, setColdStreaks] = useState({})
  const [answered, setAnswered] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [gamePhase, setGamePhase] = useState('lobby')
  const [reactions, setReactions] = useState([])
  const [badges, setBadges] = useState({})
  const [myReactionCount, setMyReactionCount] = useState(0)
  const [shakeScreen, setShakeScreen] = useState(false)
  const [scorePopKey, setScorePopKey] = useState(0)
  const prevGamePhaseRef = useRef('lobby') // Track previous phase to detect transitions

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

  const showToast = (message, type = "success") => setToast({ message, type })

  const handleSignInWithGoogle = async () => {
    setLoading(true)
    const result = await authService.handleSignInWithGoogle()

    if (result.requiresRedirect) {
      // Redirect in progress, don't update loading state
      return
    }

    if (!result.success) {
      showToast("Sign-in failed: " + result.error, "error")
      setLoading(false)
      return
    }

    // Validate admin access
    const validation = await authService.validateAdminAccess(result.user)
    if (validation.isAdmin) {
      setIsAdmin(true)
      setView('dash')
      showToast("Welcome back, Admin!")
    } else {
      showToast(validation.error, "error")
    }
    setLoading(false)
  }

  useEffect(() => {
    const handleRedirect = async () => {
      const result = await authService.handleRedirectResult()

      if (result.error) {
        showToast("Sign-in failed. Please try again.", "error")
        return
      }

      if (result.hasResult && result.user) {
        const validation = await authService.validateAdminAccess(result.user)
        if (validation.isAdmin) {
          setIsAdmin(true)
          setView('dash')
          showToast("Welcome back, Admin!")
        } else {
          showToast(validation.error, "error")
        }
        setLoading(false)
      }
    }
    handleRedirect()
  }, [])

  const signOutAdmin = async () => {
    const result = await authService.signOut()
    if (result.success) {
      setIsAdmin(false)
      setView('home')
      showToast("Signed out successfully")
    } else {
      showToast("Sign-out failed", "error")
    }
  }

  useEffect(() => {
    return authService.onAuthStateChanged((user, isAdminStatus) => {
      setUser(user)
      setIsAdmin(isAdminStatus)
      setLoading(false)
    })
  }, [])

  // Load quizzes
  useEffect(() => {
    if (view === 'dash' && user) {
      return quizService.subscribeToQuizzes(
        (quizzes) => setQuizzes(quizzes),
        (error) => showToast("Failed to load quizzes", "error")
      )
    }
  }, [view, user])

  // Load leaderboards
  useEffect(() => {
    if (view === 'dash' && user && isAdmin) {
      return leaderboardService.subscribeToLeaderboards(
        (leaderboards) => setLeaderboards(leaderboards),
        (error) => showToast("Failed to load leaderboards", "error")
      )
    }
  }, [view, user, isAdmin])

  // Leaderboard functions
  const createLeaderboard = async () => {
    if (!newLeaderboardName.trim()) {
      showToast("Please enter a leaderboard name", "error")
      return
    }
    const result = await leaderboardService.createLeaderboard(newLeaderboardName)
    if (result.success) {
      setNewLeaderboardName('')
      setShowLeaderboardModal(false)
      showToast("Leaderboard created!")
    } else {
      showToast(result.error || "Failed to create leaderboard", "error")
    }
  }

  const flushLeaderboard = async (lb) => {
    setConfirmModal({
      isOpen: true,
      title: "Flush Leaderboard",
      message: `Are you sure you want to reset "${lb.name}"? All scores will be deleted.`,
      onConfirm: async () => {
        const result = await leaderboardService.flushLeaderboard(lb.id)
        if (result.success) {
          showToast("Leaderboard reset!")
          setViewingLeaderboard(null)
        } else {
          showToast(result.error || "Failed to reset leaderboard", "error")
        }
        setConfirmModal({ isOpen: false })
      },
      onCancel: () => setConfirmModal({ isOpen: false })
    })
  }

  const deleteLeaderboard = async (lb) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Leaderboard",
      message: `Are you sure you want to delete "${lb.name}"? This cannot be undone.`,
      onConfirm: async () => {
        const result = await leaderboardService.deleteLeaderboard(lb.id)
        if (result.success) {
          showToast("Leaderboard deleted!")
          setViewingLeaderboard(null)
        } else {
          showToast(result.error || "Failed to delete leaderboard", "error")
        }
        setConfirmModal({ isOpen: false })
      },
      onCancel: () => setConfirmModal({ isOpen: false })
    })
  }

  const renameLeaderboard = async (lb) => {
    setRenamingLeaderboard(lb)
    setRenameLeaderboardName(lb.name)
  }

  const confirmRenameLeaderboard = async () => {
    if (!renameLeaderboardName.trim()) {
      showToast("Please enter a leaderboard name", "error")
      return
    }
    const result = await leaderboardService.renameLeaderboard({
      leaderboardId: renamingLeaderboard.id,
      newName: renameLeaderboardName
    })
    if (result.success) {
      showToast("Leaderboard renamed!")
      setRenamingLeaderboard(null)
      setRenameLeaderboardName('')
    } else {
      showToast(result.error || "Failed to rename leaderboard", "error")
    }
  }

  const saveToLeaderboard = async (leaderboardId, sessionPlayers, sessionScores) => {
    if (!leaderboardId) return
    const result = await leaderboardService.saveScoresToLeaderboard({
      leaderboardId,
      sessionPlayers,
      sessionScores
    })
    if (!result.success) {
      console.error('Failed to save to leaderboard:', result.error)
    }
  }

  // Session listeners
  useEffect(() => {
    if ((view === 'host' || view === 'play-host') && session?.pin) {
      return sessionService.subscribeToSession(
        session.pin,
        (data) => {
          setSession(data)
          setGamePhase(data.status || 'lobby')
          if (data.currentQuestion !== undefined) setCurrentQuestion(data.currentQuestion)
          if (data.scores) setScores(data.scores)
          if (data.streaks) setStreaks(data.streaks)
          if (data.coldStreaks) setColdStreaks(data.coldStreaks)
          if (data.reactions) setReactions(data.reactions)
          if (data.badges) setBadges(data.badges)
        },
        (error) => showToast("Session connection lost", "error")
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
            setView('home')
            setJoinForm({ pin: '', name: '' })
            showToast("You have been removed from the game.", "error")
            return
          }

          setSession(data)
          const newPhase = data.status || 'lobby'

          // Use ref to detect phase transitions (avoids stale closure issues)
          if ((newPhase === 'countdown' || newPhase === 'question') && prevGamePhaseRef.current !== 'countdown' && prevGamePhaseRef.current !== 'question') {
            setAnswered(false)
            setPlayerAnswer(null)
            setMyReactionCount(0) // Reset reaction limit for new question
          }
          if (newPhase === 'results') {
            const myScore = data.scores?.[user?.uid] || 0
            const prevScore = scores[user?.uid] || 0
            if (myScore > prevScore) {
              setShowConfetti(true)
              setTimeout(() => setShowConfetti(false), 2000)
            }
          }

          // Transition from lobby to play view (on countdown or question)
          if ((newPhase === 'countdown' || newPhase === 'question') && prevGamePhaseRef.current === 'lobby') {
            setView('play-player')
          }

          // Update ref and state
          prevGamePhaseRef.current = newPhase
          setGamePhase(newPhase)
          if (data.currentQuestion !== undefined) setCurrentQuestion(data.currentQuestion)
          if (data.scores) setScores(data.scores)
          if (data.streaks) setStreaks(data.streaks)
          if (data.coldStreaks) setColdStreaks(data.coldStreaks)
          if (data.badges) setBadges(data.badges)
        },
        (error) => showToast("Session connection lost", "error")
      )
    }
  }, [view, session?.pin, user?.uid])

  const handleImport = () => {
    const result = quizService.importQuizFromJSON(importText)
    if (result.success) {
      setActiveQuiz(result.quiz)
      setShowImport(false)
      setImportText('')
      setView('edit')
      showToast("Quiz imported successfully!")
    } else {
      showToast(result.error || "Invalid JSON format", "error")
    }
  }

  const handleSave = async () => {
    if (!activeQuiz.title.trim()) {
      showToast("Please enter a quiz title", "error")
      return
    }
    setSaving(true)
    const result = await quizService.saveQuiz({ quiz: activeQuiz, userId: user.uid })
    if (result.success) {
      showToast("Quiz saved successfully!")
      setView('dash')
    } else {
      showToast(result.error || "Failed to save quiz", "error")
    }
    setSaving(false)
  }

  const handleDelete = async (quiz) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Quiz",
      message: `Are you sure you want to delete "${quiz.title}"?`,
      onConfirm: async () => {
        const result = await quizService.deleteQuiz(quiz.id)
        if (result.success) {
          showToast("Quiz deleted")
        } else {
          showToast(result.error || "Failed to delete quiz", "error")
        }
        setConfirmModal({ isOpen: false })
      },
      onCancel: () => setConfirmModal({ isOpen: false })
    })
  }

  const handleLaunch = (quiz) => {
    setLaunchingQuiz(quiz)
    setSelectedLeaderboard(null)
  }

  const confirmLaunch = async () => {
    if (!launchingQuiz) return
    const leaderboardName = selectedLeaderboard ? leaderboards.find(lb => lb.id === selectedLeaderboard)?.name : null
    const result = await sessionService.createSession({
      quiz: launchingQuiz,
      leaderboardId: selectedLeaderboard || null,
      leaderboardName
    })
    if (result.success) {
      setSession(result.session)
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
    setLoading(true)
    const result = await sessionService.joinSession({
      pin: joinForm.pin,
      userId: user.uid,
      displayName: joinForm.name
    })

    if (result.success) {
      setSession(result.session)
      setScores(result.session.scores || {})

      if (result.session.status !== 'lobby') {
        setView('play-player')
        prevGamePhaseRef.current = result.session.status
        setGamePhase(result.session.status)
        setCurrentQuestion(result.session.currentQuestion || 0)
        showToast("Joined! Catching up...", "info")
      } else {
        setView('wait')
      }
    } else {
      showToast(result.error || "Failed to join session", "error")
    }
    setLoading(false)
  }

  const tryRecoverSession = async () => {
    if (!user) return
    const result = await sessionService.recoverSession(user.uid)

    if (result.success) {
      setSession(result.session)
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
    const result = await gameService.startGame(session.pin)
    if (result.success) {
      setView('play-host')

      // Auto-transition to question phase after countdown
      setTimeout(async () => {
        await gameService.startQuestionTimer(session.pin)
      }, 3000)
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
    const result = await gameService.nextQuestion({
      pin: session.pin,
      currentQuestion,
      totalQuestions: session.quiz.questions.length,
      streaks: session.streaks,
      coldStreaks: session.coldStreaks,
      answers: session.answers,
      players: session.players
    })

    if (result.success && !result.isFinal) {
      // Auto-transition to question phase after countdown
      setTimeout(async () => {
        await gameService.startQuestionTimer(session.pin)
      }, 3000)
    } else if (!result.success) {
      showToast(result.error || "Failed to move to next question", "error")
    }
  }

  const endGame = async () => {
    if (session?.leaderboardId && session?.players && session?.scores) {
      await saveToLeaderboard(session.leaderboardId, session.players, session.scores)
      showToast(`Scores saved to ${session.leaderboardName}!`)
    }
    const result = await sessionService.deleteSession(session.pin)
    if (result.success) {
      setSession(null)
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
    const questionEndTime = session.questionStartTime + (25 * 1000)  // 25 seconds
    const GRACE_PERIOD = 3000  // 3 seconds grace
    const now = Date.now()

    if (now > questionEndTime + GRACE_PERIOD) {
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

    // First Blood - first correct answer in the question
    const isFirstCorrect = Object.values(session.answers || {}).filter(a =>
      a.answerIndex === question.correct
    ).length === 0
    if (isCorrect && isFirstCorrect) {
      newBadges.firstBlood = true
    }

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
    .map(([uid, score]) => ({ uid, score, name: session?.players?.[uid] || 'Unknown' }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // Stable tie-breaker: alphabetical by name
      return a.name.localeCompare(b.name)
    })

  const getLeaderboardPlayers = (lb) => {
    if (!lb?.players) return []
    return Object.entries(lb.players)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 20)
  }

  // Render
  if (loading && view === 'home') {
    return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  }

  return (
    <div className={shakeScreen ? 'animate-shake' : ''}>
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <HomePage {...{ joinForm, setJoinForm, handleJoin, loading, isAdmin, setView, handleSignInWithGoogle }} />
          </motion.div>
        )}
        {view === 'dash' && (
          <motion.div key="dash" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <DashboardPage {...{ user, isAdmin, handleSignInWithGoogle, signOutAdmin, dashTab, setDashTab, showImport, setShowImport, importText, setImportText, handleImport, quizzes, setActiveQuiz, setView, handleLaunch, handleDelete, leaderboards, setShowLeaderboardModal, showLeaderboardModal, newLeaderboardName, setNewLeaderboardName, createLeaderboard, setViewingLeaderboard, viewingLeaderboard, getLeaderboardPlayers, flushLeaderboard, deleteLeaderboard, renameLeaderboard, renamingLeaderboard, setRenamingLeaderboard, renameLeaderboardName, setRenameLeaderboardName, confirmRenameLeaderboard, launchingQuiz, setLaunchingQuiz, selectedLeaderboard, setSelectedLeaderboard, confirmLaunch, confirmModal }} />
          </motion.div>
        )}
        {view === 'edit' && (
          <motion.div key="edit" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <QuizEditorPage {...{ user, isAdmin, setView, activeQuiz, setActiveQuiz, handleSave, saving, showToast }} />
          </motion.div>
        )}
        {view === 'host' && (
          <motion.div key="host" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <HostLobbyPage {...{ user, isAdmin, setView, session, startGame, toggleLateJoin, kickPlayer, db, deleteDoc, doc }} />
          </motion.div>
        )}
        {view === 'play-host' && (
          <motion.div key="play-host" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <HostGamePage {...{ user, isAdmin, setView, session, gamePhase, currentQuestion, leaderboard, streaks, reactions, badges, badgeTypes, endGame, showQuestionResults, nextQuestion }} />
          </motion.div>
        )}
        {view === 'wait' && (
          <motion.div key="wait" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <PlayerWaitPage joinForm={joinForm} />
          </motion.div>
        )}
        {view === 'play-player' && (
          <motion.div key="play-player" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <PlayerGamePage {...{ session, gamePhase, currentQuestion, user, scores, streaks, coldStreaks, badges, badgeTypes, leaderboard, answered, setAnswered, submitAnswer, sendReaction, reactionEmojis, myReactionCount, MAX_REACTIONS_PER_QUESTION, showConfetti, setView, setSession, setJoinForm, shakeScreen, setShakeScreen, scorePopKey, showToast }} />
          </motion.div>
        )}
      </AnimatePresence>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <Confetti show={showConfetti} />
    </div>
  )
}

// ============ VIEW COMPONENTS ============

// Quiz category colors and icons
const categoryConfig = {
  pre: { color: 'emerald', icon: 'play-circle', label: 'Pre', bgClass: 'bg-emerald-600/20', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30' },
  mid: { color: 'amber', icon: 'pause-circle', label: 'Mid', bgClass: 'bg-amber-600/20', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
  post: { color: 'blue', icon: 'stop-circle', label: 'Post', bgClass: 'bg-blue-600/20', textClass: 'text-blue-400', borderClass: 'border-blue-500/30' }
}


