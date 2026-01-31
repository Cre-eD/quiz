import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { signInAnonymously, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, onSnapshot, collection, deleteDoc } from 'firebase/firestore'
import { auth, db, googleProvider, ADMIN_EMAIL } from './firebase'
import { optionColors } from './constants'
import { haptic } from './utils/haptic'
import Spinner from './components/Spinner'
import ConfirmModal from './components/ConfirmModal'
import Toast from './components/Toast'
import Confetti from './components/Confetti'
import TimerBar from './components/TimerBar'

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
    perfectStreak: { icon: '🔥', name: 'On Fire', desc: 'Got a 4+ answer streak' },
    comeback: { icon: '🚀', name: 'Comeback', desc: 'Moved up 3+ places' },
    perfectGame: { icon: '👑', name: 'Perfect Game', desc: 'All answers correct' }
  }

  const showToast = (message, type = "success") => setToast({ message, type })

  const checkAdmin = (u) => {
    if (!u || !u.email) return false
    return u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  }

  const signInWithGoogle = async () => {
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await handleAuthResult(result.user)
    } catch (popupError) {
      if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
        sessionStorage.setItem('authRedirect', 'dash')
        signInWithRedirect(auth, googleProvider)
      } else {
        showToast("Sign-in failed: " + (popupError.message || "Unknown error"), "error")
        setLoading(false)
      }
    }
  }

  const handleAuthResult = async (authUser) => {
    if (!authUser) return
    const userEmail = (authUser.email || '').toLowerCase()

    if (userEmail === ADMIN_EMAIL.toLowerCase()) {
      setIsAdmin(true)
      setView('dash')
      showToast("Welcome back, Admin!")
    } else {
      await signOut(auth)
      showToast("Access denied. Only " + ADMIN_EMAIL + " can access the dashboard.", "error")
      await signInAnonymously(auth)
    }
    setLoading(false)
  }

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth)
        if (result && result.user) {
          sessionStorage.removeItem('authRedirect')
          await handleAuthResult(result.user)
        }
      } catch (e) {
        showToast("Sign-in failed. Please try again.", "error")
      }
    }
    handleRedirectResult()
  }, [])

  const signOutAdmin = async () => {
    try {
      await signOut(auth)
      setIsAdmin(false)
      setView('home')
      showToast("Signed out successfully")
      await signInAnonymously(auth)
    } catch (e) {
      showToast("Sign-out failed", "error")
    }
  }

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u)
      setIsAdmin(checkAdmin(u))
      setLoading(false)
      if (!u) signInAnonymously(auth)
    })
  }, [])

  // Load quizzes
  useEffect(() => {
    if (view === 'dash' && user) {
      return onSnapshot(collection(db, 'quizzes'), (snapshot) => {
        setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      })
    }
  }, [view, user])

  // Load leaderboards
  useEffect(() => {
    if (view === 'dash' && user && isAdmin) {
      return onSnapshot(collection(db, 'leaderboards'), (snapshot) => {
        setLeaderboards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      })
    }
  }, [view, user, isAdmin])

  // Leaderboard functions
  const createLeaderboard = async () => {
    if (!newLeaderboardName.trim()) {
      showToast("Please enter a leaderboard name", "error")
      return
    }
    try {
      const id = Math.random().toString(36).substring(2, 11)
      await setDoc(doc(db, 'leaderboards', id), {
        id, name: newLeaderboardName.trim(), createdAt: Date.now(), players: {}
      })
      setNewLeaderboardName('')
      setShowLeaderboardModal(false)
      showToast("Leaderboard created!")
    } catch (e) {
      showToast("Failed to create leaderboard", "error")
    }
  }

  const flushLeaderboard = async (lb) => {
    setConfirmModal({
      isOpen: true,
      title: "Flush Leaderboard",
      message: `Are you sure you want to reset "${lb.name}"? All scores will be deleted.`,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'leaderboards', lb.id), { players: {} })
          showToast("Leaderboard reset!")
          setViewingLeaderboard(null)
        } catch (e) {
          showToast("Failed to reset leaderboard", "error")
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
        try {
          await deleteDoc(doc(db, 'leaderboards', lb.id))
          showToast("Leaderboard deleted!")
          setViewingLeaderboard(null)
        } catch (e) {
          showToast("Failed to delete leaderboard", "error")
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
    try {
      await updateDoc(doc(db, 'leaderboards', renamingLeaderboard.id), {
        name: renameLeaderboardName.trim()
      })
      showToast("Leaderboard renamed!")
      setRenamingLeaderboard(null)
      setRenameLeaderboardName('')
    } catch (e) {
      showToast("Failed to rename leaderboard", "error")
    }
  }

  const saveToLeaderboard = async (leaderboardId, sessionPlayers, sessionScores) => {
    if (!leaderboardId) return
    try {
      const lbRef = doc(db, 'leaderboards', leaderboardId)
      const lbSnap = await getDoc(lbRef)
      if (!lbSnap.exists()) return

      const existingPlayers = lbSnap.data().players || {}
      Object.entries(sessionPlayers).forEach(([uid, displayName]) => {
        const nameKey = displayName.toLowerCase().trim()
        const sessionScore = sessionScores[uid] || 0

        if (existingPlayers[nameKey]) {
          existingPlayers[nameKey].totalScore += sessionScore
          existingPlayers[nameKey].quizzesTaken += 1
          existingPlayers[nameKey].lastPlayed = Date.now()
          existingPlayers[nameKey].displayName = displayName
        } else {
          existingPlayers[nameKey] = {
            displayName, totalScore: sessionScore, quizzesTaken: 1, lastPlayed: Date.now()
          }
        }
      })
      await updateDoc(lbRef, { players: existingPlayers })
    } catch (e) {
      console.error('Failed to save to leaderboard:', e)
    }
  }

  // Session listeners
  useEffect(() => {
    if ((view === 'host' || view === 'play-host') && session?.pin) {
      return onSnapshot(doc(db, 'sessions', session.pin), (snap) => {
        if (snap.exists()) {
          const data = snap.data()
          setSession(data)
          setGamePhase(data.status || 'lobby')
          if (data.currentQuestion !== undefined) setCurrentQuestion(data.currentQuestion)
          if (data.scores) setScores(data.scores)
          if (data.streaks) setStreaks(data.streaks)
          if (data.reactions) setReactions(data.reactions)
          if (data.badges) setBadges(data.badges)
        }
      })
    }
  }, [view, session?.pin])

  useEffect(() => {
    if ((view === 'wait' || view === 'play-player') && session?.pin) {
      return onSnapshot(doc(db, 'sessions', session.pin), (snap) => {
        if (snap.exists()) {
          const data = snap.data()

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
          if (newPhase === 'question' && prevGamePhaseRef.current !== 'question') {
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

          // Transition from lobby to play view
          if (newPhase === 'question' && prevGamePhaseRef.current === 'lobby') {
            setView('play-player')
          }

          // Update ref and state
          prevGamePhaseRef.current = newPhase
          setGamePhase(newPhase)
          if (data.currentQuestion !== undefined) setCurrentQuestion(data.currentQuestion)
          if (data.scores) setScores(data.scores)
          if (data.streaks) setStreaks(data.streaks)
          if (data.badges) setBadges(data.badges)
        }
      })
    }
  }, [view, session?.pin, user?.uid])

  const handleImport = () => {
    try {
      const data = JSON.parse(importText)
      if (!data.title || !Array.isArray(data.questions)) throw new Error("Invalid format")
      setActiveQuiz(data)
      setShowImport(false)
      setImportText('')
      setView('edit')
      showToast("Quiz imported successfully!")
    } catch (e) {
      showToast("Invalid JSON format", "error")
    }
  }

  const handleSave = async () => {
    if (!activeQuiz.title.trim()) {
      showToast("Please enter a quiz title", "error")
      return
    }
    setSaving(true)
    try {
      const id = activeQuiz.id || Math.random().toString(36).substring(2, 11)
      await setDoc(doc(db, 'quizzes', id), { ...activeQuiz, id, owner: user.uid })
      showToast("Quiz saved successfully!")
      setView('dash')
    } catch (e) {
      showToast("Failed to save quiz", "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (quiz) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Quiz",
      message: `Are you sure you want to delete "${quiz.title}"?`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'quizzes', quiz.id))
          showToast("Quiz deleted")
        } catch (e) {
          showToast("Failed to delete quiz", "error")
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
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    const data = {
      pin, quiz: launchingQuiz, status: 'lobby', players: {}, scores: {}, streaks: {},
      currentQuestion: 0, answers: {}, allowLateJoin: true,
      leaderboardId: selectedLeaderboard || null,
      leaderboardName: selectedLeaderboard ? leaderboards.find(lb => lb.id === selectedLeaderboard)?.name : null,
      reactions: [], badges: {}, correctCounts: {}, bannedUsers: []
    }
    await setDoc(doc(db, 'sessions', pin), data)
    setSession(data)
    setScores({})
    setStreaks({})
    setReactions([])
    setBadges({})
    setCurrentQuestion(0)
    setGamePhase('lobby')
    setLaunchingQuiz(null)
    setView('host')
  }

  const toggleLateJoin = async () => {
    await updateDoc(doc(db, 'sessions', session.pin), { allowLateJoin: !session.allowLateJoin })
  }

  const kickPlayer = async (uid) => {
    if (!session?.pin) return
    const currentBanned = session.bannedUsers || []
    const updates = {
      bannedUsers: [...currentBanned, uid]
    }
    // Remove player from players, scores, streaks
    updates[`players.${uid}`] = null
    updates[`scores.${uid}`] = null
    updates[`streaks.${uid}`] = null
    await updateDoc(doc(db, 'sessions', session.pin), updates)
    showToast("Player kicked")
  }

  const handleJoin = async () => {
    if (!joinForm.pin || !joinForm.name.trim()) {
      showToast("Please enter PIN and name", "error")
      return
    }
    setLoading(true)
    try {
      const sRef = doc(db, 'sessions', joinForm.pin)
      const snap = await getDoc(sRef)
      if (!snap.exists()) {
        showToast("PIN not found!", "error")
        setLoading(false)
        return
      }
      const sessionData = snap.data()

      if (sessionData.status !== 'lobby' && !sessionData.allowLateJoin) {
        showToast("Game already in progress. Late joining is disabled.", "error")
        setLoading(false)
        return
      }

      // Check if user is banned
      if (sessionData.bannedUsers?.includes(user.uid)) {
        showToast("You have been removed from this game.", "error")
        setLoading(false)
        return
      }

      await updateDoc(sRef, {
        [`players.${user.uid}`]: joinForm.name,
        [`scores.${user.uid}`]: sessionData.scores?.[user.uid] || 0
      })
      localStorage.setItem('quizSession', JSON.stringify({ pin: joinForm.pin, name: joinForm.name }))
      setSession(sessionData)
      setScores(sessionData.scores || {})

      if (sessionData.status !== 'lobby') {
        setView('play-player')
        prevGamePhaseRef.current = sessionData.status
        setGamePhase(sessionData.status)
        setCurrentQuestion(sessionData.currentQuestion || 0)
        showToast("Joined! Catching up...", "info")
      } else {
        setView('wait')
      }
    } catch (e) {
      showToast("Failed to join session", "error")
    } finally {
      setLoading(false)
    }
  }

  const tryRecoverSession = async () => {
    const saved = localStorage.getItem('quizSession')
    if (!saved || !user) return

    try {
      const { pin, name } = JSON.parse(saved)
      const snap = await getDoc(doc(db, 'sessions', pin))

      if (snap.exists()) {
        const data = snap.data()
        if (data.players && data.players[user.uid]) {
          setSession(data)
          setScores(data.scores || {})
          setJoinForm({ pin, name })

          if (data.status === 'lobby') setView('wait')
          else if (data.status === 'final') { setView('play-player'); prevGamePhaseRef.current = 'final'; setGamePhase('final') }
          else { setView('play-player'); prevGamePhaseRef.current = data.status; setGamePhase(data.status) }
          showToast("Session restored!", "info")
        } else {
          localStorage.removeItem('quizSession')
        }
      } else {
        localStorage.removeItem('quizSession')
      }
    } catch (e) {
      localStorage.removeItem('quizSession')
    }
  }

  useEffect(() => {
    if (user && !isAdmin && view === 'home') tryRecoverSession()
  }, [user, isAdmin])

  const startGame = async () => {
    await updateDoc(doc(db, 'sessions', session.pin), {
      status: 'question', currentQuestion: 0, answers: {}, questionStartTime: Date.now(), reactions: []
    })
    setView('play-host')
  }

  const showQuestionResults = async () => {
    await updateDoc(doc(db, 'sessions', session.pin), { status: 'results' })
  }

  const nextQuestion = async () => {
    const nextQ = currentQuestion + 1
    if (nextQ >= session.quiz.questions.length) {
      await updateDoc(doc(db, 'sessions', session.pin), { status: 'final', reactions: [] })
    } else {
      await updateDoc(doc(db, 'sessions', session.pin), {
        status: 'question', currentQuestion: nextQ, answers: {}, questionStartTime: Date.now(), reactions: []
      })
    }
  }

  const endGame = async () => {
    if (session?.leaderboardId && session?.players && session?.scores) {
      await saveToLeaderboard(session.leaderboardId, session.players, session.scores)
      showToast(`Scores saved to ${session.leaderboardName}!`)
    }
    await deleteDoc(doc(db, 'sessions', session.pin))
    setSession(null)
    setView('dash')
    showToast("Session ended")
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
    const reaction = {
      id: Date.now() + Math.random(),
      emoji,
      playerName,
      timestamp: Date.now()
    }
    // Add reaction to array (keep last 15 for display)
    const currentReactions = session.reactions || []
    const newReactions = [...currentReactions, reaction].slice(-15)
    await updateDoc(doc(db, 'sessions', session.pin), { reactions: newReactions })
  }

  const submitAnswer = async (answerIndex, answerTime = null) => {
    if (answered) return
    setAnswered(true)
    setPlayerAnswer(answerIndex)
    haptic.medium()

    const question = session.quiz.questions[currentQuestion]
    const isCorrect = answerIndex === question.correct

    // Haptic and visual feedback based on answer
    if (isCorrect) {
      haptic.success()
      setScorePopKey(prev => prev + 1)
    } else {
      haptic.error()
      setShakeScreen(true)
      setTimeout(() => setShakeScreen(false), 500)
    }

    const currentStreak = streaks[user.uid] || 0
    const newStreak = isCorrect ? currentStreak + 1 : 0
    const multiplier = isCorrect ? getStreakMultiplier(newStreak) : 1
    const basePoints = isCorrect ? 100 : 0
    const points = basePoints * multiplier
    const currentScore = scores[user.uid] || 0
    const currentCorrectCount = session.correctCounts?.[user.uid] || 0
    const newCorrectCount = isCorrect ? currentCorrectCount + 1 : currentCorrectCount

    // Calculate badges
    const newBadges = { ...(badges[user.uid] || {}) }
    const totalQuestions = session.quiz.questions.length

    // First Blood - first correct answer in the game
    if (isCorrect && currentQuestion === 0 && Object.keys(session.answers || {}).length === 0) {
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

    // Perfect Game - all correct (check on last question)
    if (currentQuestion === totalQuestions - 1 && isCorrect && newCorrectCount === totalQuestions) {
      newBadges.perfectGame = true
    }

    await updateDoc(doc(db, 'sessions', session.pin), {
      [`answers.${user.uid}`]: answerIndex,
      [`scores.${user.uid}`]: currentScore + points,
      [`streaks.${user.uid}`]: newStreak,
      [`correctCounts.${user.uid}`]: newCorrectCount,
      [`badges.${user.uid}`]: newBadges
    })
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
            <HomeView {...{ joinForm, setJoinForm, handleJoin, loading, isAdmin, setView, signInWithGoogle }} />
          </motion.div>
        )}
        {view === 'dash' && (
          <motion.div key="dash" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <DashboardView {...{ user, isAdmin, signInWithGoogle, signOutAdmin, dashTab, setDashTab, showImport, setShowImport, importText, setImportText, handleImport, quizzes, setActiveQuiz, setView, handleLaunch, handleDelete, leaderboards, setShowLeaderboardModal, showLeaderboardModal, newLeaderboardName, setNewLeaderboardName, createLeaderboard, setViewingLeaderboard, viewingLeaderboard, getLeaderboardPlayers, flushLeaderboard, deleteLeaderboard, renameLeaderboard, renamingLeaderboard, setRenamingLeaderboard, renameLeaderboardName, setRenameLeaderboardName, confirmRenameLeaderboard, launchingQuiz, setLaunchingQuiz, selectedLeaderboard, setSelectedLeaderboard, confirmLaunch, confirmModal }} />
          </motion.div>
        )}
        {view === 'edit' && (
          <motion.div key="edit" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <EditView {...{ user, isAdmin, setView, activeQuiz, setActiveQuiz, handleSave, saving, showToast }} />
          </motion.div>
        )}
        {view === 'host' && (
          <motion.div key="host" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <HostLobbyView {...{ user, isAdmin, setView, session, startGame, toggleLateJoin, kickPlayer, db, deleteDoc, doc }} />
          </motion.div>
        )}
        {view === 'play-host' && (
          <motion.div key="play-host" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <HostPlayView {...{ user, isAdmin, setView, session, gamePhase, currentQuestion, leaderboard, streaks, reactions, badges, badgeTypes, endGame, showQuestionResults, nextQuestion }} />
          </motion.div>
        )}
        {view === 'wait' && (
          <motion.div key="wait" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <WaitView joinForm={joinForm} />
          </motion.div>
        )}
        {view === 'play-player' && (
          <motion.div key="play-player" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
            <PlayerPlayView {...{ session, gamePhase, currentQuestion, user, scores, streaks, badges, badgeTypes, leaderboard, answered, setAnswered, submitAnswer, sendReaction, reactionEmojis, myReactionCount, MAX_REACTIONS_PER_QUESTION, showConfetti, setView, setSession, setJoinForm, shakeScreen, setShakeScreen, scorePopKey }} />
          </motion.div>
        )}
      </AnimatePresence>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <Confetti show={showConfetti} />
    </div>
  )
}

