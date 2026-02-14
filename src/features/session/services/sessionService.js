/**
 * Session Service
 * Handles all quiz session operations including create, join, kick, delete, and subscriptions
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  deleteField
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { sanitizePlayerName } from '@/shared/utils/sanitization'
import { validators } from '@/shared/utils/validation'
import { generateSecurePIN } from '@/shared/utils/crypto'
import { checkSessionJoinLimit, resetSessionJoinLimit } from '@/shared/utils/rateLimit'

/**
 * Generate a cryptographically secure random 4-digit PIN for a session
 * Uses crypto.getRandomValues() for secure random number generation
 * @returns {string} - 4-digit PIN
 */
function generatePIN() {
  return generateSecurePIN()
}

/**
 * Create a new quiz session
 * @param {Object} params - Session creation parameters
 * @param {Object} params.quiz - Quiz object to use for the session
 * @param {string|null} params.leaderboardId - Optional leaderboard ID to link
 * @param {string|null} params.leaderboardName - Optional leaderboard name
 * @returns {Promise<Object>} - Object with { success: boolean, session?: Object, pin?: string, error?: string }
 */
export async function createSession({ quiz, leaderboardId = null, leaderboardName = null }) {
  try {
    // Validate quiz
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return {
        success: false,
        error: 'Invalid quiz: must have at least one question'
      }
    }

    const pin = generatePIN()
    const sessionData = {
      pin,
      quizId: quiz.id || pin, // Firestore rules require quizId
      quiz,
      status: 'lobby',
      players: {},
      scores: {},
      streaks: {},
      coldStreaks: {},
      currentQuestion: 0,
      answers: {},
      allowLateJoin: true,
      leaderboardId,
      leaderboardName,
      reactions: [],
      badges: {},
      correctCounts: {},
      bannedUsers: [],
      createdAt: Date.now() // Firestore rules require createdAt
    }

    await setDoc(doc(db, 'sessions', pin), sessionData)

    return {
      success: true,
      session: sessionData,
      pin
    }
  } catch (error) {
    console.error('Create session error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create session'
    }
  }
}

/**
 * Get session by PIN
 * @param {string} pin - Session PIN
 * @returns {Promise<Object>} - Object with { success: boolean, session?: Object, error?: string }
 */
export async function getSession(pin) {
  try {
    // Validate PIN
    const validation = validators.pin(pin)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    const snap = await getDoc(doc(db, 'sessions', pin))

    if (!snap.exists()) {
      return {
        success: false,
        error: 'Session not found'
      }
    }

    return {
      success: true,
      session: snap.data()
    }
  } catch (error) {
    console.error('Get session error:', error)
    return {
      success: false,
      error: error.message || 'Failed to get session'
    }
  }
}

/**
 * Join a quiz session
 * @param {Object} params - Join parameters
 * @param {string} params.pin - Session PIN
 * @param {string} params.name - Player name
 * @param {string} params.userId - User ID
 * @returns {Promise<Object>} - Object with { success: boolean, session?: Object, shouldWait?: boolean, error?: string }
 */
