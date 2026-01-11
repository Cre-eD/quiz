import { useEffect } from 'react'

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600"
  }

  return (
    <div className={`fixed bottom-6 right-6 ${colors[type]} px-6 py-4 rounded-xl shadow-2xl animate-slide-up flex items-center gap-3 z-50`}>
      <i className={`fa ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}></i>
      {message}
    </div>
  )
}
