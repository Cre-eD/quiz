import { describe, it, expect } from 'vitest'
import { validators, validateQuiz } from './validation'

describe('validators.quizTitle', () => {
  it('should accept valid title', () => {
    expect(validators.quizTitle('DevOps Quiz')).toEqual({ valid: true })
  })

  it('should reject null/undefined', () => {
    expect(validators.quizTitle(null).valid).toBe(false)
    expect(validators.quizTitle(undefined).valid).toBe(false)
  })

  it('should reject non-string', () => {
    expect(validators.quizTitle(123).valid).toBe(false)
    expect(validators.quizTitle({}).valid).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validators.quizTitle('').valid).toBe(false)
    expect(validators.quizTitle('   ').valid).toBe(false)
  })

  it('should reject title over 200 characters', () => {
    const longTitle = 'a'.repeat(201)
    expect(validators.quizTitle(longTitle).valid).toBe(false)
  })

  it('should accept title at boundary (200 chars)', () => {
    const boundaryTitle = 'a'.repeat(200)
    expect(validators.quizTitle(boundaryTitle)).toEqual({ valid: true })
  })
})

describe('validators.quizLevel', () => {
  it('should accept valid levels', () => {
    expect(validators.quizLevel(1)).toEqual({ valid: true })
    expect(validators.quizLevel(50)).toEqual({ valid: true })
    expect(validators.quizLevel(99)).toEqual({ valid: true })
  })

  it('should reject non-numbers', () => {
    expect(validators.quizLevel('1').valid).toBe(false)
    expect(validators.quizLevel(null).valid).toBe(false)
  })

  it('should reject floats', () => {
    expect(validators.quizLevel(1.5).valid).toBe(false)
  })

  it('should reject out of range', () => {
    expect(validators.quizLevel(0).valid).toBe(false)
    expect(validators.quizLevel(100).valid).toBe(false)
    expect(validators.quizLevel(-1).valid).toBe(false)
  })
})

describe('validators.questionText', () => {
  it('should accept valid question', () => {
    expect(validators.questionText('What is DevOps?')).toEqual({ valid: true })
  })

  it('should reject null/undefined', () => {
    expect(validators.questionText(null).valid).toBe(false)
    expect(validators.questionText(undefined).valid).toBe(false)
  })

  it('should reject too short', () => {
    expect(validators.questionText('Why?').valid).toBe(false)
    expect(validators.questionText('').valid).toBe(false)
  })

  it('should accept at boundary (5 chars)', () => {
    expect(validators.questionText('What?')).toEqual({ valid: true })
  })

  it('should reject over 500 characters', () => {
    const longText = 'a'.repeat(501)
    expect(validators.questionText(longText).valid).toBe(false)
  })

  it('should accept at boundary (500 chars)', () => {
    const boundaryText = 'a'.repeat(500)
    expect(validators.questionText(boundaryText)).toEqual({ valid: true })
  })
})

describe('validators.options', () => {
  it('should accept valid options', () => {
    const valid = ['Option A', 'Option B', 'Option C', 'Option D']
    expect(validators.options(valid)).toEqual({ valid: true })
  })

  it('should reject non-array', () => {
    expect(validators.options('not array').valid).toBe(false)
    expect(validators.options(null).valid).toBe(false)
  })

  it('should reject wrong number of options', () => {
    expect(validators.options(['A', 'B']).valid).toBe(false)
    expect(validators.options(['A', 'B', 'C', 'D', 'E']).valid).toBe(false)
  })

  it('should reject non-string options', () => {
    expect(validators.options(['A', 123, 'C', 'D']).valid).toBe(false)
    expect(validators.options(['A', null, 'C', 'D']).valid).toBe(false)
  })

  it('should reject empty option', () => {
    expect(validators.options(['A', '', 'C', 'D']).valid).toBe(false)
    expect(validators.options(['A', '   ', 'C', 'D']).valid).toBe(false)
  })

  it('should reject option over 200 chars', () => {
    const longOpt = 'a'.repeat(201)
    expect(validators.options(['A', longOpt, 'C', 'D']).valid).toBe(false)
  })

  it('should accept option at boundary (200 chars)', () => {
    const boundaryOpt = 'a'.repeat(200)
    expect(validators.options(['A', boundaryOpt, 'C', 'D'])).toEqual({ valid: true })
  })
})

