import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoist mocks to avoid initialization errors
const {
  mockSignInAnonymously,
  mockSignInWithPopup,
  mockSignInWithRedirect,
  mockGetRedirectResult,
  mockSignOut,
  mockOnAuthStateChanged,
  mockAuth,
  mockGoogleProvider,
  MOCK_ADMIN_EMAIL
} = vi.hoisted(() => {
  return {
    mockSignInAnonymously: vi.fn(),
    mockSignInWithPopup: vi.fn(),
    mockSignInWithRedirect: vi.fn(),
    mockGetRedirectResult: vi.fn(),
    mockSignOut: vi.fn(),
    mockOnAuthStateChanged: vi.fn(),
    mockAuth: { currentUser: null },
    mockGoogleProvider: {},
    MOCK_ADMIN_EMAIL: 'admin@test.com'
  }
})

// Mock Firebase auth functions
vi.mock('firebase/auth', () => ({
  signInAnonymously: (...args) => mockSignInAnonymously(...args),
  signInWithPopup: (...args) => mockSignInWithPopup(...args),
  signInWithRedirect: (...args) => mockSignInWithRedirect(...args),
  getRedirectResult: (...args) => mockGetRedirectResult(...args),
  signOut: (...args) => mockSignOut(...args),
  onAuthStateChanged: (...args) => mockOnAuthStateChanged(...args)
}))

// Mock Firebase config
vi.mock('@/lib/firebase/config', () => ({
  auth: mockAuth,
  googleProvider: mockGoogleProvider,
  ADMIN_EMAIL: MOCK_ADMIN_EMAIL
}))