// ============ VIEW COMPONENTS ============

function HomeView({ joinForm, setJoinForm, handleJoin, loading, isAdmin, setView, signInWithGoogle }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="animate-float mb-4">
          <i className="fa fa-graduation-cap text-5xl text-blue-500"></i>
        </div>
        <h1 className="text-5xl font-black gradient-text mb-2">LectureQuiz</h1>
        <p className="text-slate-400 mb-10">Enter the game PIN to join</p>

        <div className="space-y-4 mb-4">
          <input
            type="text"
            inputMode="numeric"
            className="w-full glass p-6 rounded-2xl text-center text-5xl font-mono font-bold tracking-[0.3em] focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-2xl indent-[0.15em]"
            placeholder="PIN"
            maxLength={4}
            value={joinForm.pin}
            onChange={e => setJoinForm({...joinForm, pin: e.target.value.replace(/\D/g, '')})}
          />
          <input
            className="w-full glass p-4 rounded-xl text-center text-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Your Nickname"
            maxLength={20}
            value={joinForm.name}
            onChange={e => setJoinForm({...joinForm, name: e.target.value})}
            onKeyDown={e => e.key === 'Enter' && joinForm.pin && joinForm.name && handleJoin()}
          />
        </div>

        <div className="glass rounded-xl p-3 mb-6 border border-yellow-500/30 text-left">
          <p className="text-yellow-500 text-sm flex items-start gap-2">
            <i className="fa fa-lightbulb mt-0.5"></i>
            <span><strong>Tip:</strong> Use the same nickname for all quizzes to track your total score on the leaderboard!</span>
          </p>
        </div>

        <button
          onClick={() => { haptic.medium(); handleJoin(); }}
          disabled={loading || !joinForm.pin || !joinForm.name.trim()}
          className="w-full btn-gradient py-5 rounded-2xl font-bold text-2xl disabled:opacity-50 flex items-center justify-center gap-3 mb-8"
        >
          {loading ? <><Spinner size="sm" /> Joining...</> : <><i className="fa fa-play"></i> Join Game</>}
        </button>

        <div className="pt-8 border-t border-slate-800">
          <button
            onClick={() => isAdmin ? setView('dash') : signInWithGoogle()}
            disabled={loading}
            className="text-slate-500 hover:text-blue-400 transition-colors text-sm flex items-center justify-center gap-2 mx-auto"
          >
            <i className={`${isAdmin ? 'fa fa-chalkboard-teacher' : 'fab fa-google'}`}></i>
            {isAdmin ? 'Go to Teacher Dashboard' : "I'm a teacher"}
          </button>
        </div>
      </div>
    </div>
  )
}

