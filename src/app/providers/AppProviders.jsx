import { ToastProvider, useToast } from './ToastProvider'
import { AuthProvider } from './AuthProvider'
import { SessionProvider } from './SessionProvider'
import { ConfirmModalProvider } from './ConfirmModalProvider'

function ProvidersWithToast({ children }) {
  const { showToast } = useToast()

  return (
    <AuthProvider onToast={showToast}>
      <SessionProviderWrapper>{children}</SessionProviderWrapper>
    </AuthProvider>
  )
}

function SessionProviderWrapper({ children }) {
  const { showToast } = useToast()
  const { user } = useAuth()

  return (
    <SessionProvider user={user} onToast={showToast}>
      <ConfirmModalProvider>{children}</ConfirmModalProvider>
    </SessionProvider>
  )
}

// Need to import useAuth here after AuthProvider is defined
import { useAuth } from './AuthProvider'

export function AppProviders({ children }) {
  return (
    <ToastProvider>
      <ProvidersWithToast>{children}</ProvidersWithToast>
    </ToastProvider>
  )
}