import {
  isAdmin,
  signInAnonymously,
  signInWithGoogle,
  handleRedirectResult,
  validateAdminAccess,
  signOut,
  onAuthStateChanged,
  getCurrentUser
} from './authService'

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset sessionStorage
    sessionStorage.clear()
    // Reset console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    console.error.mockRestore()
  })

  describe('isAdmin', () => {
    it('should return true for admin email', () => {
      const user = { email: 'admin@test.com' }
      expect(isAdmin(user)).toBe(true)
    })

    it('should return true for admin email regardless of case', () => {
      const user = { email: 'ADMIN@TEST.COM' }
      expect(isAdmin(user)).toBe(true)
    })

    it('should return false for non-admin email', () => {
      const user = { email: 'user@example.com' }
      expect(isAdmin(user)).toBe(false)
    })

    it('should return false if user has no email', () => {
      const user = {}
      expect(isAdmin(user)).toBe(false)
    })

    it('should return false if user is null', () => {
      expect(isAdmin(null)).toBe(false)
    })

    it('should return false if user is undefined', () => {
      expect(isAdmin(undefined)).toBe(false)
    })
  })

  describe('signInAnonymously', () => {
    it('should sign in anonymously successfully', async () => {
      const mockResult = { user: { uid: 'anon-123', isAnonymous: true } }
      mockSignInAnonymously.mockResolvedValue(mockResult)

      const result = await signInAnonymously()

      expect(result).toEqual(mockResult)
      expect(mockSignInAnonymously).toHaveBeenCalledWith(mockAuth)
    })

    it('should throw error if sign-in fails', async () => {
      const error = new Error('Network error')
      mockSignInAnonymously.mockRejectedValue(error)

      await expect(signInAnonymously()).rejects.toThrow(
        'Failed to sign in anonymously: Network error'
      )
      expect(console.error).toHaveBeenCalledWith('Anonymous sign-in error:', error)
    })
  })

  describe('signInWithGoogle', () => {
    it('should sign in with popup successfully', async () => {
      const mockUser = { uid: 'user-123', email: 'admin@test.com' }
      mockSignInWithPopup.mockResolvedValue({ user: mockUser })

      const result = await signInWithGoogle()

      expect(result).toEqual({ success: true, user: mockUser })
      expect(mockSignInWithPopup).toHaveBeenCalledWith(mockAuth, mockGoogleProvider)
    })

    it('should fall back to redirect when popup is blocked', async () => {
      const popupError = { code: 'auth/popup-blocked', message: 'Popup blocked' }
      mockSignInWithPopup.mockRejectedValue(popupError)
      mockSignInWithRedirect.mockResolvedValue()

      const result = await signInWithGoogle()

      expect(result).toEqual({ success: true, requiresRedirect: true })
      expect(sessionStorage.getItem('authRedirect')).toBe('dash')
      expect(mockSignInWithRedirect).toHaveBeenCalledWith(mockAuth, mockGoogleProvider)
    })

    it('should fall back to redirect when popup is closed by user', async () => {
      const popupError = { code: 'auth/popup-closed-by-user', message: 'Popup closed' }
      mockSignInWithPopup.mockRejectedValue(popupError)
      mockSignInWithRedirect.mockResolvedValue()

      const result = await signInWithGoogle()

      expect(result).toEqual({ success: true, requiresRedirect: true })
      expect(sessionStorage.getItem('authRedirect')).toBe('dash')
    })

    it('should return error for other popup failures', async () => {
      const popupError = { code: 'auth/network-error', message: 'Network error' }
      mockSignInWithPopup.mockRejectedValue(popupError)

      const result = await signInWithGoogle()

      expect(result).toEqual({ success: false, error: 'Network error' })
      expect(console.error).toHaveBeenCalledWith('Google sign-in error:', popupError)
    })

    it('should handle error without message', async () => {
      const popupError = { code: 'auth/unknown' }
      mockSignInWithPopup.mockRejectedValue(popupError)

      const result = await signInWithGoogle()

      expect(result).toEqual({ success: false, error: 'Unknown error during sign-in' })
    })
  })

  describe('handleRedirectResult', () => {
    it('should handle redirect result successfully', async () => {
      const mockUser = { uid: 'user-123', email: 'admin@test.com' }
      mockGetRedirectResult.mockResolvedValue({ user: mockUser })
      sessionStorage.setItem('authRedirect', 'dash')

      const result = await handleRedirectResult()

      expect(result).toEqual({ hasResult: true, user: mockUser })
      expect(sessionStorage.getItem('authRedirect')).toBeNull()
    })

    it('should handle no redirect result', async () => {
      mockGetRedirectResult.mockResolvedValue(null)

      const result = await handleRedirectResult()

      expect(result).toEqual({ hasResult: false })
    })

    it('should handle redirect result with no user', async () => {
      mockGetRedirectResult.mockResolvedValue({})

      const result = await handleRedirectResult()

      expect(result).toEqual({ hasResult: false })
    })

    it('should handle redirect result error', async () => {
      const error = new Error('Redirect failed')
      mockGetRedirectResult.mockRejectedValue(error)

      const result = await handleRedirectResult()

      expect(result).toEqual({
        hasResult: false,
        error: 'Redirect failed'
      })
      expect(console.error).toHaveBeenCalledWith('Redirect result error:', error)
    })

    it('should handle error without message', async () => {
      mockGetRedirectResult.mockRejectedValue({})

      const result = await handleRedirectResult()

      expect(result.error).toBe('Failed to handle redirect result')
    })
  })

  describe('validateAdminAccess', () => {
    it('should validate admin user successfully', async () => {
      const user = { email: 'admin@test.com' }

      const result = await validateAdminAccess(user)

      expect(result).toEqual({ isAdmin: true })
    })

    it('should validate admin email case-insensitively', async () => {
      const user = { email: 'ADMIN@TEST.COM' }

      const result = await validateAdminAccess(user)

      expect(result).toEqual({ isAdmin: true })
    })

    it('should reject non-admin user and sign them out', async () => {
      const user = { email: 'user@example.com' }
      mockSignOut.mockResolvedValue()
      mockSignInAnonymously.mockResolvedValue()

      const result = await validateAdminAccess(user)

      expect(result.isAdmin).toBe(false)
      expect(result.error).toContain('Access denied')
      expect(mockSignOut).toHaveBeenCalledWith(mockAuth)
      expect(mockSignInAnonymously).toHaveBeenCalledWith(mockAuth)
    })

    it('should return error if no user provided', async () => {
      const result = await validateAdminAccess(null)

      expect(result).toEqual({ isAdmin: false, error: 'No user provided' })
    })

    it('should handle sign-out error during validation', async () => {
      const user = { email: 'user@example.com' }
      const error = new Error('Sign-out failed')
      mockSignOut.mockRejectedValue(error)

      const result = await validateAdminAccess(user)

      expect(result.isAdmin).toBe(false)
      expect(result.error).toBe('Failed to validate admin access')
      expect(console.error).toHaveBeenCalledWith('Admin validation error:', error)
    })
  })

  describe('signOut', () => {
    it('should sign out and re-authenticate anonymously', async () => {
      mockSignOut.mockResolvedValue()
      mockSignInAnonymously.mockResolvedValue()

      const result = await signOut()

      expect(result).toEqual({ success: true })
      expect(mockSignOut).toHaveBeenCalledWith(mockAuth)
      expect(mockSignInAnonymously).toHaveBeenCalledWith(mockAuth)
    })

    it('should handle sign-out error', async () => {
      const error = new Error('Sign-out failed')
      mockSignOut.mockRejectedValue(error)

      const result = await signOut()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Sign-out failed')
      expect(console.error).toHaveBeenCalledWith('Sign-out error:', error)
    })

    it('should handle error without message', async () => {
      mockSignOut.mockRejectedValue({})

      const result = await signOut()

      expect(result.error).toBe('Failed to sign out')
    })
  })

  describe('onAuthStateChanged', () => {
    it('should call callback with user', () => {
      const mockUser = { uid: 'user-123', email: 'admin@test.com' }
      const callback = vi.fn()
      const unsubscribe = vi.fn()

      mockOnAuthStateChanged.mockImplementation((auth, cb) => {
        cb(mockUser)
        return unsubscribe
      })

      const result = onAuthStateChanged(callback)

      expect(callback).toHaveBeenCalledWith(mockUser)
      expect(result).toBe(unsubscribe)
    })

    it('should call callback with null when no user', () => {
      const callback = vi.fn()
      const unsubscribe = vi.fn()

      mockOnAuthStateChanged.mockImplementation((auth, cb) => {
        cb(null)
        return unsubscribe
      })

      const result = onAuthStateChanged(callback)

      expect(callback).toHaveBeenCalledWith(null)
      expect(result).toBe(unsubscribe)
    })

    it('should return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = vi.fn()

      mockOnAuthStateChanged.mockImplementation((auth, cb) => {
        return unsubscribe
      })

      const result = onAuthStateChanged(callback)

      expect(result).toBe(unsubscribe)
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user from auth', () => {
      const mockUser = { uid: 'user-123', email: 'user@example.com' }
      mockAuth.currentUser = mockUser

      const result = getCurrentUser()

      expect(result).toBe(mockUser)
    })

    it('should return null if no current user', () => {
      mockAuth.currentUser = null

      const result = getCurrentUser()

      expect(result).toBeNull()
    })
  })
})
