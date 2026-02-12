import { useState, useEffect } from 'react'
import { authService } from '../services/authService'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const handleSignInWithGoogle = async (onSuccess, onError) => {
    setLoading(true)
    const result = await authService.handleSignInWithGoogle()

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
    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return {
    user,
    isAdmin,
    loading,
    handleSignInWithGoogle,
    signOutAdmin
  }
}