// Quiz category colors and icons
const categoryConfig = {
  pre: { color: 'emerald', icon: 'play-circle', label: 'Pre', bgClass: 'bg-emerald-600/20', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/30' },
  mid: { color: 'amber', icon: 'pause-circle', label: 'Mid', bgClass: 'bg-amber-600/20', textClass: 'text-amber-400', borderClass: 'border-amber-500/30' },
  post: { color: 'blue', icon: 'stop-circle', label: 'Post', bgClass: 'bg-blue-600/20', textClass: 'text-blue-400', borderClass: 'border-blue-500/30' }
}

function DashboardView(props) {
  const { user, isAdmin, signInWithGoogle, signOutAdmin, dashTab, setDashTab, showImport, setShowImport, importText, setImportText, handleImport, quizzes, setActiveQuiz, setView, handleLaunch, handleDelete, leaderboards, setShowLeaderboardModal, showLeaderboardModal, newLeaderboardName, setNewLeaderboardName, createLeaderboard, setViewingLeaderboard, viewingLeaderboard, getLeaderboardPlayers, flushLeaderboard, deleteLeaderboard, renameLeaderboard, renamingLeaderboard, setRenamingLeaderboard, renameLeaderboardName, setRenameLeaderboardName, confirmRenameLeaderboard, launchingQuiz, setLaunchingQuiz, selectedLeaderboard, setSelectedLeaderboard, confirmLaunch, confirmModal } = props

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [expandedLevels, setExpandedLevels] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  // Group quizzes by level
  const groupedQuizzes = quizzes.reduce((acc, quiz) => {
    const level = quiz.level || 0
    if (!acc[level]) acc[level] = []
    acc[level].push(quiz)
    return acc
  }, {})

  // Sort levels and filter by category
  const sortedLevels = Object.keys(groupedQuizzes).map(Number).sort((a, b) => a - b)

  // Filter quizzes
  const getFilteredQuizzes = (levelQuizzes) => {
    return levelQuizzes
      .filter(q => categoryFilter === 'all' || q.category === categoryFilter)
      .filter(q => !searchQuery || q.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const order = { pre: 0, mid: 1, post: 2 }
        return (order[a.category] || 99) - (order[b.category] || 99)
      })
  }

  // Count quizzes per category
  const categoryCounts = quizzes.reduce((acc, q) => {
    acc[q.category] = (acc[q.category] || 0) + 1
    return acc
  }, {})

  // Toggle level expansion
  const toggleLevel = (level) => {
    setExpandedLevels(prev => ({ ...prev, [level]: !prev[level] }))
  }

  // Expand/collapse all
  const expandAll = () => setExpandedLevels(sortedLevels.reduce((acc, l) => ({ ...acc, [l]: true }), {}))
  const collapseAll = () => setExpandedLevels({})

  const hasGoogleAuth = user && user.email
  const isAuthorized = hasGoogleAuth && isAdmin

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="glass p-12 rounded-3xl max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-600/20 flex items-center justify-center">
            <i className="fa fa-lock text-4xl text-red-500"></i>
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-6">You need to sign in with an authorized Google account to access the dashboard.</p>
          <button onClick={signInWithGoogle} className="btn-gradient px-8 py-3 rounded-xl font-bold w-full mb-3">
            <i className="fab fa-google mr-2"></i>Sign in with Google
          </button>
          <button onClick={() => setView('home')} className="text-slate-500 hover:text-white transition-colors">
            <i className="fa fa-arrow-left mr-2"></i>Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-4xl font-black gradient-text">Dashboard</h2>
          <p className="text-slate-500 mt-1">Welcome, {user?.email}</p>
        </div>
        <button onClick={signOutAdmin} className="bg-slate-800/50 px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors text-red-400 hover:text-red-300">
          <i className="fa fa-sign-out-alt mr-2"></i>Sign Out
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setDashTab('quizzes')} className={`px-6 py-3 rounded-xl font-semibold transition-all ${dashTab === 'quizzes' ? 'bg-blue-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
          <i className="fa fa-question-circle mr-2"></i>Quizzes
        </button>
        <button onClick={() => setDashTab('leaderboards')} className={`px-6 py-3 rounded-xl font-semibold transition-all ${dashTab === 'leaderboards' ? 'bg-purple-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
          <i className="fa fa-trophy mr-2"></i>Leaderboards
        </button>
      </div>

      {dashTab === 'quizzes' && (
        <>
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter Buttons */}
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${categoryFilter === 'all' ? 'bg-slate-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
              >
                All <span className="ml-1 text-xs opacity-70">{quizzes.length}</span>
              </button>
              {['pre', 'mid', 'post'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${categoryFilter === cat ? `${categoryConfig[cat].bgClass} ${categoryConfig[cat].textClass}` : 'glass text-slate-400 hover:text-white'}`}
                >
                  <i className={`fa fa-${categoryConfig[cat].icon} mr-1`}></i>
                  {categoryConfig[cat].label} <span className="ml-1 text-xs opacity-70">{categoryCounts[cat] || 0}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <i className="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input
                  type="text"
                  placeholder="Search quizzes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass pl-9 pr-4 py-2 rounded-lg text-sm bg-slate-800/50 border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              </div>
              <button onClick={() => setShowImport(true)} className="glass px-4 py-2 rounded-lg text-blue-400 hover:text-blue-300 transition-colors text-sm">
                <i className="fa fa-file-import mr-1"></i>Import
              </button>
              <button onClick={() => {setActiveQuiz({ title: 'New Quiz', questions: [], level: 1, category: 'pre' }); setView('edit');}} className="btn-gradient px-4 py-2 rounded-lg font-semibold text-sm">
                <i className="fa fa-plus mr-1"></i>Create
              </button>
            </div>
          </div>

          {/* Expand/Collapse Controls */}
          {sortedLevels.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-slate-500 text-sm">{sortedLevels.length} lectures</span>
              <button onClick={expandAll} className="text-xs text-slate-400 hover:text-white transition-colors">
                <i className="fa fa-expand-alt mr-1"></i>Expand All
              </button>
              <button onClick={collapseAll} className="text-xs text-slate-400 hover:text-white transition-colors">
                <i className="fa fa-compress-alt mr-1"></i>Collapse All
              </button>
            </div>
          )}

          {showImport && (
            <div className="mb-6 glass p-6 rounded-2xl animate-slide-up border border-blue-500/30">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold"><i className="fa fa-file-code mr-2 text-blue-500"></i>Import Quiz JSON</h3>
                <button onClick={() => setShowImport(false)} className="text-slate-500 hover:text-white"><i className="fa fa-times"></i></button>
              </div>
              <textarea
                className="w-full h-40 bg-slate-950/50 p-4 font-mono text-sm rounded-xl border border-slate-800 focus:border-blue-500 outline-none mb-4"
                placeholder='{"title": "L1: Topic — Pre-Quiz", "level": 1, "category": "pre", "questions": [...]}'
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => {setShowImport(false); setImportText('');}} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
                <button onClick={handleImport} className="btn-gradient px-5 py-2 rounded-lg font-semibold text-sm">Import</button>
              </div>
            </div>
          )}

          {quizzes.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                <i className="fa fa-folder-open text-3xl text-slate-600"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">No quizzes yet</h3>
              <p className="text-slate-500 mb-4 text-sm">Create your first quiz or import one</p>
              <button onClick={() => {setActiveQuiz({ title: 'My First Quiz', questions: [], level: 1, category: 'pre' }); setView('edit');}} className="btn-gradient px-6 py-2 rounded-xl font-bold text-sm">
                <i className="fa fa-plus mr-2"></i>Create Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLevels.map(level => {
                const levelQuizzes = getFilteredQuizzes(groupedQuizzes[level] || [])
                if (levelQuizzes.length === 0) return null

                const isExpanded = expandedLevels[level]
                const firstQuiz = groupedQuizzes[level][0]
                const levelTitle = firstQuiz?.title?.match(/L\d+:\s*([^—]+)/)?.[1]?.trim() || `Lecture ${level}`

                return (
                  <div key={level} className="glass rounded-2xl overflow-hidden">
                    {/* Level Header */}
                    <button
                      onClick={() => toggleLevel(level)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-sm">
                          L{level}
                        </div>
                        <div className="text-left">
                          <span className="font-semibold block">{levelTitle}</span>
                          <span className="text-xs text-slate-500">{levelQuizzes.length} quiz{levelQuizzes.length !== 1 ? 'zes' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Category badges preview */}
                        <div className="hidden sm:flex gap-1">
                          {['pre', 'mid', 'post'].map(cat => {
                            const hasCategory = groupedQuizzes[level]?.some(q => q.category === cat)
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
                        {levelQuizzes.map((q) => {
                          const catConf = categoryConfig[q.category] || categoryConfig.pre
                          return (
                            <div key={q.id} className={`p-4 rounded-xl border ${catConf.borderClass} bg-slate-900/50 flex justify-between items-center group hover:bg-slate-800/50 transition-colors`}>
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${catConf.bgClass} ${catConf.textClass} shrink-0`}>
                                  {catConf.label}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-medium block truncate">{q.title}</span>
                                  <span className="text-xs text-slate-500">{q.questions?.length || 0} questions</span>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleLaunch(q)} className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-1.5 rounded-lg font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all">
                                  <i className="fa fa-play mr-1"></i>Launch
                                </button>
                                <button onClick={() => {setActiveQuiz(q); setView('edit');}} className="bg-slate-700 p-1.5 px-3 rounded-lg hover:bg-slate-600 transition-colors text-sm">
                                  <i className="fa fa-edit"></i>
                                </button>
                                <button onClick={() => handleDelete(q)} className="text-red-500 hover:text-red-400 p-1.5 px-2 transition-colors text-sm">
                                  <i className="fa fa-trash"></i>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {dashTab === 'leaderboards' && (
        <>
          <div className="flex justify-end mb-6">
            <button onClick={() => setShowLeaderboardModal(true)} className="btn-gradient px-6 py-3 rounded-xl font-bold">
              <i className="fa fa-plus mr-2"></i>New Leaderboard
            </button>
          </div>

          {leaderboards.length === 0 ? (
            <div className="glass rounded-3xl p-16 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
                <i className="fa fa-trophy text-4xl text-slate-600"></i>
              </div>
              <h3 className="text-2xl font-bold mb-2">No leaderboards yet</h3>
              <p className="text-slate-500 mb-6">Create a leaderboard to track cumulative scores</p>
              <button onClick={() => setShowLeaderboardModal(true)} className="btn-gradient px-8 py-3 rounded-xl font-bold">
                <i className="fa fa-plus mr-2"></i>Create Leaderboard
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {leaderboards.map((lb, idx) => {
                const playerCount = Object.keys(lb.players || {}).length
                return (
                  <div key={lb.id} className="glass p-6 rounded-2xl card-hover flex justify-between items-center animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <i className="fa fa-trophy text-xl"></i>
                      </div>
                      <div>
                        <span className="text-xl font-bold block">{lb.name}</span>
                        <span className="text-sm text-slate-500"><i className="fa fa-users mr-1"></i>{playerCount} players</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setViewingLeaderboard(lb)} className="bg-slate-800 px-5 py-2 rounded-xl font-semibold hover:bg-slate-700 transition-colors">
                        <i className="fa fa-eye mr-2"></i>View Top 20
                      </button>
                      <button onClick={() => renameLeaderboard(lb)} className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-600/30 transition-colors">
                        <i className="fa fa-edit"></i>
                      </button>
                      <button onClick={() => flushLeaderboard(lb)} className="bg-yellow-600/20 text-yellow-500 px-4 py-2 rounded-xl hover:bg-yellow-600/30 transition-colors">
                        <i className="fa fa-redo"></i>
                      </button>
                      <button onClick={() => deleteLeaderboard(lb)} className="text-red-500 hover:text-red-400 p-2 px-3 transition-colors">
                        <i className="fa fa-trash"></i>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
            <h3 className="text-2xl font-bold mb-4"><i className="fa fa-trophy text-purple-500 mr-2"></i>New Leaderboard</h3>
            <input
              className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus:border-purple-500 outline-none mb-4"
              placeholder="e.g., DevOps Spring 2026"
              value={newLeaderboardName}
              onChange={e => setNewLeaderboardName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createLeaderboard()}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => {setShowLeaderboardModal(false); setNewLeaderboardName('');}} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Cancel</button>
              <button onClick={createLeaderboard} className="flex-1 bg-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-500">Create</button>
            </div>
          </div>
        </div>
      )}

      {renamingLeaderboard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
            <h3 className="text-2xl font-bold mb-4"><i className="fa fa-edit text-blue-500 mr-2"></i>Rename Leaderboard</h3>
            <input
              className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none mb-4"
              placeholder="Enter new name"
              value={renameLeaderboardName}
              onChange={e => setRenameLeaderboardName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmRenameLeaderboard()}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => {setRenamingLeaderboard(null); setRenameLeaderboardName('');}} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Cancel</button>
              <button onClick={confirmRenameLeaderboard} className="flex-1 bg-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-500">Rename</button>
            </div>
          </div>
        </div>
      )}

      {viewingLeaderboard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-8 rounded-3xl max-w-2xl w-full mx-4 animate-bounce-in max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold"><i className="fa fa-trophy text-yellow-500 mr-2"></i>{viewingLeaderboard.name}</h3>
              <button onClick={() => setViewingLeaderboard(null)} className="text-slate-500 hover:text-white"><i className="fa fa-times text-xl"></i></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {getLeaderboardPlayers(viewingLeaderboard).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <i className="fa fa-users text-4xl mb-4 block"></i>
                  <p>No players yet. Launch a quiz with this leaderboard to start tracking scores!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getLeaderboardPlayers(viewingLeaderboard).map((player, idx) => (
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
              <button onClick={() => flushLeaderboard(viewingLeaderboard)} className="flex-1 bg-yellow-600/20 text-yellow-500 py-3 rounded-xl font-semibold hover:bg-yellow-600/30">
                <i className="fa fa-redo mr-2"></i>Flush Scores
              </button>
              <button onClick={() => setViewingLeaderboard(null)} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {launchingQuiz && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
            <h3 className="text-2xl font-bold mb-2"><i className="fa fa-play text-green-500 mr-2"></i>Launch Quiz</h3>
            <p className="text-slate-400 mb-6">{launchingQuiz.title}</p>

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
              <button onClick={() => setLaunchingQuiz(null)} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Cancel</button>
              <button onClick={confirmLaunch} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 py-3 rounded-xl font-semibold hover:from-green-500 hover:to-emerald-500">
                <i className="fa fa-play mr-2"></i>Launch
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal {...confirmModal} />
    </div>
  )
}

function EditView({ user, isAdmin, setView, activeQuiz, setActiveQuiz, handleSave, saving, showToast }) {
  if (!user?.email || !isAdmin) { setView('home'); return null }

  return (
    <div className="min-h-screen pb-24">
      <div className="p-8 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <input
            className="bg-transparent text-4xl font-black border-b-2 border-slate-800 focus:border-blue-500 pb-2 outline-none flex-grow gradient-text"
            value={activeQuiz.title}
            onChange={e => setActiveQuiz({...activeQuiz, title: e.target.value})}
            placeholder="Quiz Title"
          />
          <button onClick={() => {navigator.clipboard.writeText(JSON.stringify(activeQuiz, null, 2)); showToast("JSON copied!");}} className="ml-4 text-slate-500 hover:text-blue-400">
            <i className="fa fa-copy mr-1"></i>Export
          </button>
        </div>

        <div className="space-y-4 mb-6">
          {activeQuiz.questions.map((q, qIdx) => (
            <div key={qIdx} className="glass p-6 rounded-2xl space-y-4 relative animate-slide-up card-hover">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">{qIdx + 1}</span>
                <button onClick={() => {const qs = [...activeQuiz.questions]; qs.splice(qIdx, 1); setActiveQuiz({...activeQuiz, questions: qs});}} className="absolute top-4 right-4 text-slate-600 hover:text-red-500">
                  <i className="fa fa-trash"></i>
                </button>
              </div>
              <input
                className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none"
                placeholder="Enter your question..."
                value={q.text}
                onChange={e => {
                  const qs = [...activeQuiz.questions]
                  qs[qIdx].text = e.target.value
                  setActiveQuiz({...activeQuiz, questions: qs})
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt, oIdx) => (
                  <div key={oIdx} className="relative">
                    <input
                      className={`w-full p-3 pl-10 rounded-xl border-2 outline-none ${q.correct === oIdx ? 'border-green-500 bg-green-900/20' : 'border-slate-700 bg-slate-800/30 focus:border-slate-600'}`}
                      value={opt}
                      placeholder={`Option ${oIdx + 1}`}
                      onChange={e => {
                        const qs = [...activeQuiz.questions]
                        qs[qIdx].options[oIdx] = e.target.value
                        setActiveQuiz({...activeQuiz, questions: qs})
                      }}
                    />
                    <button
                      onClick={() => {
                        const qs = [...activeQuiz.questions]
                        qs[qIdx].correct = oIdx
                        setActiveQuiz({...activeQuiz, questions: qs})
                      }}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${q.correct === oIdx ? 'border-green-500 bg-green-500' : 'border-slate-600 hover:border-slate-500'}`}
                    >
                      {q.correct === oIdx && <i className="fa fa-check text-xs"></i>}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mb-3"><i className="fa fa-info-circle mr-1"></i>Click the circle to mark the correct answer</p>

              <div className="border-t border-slate-700 pt-4">
                <label className="text-sm text-slate-400 mb-2 block">
                  <i className="fa fa-lightbulb text-yellow-500 mr-2"></i>Explanation (shown after answer)
                </label>
                <textarea
                  className="w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700 focus:border-yellow-500 outline-none text-sm resize-none"
                  placeholder="Add a fun fact or explanation..."
                  rows={2}
                  value={q.explanation || ''}
                  onChange={e => {
                    const qs = [...activeQuiz.questions]
                    qs[qIdx].explanation = e.target.value
                    setActiveQuiz({...activeQuiz, questions: qs})
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <button onClick={() => setActiveQuiz({...activeQuiz, questions: [...activeQuiz.questions, {text: '', options:['','','',''], correct: 0, explanation: ''}]})} className="w-full py-5 border-2 border-dashed border-slate-700 rounded-2xl text-slate-500 hover:border-blue-500 hover:text-blue-400">
          <i className="fa fa-plus mr-2"></i>Add Question
        </button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800 p-4">
        <div className="max-w-4xl mx-auto flex gap-4">
          <button onClick={() => setView('dash')} className="flex-1 glass py-4 rounded-2xl font-bold hover:bg-slate-800">
            <i className="fa fa-times mr-2"></i>Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-[2] btn-gradient py-4 rounded-2xl font-bold text-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Spinner size="sm" /> Saving...</> : <><i className="fa fa-save mr-2"></i>Save Quiz</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function HostLobbyView({ user, isAdmin, setView, session, startGame, toggleLateJoin, kickPlayer, db, deleteDoc, doc }) {
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

function HostPlayView({ user, isAdmin, setView, session, gamePhase, currentQuestion, leaderboard, streaks, reactions, badges, badgeTypes, endGame, showQuestionResults, nextQuestion }) {
  if (!user?.email || !isAdmin) { setView('home'); return null }

  const question = session?.quiz?.questions?.[currentQuestion]
  const answeredCount = Object.keys(session?.answers || {}).length
  const totalPlayers = Object.keys(session?.players || {}).length

  // Ref to the container where we'll append reactions directly to DOM
  const reactionsContainerRef = useRef(null)
  const processedIdsRef = useRef(new Set())

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

  return (
    <div className="min-h-screen flex flex-col p-6">
      <div ref={reactionsContainerRef} className="fixed inset-0 pointer-events-none z-50 overflow-hidden" />
      <div className="flex justify-between items-center mb-4">
        <span className="text-slate-400">Question {currentQuestion + 1} of {session?.quiz?.questions?.length}</span>
        <span className="text-slate-400"><i className="fa fa-users mr-2"></i>{answeredCount}/{totalPlayers} answered</span>
      </div>

      <TimerBar duration={25} isRunning={gamePhase === 'question'} onComplete={showQuestionResults} startTime={session?.questionStartTime} />

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

function WaitView({ joinForm }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl animate-pulse-slow"></div>
      </div>

      <div className="relative z-10">
        <div className="mb-8 animate-float">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <i className="fa fa-hourglass-half text-4xl animate-pulse"></i>
          </div>
        </div>
        <h2 className="text-5xl font-black gradient-text mb-4">You're in!</h2>
        <p className="text-2xl text-slate-300 mb-2">{joinForm.name}</p>
        <p className="text-slate-500 text-lg">Waiting for the host to start...</p>

        <div className="mt-8 flex gap-2 justify-center">
          <span className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }}></span>
          <span className="w-3 h-3 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0.1s' }}></span>
          <span className="w-3 h-3 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        </div>
      </div>
    </div>
  )
}

function PlayerPlayView({ session, gamePhase, currentQuestion, user, scores, streaks, badges, badgeTypes, leaderboard, answered, setAnswered, submitAnswer, sendReaction, reactionEmojis, myReactionCount, MAX_REACTIONS_PER_QUESTION, showConfetti, setView, setSession, setJoinForm, shakeScreen, setShakeScreen, scorePopKey }) {
  const reactionsLeft = MAX_REACTIONS_PER_QUESTION - myReactionCount
  const canReact = reactionsLeft > 0
  const question = session?.quiz?.questions?.[currentQuestion]
  const myStreak = streaks?.[user?.uid] || 0
  const myBadges = badges?.[user?.uid] || {}
  const getMultiplier = (s) => s >= 4 ? 4 : s >= 3 ? 3 : s >= 2 ? 2 : 1
  // Use session's questionStartTime for accurate speed tracking
  const questionStartTime = session?.questionStartTime || Date.now()
  const myScore = scores?.[user?.uid] || 0

  // My badges display
  const MyBadges = () => {
    const earnedBadges = Object.keys(myBadges).filter(k => myBadges[k])
    if (earnedBadges.length === 0) return null
    return (
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        {earnedBadges.map(badge => (
          <span key={badge} className="bg-slate-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
            <span>{badgeTypes[badge]?.icon}</span>
            <span>{badgeTypes[badge]?.name}</span>
          </span>
        ))}
      </div>
    )
  }

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
        <MyBadges />

        <button onClick={() => {localStorage.removeItem('quizSession'); setView('home'); setSession(null); setJoinForm({ pin: '', name: '' });}} className="btn-gradient px-8 py-4 rounded-2xl font-bold">
          <i className="fa fa-home mr-2"></i>Back to Home
        </button>
      </div>
    )
  }

  if (gamePhase === 'results') {
    const myAnswer = session?.answers?.[user?.uid]
    const wasCorrect = myAnswer === question?.correct
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
        <TimerBar duration={25} isRunning={gamePhase === 'question'} onComplete={() => {}} startTime={session?.questionStartTime} />
      </div>

      {myStreak >= 2 && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <i className="fa fa-fire text-orange-500 text-xl animate-fire-glow"></i>
          <span className="text-orange-400 font-bold animate-fire-glow">{myStreak} streak! Next: {getMultiplier(myStreak + 1)}x</span>
          <i className="fa fa-fire text-orange-500 text-xl animate-fire-glow"></i>
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
            onClick={() => {
              haptic.light()
              const answerTime = Date.now() - questionStartTime
              submitAnswer(idx, answerTime)
            }}
            className={`${optionColors[idx].bg} rounded-2xl flex flex-col items-center justify-center p-4 option-btn active:scale-95 animate-option-reveal`}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <i className={`fa ${optionColors[idx].icon} text-3xl mb-2 opacity-75`}></i>
            <span className="text-lg font-semibold text-center">{opt}</span>
          </button>
        ))}
      </div>

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
