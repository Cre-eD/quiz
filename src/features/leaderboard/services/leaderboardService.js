/**
 * Leaderboard Service
 * Handles all leaderboard operations including create, rename, flush, delete, and score updates
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { sanitizeLeaderboardName } from '@/shared/utils/sanitization'
import { validators } from '@/shared/utils/validation'

/**
 * Generate a random ID for a leaderboard
 * @returns {string} - Random ID
 */
function generateLeaderboardId() {
  return Math.random().toString(36).substring(2, 11)
}

/**
 * Create a new leaderboard
 * @param {string} name - Leaderboard name
 * @returns {Promise<Object>} - Object with { success: boolean, leaderboardId?: string, error?: string }
 */
export async function createLeaderboard(name) {
  try {
    // Validate name
    const validation = validators.leaderboardName(name)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Sanitize name
    const sanitizedName = sanitizeLeaderboardName(name)

    const id = generateLeaderboardId()
    await setDoc(doc(db, 'leaderboards', id), {
      id,
      name: sanitizedName,
      createdAt: Date.now(),
      players: {}
    })

    return {
      success: true,
      leaderboardId: id
    }
  } catch (error) {
    console.error('Create leaderboard error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create leaderboard'
    }
  }
}

/**
 * Rename a leaderboard
 * @param {Object} params - Rename parameters
 * @param {string} params.leaderboardId - Leaderboard ID
 * @param {string} params.newName - New name
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function renameLeaderboard({ leaderboardId, newName }) {
  try {
    if (!leaderboardId) {
      return { success: false, error: 'Leaderboard ID is required' }
    }

    // Validate name
    const validation = validators.leaderboardName(newName)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Sanitize name
    const sanitizedName = sanitizeLeaderboardName(newName)

    await updateDoc(doc(db, 'leaderboards', leaderboardId), {
      name: sanitizedName
    })

    return { success: true }
  } catch (error) {
    console.error('Rename leaderboard error:', error)
    return {
      success: false,
      error: error.message || 'Failed to rename leaderboard'
    }
  }
}

/**
 * Flush a leaderboard (reset all scores)
 * @param {string} leaderboardId - Leaderboard ID
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function flushLeaderboard(leaderboardId) {
  try {
    if (!leaderboardId) {
      return { success: false, error: 'Leaderboard ID is required' }
    }

    await updateDoc(doc(db, 'leaderboards', leaderboardId), {
      players: {}
    })

    return { success: true }
  } catch (error) {
    console.error('Flush leaderboard error:', error)
    return {
      success: false,
      error: error.message || 'Failed to flush leaderboard'
    }
  }
}

/**
 * Delete a leaderboard
 * @param {string} leaderboardId - Leaderboard ID
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function deleteLeaderboard(leaderboardId) {
  try {
    if (!leaderboardId) {
      return { success: false, error: 'Leaderboard ID is required' }
    }

    await deleteDoc(doc(db, 'leaderboards', leaderboardId))

    return { success: true }
  } catch (error) {
    console.error('Delete leaderboard error:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete leaderboard'
    }
  }
}

/**
 * Save session scores to a leaderboard
 * @param {Object} params - Save parameters
 * @param {string} params.leaderboardId - Leaderboard ID
 * @param {Object} params.sessionPlayers - Session players { uid: displayName }
 * @param {Object} params.sessionScores - Session scores { uid: score }
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function saveScoresToLeaderboard({ leaderboardId, sessionPlayers, sessionScores }) {
  try {
    if (!leaderboardId) {
      return { success: false, error: 'Leaderboard ID is required' }
    }

    if (!sessionPlayers || !sessionScores) {
      return { success: false, error: 'Session players and scores are required' }
    }

    const lbRef = doc(db, 'leaderboards', leaderboardId)
    const lbSnap = await getDoc(lbRef)

    if (!lbSnap.exists()) {
      return { success: false, error: 'Leaderboard not found' }
    }

    const existingPlayers = lbSnap.data().players || {}

    // Merge session scores with existing leaderboard scores
    Object.entries(sessionPlayers).forEach(([uid, displayName]) => {
      const nameKey = displayName.toLowerCase().trim()
      const sessionScore = sessionScores[uid] || 0

      if (existingPlayers[nameKey]) {
        // Update existing player
        existingPlayers[nameKey].totalScore += sessionScore
        existingPlayers[nameKey].quizzesTaken += 1
        existingPlayers[nameKey].lastPlayed = Date.now()
        existingPlayers[nameKey].displayName = displayName
      } else {
        // Add new player
        existingPlayers[nameKey] = {
          displayName,
          totalScore: sessionScore,
          quizzesTaken: 1,
          lastPlayed: Date.now()
        }
      }
    })

    await updateDoc(lbRef, { players: existingPlayers })

    return { success: true }
  } catch (error) {
    console.error('Save scores to leaderboard error:', error)
    return {
      success: false,
      error: error.message || 'Failed to save scores to leaderboard'
    }
  }
}

/**
 * Subscribe to leaderboards collection
 * @param {Function} callback - Called with (leaderboards[]) when collection updates
 * @param {Function} onError - Called with (error) if subscription fails
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToLeaderboards(callback, onError) {
  if (!callback || typeof callback !== 'function') {
    console.error('Callback function is required for subscription')
    if (onError) onError(new Error('Callback function is required'))
    return () => {}
  }

  return onSnapshot(
    collection(db, 'leaderboards'),
    (snapshot) => {
      const leaderboards = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      callback(leaderboards)
    },
    (error) => {
      console.error('Leaderboards subscription error:', error)
      if (onError) onError(error)
    }
  )
}

// Export service object for easier mocking in tests
export const leaderboardService = {
  createLeaderboard,
  renameLeaderboard,
  flushLeaderboard,
  deleteLeaderboard,
  saveScoresToLeaderboard,
  subscribeToLeaderboards
}
