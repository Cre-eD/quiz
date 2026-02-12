import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '@/features/auth/services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children, onToast }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Handle redirect result on mount
  useEffect(() => {
    const handleRedirect = async () => {
      const result = await authService.handleRedirectResult()

      if (result.error) {
        onToast?.("Sign-in failed. Please try again.", "error")
        return
      }

      if (result.hasResult && result.user) {
        const validation = await authService.validateAdminAccess(result.user)
        if (validation.isAdmin) {
          setIsAdmin(true)
          onToast?.("Welcome back, Admin!")
        } else {
          onToast?.(validation.error, "error")
        }
        setLoading(false)
      }
    }
    handleRedirect()
  }, [onToast])

  // Listen to auth state changes
  useEffect(() => {
    return authService.onAuthStateChanged((user, isAdminStatus) => {
      setUser(user)
      setIsAdmin(isAdminStatus)
      setLoading(false)
    })
  }, [])

  const handleSignInWithGoogle = async () => {
    setLoading(true)
    const result = await authService.handleSignInWithGoogle()

    if (result.requiresRedirect) {
      // Redirect in progress, don't update loading state
      return { requiresRedirect: true }
    }

    if (!result.success) {
      onToast?.("Sign-in failed: " + result.error, "error")
      setLoading(false)
      return { success: false, error: result.error }
    }

    // Validate admin access
    const validation = await authService.validateAdminAccess(result.user)
    if (validation.isAdmin) {
      setIsAdmin(true)
      onToast?.("Welcome back, Admin!")
      setLoading(false)
      return { success: true, isAdmin: true }
    } else {
      onToast?.(validation.error, "error")
      setLoading(false)
      return { success: false, error: validation.error }
    }
  }

  const signOut = async () => {
    const result = await authService.signOut()
    if (result.success) {
      setIsAdmin(false)
      onToast?.("Signed out successfully")
      return { success: true }
    } else {
      onToast?.("Sign-out failed", "error")
      return { success: false, error: result.error }
    }
  }

  const value = {
    user,
    isAdmin,
    loading,
    signIn: handleSignInWithGoogle,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
