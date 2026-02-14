import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoist mocks
const {
  mockDoc,
  mockGetDoc,
  mockSetDoc,
  mockUpdateDoc,
  mockDeleteDoc,
  mockCollection,
  mockOnSnapshot,
  mockDb
} = vi.hoisted(() => {
  return {
    mockDoc: vi.fn(),
    mockGetDoc: vi.fn(),
    mockSetDoc: vi.fn(),
    mockUpdateDoc: vi.fn(),
    mockDeleteDoc: vi.fn(),
    mockCollection: vi.fn(),
    mockOnSnapshot: vi.fn(),
    mockDb: {}
  }
})

vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  collection: (...args) => mockCollection(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args)
}))

vi.mock('@/lib/firebase/config', () => ({
  db: mockDb
}))

vi.mock('@/shared/utils/sanitization', () => ({
  sanitizeLeaderboardName: (name) => {
    if (!name || typeof name !== 'string') return ''
    return name.trim().substring(0, 100)
  }
}))

vi.mock('@/shared/utils/validation', () => ({
  validators: {
    leaderboardName: (name) => {
      if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Leaderboard name is required' }
      }
      if (name.trim().length === 0) {
        return { valid: false, error: 'Leaderboard name cannot be empty' }
      }
      if (name.length > 100) {
        return { valid: false, error: 'Leaderboard name must be 100 characters or less' }
      }
      return { valid: true }
    }
  }
}))

import {
  createLeaderboard,
  renameLeaderboard,
  flushLeaderboard,
  deleteLeaderboard,
  saveScoresToLeaderboard,
  subscribeToLeaderboards
} from './leaderboardService'

