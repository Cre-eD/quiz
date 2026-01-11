export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = "Delete", danger = true }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-slide-up">
      <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
