export default function QuizFilters({
  categoryFilter,
  setCategoryFilter,
  categoryConfig,
  courseFilteredQuizzes,
  searchQuery,
  setSearchQuery,
  onImport,
  onCreate
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        {/* Category Filter Buttons */}
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${categoryFilter === 'all' ? 'bg-slate-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
        >
          All <span className="ml-1 text-xs opacity-70">{courseFilteredQuizzes.length}</span>
        </button>
        {['pre', 'mid', 'post'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${categoryFilter === cat ? `${categoryConfig[cat].bgClass} ${categoryConfig[cat].textClass}` : 'glass text-slate-400 hover:text-white'}`}
          >
            <i className={`fa fa-${categoryConfig[cat].icon} mr-1`}></i>
            {categoryConfig[cat].label} <span className="ml-1 text-xs opacity-70">{courseFilteredQuizzes.filter(q => q.category === cat).length}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <i className="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass pl-9 pr-4 py-2 rounded-lg text-sm bg-slate-800/50 border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          />
        </div>
        <button onClick={onImport} className="glass px-4 py-2 rounded-lg text-blue-400 hover:text-blue-300 transition-colors text-sm">
          <i className="fa fa-file-import mr-1"></i>Import
        </button>
        <button onClick={onCreate} className="btn-gradient px-4 py-2 rounded-lg font-semibold text-sm">
          <i className="fa fa-plus mr-1"></i>Create
        </button>
      </div>
    </div>
  )
}
