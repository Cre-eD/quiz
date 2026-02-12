import { createContext, useContext, useState } from 'react'
import ConfirmModal from '@/components/ConfirmModal'

const ConfirmModalContext = createContext(null)

export function ConfirmModalProvider({ children }) {
  const [modal, setModal] = useState({ isOpen: false })

  const confirm = ({ title, message, onConfirm, onCancel }) => {
    setModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        await onConfirm?.()
        setModal({ isOpen: false })
      },
      onCancel: () => {
        onCancel?.()
        setModal({ isOpen: false })
      }
    })
  }

  const close = () => {
    setModal({ isOpen: false })
  }

  const value = {
    confirm,
    close
  }

  return (
    <ConfirmModalContext.Provider value={value}>
      {children}
      {modal.isOpen && (
        <ConfirmModal
          isOpen={modal.isOpen}
          title={modal.title}
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
        />
      )}
    </ConfirmModalContext.Provider>
  )
}

export function useConfirmModal() {
  const context = useContext(ConfirmModalContext)
  if (!context) {
    throw new Error('useConfirmModal must be used within a ConfirmModalProvider')
  }
  return context
}
