export default function RenameLeaderboardModal({
  leaderboard,
  name,
  setName,
  onRename,
  onClose
}) {
  if (!leaderboard) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
        <h3 className="text-2xl font-bold mb-4"><i className="fa fa-edit text-blue-500 mr-2"></i>Rename Leaderboard</h3>
        <input
          className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none mb-4"
          placeholder="Enter new name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onRename()}
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Cancel</button>
          <button onClick={onRename} className="flex-1 bg-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-500">Rename</button>
        </div>
      </div>
    </div>
  )
}
