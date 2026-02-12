/**
 * Sanitization utilities for preventing XSS attacks
 * Uses DOMPurify to strip all HTML and malicious content
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML content - strips ALL HTML tags
 * @param {string} dirty - Potentially dangerous input
 * @returns {string} - Clean text without HTML
 */
export function sanitizeHTML(dirty) {
  if (!dirty || typeof dirty !== 'string') {
    return ''
  }

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],      // Strip all HTML tags
    KEEP_CONTENT: true     // Keep text content
  })
}

/**
 * Sanitize player name
 * Removes HTML, non-printable characters, and enforces length limit
 * @param {string} name - Raw player name input
 * @returns {string} - Sanitized player name
 */
export function sanitizePlayerName(name) {
  if (!name || typeof name !== 'string') {
    return ''
  }

  // First strip HTML
  const cleaned = sanitizeHTML(name).trim()

  // Remove non-printable characters (keep basic ASCII + Unicode)
  const printable = cleaned.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '')

  // Enforce length limit
  return printable.substring(0, 30)
}

/**
 * Sanitize quiz title
 * @param {string} title - Raw quiz title
 * @returns {string} - Sanitized title
 */
export function sanitizeQuizTitle(title) {
  if (!title || typeof title !== 'string') {
    return ''
  }

  return sanitizeHTML(title).trim().substring(0, 200)
}

/**
 * Sanitize question text
 * @param {string} text - Raw question text
 * @returns {string} - Sanitized text
 */
export function sanitizeQuestionText(text) {
  if (!text || typeof text !== 'string') {
    return ''
  }

  return sanitizeHTML(text).trim().substring(0, 500)
}

/**
 * Sanitize option text
 * @param {string} option - Raw option text
 * @returns {string} - Sanitized option
 */
export function sanitizeOption(option) {
  if (!option || typeof option !== 'string') {
    return ''
  }

  return sanitizeHTML(option).trim().substring(0, 200)
}

/**
 * Sanitize explanation text
 * @param {string} explanation - Raw explanation text
 * @returns {string} - Sanitized explanation
 */
export function sanitizeExplanation(explanation) {
  if (!explanation || typeof explanation !== 'string') {
    return ''
  }

  return sanitizeHTML(explanation).trim().substring(0, 500)
}

/**
 * Sanitize leaderboard name
 * @param {string} name - Raw leaderboard name
 * @returns {string} - Sanitized name
 */
export function sanitizeLeaderboardName(name) {
  if (!name || typeof name !== 'string') {
    return ''
  }

  return sanitizeHTML(name).trim().substring(0, 100)
}

/**
 * Sanitize email address
 * Converts to lowercase and trims whitespace
 * @param {string} email - Raw email
 * @returns {string} - Sanitized email
 */
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return ''
  }

  return email.toLowerCase().trim()
}

/**
 * Sanitize entire quiz object
 * Recursively sanitizes all text fields in a quiz
 * @param {Object} quiz - Raw quiz object
 * @returns {Object} - Sanitized quiz object
 */
export function sanitizeQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') {
    return quiz
  }

  return {
    ...quiz,
    title: sanitizeQuizTitle(quiz.title),
    questions: Array.isArray(quiz.questions)
      ? quiz.questions.map(q => ({
          ...q,
          text: sanitizeQuestionText(q.text),
          options: Array.isArray(q.options)
            ? q.options.map(sanitizeOption)
            : q.options,
          explanation: q.explanation
            ? sanitizeExplanation(q.explanation)
            : q.explanation
        }))
      : quiz.questions
  }
}
