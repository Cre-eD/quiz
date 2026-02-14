import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoist mocks to avoid initialization errors
const {
  mockDoc,
  mockGetDoc,
  mockSetDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockDeleteField,
  mockOnSnapshot,
  mockDb
} = vi.hoisted(() => {
  return {
    mockDoc: vi.fn(),
    mockGetDoc: vi.fn(),
    mockSetDoc: vi.fn(),
    mockUpdateDoc: vi.fn(),
    mockDeleteDoc: vi.fn(),
    mockDeleteField: vi.fn(),
    mockOnSnapshot: vi.fn(),
    mockDb: {}
  }
})

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  deleteField: (...args) => mockDeleteField(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args)
}))

// Mock Firebase config
vi.mock('@/lib/firebase/config', () => ({
  db: mockDb
}))

// Mock sanitization and validation
vi.mock('@/shared/utils/sanitization', () => ({
  sanitizePlayerName: (name) => {
    if (!name || typeof name !== 'string') return ''
    return name.trim().substring(0, 30)
  }
}))

vi.mock('@/shared/utils/validation', () => ({
  validators: {
    pin: (pin) => {
      if (!pin || !/^\d{4}$/.test(pin)) {
        return { valid: false, error: 'PIN must be 4 digits' }
      }
      return { valid: true }
    },
    playerName: (name) => {
      if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Name is required' }
      }
      if (name.length < 1 || name.length > 30) {
        return { valid: false, error: 'Name must be 1-30 characters' }
      }
      return { valid: true }
    }
  }
}))

import {
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
} from './sessionService'
import { rateLimiter } from '@/shared/utils/rateLimit'

