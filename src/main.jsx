import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { IS_E2E_MODE } from './lib/firebase/config'
import { authService } from './features/auth/services/authService'

const waitFor = (predicate, timeoutMs = 10000, intervalMs = 50) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const tick = () => {
      if (predicate()) {
        resolve(true)
        return
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('Timed out waiting for E2E auth bridge condition'))
        return
      }
      setTimeout(tick, intervalMs)
    }
    tick()
  })

if (IS_E2E_MODE && typeof window !== 'undefined') {
  window.__E2E_AUTH__ = {
    loginAdmin: async () => {
      await authService.e2eLoginAdmin()
      window.__E2E_APP__?.goDashboard?.()

      await waitFor(() => {
        const state = window.__E2E_APP__?.getState?.()
        if (state?.view === 'dash' && state?.isAdmin && !state?.loading) return true
        return Boolean(document.querySelector('[data-testid="dash-title"]'))
      })
    },
    logout: async () => {
      await authService.signOut()
      window.__E2E_APP__?.goHome?.()
      await waitFor(() => Boolean(document.querySelector('[data-testid="home-join-btn"]')))
    },
  }

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      delete window.__E2E_AUTH__
      delete window.__E2E_AUTH_PENDING__
    })
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
