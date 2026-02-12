import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoist mocks to avoid initialization errors
const {
  mockDoc,
  mockSetDoc,
  mockDeleteDoc,
  mockCollection,
  mockOnSnapshot,
  mockDb
} = vi.hoisted(() => {
  return {
    mockDoc: vi.fn(),
    mockSetDoc: vi.fn(),
    mockDeleteDoc: vi.fn(),
    mockCollection: vi.fn(),
    mockOnSnapshot: vi.fn(),
    mockDb: {}
  }
})

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  collection: (...args) => mockCollection(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args)
}))

// Mock Firebase config
vi.mock('@/lib/firebase/config', () => ({
  db: mockDb
}))

// Mock sanitization
vi.mock('@/shared/utils/sanitization', () => ({
  sanitizeQuiz: (quiz) => {
    if (!quiz) return quiz
    return {
      ...quiz,
      title: quiz.title?.trim() || '',
      questions: quiz.questions?.map(q => ({
        ...q,
        text: q.text?.trim() || '',
        options: q.options?.map(opt => opt?.trim() || '') || []
      })) || []
    }
  }
}))

// Mock validation
vi.mock('@/shared/utils/validation', () => ({
  validateQuiz: (quiz) => {
    if (!quiz) {
      return { valid: false, error: 'Quiz is required' }
    }
    if (!quiz.title || quiz.title.trim() === '') {
      return { valid: false, error: 'Quiz title is required' }
    }
    if (!quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return { valid: false, error: 'Quiz must have at least one question' }
    }
    return { valid: true }
  }
}))

import {
  saveQuiz,
  deleteQuiz,
  importQuizFromJSON,
  subscribeToQuizzes
} from './quizService'

