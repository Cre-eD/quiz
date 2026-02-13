/**
 * Game Service
 * Handles game state transitions and updates for quiz sessions
 *
 * Note: This service focuses on session state updates.
 * Complex scoring logic remains in App.jsx and can be extracted to utils in future phases.
 */

import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { secureRandom } from '@/shared/utils/crypto'

/**
 * Start a game session (transition to countdown phase)
 * @param {string} pin - Session PIN
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function startGame(pin) {
  try {
    if (!pin) {
      return { success: false, error: 'PIN is required' }
    }

    const now = Date.now()
    await updateDoc(doc(db, 'sessions', pin), {
      status: 'countdown',
      currentQuestion: 0,
      answers: {},
      countdownEnd: now + 3000, // 3 seconds from now
      questionStartTime: null,
      reactions: []
    })

    return { success: true }
  } catch (error) {
    console.error('Start game error:', error)
    return {
      success: false,
      error: error.message || 'Failed to start game'
    }
  }
}

/**
 * Transition from countdown to question phase
 * @param {string} pin - Session PIN
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function startQuestionTimer(pin) {
  try {
    if (!pin) {
      return { success: false, error: 'PIN is required' }
    }

    // Check if still in countdown before transitioning
    const sessionRef = doc(db, 'sessions', pin)
    const sessionSnap = await getDoc(sessionRef)

    if (!sessionSnap.exists()) {
      return { success: false, error: 'Session not found' }
    }

    const sessionData = sessionSnap.data()
    if (sessionData.status === 'countdown') {
      // Use server timestamp for accurate sync across all clients
      // Also provide fallback timestamp for immediate availability
      await updateDoc(sessionRef, {
        status: 'question',
        questionStartTime: serverTimestamp(),
        questionStartTimeFallback: sessionData.countdownEnd  // Immediate fallback value
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Start question timer error:', error)
    return {
      success: false,
      error: error.message || 'Failed to start question timer'
    }
  }
}

/**
 * Show question results (transition to results phase)
 * @param {string} pin - Session PIN
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function showQuestionResults(pin) {
  try {
    if (!pin) {
      return { success: false, error: 'PIN is required' }
    }

    await updateDoc(doc(db, 'sessions', pin), {
      status: 'results'
    })

    return { success: true }
  } catch (error) {
    console.error('Show question results error:', error)
    return {
      success: false,
      error: error.message || 'Failed to show results'
    }
  }
}

/**
 * Move to next question or final results
 * @param {Object} params - Next question parameters
 * @param {string} params.pin - Session PIN
 * @param {number} params.currentQuestion - Current question index
 * @param {number} params.totalQuestions - Total number of questions
 * @param {Object} params.streaks - Current streaks { uid: count }
 * @param {Object} params.coldStreaks - Current cold streaks { uid: count }
 * @param {Object} params.answers - Current answers { uid: answerData }
 * @param {Object} params.players - Session players { uid: name }
 * @returns {Promise<Object>} - Object with { success: boolean, isFinal?: boolean, error?: string }
 */
export async function nextQuestion({
  pin,
  currentQuestion,
  totalQuestions,
  streaks,
  coldStreaks,
  answers,
  players
}) {
  try {
    if (!pin) {
      return { success: false, error: 'PIN is required' }
    }

    const nextQ = currentQuestion + 1

    // Update streaks for players who didn't answer
    const newStreaks = { ...streaks }
    const newColdStreaks = { ...coldStreaks }
    const answeredPlayers = new Set(Object.keys(answers || {}))

    Object.keys(players || {}).forEach((uid) => {
      if (!answeredPlayers.has(uid)) {
        newStreaks[uid] = 0
        newColdStreaks[uid] = (newColdStreaks[uid] || 0) + 1
      }
    })

    // Check if this was the last question
    if (nextQ >= totalQuestions) {
      await updateDoc(doc(db, 'sessions', pin), {
        status: 'final',
        reactions: [],
        streaks: newStreaks,
        coldStreaks: newColdStreaks
      })
      return { success: true, isFinal: true }
    }

    // Move to next question with countdown
    const now = Date.now()
    await updateDoc(doc(db, 'sessions', pin), {
      status: 'countdown',
      currentQuestion: nextQ,
      answers: {},
      countdownEnd: now + 3000, // 3 seconds from now
      questionStartTime: null,
      reactions: [],
      streaks: newStreaks,
      coldStreaks: newColdStreaks
    })

    return { success: true, isFinal: false }
  } catch (error) {
    console.error('Next question error:', error)
    return {
      success: false,
      error: error.message || 'Failed to move to next question'
    }
  }
}

/**
 * Add a reaction to the session
 * @param {Object} params - Reaction parameters
 * @param {string} params.pin - Session PIN
 * @param {string} params.emoji - Emoji to send
 * @param {string} params.playerName - Player's display name
 * @param {string} params.userId - User ID (for rate limiting)
 * @param {Array} params.currentReactions - Current reactions array
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function sendReaction({
  pin,
  emoji,
  playerName,
  userId,
  currentReactions
}) {
  try {
    if (!pin || !emoji || !playerName) {
      return { success: false, error: 'PIN, emoji, and playerName are required' }
    }

    // Rate limit removed - per-question limit (5) handled in frontend is sufficient

    const reaction = {
      id: Date.now() + secureRandom(),
      emoji,
      playerName,
      timestamp: Date.now()
    }

    // Keep last 15 reactions for display
    const newReactions = [...(currentReactions || []), reaction].slice(-15)

    await updateDoc(doc(db, 'sessions', pin), {
      reactions: newReactions
    })

    return { success: true }
  } catch (error) {
    console.error('Send reaction error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send reaction'
    }
  }
}

/**
 * Submit a player's answer (simplified - complex scoring logic in App.jsx)
 * Note: Full scoring logic with streaks, badges, etc. is kept in App.jsx
 * This service handles the basic answer submission to Firestore
 *
 * @param {Object} params - Answer submission parameters
 * @param {string} params.pin - Session PIN
 * @param {string} params.userId - User ID
 * @param {Object} params.updates - Fields to update (answers, scores, streaks, etc.)
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function submitAnswer({ pin, userId, updates }) {
  try {
    if (!pin || !userId || !updates) {
      return { success: false, error: 'PIN, userId, and updates are required' }
    }

    await updateDoc(doc(db, 'sessions', pin), updates)

    return { success: true }
  } catch (error) {
    console.error('Submit answer error:', error)
    return {
      success: false,
      error: error.message || 'Failed to submit answer'
    }
  }
}

// Export service object for easier mocking in tests
export const gameService = {
  startGame,
  startQuestionTimer,
  showQuestionResults,
  nextQuestion,
  sendReaction,
  submitAnswer
}