describe('leaderboardService', () => {
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

  describe('createLeaderboard', () => {
    it('should create leaderboard successfully', async () => {
      mockSetDoc.mockResolvedValue()

      const result = await createLeaderboard({ name: 'Spring 2024', course: 'devops', year: 2024 })

      expect(result.success).toBe(true)
      expect(result.leaderboardId).toBeTruthy()
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Spring 2024',
          course: 'devops',
          year: 2024,
          players: {}
        })
      )
    })

    it('should sanitize leaderboard name', async () => {
      mockSetDoc.mockResolvedValue()

      await createLeaderboard({ name: '  Spring 2024  ', course: 'devops', year: 2024 })

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          name: 'Spring 2024',
          course: 'devops',
          year: 2024
        })
      )
    })

    it('should reject empty name', async () => {
      const result = await createLeaderboard({ name: '', course: 'devops', year: 2024 })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('should reject null name', async () => {
      const result = await createLeaderboard({ name: null, course: 'devops', year: 2024 })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Firestore error')
      mockSetDoc.mockRejectedValue(error)

      const result = await createLeaderboard({ name: 'Spring 2024', course: 'devops', year: 2024 })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Firestore error')
      expect(console.error).toHaveBeenCalled()
    })

    it('should reject missing course', async () => {
      const result = await createLeaderboard({ name: 'Spring 2024', course: '', year: 2024 })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Course is required')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('should reject invalid year (too low)', async () => {
      const result = await createLeaderboard({ name: 'Spring 2024', course: 'devops', year: 2019 })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Valid year is required')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    it('should reject invalid year (too high)', async () => {
      const result = await createLeaderboard({ name: 'Spring 2024', course: 'devops', year: 2101 })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Valid year is required')
      expect(mockSetDoc).not.toHaveBeenCalled()
    })
  })

  describe('renameLeaderboard', () => {
    it('should rename leaderboard successfully', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await renameLeaderboard({
        leaderboardId: 'lb-123',
        newName: 'Fall 2024'
      })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { name: 'Fall 2024' }
      )
    })

    it('should sanitize new name', async () => {
      mockUpdateDoc.mockResolvedValue()

      await renameLeaderboard({
        leaderboardId: 'lb-123',
        newName: '  Fall 2024  '
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { name: 'Fall 2024' }
      )
    })

    it('should reject missing leaderboard ID', async () => {
      const result = await renameLeaderboard({
        leaderboardId: '',
        newName: 'Fall 2024'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should reject empty new name', async () => {
      const result = await renameLeaderboard({
        leaderboardId: 'lb-123',
        newName: ''
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Update failed')
      mockUpdateDoc.mockRejectedValue(error)

      const result = await renameLeaderboard({
        leaderboardId: 'lb-123',
        newName: 'Fall 2024'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })
  })

  describe('flushLeaderboard', () => {
    it('should flush leaderboard successfully', async () => {
      mockUpdateDoc.mockResolvedValue()

      const result = await flushLeaderboard('lb-123')

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { players: {} }
      )
    })

    it('should reject missing leaderboard ID', async () => {
      const result = await flushLeaderboard('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('should reject null leaderboard ID', async () => {
      const result = await flushLeaderboard(null)

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Flush failed')
      mockUpdateDoc.mockRejectedValue(error)

      const result = await flushLeaderboard('lb-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Flush failed')
    })
  })

  describe('deleteLeaderboard', () => {
    it('should delete leaderboard successfully', async () => {
      mockDeleteDoc.mockResolvedValue()

      const result = await deleteLeaderboard('lb-123')

      expect(result.success).toBe(true)
      expect(mockDeleteDoc).toHaveBeenCalled()
    })

    it('should reject missing leaderboard ID', async () => {
      const result = await deleteLeaderboard('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
      expect(mockDeleteDoc).not.toHaveBeenCalled()
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Delete failed')
      mockDeleteDoc.mockRejectedValue(error)

      const result = await deleteLeaderboard('lb-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Delete failed')
    })
  })

  describe('saveScoresToLeaderboard', () => {
    const mockExistingLeaderboard = {
      id: 'lb-123',
      name: 'Spring 2024',
      players: {
        'alice': {
          displayName: 'Alice',
          totalScore: 500,
          quizzesTaken: 2,
          lastPlayed: 1000000
        }
      }
    }

    it('should save scores to new players', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ players: {} })
      })
      mockUpdateDoc.mockResolvedValue()

      const result = await saveScoresToLeaderboard({
        leaderboardId: 'lb-123',
        sessionPlayers: { 'user-1': 'Bob' },
        sessionScores: { 'user-1': 300 }
      })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          players: {
            'bob': {
              displayName: 'Bob',
              totalScore: 300,
              quizzesTaken: 1,
              lastPlayed: expect.any(Number)
            }
          }
        })
      )
    })

    it('should update existing player scores', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockExistingLeaderboard
      })
      mockUpdateDoc.mockResolvedValue()

      const result = await saveScoresToLeaderboard({
        leaderboardId: 'lb-123',
        sessionPlayers: { 'user-1': 'Alice' },
        sessionScores: { 'user-1': 400 }
      })

      expect(result.success).toBe(true)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          players: expect.objectContaining({
            'alice': expect.objectContaining({
              totalScore: 900, // 500 + 400
              quizzesTaken: 3 // 2 + 1
            })
          })
        })
      )
    })

    it('should handle multiple players', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ players: {} })
      })
      mockUpdateDoc.mockResolvedValue()

      await saveScoresToLeaderboard({
        leaderboardId: 'lb-123',
        sessionPlayers: {
          'user-1': 'Alice',
          'user-2': 'Bob',
          'user-3': 'Charlie'
        },
        sessionScores: {
          'user-1': 100,
          'user-2': 200,
          'user-3': 300
        }
      })

      const updateCall = mockUpdateDoc.mock.calls[0][1]
      expect(Object.keys(updateCall.players)).toHaveLength(3)
    })

    it('should normalize player names to lowercase', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ players: {} })
      })
      mockUpdateDoc.mockResolvedValue()

      await saveScoresToLeaderboard({
        leaderboardId: 'lb-123',
        sessionPlayers: { 'user-1': 'ALICE' },
        sessionScores: { 'user-1': 100 }
      })

      const updateCall = mockUpdateDoc.mock.calls[0][1]
      expect(updateCall.players['alice']).toBeDefined()
      expect(updateCall.players['alice'].displayName).toBe('ALICE')
    })

    it('should reject missing leaderboard ID', async () => {
      const result = await saveScoresToLeaderboard({
        leaderboardId: '',
        sessionPlayers: { 'user-1': 'Alice' },
        sessionScores: { 'user-1': 100 }
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject missing session players', async () => {
      const result = await saveScoresToLeaderboard({
        leaderboardId: 'lb-123',
        sessionPlayers: null,
        sessionScores: { 'user-1': 100 }
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should reject missing session scores', async () => {
      const result = await saveScoresToLeaderboard({
        leaderboardId: 'lb-123',
        sessionPlayers: { 'user-1': 'Alice' },
        sessionScores: null
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('required')
    })

    it('should handle leaderboard not found', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false })

      const result = await saveScoresToLeaderboard({
        leaderboardId: 'lb-123',
        sessionPlayers: { 'user-1': 'Alice' },
        sessionScores: { 'user-1': 100 }
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should handle Firestore error', async () => {
      const error = new Error('Save failed')
      mockGetDoc.mockRejectedValue(error)

      const result = await saveScoresToLeaderboard({
        leaderboardId: 'lb-123',
        sessionPlayers: { 'user-1': 'Alice' },
        sessionScores: { 'user-1': 100 }
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Save failed')
    })
  })

  describe('subscribeToLeaderboards', () => {
    it('should subscribe successfully', () => {
      const callback = vi.fn()
      const unsubscribe = vi.fn()
      const mockDocs = [
        { id: 'lb-1', data: () => ({ name: 'Spring 2024' }) },
        { id: 'lb-2', data: () => ({ name: 'Fall 2024' }) }
      ]

      mockOnSnapshot.mockImplementation((ref, onSuccess) => {
        onSuccess({ docs: mockDocs })
        return unsubscribe
      })

      const result = subscribeToLeaderboards(callback)

      expect(callback).toHaveBeenCalledWith([
        { id: 'lb-1', name: 'Spring 2024' },
        { id: 'lb-2', name: 'Fall 2024' }
      ])
      expect(result).toBe(unsubscribe)
    })

    it('should handle empty collection', () => {
      const callback = vi.fn()
      mockOnSnapshot.mockImplementation((ref, onSuccess) => {
        onSuccess({ docs: [] })
        return vi.fn()
      })

      subscribeToLeaderboards(callback)

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

      subscribeToLeaderboards(callback, onError)

      expect(onError).toHaveBeenCalledWith(error)
      expect(console.error).toHaveBeenCalled()
    })

    it('should return noop if no callback provided', () => {
      const onError = vi.fn()

      const unsubscribe = subscribeToLeaderboards(null, onError)

      expect(onError).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })

    it('should return noop if callback is not a function', () => {
      const onError = vi.fn()

      const unsubscribe = subscribeToLeaderboards('not a function', onError)

      expect(onError).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })
  })
})