describe('quizService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockDoc.mockReturnValue({ id: 'mock-doc-ref' })
    mockCollection.mockReturnValue({ id: 'mock-collection-ref' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('saveQuiz', () => {
    const validQuiz = {
      title: 'Test Quiz',
      questions: [
        { text: 'Q1?', options: ['A', 'B'], correct: 0 }
      ]
    }

    it('should save new quiz successfully', async () => {
      mockSetDoc.mockResolvedValue()

      const result = await saveQuiz({ quiz: validQuiz, userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(result.quizId).toBeTruthy()
      expect(typeof result.quizId).toBe('string')
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'Test Quiz',
          id: result.quizId,
          owner: 'user-1'
        })
      )
    })

    it('should update existing quiz', async () => {
      mockSetDoc.mockResolvedValue()
      const existingQuiz = { ...validQuiz, id: 'existing-123' }

      const result = await saveQuiz({ quiz: existingQuiz, userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(result.quizId).toBe('existing-123')
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: 'existing-123',
          owner: 'user-1'
        })
      )
    })

    it('should reject quiz without title', async () => {
      const result = await saveQuiz({ quiz: { questions: [] }, userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('title')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('should reject quiz without questions', async () => {
      const result = await saveQuiz({ quiz: { title: 'Test' }, userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('question')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('should reject quiz with empty questions array', async () => {
      const result = await saveQuiz({ quiz: { title: 'Test', questions: [] }, userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('at least one question')
    })

    it('should sanitize quiz before saving', async () => {
      mockSetDoc.mockResolvedValue()
      const dirtyQuiz = {
        title: '  Test Quiz  ',
        questions: [
          { text: '  Question?  ', options: ['  A  ', '  B  '], correct: 0 }
        ]
      }

      await saveQuiz({ quiz: dirtyQuiz, userId: 'user-1' })

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'Test Quiz',
          questions: [
            { text: 'Question?', options: ['A', 'B'], correct: 0 }
          ]
        })
      )
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Firestore error')
      mockSetDoc.mockRejectedValue(error)

      const result = await saveQuiz({ quiz: validQuiz, userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore error')
      expect(console.error).toHaveBeenCalledWith('Save quiz error:', error)
    })

    it('should handle Firestore error without message', async () => {
      mockSetDoc.mockRejectedValue({})

      const result = await saveQuiz({ quiz: validQuiz, userId: 'user-1' })

      expect(result.error).toBe('Failed to save quiz')
    })
  })

  describe('deleteQuiz', () => {
    it('should delete quiz successfully', async () => {
      mockDeleteDoc.mockResolvedValue()

      const result = await deleteQuiz('quiz-123')

      expect(result.success).toBe(true)
      expect(mockDeleteDoc).toHaveBeenCalled()
      expect(mockDoc).toHaveBeenCalledWith(mockDb, 'quizzes', 'quiz-123')
    })

    it('should reject missing quiz ID', async () => {
      const result = await deleteQuiz('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockDeleteDoc).not.toHaveBeenCalled()
    })

    it('should reject null quiz ID', async () => {
      const result = await deleteQuiz(null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Delete failed')
      mockDeleteDoc.mockRejectedValue(error)

      const result = await deleteQuiz('quiz-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
      expect(console.error).toHaveBeenCalledWith('Delete quiz error:', error)
    })

    it('should handle Firestore error without message', async () => {
      mockDeleteDoc.mockRejectedValue({})

      const result = await deleteQuiz('quiz-123')

      expect(result.error).toBe('Failed to delete quiz')
    })
  })

  describe('importQuizFromJSON', () => {
    const validJSON = JSON.stringify({
      title: 'Imported Quiz',
      questions: [
        { text: 'Q1?', options: ['A', 'B'], correct: 0 }
      ]
    })

    it('should import valid JSON successfully', () => {
      const result = importQuizFromJSON(validJSON)

      expect(result.success).toBe(true)
      expect(result.quiz).toEqual({
        title: 'Imported Quiz',
        questions: [
          { text: 'Q1?', options: ['A', 'B'], correct: 0 }
        ]
      })
    })

    it('should reject empty string', () => {
      const result = importQuizFromJSON('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject null', () => {
      const result = importQuizFromJSON(null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject non-string', () => {
      const result = importQuizFromJSON(123)

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject invalid JSON', () => {
      const result = importQuizFromJSON('{invalid json}')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JSON format')
      expect(console.error).toHaveBeenCalled()
    })

    it('should reject JSON without title', () => {
      const result = importQuizFromJSON(JSON.stringify({
        questions: [{ text: 'Q?', options: ['A'], correct: 0 }]
      }))

      expect(result.success).toBe(false)
      expect(result.error).toContain('title')
    })

    it('should reject JSON without questions array', () => {
      const result = importQuizFromJSON(JSON.stringify({
        title: 'Quiz'
      }))

      expect(result.success).toBe(false)
      expect(result.error).toContain('questions array')
    })

    it('should reject JSON with non-array questions', () => {
      const result = importQuizFromJSON(JSON.stringify({
        title: 'Quiz',
        questions: 'not an array'
      }))

      expect(result.success).toBe(false)
      expect(result.error).toContain('questions array')
    })

    it('should reject quiz with empty questions', () => {
      const result = importQuizFromJSON(JSON.stringify({
        title: 'Quiz',
        questions: []
      }))

      expect(result.success).toBe(false)
      expect(result.error).toContain('at least one question')
    })

    it('should sanitize imported quiz', () => {
      const dirtyJSON = JSON.stringify({
        title: '  Imported Quiz  ',
        questions: [
          { text: '  Q1?  ', options: ['  A  ', '  B  '], correct: 0 }
        ]
      })

      const result = importQuizFromJSON(dirtyJSON)

      expect(result.success).toBe(true)
      expect(result.quiz.title).toBe('Imported Quiz')
      expect(result.quiz.questions[0].text).toBe('Q1?')
      expect(result.quiz.questions[0].options).toEqual(['A', 'B'])
    })

    it('should handle generic error', () => {
      // Mock JSON.parse to throw non-SyntaxError
      vi.spyOn(JSON, 'parse').mockImplementation(() => {
        throw new Error('Parse error')
      })

      const result = importQuizFromJSON('{}')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Parse error')
    })
  })

  describe('subscribeToQuizzes', () => {
    it('should subscribe successfully', () => {
      const callback = vi.fn()
      const unsubscribe = vi.fn()
      const mockDocs = [
        { id: 'quiz-1', data: () => ({ title: 'Quiz 1' }) },
        { id: 'quiz-2', data: () => ({ title: 'Quiz 2' }) }
      ]

      mockOnSnapshot.mockImplementation((ref, onSuccess) => {
        onSuccess({ docs: mockDocs })
        return unsubscribe
      })

      const result = subscribeToQuizzes(callback)

      expect(callback).toHaveBeenCalledWith([
        { id: 'quiz-1', title: 'Quiz 1' },
        { id: 'quiz-2', title: 'Quiz 2' }
      ])
      expect(result).toBe(unsubscribe)
      expect(mockCollection).toHaveBeenCalledWith(mockDb, 'quizzes')
    })

    it('should handle empty collection', () => {
      const callback = vi.fn()
      mockOnSnapshot.mockImplementation((ref, onSuccess) => {
        onSuccess({ docs: [] })
        return vi.fn()
      })

      subscribeToQuizzes(callback)

      expect(callback).toHaveBeenCalledWith([])
    })

    it('should handle subscription error', () => {
      const callback = vi.fn()
      const onError = vi.fn()
      const error = new Error('Subscription failed')

      mockOnSnapshot.mockImplementation((ref, onSuccess, onErr) => {
        onErr(error)
        return vi.fn()
      })

      subscribeToQuizzes(callback, onError)

      expect(onError).toHaveBeenCalledWith(error)
      expect(console.error).toHaveBeenCalledWith('Quizzes subscription error:', error)
    })

    it('should return noop if no callback provided', () => {
      const onError = vi.fn()

      const unsubscribe = subscribeToQuizzes(null, onError)

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(typeof unsubscribe).toBe('function')
      unsubscribe() // Should not throw
    })

    it('should return noop if callback is not a function', () => {
      const onError = vi.fn()

      const unsubscribe = subscribeToQuizzes('not a function', onError)

      expect(onError).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })

    it('should work without onError callback', () => {
      const callback = vi.fn()
      const mockDocs = [{ id: 'quiz-1', data: () => ({ title: 'Quiz 1' }) }]

      mockOnSnapshot.mockImplementation((ref, onSuccess) => {
        onSuccess({ docs: mockDocs })
        return vi.fn()
      })

      subscribeToQuizzes(callback)

      expect(callback).toHaveBeenCalled()
    })
  })
})
