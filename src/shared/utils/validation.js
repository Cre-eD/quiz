/**
 * Validation utilities for user inputs
 * All validators return { valid: boolean, error?: string }
 */

export const validators = {
  /**
   * Validate quiz title
   */
  quizTitle: (title) => {
    if (!title || typeof title !== 'string') {
      return { valid: false, error: 'Title is required' }
    }
    const trimmed = title.trim()
    if (trimmed.length < 1) {
      return { valid: false, error: 'Title cannot be empty' }
    }
    if (trimmed.length > 200) {
      return { valid: false, error: 'Title must be 200 characters or less' }
    }
    return { valid: true }
  },

  /**
   * Validate quiz level
   */
  quizLevel: (level) => {
    if (typeof level !== 'number' || !Number.isInteger(level)) {
      return { valid: false, error: 'Level must be an integer' }
    }
    if (level < 1 || level > 99) {
      return { valid: false, error: 'Level must be between 1 and 99' }
    }
    return { valid: true }
  },

  /**
   * Validate question text
   */
  questionText: (text) => {
    if (!text || typeof text !== 'string') {
      return { valid: false, error: 'Question text is required' }
    }
    const trimmed = text.trim()
    if (trimmed.length < 5) {
      return { valid: false, error: 'Question must be at least 5 characters' }
    }
    if (trimmed.length > 500) {
      return { valid: false, error: 'Question must be 500 characters or less' }
    }
    return { valid: true }
  },

  /**
   * Validate question options array
   */
  options: (options) => {
    if (!Array.isArray(options)) {
      return { valid: false, error: 'Options must be an array' }
    }
    if (options.length !== 4) {
      return { valid: false, error: 'Must have exactly 4 options' }
    }
    for (let i = 0; i < options.length; i++) {
      const opt = options[i]
      if (!opt || typeof opt !== 'string') {
        return { valid: false, error: `Option ${i + 1} must be a non-empty string` }
      }
      const trimmed = opt.trim()
      if (trimmed.length < 1) {
        return { valid: false, error: `Option ${i + 1} cannot be empty` }
      }
      if (trimmed.length > 200) {
        return { valid: false, error: `Option ${i + 1} must be 200 characters or less` }
      }
    }
    return { valid: true }
  },

  /**
   * Validate correct answer index
   */
  correctAnswer: (correct) => {
    if (typeof correct !== 'number' || !Number.isInteger(correct)) {
      return { valid: false, error: 'Correct answer must be an integer' }
    }
    if (correct < 0 || correct > 3) {
      return { valid: false, error: 'Correct answer must be 0, 1, 2, or 3' }
    }
    return { valid: true }
  },

  /**
   * Validate player name
   */
  playerName: (name) => {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Name is required' }
    }
    const trimmed = name.trim()
    if (trimmed.length < 1) {
      return { valid: false, error: 'Name cannot be empty' }
    }
    if (trimmed.length > 30) {
      return { valid: false, error: 'Name must be 30 characters or less' }
    }
    return { valid: true }
  },

  /**
   * Validate session PIN
   */
  pin: (pin) => {
    if (!pin || typeof pin !== 'string') {
      return { valid: false, error: 'PIN is required' }
    }
    if (!/^\d{4}$/.test(pin)) {
      return { valid: false, error: 'PIN must be exactly 4 digits' }
    }
    return { valid: true }
  },

  /**
   * Validate email address
   */
  email: (email) => {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' }
    }
    return { valid: true }
  },

  /**
   * Validate leaderboard name
   */
  leaderboardName: (name) => {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Leaderboard name is required' }
    }
    const trimmed = name.trim()
    if (trimmed.length < 1) {
      return { valid: false, error: 'Leaderboard name cannot be empty' }
    }
    if (trimmed.length > 100) {
      return { valid: false, error: 'Leaderboard name must be 100 characters or less' }
    }
    return { valid: true }
  },

  /**
   * Validate explanation text (optional field)
   */
  explanation: (text) => {
    if (!text) {
      return { valid: true } // Optional field
    }
    if (typeof text !== 'string') {
      return { valid: false, error: 'Explanation must be a string' }
    }
    if (text.trim().length > 500) {
      return { valid: false, error: 'Explanation must be 500 characters or less' }
    }
    return { valid: true }
  }
}

/**
 * Validate entire quiz object
 */
export function validateQuiz(quiz) {
  // Validate title
  const titleCheck = validators.quizTitle(quiz.title)
  if (!titleCheck.valid) return titleCheck

  // Validate level
  const levelCheck = validators.quizLevel(quiz.level)
  if (!levelCheck.valid) return levelCheck

  // Validate questions array
  if (!Array.isArray(quiz.questions)) {
    return { valid: false, error: 'Quiz must have a questions array' }
  }
  if (quiz.questions.length < 1) {
    return { valid: false, error: 'Quiz must have at least 1 question' }
  }
  if (quiz.questions.length > 100) {
    return { valid: false, error: 'Quiz cannot have more than 100 questions' }
  }

  // Validate each question
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i]

    const textCheck = validators.questionText(q.text)
    if (!textCheck.valid) {
      return { valid: false, error: `Question ${i + 1}: ${textCheck.error}` }
    }

    const optCheck = validators.options(q.options)
    if (!optCheck.valid) {
      return { valid: false, error: `Question ${i + 1}: ${optCheck.error}` }
    }

    const correctCheck = validators.correctAnswer(q.correct)
    if (!correctCheck.valid) {
      return { valid: false, error: `Question ${i + 1}: ${correctCheck.error}` }
    }

    // Validate explanation if present
    if (q.explanation) {
      const explainCheck = validators.explanation(q.explanation)
      if (!explainCheck.valid) {
        return { valid: false, error: `Question ${i + 1}: ${explainCheck.error}` }
      }
    }
  }

  return { valid: true }
}
