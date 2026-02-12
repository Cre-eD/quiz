/**
 * Quiz Service
 * Handles all quiz CRUD operations and subscriptions
 */

import {
  doc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { sanitizeQuiz } from '@/shared/utils/sanitization'
import { validateQuiz } from '@/shared/utils/validation'

/**
 * Generate a random ID for a quiz
 * @returns {string} - Random ID
 */
function generateQuizId() {
  return Math.random().toString(36).substring(2, 11)
}

/**
 * Save a quiz (create or update)
 * @param {Object} params - Save parameters
 * @param {Object} params.quiz - Quiz object to save
 * @param {string} params.userId - User ID (owner)
 * @returns {Promise<Object>} - Object with { success: boolean, quizId?: string, error?: string }
 */
export async function saveQuiz({ quiz, userId }) {
  try {
    // Validate quiz
    const validation = validateQuiz(quiz)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Sanitize quiz
    const sanitizedQuiz = sanitizeQuiz(quiz)

    // Generate ID if new quiz
    const quizId = sanitizedQuiz.id || generateQuizId()

    // Save to Firestore
    await setDoc(doc(db, 'quizzes', quizId), {
      ...sanitizedQuiz,
      id: quizId,
      owner: userId
    })

    return {
      success: true,
      quizId
    }
  } catch (error) {
    console.error('Save quiz error:', error)
    return {
      success: false,
      error: error.message || 'Failed to save quiz'
    }
  }
}

/**
 * Delete a quiz
 * @param {string} quizId - Quiz ID to delete
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function deleteQuiz(quizId) {
  try {
    if (!quizId) {
      return {
        success: false,
        error: 'Quiz ID is required'
      }
    }

    await deleteDoc(doc(db, 'quizzes', quizId))

    return { success: true }
  } catch (error) {
    console.error('Delete quiz error:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete quiz'
    }
  }
}

/**
 * Import quiz from JSON
 * @param {string} jsonText - JSON string containing quiz data
 * @returns {Object} - Object with { success: boolean, quiz?: Object, error?: string }
 */
export function importQuizFromJSON(jsonText) {
  try {
    if (!jsonText || typeof jsonText !== 'string') {
      return {
        success: false,
        error: 'JSON text is required'
      }
    }

    const data = JSON.parse(jsonText)

    // Validate basic structure
    if (!data.title || !Array.isArray(data.questions)) {
      return {
        success: false,
        error: 'Invalid quiz format: must have title and questions array'
      }
    }

    // Validate quiz
    const validation = validateQuiz(data)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Sanitize quiz
    const sanitizedQuiz = sanitizeQuiz(data)

    return {
      success: true,
      quiz: sanitizedQuiz
    }
  } catch (error) {
    console.error('Import quiz error:', error)
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'Invalid JSON format'
      }
    }
    return {
      success: false,
      error: error.message || 'Failed to import quiz'
    }
  }
}

/**
 * Subscribe to quizzes collection
 * @param {Function} callback - Called with (quizzes[]) when collection updates
 * @param {Function} onError - Called with (error) if subscription fails
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToQuizzes(callback, onError) {
  if (!callback || typeof callback !== 'function') {
    console.error('Callback function is required for subscription')
    if (onError) onError(new Error('Callback function is required'))
    return () => {}
  }

  return onSnapshot(
    collection(db, 'quizzes'),
    (snapshot) => {
      const quizzes = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      callback(quizzes)
    },
    (error) => {
      console.error('Quizzes subscription error:', error)
      if (onError) onError(error)
    }
  )
}

// Export service object for easier mocking in tests
export const quizService = {
  saveQuiz,
  deleteQuiz,
  importQuizFromJSON,
  subscribeToQuizzes
}
