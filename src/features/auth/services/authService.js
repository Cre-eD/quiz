/**
 * Authentication Service
 * Handles all authentication operations including Google sign-in, anonymous auth, and admin checks
 */

import {
  signInAnonymously as firebaseSignInAnonymously,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth'
import { auth, googleProvider, ADMIN_EMAIL, IS_TEST_MODE } from '@/lib/firebase/config'

/**
 * Check if a user is an admin based on their email
 * In test mode (development only), any authenticated user is treated as admin
 * This allows E2E testing without OAuth complexity
 * @param {Object} user - Firebase user object
 * @returns {boolean} - True if user is admin, false otherwise
 */
export function isAdmin(user) {
  if (!user || !user.email) return false

  // Test mode: Grant admin access to any authenticated user (non-anonymous)
  // SECURITY: Only works in DEV builds, completely removed from production
  if (IS_TEST_MODE && !user.isAnonymous) {
    console.log('🧪 Test mode: Granting admin access for E2E testing')
    return true
  }

  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

/**
 * Sign in anonymously (for players)
 * @returns {Promise<Object>} - Firebase user credential
 * @throws {Error} - If sign-in fails
 */
export async function signInAnonymously() {
  try {
    const result = await firebaseSignInAnonymously(auth)
    return result
  } catch (error) {
    console.error('Anonymous sign-in error:', error)
    throw new Error(`Failed to sign in anonymously: ${error.message}`)
  }
}

/**
 * Sign in with Google (for admins/teachers)
 * Tries popup first, falls back to redirect if popup is blocked
 * @returns {Promise<Object>} - Object with { success: boolean, user?: Object, requiresRedirect?: boolean, error?: string }
 */
export async function signInWithGoogle() {
  try {
    // Try popup first
    const result = await signInWithPopup(auth, googleProvider)
    return { success: true, user: result.user }
  } catch (popupError) {
    // If popup blocked or closed, use redirect
    if (
      popupError.code === 'auth/popup-blocked' ||
      popupError.code === 'auth/popup-closed-by-user'
    ) {
      // Store redirect intent
      sessionStorage.setItem('authRedirect', 'dash')
      await signInWithRedirect(auth, googleProvider)
      return { success: true, requiresRedirect: true }
    }

    // Other errors
    console.error('Google sign-in error:', popupError)
    return {
      success: false,
      error: popupError.message || 'Unknown error during sign-in'
    }
  }
}

/**
 * Handle redirect result after sign-in with redirect
 * Should be called on app initialization
 * @returns {Promise<Object>} - Object with { hasResult: boolean, user?: Object, error?: string }
 */
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth)
    if (result && result.user) {
      // Clear redirect intent
      sessionStorage.removeItem('authRedirect')
      return { hasResult: true, user: result.user }
    }
    return { hasResult: false }
  } catch (error) {
    console.error('Redirect result error:', error)
    return {
      hasResult: false,
      error: error.message || 'Failed to handle redirect result'
    }
  }
}

/**
 * Validate if authenticated user is admin, sign out if not
 * @param {Object} user - Firebase user object
 * @returns {Promise<Object>} - Object with { isAdmin: boolean, error?: string }
 */
export async function validateAdminAccess(user) {
  if (!user) {
    return { isAdmin: false, error: 'No user provided' }
  }

  // Test mode: Allow any authenticated (non-anonymous) user
  if (IS_TEST_MODE && !user.isAnonymous) {
    console.log('🧪 Test mode: Allowing admin access for E2E testing')
    return { isAdmin: true }
  }

  const userEmail = (user.email || '').toLowerCase()
  const adminEmail = ADMIN_EMAIL.toLowerCase()

  if (userEmail === adminEmail) {
    return { isAdmin: true }
  }

  // Not admin - sign out and re-auth as anonymous
  try {
    await firebaseSignOut(auth)
    await firebaseSignInAnonymously(auth)
    return {
      isAdmin: false,
      error: `Access denied. Only ${ADMIN_EMAIL} can access the dashboard.`
    }
  } catch (error) {
    console.error('Admin validation error:', error)
    return {
      isAdmin: false,
      error: 'Failed to validate admin access'
    }
  }
}

/**
 * Sign out current user and re-authenticate as anonymous
 * @returns {Promise<Object>} - Object with { success: boolean, error?: string }
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth)
    await firebaseSignInAnonymously(auth)
    return { success: true }
  } catch (error) {
    console.error('Sign-out error:', error)
    return {
      success: false,
      error: error.message || 'Failed to sign out'
    }
  }
}

/**
 * Subscribe to authentication state changes
 * @param {Function} callback - Called with (user) when auth state changes
 * @returns {Function} - Unsubscribe function
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, callback)
}

/**
 * Get current authenticated user
 * @returns {Object|null} - Current Firebase user or null
 */
export function getCurrentUser() {
  return auth.currentUser
}

// Export service object for easier mocking in tests
export const authService = {
  isAdmin,
  signInAnonymously,
  signInWithGoogle,
  handleRedirectResult,
  validateAdminAccess,
  signOut,
  onAuthStateChanged,
  getCurrentUser
}
