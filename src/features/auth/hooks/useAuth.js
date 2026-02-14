import { useState, useEffect } from 'react'
import { authService } from '../services/authService'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const handleSignInWithGoogle = async (onSuccess, onError) => {
    setLoading(true)
    const result = await authService.signInWithGoogle()

    if (result.requiresRedirect) {
      return
    }

    if (!result.success) {
      onError?.("Sign-in failed: " + result.error)
      setLoading(false)
      return
    }

    const validation = await authService.validateAdminAccess(result.user)
    if (validation.isAdmin) {
      setIsAdmin(true)
      onSuccess?.()
    } else {
      onError?.(validation.error)
    }
    setLoading(false)
  }

  const signOutAdmin = async (onSuccess) => {
    const result = await authService.signOut()
    if (result.success) {
      setIsAdmin(false)
      onSuccess?.()
    }
  }

  // Handle redirect result on mount
  useEffect(() => {
    const handleRedirect = async () => {
      const result = await authService.handleRedirectResult()

      if (result.error) {
        return { error: result.error }
      }

      if (result.hasResult && result.user) {
        const validation = await authService.validateAdminAccess(result.user)
        if (validation.isAdmin) {
          setUser(result.user)
          setIsAdmin(true)
          return { success: true, isAdmin: true }
        } else {
          return { error: validation.error }
        }
      }
      return {}
    }

    handleRedirect()
  }, [])

  // Listen to auth state changes
  useEffect(() => {
    let mounted = true
    let retryTimeoutId = null

    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
      if (!mounted) return
      setUser(firebaseUser)
      setLoading(false)
    })

    // Immediately check if we have a user, if not sign in anonymously
    const initAuth = async (retryCount = 0) => {
      const currentUser = authService.getCurrentUser()
      if (!currentUser && mounted) {
        try {
          await authService.signInAnonymously()
        } catch (error) {
          console.error('Initial anonymous sign-in failed:', error)

          // If rate limited and not too many retries, use exponential backoff
          if (error.message?.includes('too-many-requests') && retryCount < 3) {
            const delayMs = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
            console.log(`Rate limited. Retrying in ${delayMs}ms... (attempt ${retryCount + 1}/3)`)

            retryTimeoutId = setTimeout(() => {
              if (mounted) initAuth(retryCount + 1)
            }, delayMs)
          } else {
            // Give up after 3 retries or other errors
            if (mounted) setLoading(false)
          }
        }
      }
    }

    initAuth()

    return () => {
      mounted = false
      if (retryTimeoutId) clearTimeout(retryTimeoutId)
      unsubscribe()
    }
  }, [])

  return {
    user,
    isAdmin,
    loading,
    handleSignInWithGoogle,
    signOutAdmin
  }
}