describe('validators.correctAnswer', () => {
  it('should accept valid indices', () => {
    expect(validators.correctAnswer(0)).toEqual({ valid: true })
    expect(validators.correctAnswer(1)).toEqual({ valid: true })
    expect(validators.correctAnswer(2)).toEqual({ valid: true })
    expect(validators.correctAnswer(3)).toEqual({ valid: true })
  })

  it('should reject non-numbers', () => {
    expect(validators.correctAnswer('0').valid).toBe(false)
    expect(validators.correctAnswer(null).valid).toBe(false)
  })

  it('should reject floats', () => {
    expect(validators.correctAnswer(1.5).valid).toBe(false)
  })

  it('should reject out of range', () => {
    expect(validators.correctAnswer(-1).valid).toBe(false)
    expect(validators.correctAnswer(4).valid).toBe(false)
  })
})

describe('validators.playerName', () => {
  it('should accept valid names', () => {
    expect(validators.playerName('John')).toEqual({ valid: true })
    expect(validators.playerName('Alice Bob')).toEqual({ valid: true })
  })

  it('should reject null/undefined', () => {
    expect(validators.playerName(null).valid).toBe(false)
    expect(validators.playerName(undefined).valid).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validators.playerName('').valid).toBe(false)
    expect(validators.playerName('   ').valid).toBe(false)
  })

  it('should reject over 30 characters', () => {
    const longName = 'a'.repeat(31)
    expect(validators.playerName(longName).valid).toBe(false)
  })

  it('should accept at boundary (30 chars)', () => {
    const boundaryName = 'a'.repeat(30)
    expect(validators.playerName(boundaryName)).toEqual({ valid: true })
  })
})

describe('validators.pin', () => {
  it('should accept valid 4-digit PIN', () => {
    expect(validators.pin('1234')).toEqual({ valid: true })
    expect(validators.pin('0000')).toEqual({ valid: true })
    expect(validators.pin('9999')).toEqual({ valid: true })
  })

  it('should reject null/undefined', () => {
    expect(validators.pin(null).valid).toBe(false)
    expect(validators.pin(undefined).valid).toBe(false)
  })

  it('should reject non-string', () => {
    expect(validators.pin(1234).valid).toBe(false)
  })

  it('should reject wrong length', () => {
    expect(validators.pin('123').valid).toBe(false)
    expect(validators.pin('12345').valid).toBe(false)
  })

  it('should reject non-digits', () => {
    expect(validators.pin('12ab').valid).toBe(false)
    expect(validators.pin('12 4').valid).toBe(false)
  })
})

describe('validators.email', () => {
  it('should accept valid emails', () => {
    expect(validators.email('user@example.com')).toEqual({ valid: true })
    expect(validators.email('test.user+tag@domain.co.uk')).toEqual({ valid: true })
  })

  it('should reject null/undefined', () => {
    expect(validators.email(null).valid).toBe(false)
    expect(validators.email(undefined).valid).toBe(false)
  })

  it('should reject invalid formats', () => {
    expect(validators.email('notanemail').valid).toBe(false)
    expect(validators.email('@example.com').valid).toBe(false)
    expect(validators.email('user@').valid).toBe(false)
    expect(validators.email('user@domain').valid).toBe(false)
  })
})

describe('validators.leaderboardName', () => {
  it('should accept valid names', () => {
    expect(validators.leaderboardName('Spring 2024')).toEqual({ valid: true })
  })

  it('should reject null/undefined', () => {
    expect(validators.leaderboardName(null).valid).toBe(false)
    expect(validators.leaderboardName(undefined).valid).toBe(false)
  })

  it('should reject empty string', () => {
    expect(validators.leaderboardName('').valid).toBe(false)
    expect(validators.leaderboardName('   ').valid).toBe(false)
  })

  it('should reject over 100 characters', () => {
    const longName = 'a'.repeat(101)
    expect(validators.leaderboardName(longName).valid).toBe(false)
  })

  it('should accept at boundary (100 chars)', () => {
    const boundaryName = 'a'.repeat(100)
    expect(validators.leaderboardName(boundaryName)).toEqual({ valid: true })
  })
})

