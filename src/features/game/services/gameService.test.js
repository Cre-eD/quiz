import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoist mocks
const {
  mockDoc,
  mockGetDoc,
  mockUpdateDoc,
  mockServerTimestamp,
  mockDb
} = vi.hoisted(() => {
  return {
    mockDoc: vi.fn(),
    mockGetDoc: vi.fn(),
    mockUpdateDoc: vi.fn(),
    mockServerTimestamp: vi.fn(() => Date.now()),  // Return current timestamp
    mockDb: {}
  }
})

vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args)
}))

vi.mock('@/lib/firebase/config', () => ({
  db: mockDb
}))

import {
  startGame,
  startQuestionTimer,
  showQuestionResults,
  nextQuestion,
  sendReaction,
  submitAnswer
} from './gameService'

describe('gameService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    mockDoc.mockReturnValue({ id: 'mock-doc-ref' })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('startGame', () => {
    it('should start game successfully', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await startGame('1234')

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'countdown',
          currentQuestion: 0,
          answers: {},
          countdownEnd: expect.any(Number),
          questionStartMs: expect.any(Number),
          questionEndMs: expect.any(Number),
          questionStartTime: null,
          questionStartTimeFallback: expect.any(Number),
          reactions: []
        })
      )
    })

    it('should reject missing PIN', async () => {
      const result = await startGame('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should reject null PIN', async () => {
      const result = await startGame(null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Update failed')
      mockUpdateDoc.mockRejectedValue(error)

      const result = await startGame('1234')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
      expect(console.error).toHaveBeenCalledWith('Start game error:', error)
    })

    it('should handle Firestore error without message', async () => {
      mockUpdateDoc.mockRejectedValue({})

      const result = await startGame('1234')

      expect(result.error).toBe('Failed to start game')
    })
  })

  describe('startQuestionTimer', () => {
    it('should start question timer successfully from countdown', async () => {
      const countdownEnd = Date.now() + 3000
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ status: 'countdown', countdownEnd })
      })
      mockUpdateDoc.mockResolvedValue()

      const result = await startQuestionTimer('1234')

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'question',
          questionStartTime: expect.any(Number),
          questionStartTimeFallback: countdownEnd,
          questionStartMs: countdownEnd,
          questionEndMs: countdownEnd + 25000
        })
      )
    })

    it('should not transition if not in countdown status', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ status: 'question' })
      })

      const result = await startQuestionTimer('1234')

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should reject missing PIN', async () => {
      const result = await startQuestionTimer('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockGetDoc).not.toHaveBeenCalled()
    })

    it('should handle session not found', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })

      const result = await startQuestionTimer('1234')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Get failed')
      mockGetDoc.mockRejectedValue(error)

      const result = await startQuestionTimer('1234')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Get failed')
      expect(console.error).toHaveBeenCalledWith('Start question timer error:', error)
    })
  })

  describe('showQuestionResults', () => {
    it('should show results successfully', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await showQuestionResults('1234')

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: 'results' }
      )
    })

    it('should reject missing PIN', async () => {
      const result = await showQuestionResults('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Update failed')
      mockUpdateDoc.mockRejectedValue(error)

      const result = await showQuestionResults('1234')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })

  describe('nextQuestion', () => {
    const baseParams = {
      pin: '1234',
      currentQuestion: 0,
      totalQuestions: 3,
      streaks: { 'user-1': 2, 'user-2': 1 },
      coldStreaks: { 'user-1': 0, 'user-2': 0 },
      answers: { 'user-1': { answer: 0, correct: true } },
      players: { 'user-1': 'Alice', 'user-2': 'Bob' }
    }

    it('should move to next question successfully', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await nextQuestion(baseParams)

      expect(result.success).toBe(true)
      expect(result.isFinal).toBe(false)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'countdown',
          currentQuestion: 1,
          answers: {},
          countdownEnd: expect.any(Number),
          questionStartMs: expect.any(Number),
          questionEndMs: expect.any(Number),
          questionStartTime: null,
          questionStartTimeFallback: expect.any(Number),
          reactions: []
        })
      )
    })

    it('should update streaks for players who did not answer', async () => {
      mockUpdateDoc.mockResolvedValue()

      await nextQuestion(baseParams)

      const updateCall = mockUpdateDoc.mock.calls[0][1]
      expect(updateCall.streaks['user-2']).toBe(0) // Did not answer
      expect(updateCall.coldStreaks['user-2']).toBe(1) // Cold streak incremented
      expect(updateCall.streaks['user-1']).toBe(2) // Answered, preserved
      expect(updateCall.coldStreaks['user-1']).toBe(0) // Answered, preserved
    })

    it('should transition to final when last question completed', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await nextQuestion({
        ...baseParams,
        currentQuestion: 2,
        totalQuestions: 3
      })

      expect(result.success).toBe(true)
      expect(result.isFinal).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'final',
          reactions: []
        })
      )
    })

    it('should handle players object as null', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await nextQuestion({
        ...baseParams,
        players: null
      })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalled()
    })

    it('should handle answers object as null', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await nextQuestion({
        ...baseParams,
        answers: null
      })

      expect(result.success).toBe(true)
      const updateCall = mockUpdateDoc.mock.calls[0][1]
      expect(updateCall.streaks['user-1']).toBe(0) // All players treated as non-answerers
      expect(updateCall.streaks['user-2']).toBe(0)
    })

    it('should reject missing PIN', async () => {
      const result = await nextQuestion({
        ...baseParams,
        pin: ''
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Update failed')
      mockUpdateDoc.mockRejectedValue(error)

      const result = await nextQuestion(baseParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
      expect(console.error).toHaveBeenCalledWith('Next question error:', error)
    })
  })

  describe('sendReaction', () => {
    it('should send reaction successfully', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await sendReaction({
        pin: '1234',
        emoji: '🎉',
        playerName: 'Alice',
        currentReactions: []
      })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          reactions: expect.arrayContaining([
            expect.objectContaining({
              emoji: '🎉',
              playerName: 'Alice',
              timestamp: expect.any(Number),
              id: expect.any(Number)
            })
          ])
        })
      )
    })

    it('should limit reactions to last 15', async () => {
      mockUpdateDoc.mockResolvedValue()

      const existingReactions = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        emoji: '😊',
        playerName: 'Bob',
        timestamp: Date.now() - i * 1000
      }))

      await sendReaction({
        pin: '1234',
        emoji: '🎉',
        playerName: 'Alice',
        currentReactions: existingReactions
      })

      const updateCall = mockUpdateDoc.mock.calls[0][1]
      expect(updateCall.reactions).toHaveLength(15)
      expect(updateCall.reactions[14].emoji).toBe('🎉')
    })

    it('should handle null current reactions', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await sendReaction({
        pin: '1234',
        emoji: '🎉',
        playerName: 'Alice',
        currentReactions: null
      })

      expect(result.success).toBe(true)
      const updateCall = mockUpdateDoc.mock.calls[0][1]
      expect(updateCall.reactions).toHaveLength(1)
    })

    it('should reject missing PIN', async () => {
      const result = await sendReaction({
        pin: '',
        emoji: '🎉',
        playerName: 'Alice',
        currentReactions: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should reject missing emoji', async () => {
      const result = await sendReaction({
        pin: '1234',
        emoji: '',
        playerName: 'Alice',
        currentReactions: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject missing playerName', async () => {
      const result = await sendReaction({
        pin: '1234',
        emoji: '🎉',
        playerName: '',
        currentReactions: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Send failed')
      mockUpdateDoc.mockRejectedValue(error)

      const result = await sendReaction({
        pin: '1234',
        emoji: '🎉',
        playerName: 'Alice',
        currentReactions: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Send failed')
      expect(console.error).toHaveBeenCalledWith('Send reaction error:', error)
    })
  })

  describe('submitAnswer', () => {
    it('should submit answer successfully', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await submitAnswer({
        pin: '1234',
        userId: 'user-1',
        updates: {
          'answers.user-1': { answer: 0, correct: true },
          'scores.user-1': 100
        }
      })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'answers.user-1': { answer: 0, correct: true },
          'scores.user-1': 100
        })
      )
    })

    it('should reject missing PIN', async () => {
      const result = await submitAnswer({
        pin: '',
        userId: 'user-1',
        updates: {}
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should reject missing userId', async () => {
      const result = await submitAnswer({
        pin: '1234',
        userId: '',
        updates: {}
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject missing updates', async () => {
      const result = await submitAnswer({
        pin: '1234',
        userId: 'user-1',
        updates: null
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Submit failed')
      mockUpdateDoc.mockRejectedValue(error)

      const result = await submitAnswer({
        pin: '1234',
        userId: 'user-1',
        updates: { 'scores.user-1': 100 }
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Submit failed')
      expect(console.error).toHaveBeenCalledWith('Submit answer error:', error)
    })

    it('should handle Firestore error without message', async () => {
      mockUpdateDoc.mockRejectedValue({})

      const result = await submitAnswer({
        pin: '1234',
        userId: 'user-1',
        updates: {}
      })

      expect(result.error).toBe('Failed to submit answer')
    })
  })
})