export async function joinSession({ pin, name, userId }) {
  try {
    // Rate limit check (prevent spam/brute force)
    const rateLimit = checkSessionJoinLimit()
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Too many join attempts. Please wait ${rateLimit.resetIn} seconds.`
      }
    }

    // Validate inputs
    const pinValidation = validators.pin(pin)
    if (!pinValidation.valid) {
      return { success: false, error: pinValidation.error }
    }

    const nameValidation = validators.playerName(name)
    if (!nameValidation.valid) {
      return { success: false, error: nameValidation.error }
    }

    // Sanitize player name
    const sanitizedName = sanitizePlayerName(name)
    if (!sanitizedName) {
      return { success: false, error: 'Invalid player name after sanitization' }
    }

    // Get session
    const sessionRef = doc(db, 'sessions', pin)
    const snap = await getDoc(sessionRef)

    if (!snap.exists()) {
      return { success: false, error: 'PIN not found!' }
    }

    const sessionData = snap.data()

    // Check if game is in progress and late join is disabled
    if (sessionData.status !== 'lobby' && !sessionData.allowLateJoin) {
      return {
        success: false,
        error: 'Game already in progress. Late joining is disabled.'
      }
    }

    // Check if user is banned
    if (sessionData.bannedUsers?.includes(userId)) {
      return {
        success: false,
        error: 'You have been removed from this game.'
      }
    }

    // Check for duplicate names (prevent multi-device cheating)
    const existingPlayers = sessionData.players || {}
    const normalizedName = sanitizedName.toLowerCase()
    const duplicateName = Object.entries(existingPlayers).find(
      ([uid, playerName]) =>
        uid !== userId && playerName.toLowerCase() === normalizedName
    )

    if (duplicateName) {
      return {
        success: false,
        error: 'This name is already taken. Please choose a different name.'
      }
    }

    // Add player to session
    await updateDoc(sessionRef, {
      [`players.${userId}`]: sanitizedName,
      [`scores.${userId}`]: sessionData.scores?.[userId] || 0
    })

    // Save to localStorage for session recovery
    try {
      localStorage.setItem(
        'quizSession',
        JSON.stringify({ pin, name: sanitizedName })
      )
    } catch (e) {
      console.warn('Failed to save session to localStorage:', e)
    }

    // Reset rate limit on successful join
    resetSessionJoinLimit()

    return {
      success: true,
      session: sessionData,
      shouldWait: sessionData.status === 'lobby'
    }
  } catch (error) {
    console.error('Join session error:', error)
    return {
      success: false,
      error: error.message || 'Failed to join session'
    }
  }
}

/**
 * Try to recover session from localStorage
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Object with { success: boolean, session?: Object, pin?: string, name?: string, error?: string }
 */
export async function recoverSession(userId) {
  try {
    const saved = localStorage.getItem('quizSession')
    if (!saved) {
      return { success: false, error: 'No saved session found' }
    }

    const { pin, name } = JSON.parse(saved)

    // Validate and sanitize saved data (protect against localStorage injection)
    if (!pin || !name) {
      localStorage.removeItem('quizSession')
      return { success: false, error: 'Invalid saved session data' }
    }

    const sanitizedName = sanitizePlayerName(name)

    const snap = await getDoc(doc(db, 'sessions', pin))

    if (!snap.exists()) {
      localStorage.removeItem('quizSession')
      return { success: false, error: 'Saved session no longer exists' }
    }

    const sessionData = snap.data()

    // Check if user is still in the session
    if (!sessionData.players || !sessionData.players[userId]) {
      localStorage.removeItem('quizSession')
      return { success: false, error: 'You are no longer in this session' }
    }

    return {
      success: true,
      session: sessionData,
      pin,
      name: sanitizedName // Use sanitized name to prevent XSS
    }
  } catch (error) {
    console.error('Recover session error:', error)
    localStorage.removeItem('quizSession')
    return {
      success: false,
      error: 'Failed to recover session'
    }
  }
}

/**
 * Kick a player from the session
 * @param {Object} params - Kick parameters
 * @param {string} params.pin - Session PIN
 * @param {string} params.userId - User ID to kick
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function kickPlayer({ pin, userId }) {
  try {
    if (!pin || !userId) {
      return { success: false, error: 'PIN and userId are required' }
    }

    const sessionRef = doc(db, 'sessions', pin)
    const snap = await getDoc(sessionRef)

    if (!snap.exists()) {
      return { success: false, error: 'Session not found' }
    }

    const sessionData = snap.data()
    const currentBanned = sessionData.bannedUsers || []

    const updates = {
      bannedUsers: [...currentBanned, userId],
      [`players.${userId}`]: null,
      [`scores.${userId}`]: null,
      [`streaks.${userId}`]: null,
      [`coldStreaks.${userId}`]: null
    }

    await updateDoc(sessionRef, updates)

    return { success: true }
  } catch (error) {
    console.error('Kick player error:', error)
    return {
      success: false,
      error: error.message || 'Failed to kick player'
    }
  }
}

/**
 * Toggle late join permission for a session
 * @param {Object} params - Toggle parameters
 * @param {string} params.pin - Session PIN
 * @param {boolean} params.allowLateJoin - Current late join status
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function toggleLateJoin({ pin, allowLateJoin }) {
  try {
    if (!pin) {
      return { success: false, error: 'PIN is required' }
    }

    await updateDoc(doc(db, 'sessions', pin), {
      allowLateJoin: !allowLateJoin
    })

    return { success: true }
  } catch (error) {
    console.error('Toggle late join error:', error)
    return {
      success: false,
      error: error.message || 'Failed to toggle late join'
    }
  }
}

/**
 * Delete a session
 * @param {string} pin - Session PIN
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function deleteSession(pin) {
  try {
    if (!pin) {
      return { success: false, error: 'PIN is required' }
    }

    await deleteDoc(doc(db, 'sessions', pin))

    // Clear from localStorage if it matches
    try {
      const saved = localStorage.getItem('quizSession')
      if (saved) {
        const { pin: savedPin } = JSON.parse(saved)
        if (savedPin === pin) {
          localStorage.removeItem('quizSession')
        }
      }
    } catch (e) {
      console.warn('Failed to clear localStorage:', e)
    }

    return { success: true }
  } catch (error) {
    console.error('Delete session error:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete session'
    }
  }
}

/**
 * Leave a session as a player (remove own participation data)
 * @param {Object} params - Leave parameters
 * @param {string} params.pin - Session PIN
 * @param {string} params.userId - User ID
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function leaveSession({ pin, userId }) {
  try {
    if (!pin || !userId) {
      return { success: false, error: 'PIN and userId are required' }
    }

    await updateDoc(doc(db, 'sessions', pin), {
      [`players.${userId}`]: deleteField(),
      [`scores.${userId}`]: deleteField(),
      [`streaks.${userId}`]: deleteField(),
      [`coldStreaks.${userId}`]: deleteField(),
      [`badges.${userId}`]: deleteField(),
      [`correctCounts.${userId}`]: deleteField(),
      [`answers.${userId}`]: deleteField()
    })

    // Clear recovery state if leaving the same session
    try {
      const saved = localStorage.getItem('quizSession')
      if (saved) {
        const { pin: savedPin } = JSON.parse(saved)
        if (savedPin === pin) {
          localStorage.removeItem('quizSession')
        }
      }
    } catch (e) {
      console.warn('Failed to clear localStorage on leave:', e)
    }

    return { success: true }
  } catch (error) {
    console.error('Leave session error:', error)
    return {
      success: false,
      error: error.message || 'Failed to leave session'
    }
  }
}

/**
 * Subscribe to session updates
 * @param {string} pin - Session PIN
 * @param {Function} callback - Called with (session) when session updates
 * @param {Function} onError - Called with (error) if subscription fails
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToSession(pin, callback, onError) {
  if (!pin) {
    console.error('PIN is required for subscription')
    if (onError) onError(new Error('PIN is required'))
    return () => {}
  }

  return onSnapshot(
    doc(db, 'sessions', pin),
    (snap) => {
      if (snap.exists()) {
        callback(snap.data())
      } else {
        if (onError) onError(new Error('Session not found'))
      }
    },
    (error) => {
      console.error('Session subscription error:', error)
      if (onError) onError(error)
    }
  )
}

/**
 * Update session fields
 * @param {string} pin - Session PIN
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function updateSession(pin, updates) {
  try {
    if (!pin) {
      return { success: false, error: 'PIN is required' }
    }

    if (!updates || Object.keys(updates).length === 0) {
      return { success: false, error: 'No updates provided' }
    }

    await updateDoc(doc(db, 'sessions', pin), updates)

    return { success: true }
  } catch (error) {
    console.error('Update session error:', error)
    return {
      success: false,
      error: error.message || 'Failed to update session'
    }
  }
}

// Export service object for easier mocking in tests
export const sessionService = {
  createSession,
  getSession,
  joinSession,
  recoverSession,
  kickPlayer,
  toggleLateJoin,
  deleteSession,
  leaveSession,
  subscribeToSession,
  updateSession
}