describe('validators.explanation', () => {
  it('should accept valid explanation', () => {
    expect(validators.explanation('This is because...')).toEqual({ valid: true })
  })

  it('should accept null/undefined (optional field)', () => {
    expect(validators.explanation(null)).toEqual({ valid: true })
    expect(validators.explanation(undefined)).toEqual({ valid: true })
    expect(validators.explanation('')).toEqual({ valid: true })
  })

  it('should reject non-string', () => {
    expect(validators.explanation(123).valid).toBe(false)
  })

  it('should reject over 500 characters', () => {
    const longExpl = 'a'.repeat(501)
    expect(validators.explanation(longExpl).valid).toBe(false)
  })

  it('should accept at boundary (500 chars)', () => {
    const boundaryExpl = 'a'.repeat(500)
    expect(validators.explanation(boundaryExpl)).toEqual({ valid: true })
  })
})

describe('validateQuiz', () => {
  const validQuiz = {
    title: 'DevOps Quiz',
    level: 1,
    questions: [
      {
        text: 'What is CI/CD?',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct: 0
      }
    ]
  }

  it('should accept valid quiz', () => {
    expect(validateQuiz(validQuiz)).toEqual({ valid: true })
  })

  it('should reject invalid title', () => {
    const quiz = { ...validQuiz, title: '' }
    expect(validateQuiz(quiz).valid).toBe(false)
  })

  it('should reject invalid level', () => {
    const quiz = { ...validQuiz, level: 0 }
    expect(validateQuiz(quiz).valid).toBe(false)
  })

  it('should reject non-array questions', () => {
    const quiz = { ...validQuiz, questions: 'not array' }
    expect(validateQuiz(quiz).valid).toBe(false)
  })

  it('should reject empty questions array', () => {
    const quiz = { ...validQuiz, questions: [] }
    expect(validateQuiz(quiz).valid).toBe(false)
  })

  it('should reject over 100 questions', () => {
    const questions = Array(101).fill(validQuiz.questions[0])
    const quiz = { ...validQuiz, questions }
    expect(validateQuiz(quiz).valid).toBe(false)
  })

  it('should reject invalid question text', () => {
    const quiz = {
      ...validQuiz,
      questions: [{ ...validQuiz.questions[0], text: 'Why?' }]
    }
    expect(validateQuiz(quiz).valid).toBe(false)
  })

  it('should reject invalid options', () => {
    const quiz = {
      ...validQuiz,
      questions: [{ ...validQuiz.questions[0], options: ['A', 'B'] }]
    }
    expect(validateQuiz(quiz).valid).toBe(false)
  })

  it('should reject invalid correct answer', () => {
    const quiz = {
      ...validQuiz,
      questions: [{ ...validQuiz.questions[0], correct: 5 }]
    }
    expect(validateQuiz(quiz).valid).toBe(false)
  })

  it('should accept valid explanation', () => {
    const quiz = {
      ...validQuiz,
      questions: [{
        ...validQuiz.questions[0],
        explanation: 'This is because...'
      }]
    }
    expect(validateQuiz(quiz)).toEqual({ valid: true })
  })

  it('should reject invalid explanation', () => {
    const quiz = {
      ...validQuiz,
      questions: [{
        ...validQuiz.questions[0],
        explanation: 'a'.repeat(501)
      }]
    }
    expect(validateQuiz(quiz).valid).toBe(false)
  })

  it('should include question number in error message', () => {
    const quiz = {
      ...validQuiz,
      questions: [
        validQuiz.questions[0],
        { ...validQuiz.questions[0], text: 'Why?' }
      ]
    }
    const result = validateQuiz(quiz)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Question 2')
  })
})
