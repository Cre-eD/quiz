export default function LevelControls({ levelCount, onExpandAll, onCollapseAll }) {
  if (levelCount === 0) return null

  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-slate-500 text-sm">{levelCount} lectures</span>
      <button onClick={onExpandAll} className="text-xs text-slate-400 hover:text-white transition-colors">
        <i className="fa fa-expand-alt mr-1"></i>Expand All
      </button>
      <button onClick={onCollapseAll} className="text-xs text-slate-400 hover:text-white transition-colors">
        <i className="fa fa-compress-alt mr-1"></i>Collapse All
      </button>
    </div>
  )
}
