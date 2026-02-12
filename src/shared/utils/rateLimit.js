/**
 * Rate Limiting Utilities
 * Implements client-side rate limiting to prevent abuse and improve UX
 *
 * Note: This is client-side rate limiting for UX and basic abuse prevention.
 * Server-side rate limiting (Firestore rules, Cloud Functions) should also be implemented
 * for production security.
 */

/**
 * Simple rate limiter using time windows
 * Tracks attempts in memory (resets on page reload)
 */
class RateLimiter {
  constructor() {
    this.attempts = new Map()
  }

  /**
   * Check if an operation is allowed based on rate limit
   * @param {string} key - Unique key for the operation (e.g., 'session-join', 'answer-submit-user123')
   * @param {number} maxAttempts - Maximum number of attempts allowed
   * @param {number} windowMs - Time window in milliseconds
   * @returns {Object} - { allowed: boolean, remaining: number, resetIn: number }
   */
  check(key, maxAttempts, windowMs) {
    const now = Date.now()
    const record = this.attempts.get(key) || { count: 0, resetAt: now + windowMs }

    // Reset if window has expired
    if (now >= record.resetAt) {
      record.count = 0
      record.resetAt = now + windowMs
    }

    // Check if limit exceeded
    if (record.count >= maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: Math.ceil((record.resetAt - now) / 1000) // seconds
      }
    }

    // Increment and allow
    record.count++
    this.attempts.set(key, record)

    return {
      allowed: true,
      remaining: maxAttempts - record.count,
      resetIn: Math.ceil((record.resetAt - now) / 1000)
    }
  }

  /**
   * Reset rate limit for a specific key
   * @param {string} key - Key to reset
   */
  reset(key) {
    this.attempts.delete(key)
  }

  /**
   * Clear all rate limit records
   */
  clearAll() {
    this.attempts.clear()
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter()

/**
 * Rate limit configurations for different operations
 */
export const RATE_LIMITS = {
  SESSION_JOIN: { maxAttempts: 3, windowMs: 60000 }, // 3 attempts per minute
  ANSWER_SUBMIT: { maxAttempts: 1, windowMs: 1000 }, // 1 per second
  QUIZ_SAVE: { maxAttempts: 5, windowMs: 60000 }, // 5 per minute
  REACTION_SEND: { maxAttempts: 10, windowMs: 60000 } // 10 per minute
}

/**
 * Check if session join is allowed
 * @returns {Object} - Rate limit result
 */
export function checkSessionJoinLimit() {
  return rateLimiter.check(
    'session-join',
    RATE_LIMITS.SESSION_JOIN.maxAttempts,
    RATE_LIMITS.SESSION_JOIN.windowMs
  )
}

/**
 * Check if answer submission is allowed
 * @param {string} userId - User ID
 * @returns {Object} - Rate limit result
 */
export function checkAnswerSubmitLimit(userId) {
  return rateLimiter.check(
    `answer-submit-${userId}`,
    RATE_LIMITS.ANSWER_SUBMIT.maxAttempts,
    RATE_LIMITS.ANSWER_SUBMIT.windowMs
  )
}

/**
 * Check if quiz save is allowed
 * @returns {Object} - Rate limit result
 */
export function checkQuizSaveLimit() {
  return rateLimiter.check(
    'quiz-save',
    RATE_LIMITS.QUIZ_SAVE.maxAttempts,
    RATE_LIMITS.QUIZ_SAVE.windowMs
  )
}

/**
 * Check if reaction send is allowed
 * @param {string} userId - User ID
 * @returns {Object} - Rate limit result
 */
export function checkReactionSendLimit(userId) {
  return rateLimiter.check(
    `reaction-send-${userId}`,
    RATE_LIMITS.REACTION_SEND.maxAttempts,
    RATE_LIMITS.REACTION_SEND.windowMs
  )
}

/**
 * Reset rate limit for a user's answer submissions
 * Call this when moving to the next question
 * @param {string} userId - User ID
 */
export function resetAnswerSubmitLimit(userId) {
  rateLimiter.reset(`answer-submit-${userId}`)
}

/**
 * Reset session join limit
 * Call this after successful join
 */
export function resetSessionJoinLimit() {
  rateLimiter.reset('session-join')
}

// Export the rate limiter instance for testing
export { rateLimiter }