describe('sessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    localStorage.clear()
    rateLimiter.clearAll() // Reset rate limits before each test
    mockDoc.mockReturnValue({ id: 'mock-doc-ref' })
    mockDeleteField.mockReturnValue('__DELETE_FIELD__')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createSession', () => {
    it('should create session successfully', async () => {
      const quiz = {
        title: 'Test Quiz',
        questions: [{ text: 'Q1?', options: ['A', 'B'], correct: 0 }]
      }
      mockSetDoc.mockResolvedValue()

      const result = await createSession({ quiz })

      expect(result.success).toBe(true)
      expect(result.pin).toMatch(/^\d{4}$/) // 4-digit PIN (cryptographically random)
      expect(parseInt(result.pin)).toBeGreaterThanOrEqual(1000)
      expect(parseInt(result.pin)).toBeLessThan(10000)
      expect(result.session.quiz).toEqual(quiz)
      expect(result.session.status).toBe('lobby')
      expect(mockSetDoc).toHaveBeenCalled()
    })

    it('should create session with leaderboard', async () => {
      const quiz = { title: 'Quiz', questions: [{ text: 'Q?', options: ['A'], correct: 0 }] }
      mockSetDoc.mockResolvedValue()

      const result = await createSession({
        quiz,
        leaderboardId: 'lb-123',
        leaderboardName: 'Spring 2024'
      })

      expect(result.success).toBe(true)
      expect(result.session.leaderboardId).toBe('lb-123')
      expect(result.session.leaderboardName).toBe('Spring 2024')
    })

    it('should reject quiz without questions', async () => {
      const result = await createSession({ quiz: { title: 'Empty', questions: [] } })

      expect(result.success).toBe(false)
      expect(result.error).toContain('at least one question')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('should reject null quiz', async () => {
      const result = await createSession({ quiz: null })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid quiz')
    })

    it('should handle Firestore error', async () => {
      const quiz = { title: 'Quiz', questions: [{ text: 'Q?', options: ['A'], correct: 0 }] }
      const error = new Error('Firestore error')
      mockSetDoc.mockRejectedValue(error)

      const result = await createSession({ quiz })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore error')
      expect(console.error).toHaveBeenCalledWith('Create session error:', error)
    })
  })

  describe('getSession', () => {
    it('should get session successfully', async () => {
      const sessionData = { pin: '1234', quiz: {}, players: {} }
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => sessionData
      })

      const result = await getSession('1234')

      expect(result.success).toBe(true)
      expect(result.session).toEqual(sessionData)
      expect(mockDoc).toHaveBeenCalledWith(mockDb, 'sessions', '1234')
    })

    it('should reject invalid PIN', async () => {
      const result = await getSession('abc')

      expect(result.success).toBe(false)
      expect(result.error).toBe('PIN must be 4 digits')
      expect(mockGetDoc).not.toHaveBeenCalled()
    })

    it('should handle session not found', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })

      const result = await getSession('1234')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Session not found')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Network error')
      mockGetDoc.mockRejectedValue(error)

      const result = await getSession('1234')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })
  })

  describe('joinSession', () => {
    const mockSessionData = {
      pin: '1234',
      status: 'lobby',
      players: {},
      scores: {},
      allowLateJoin: true,
      bannedUsers: []
    }

    it('should join session successfully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSessionData
      })
      mockUpdateDoc.mockResolvedValue()

      const result = await joinSession({ pin: '1234', name: 'Alice', userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(result.session).toEqual(mockSessionData)
      expect(result.shouldWait).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalled()
      expect(localStorage.getItem('quizSession')).toBeTruthy()
    })

    it('should reject invalid PIN', async () => {
      const result = await joinSession({ pin: 'abc', name: 'Alice', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('PIN must be 4 digits')
    })

    it('should reject invalid name', async () => {
      const result = await joinSession({ pin: '1234', name: '', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Name is required')
    })

    it('should handle session not found', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })

      const result = await joinSession({ pin: '1234', name: 'Alice', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('PIN not found!')
    })

    it('should reject late join when disabled', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ ...mockSessionData, status: 'playing', allowLateJoin: false })
      })

      const result = await joinSession({ pin: '1234', name: 'Alice', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Late joining is disabled')
    })

    it('should reject banned users', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ ...mockSessionData, bannedUsers: ['user-1'] })
      })

      const result = await joinSession({ pin: '1234', name: 'Alice', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('removed from this game')
    })

    it('should reject duplicate names', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...mockSessionData,
          players: { 'user-2': 'Alice' }
        })
      })

      const result = await joinSession({ pin: '1234', name: 'Alice', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('already taken')
    })

    it('should allow same user to rejoin with same name', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          ...mockSessionData,
          players: { 'user-1': 'Alice' }
        })
      })
      mockUpdateDoc.mockResolvedValue()

      const result = await joinSession({ pin: '1234', name: 'Alice', userId: 'user-1' })

      expect(result.success).toBe(true)
    })

    it('should handle localStorage error gracefully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockSessionData
      })
      mockUpdateDoc.mockResolvedValue()
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const result = await joinSession({ pin: '1234', name: 'Alice', userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(console.warn).toHaveBeenCalled()
      setItemSpy.mockRestore()
    })

    it('should set shouldWait false for in-progress games', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ ...mockSessionData, status: 'playing', allowLateJoin: true })
      })
      mockUpdateDoc.mockResolvedValue()

      const result = await joinSession({ pin: '1234', name: 'Alice', userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(result.shouldWait).toBe(false)
    })
  })

  describe('recoverSession', () => {
    it('should recover session successfully', async () => {
      localStorage.setItem('quizSession', JSON.stringify({ pin: '1234', name: 'Alice' }))
      const sessionData = { pin: '1234', players: { 'user-1': 'Alice' } }
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => sessionData
      })

      const result = await recoverSession('user-1')

      expect(result.success).toBe(true)
      expect(result.session).toEqual(sessionData)
      expect(result.pin).toBe('1234')
      expect(result.name).toBe('Alice')
    })

    it('should fail if no saved session', async () => {
      const result = await recoverSession('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No saved session')
    })

    it('should fail if saved data is invalid', async () => {
      localStorage.setItem('quizSession', JSON.stringify({ pin: '', name: '' }))

      const result = await recoverSession('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid saved session')
      expect(localStorage.getItem('quizSession')).toBeNull()
    })

    it('should fail if session no longer exists', async () => {
      localStorage.setItem('quizSession', JSON.stringify({ pin: '1234', name: 'Alice' }))
      mockGetDoc.mockResolvedValue({ exists: () => false })

      const result = await recoverSession('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no longer exists')
      expect(localStorage.getItem('quizSession')).toBeNull()
    })

    it('should fail if user not in session', async () => {
      localStorage.setItem('quizSession', JSON.stringify({ pin: '1234', name: 'Alice' }))
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ players: { 'user-2': 'Bob' } })
      })

      const result = await recoverSession('user-1')

      expect(result.success).toBe(false)
      expect(result.error).toContain('no longer in this session')
      expect(localStorage.getItem('quizSession')).toBeNull()
    })

    it('should handle Firestore error', async () => {
      localStorage.setItem('quizSession', JSON.stringify({ pin: '1234', name: 'Alice' }))
      mockGetDoc.mockRejectedValue(new Error('Network error'))

      const result = await recoverSession('user-1')

      expect(result.success).toBe(false)
      expect(localStorage.getItem('quizSession')).toBeNull()
    })
  })

  describe('kickPlayer', () => {
    it('should kick player successfully', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ bannedUsers: [] })
      })
      mockUpdateDoc.mockResolvedValue()

      const result = await kickPlayer({ pin: '1234', userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          bannedUsers: ['user-1'],
          'players.user-1': null,
          'scores.user-1': null
        })
      )
    })

    it('should reject missing PIN', async () => {
      const result = await kickPlayer({ pin: '', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject missing userId', async () => {
      const result = await kickPlayer({ pin: '1234', userId: '' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle session not found', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })

      const result = await kickPlayer({ pin: '1234', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Session not found')
    })

    it('should append to existing banned users', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ bannedUsers: ['user-2'] })
      })
      mockUpdateDoc.mockResolvedValue()

      await kickPlayer({ pin: '1234', userId: 'user-1' })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          bannedUsers: ['user-2', 'user-1']
        })
      )
    })
  })

  describe('toggleLateJoin', () => {
    it('should toggle late join to false', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await toggleLateJoin({ pin: '1234', allowLateJoin: true })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { allowLateJoin: false }
      )
    })

    it('should toggle late join to true', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await toggleLateJoin({ pin: '1234', allowLateJoin: false })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { allowLateJoin: true }
      )
    })

    it('should reject missing PIN', async () => {
      const result = await toggleLateJoin({ pin: '', allowLateJoin: true })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle Firestore error', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'))

      const result = await toggleLateJoin({ pin: '1234', allowLateJoin: true })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      mockDeleteDoc.mockResolvedValue()

      const result = await deleteSession('1234')

      expect(result.success).toBe(true)
      expect(mockDeleteDoc).toHaveBeenCalled()
    })

    it('should clear localStorage if PIN matches', async () => {
      localStorage.setItem('quizSession', JSON.stringify({ pin: '1234', name: 'Alice' }))
      mockDeleteDoc.mockResolvedValue()

      await deleteSession('1234')

      expect(localStorage.getItem('quizSession')).toBeNull()
    })

    it('should not clear localStorage if PIN does not match', async () => {
      localStorage.setItem('quizSession', JSON.stringify({ pin: '5678', name: 'Alice' }))
      mockDeleteDoc.mockResolvedValue()

      await deleteSession('1234')

      expect(localStorage.getItem('quizSession')).toBeTruthy()
    })

    it('should reject missing PIN', async () => {
      const result = await deleteSession('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle localStorage error gracefully', async () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error')
      })
      mockDeleteDoc.mockResolvedValue()

      const result = await deleteSession('1234')

      expect(result.success).toBe(true)
      expect(console.warn).toHaveBeenCalled()
      getItemSpy.mockRestore()
    })
  })

  describe('leaveSession', () => {
    it('should remove player data successfully', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await leaveSession({ pin: '1234', userId: 'user-1' })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'players.user-1': '__DELETE_FIELD__',
          'scores.user-1': '__DELETE_FIELD__',
          'streaks.user-1': '__DELETE_FIELD__',
          'coldStreaks.user-1': '__DELETE_FIELD__',
          'badges.user-1': '__DELETE_FIELD__',
          'correctCounts.user-1': '__DELETE_FIELD__',
          'answers.user-1': '__DELETE_FIELD__'
        })
      )
    })

    it('should clear localStorage if PIN matches', async () => {
      localStorage.setItem('quizSession', JSON.stringify({ pin: '1234', name: 'Alice' }))
      mockUpdateDoc.mockResolvedValue()

      await leaveSession({ pin: '1234', userId: 'user-1' })

      expect(localStorage.getItem('quizSession')).toBeNull()
    })

    it('should reject missing PIN', async () => {
      const result = await leaveSession({ pin: '', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should reject missing userId', async () => {
      const result = await leaveSession({ pin: '1234', userId: '' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should handle Firestore error', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'))

      const result = await leaveSession({ pin: '1234', userId: 'user-1' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('subscribeToSession', () => {
    it('should subscribe successfully', () => {
      const callback = vi.fn()
      const unsubscribe = vi.fn()
      mockOnSnapshot.mockImplementation((ref, onSuccess) => {
        onSuccess({ exists: () => true, data: () => ({ pin: '1234' }) })
        return unsubscribe
      })

      const result = subscribeToSession('1234', callback)

      expect(callback).toHaveBeenCalledWith({ pin: '1234' })
      expect(result).toBe(unsubscribe)
    })

    it('should call onError if session not found', () => {
      const callback = vi.fn()
      const onError = vi.fn()
      mockOnSnapshot.mockImplementation((ref, onSuccess) => {
        onSuccess({ exists: () => false })
        return vi.fn()
      })

      subscribeToSession('1234', callback, onError)

      expect(callback).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle subscription error', () => {
      const callback = vi.fn()
      const onError = vi.fn()
      const error = new Error('Subscription failed')
      mockOnSnapshot.mockImplementation((ref, onSuccess, onErr) => {
        onErr(error)
        return vi.fn()
      })

      subscribeToSession('1234', callback, onError)

      expect(onError).toHaveBeenCalledWith(error)
      expect(console.error).toHaveBeenCalled()
    })

    it('should return noop if no PIN provided', () => {
      const callback = vi.fn()
      const onError = vi.fn()

      const unsubscribe = subscribeToSession('', callback, onError)

      expect(onError).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
      unsubscribe() // Should not throw
    })
  })

  describe('updateSession', () => {
    it('should update session successfully', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await updateSession('1234', { status: 'playing' })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { status: 'playing' }
      )
    })

    it('should reject missing PIN', async () => {
      const result = await updateSession('', { status: 'playing' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject empty updates', async () => {
      const result = await updateSession('1234', {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('No updates')
    })

    it('should reject null updates', async () => {
      const result = await updateSession('1234', null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('No updates')
    })

    it('should handle Firestore error', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'))

      const result = await updateSession('1234', { status: 'playing' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })
})
