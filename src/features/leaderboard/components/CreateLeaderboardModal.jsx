export default function CreateLeaderboardModal({
  isOpen,
  name,
  setName,
  onCreate,
  onClose
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
        <h3 className="text-2xl font-bold mb-4"><i className="fa fa-trophy text-purple-500 mr-2"></i>New Leaderboard</h3>
        <input
          className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus:border-purple-500 outline-none mb-4"
          placeholder="e.g., DevOps Spring 2026"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onCreate()}
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Cancel</button>
          <button onClick={onCreate} className="flex-1 bg-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-500">Create</button>
        </div>
      </div>
    </div>
  )
}
