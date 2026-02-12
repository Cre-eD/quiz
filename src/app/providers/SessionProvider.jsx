import { createContext, useContext, useState, useEffect } from 'react'
import { sessionService } from '@/features/session/services/sessionService'

const SessionContext = createContext(null)

export function SessionProvider({ children, user, onToast }) {
  const [session, setSession] = useState(null)
  const [joinForm, setJoinForm] = useState({ pin: '', name: '' })

  // Try to recover session on mount
  useEffect(() => {
    const tryRecover = async () => {
      if (!user) return

      const result = await sessionService.recoverSession(user.uid)
      if (result.success) {
        setSession(result.session)
        setJoinForm({ pin: result.pin, name: result.name })
        onToast?.("Session restored!", "info")

        // Return session data so parent can handle navigation
        return result
      }
    }
    tryRecover()
  }, [user, onToast])

  const createSession = async ({ quiz, leaderboardId = null, leaderboardName = null }) => {
    const result = await sessionService.createSession({ quiz, leaderboardId, leaderboardName })
    if (result.success) {
      setSession(result.session)
      return { success: true, session: result.session, pin: result.pin }
    }
    return result
  }

  const joinSession = async ({ pin, displayName }) => {
    if (!user?.uid) {
      return { success: false, error: 'User not authenticated' }
    }

    const result = await sessionService.joinSession({
      pin,
      userId: user.uid,
      displayName
    })

    if (result.success) {
      setSession(result.session)
      setJoinForm({ pin, name: displayName })
      return result
    }
    return result
  }

  const leaveSession = () => {
    setSession(null)
    setJoinForm({ pin: '', name: '' })
  }

  const deleteSession = async (pin) => {
    const result = await sessionService.deleteSession(pin)
    if (result.success) {
      leaveSession()
    }
    return result
  }

  const kickPlayer = async (pin, uid, bannedUsers) => {
    return await sessionService.kickPlayer(pin, uid, bannedUsers)
  }

  const toggleLateJoin = async (pin, allowLateJoin) => {
    return await sessionService.toggleLateJoin(pin, allowLateJoin)
  }

  const value = {
    session,
    setSession,
    joinForm,
    setJoinForm,
    createSession,
    joinSession,
    leaveSession,
    deleteSession,
    kickPlayer,
    toggleLateJoin
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
