export default function ImportQuizPanel({
  isOpen,
  importText,
  setImportText,
  onImport,
  onClose
}) {
  if (!isOpen) return null

  return (
    <div className="mb-6 glass p-6 rounded-2xl animate-slide-up border border-blue-500/30">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold"><i className="fa fa-file-code mr-2 text-blue-500"></i>Import Quiz JSON</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><i className="fa fa-times"></i></button>
      </div>
      <textarea
        className="w-full h-40 bg-slate-950/50 p-4 font-mono text-sm rounded-xl border border-slate-800 focus:border-blue-500 outline-none mb-4"
        placeholder='{"title": "L1: Topic — Pre-Quiz", "level": 1, "category": "pre", "questions": [...]}'
        value={importText}
        onChange={e => setImportText(e.target.value)}
      />
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
        <button onClick={onImport} className="btn-gradient px-5 py-2 rounded-lg font-semibold text-sm">Import</button>
      </div>
    </div>
  )
}
