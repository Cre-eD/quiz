import { useState } from 'react'
import ConfirmModal from '@/components/ConfirmModal'

export default function DashboardPage(props) {
  const { user, isAdmin, handleSignInWithGoogle, signOutAdmin, dashTab, setDashTab, showImport, setShowImport, importText, setImportText, handleImport, quizzes, setActiveQuiz, setView, handleLaunch, handleDelete, leaderboards, setShowLeaderboardModal, showLeaderboardModal, newLeaderboardName, setNewLeaderboardName, createLeaderboard, setViewingLeaderboard, viewingLeaderboard, getLeaderboardPlayers, flushLeaderboard, deleteLeaderboard, renameLeaderboard, renamingLeaderboard, setRenamingLeaderboard, renameLeaderboardName, setRenameLeaderboardName, confirmRenameLeaderboard, launchingQuiz, setLaunchingQuiz, selectedLeaderboard, setSelectedLeaderboard, confirmLaunch, confirmModal } = props

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [expandedLevels, setExpandedLevels] = useState({})
  const [searchQuery, setSearchQuery] = useState('')

  // Get unique courses
  const courses = [...new Set(quizzes.map(q => q.course || 'default'))].sort()

  // Course display names
  const courseNames = {
    'devops': 'DevOps',
    'devops-intro': 'DevOps Intro',
    'devops-intro-rus': 'DevOps Intro (RU)',
    'devsecops-intro': 'DevSecOps Intro',
    'default': 'Other'
  }

  // Filter by course first
  const courseFilteredQuizzes = courseFilter === 'all'
    ? quizzes
    : quizzes.filter(q => (q.course || 'default') === courseFilter)

  // Group quizzes by level
  const groupedQuizzes = courseFilteredQuizzes.reduce((acc, quiz) => {
    const level = quiz.level || 0
    if (!acc[level]) acc[level] = []
    acc[level].push(quiz)
    return acc
  }, {})

  // Sort levels and filter by category
  const sortedLevels = Object.keys(groupedQuizzes).map(Number).sort((a, b) => a - b)

  // Filter quizzes
  const getFilteredQuizzes = (levelQuizzes) => {
    return levelQuizzes
      .filter(q => categoryFilter === 'all' || q.category === categoryFilter)
      .filter(q => !searchQuery || q.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        const order = { pre: 0, mid: 1, post: 2 }
        return (order[a.category] || 99) - (order[b.category] || 99)
      })
  }


  // Toggle level expansion
  const toggleLevel = (level) => {
    setExpandedLevels(prev => ({ ...prev, [level]: !prev[level] }))
  }

  // Expand/collapse all
  const expandAll = () => setExpandedLevels(sortedLevels.reduce((acc, l) => ({ ...acc, [l]: true }), {}))
  const collapseAll = () => setExpandedLevels({})

  const hasGoogleAuth = user && user.email
  const isAuthorized = hasGoogleAuth && isAdmin

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="glass p-12 rounded-3xl max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-600/20 flex items-center justify-center">
            <i className="fa fa-lock text-4xl text-red-500"></i>
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-6">You need to sign in with an authorized Google account to access the dashboard.</p>
          <button onClick={handleSignInWithGoogle} className="btn-gradient px-8 py-3 rounded-xl font-bold w-full mb-3">
            <i className="fab fa-google mr-2"></i>Sign in with Google
          </button>
          <button onClick={() => setView('home')} className="text-slate-500 hover:text-white transition-colors">
            <i className="fa fa-arrow-left mr-2"></i>Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-4xl font-black gradient-text">Dashboard</h2>
          <p className="text-slate-500 mt-1">Welcome, {user?.email}</p>
        </div>
        <button onClick={signOutAdmin} className="bg-slate-800/50 px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors text-red-400 hover:text-red-300">
          <i className="fa fa-sign-out-alt mr-2"></i>Sign Out
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setDashTab('quizzes')} className={`px-6 py-3 rounded-xl font-semibold transition-all ${dashTab === 'quizzes' ? 'bg-blue-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
          <i className="fa fa-question-circle mr-2"></i>Quizzes
        </button>
        <button onClick={() => setDashTab('leaderboards')} className={`px-6 py-3 rounded-xl font-semibold transition-all ${dashTab === 'leaderboards' ? 'bg-purple-600 text-white' : 'glass text-slate-400 hover:text-white'}`}>
          <i className="fa fa-trophy mr-2"></i>Leaderboards
        </button>
      </div>

      {dashTab === 'quizzes' && (
        <>
          {/* Course Filter */}
          {courses.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-slate-500 text-sm mr-2"><i className="fa fa-book mr-1"></i>Course:</span>
              <button
                onClick={() => setCourseFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${courseFilter === 'all' ? 'bg-purple-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
              >
                All <span className="ml-1 text-xs opacity-70">{quizzes.length}</span>
              </button>
              {courses.map(course => (
                <button
                  key={course}
                  onClick={() => setCourseFilter(course)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${courseFilter === course ? 'bg-purple-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
                >
                  {courseNames[course] || course} <span className="ml-1 text-xs opacity-70">{quizzes.filter(q => (q.course || 'default') === course).length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Search and Filter Bar */}
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
              <button onClick={() => setShowImport(true)} className="glass px-4 py-2 rounded-lg text-blue-400 hover:text-blue-300 transition-colors text-sm">
                <i className="fa fa-file-import mr-1"></i>Import
              </button>
              <button onClick={() => {setActiveQuiz({ title: 'New Quiz', questions: [], level: 1, category: 'pre' }); setView('edit');}} className="btn-gradient px-4 py-2 rounded-lg font-semibold text-sm">
                <i className="fa fa-plus mr-1"></i>Create
              </button>
            </div>
          </div>

          {/* Expand/Collapse Controls */}
          {sortedLevels.length > 0 && (
            <div className="flex items-center gap-3 mb-4">
              <span className="text-slate-500 text-sm">{sortedLevels.length} lectures</span>
              <button onClick={expandAll} className="text-xs text-slate-400 hover:text-white transition-colors">
                <i className="fa fa-expand-alt mr-1"></i>Expand All
              </button>
              <button onClick={collapseAll} className="text-xs text-slate-400 hover:text-white transition-colors">
                <i className="fa fa-compress-alt mr-1"></i>Collapse All
              </button>
            </div>
          )}

          {showImport && (
            <div className="mb-6 glass p-6 rounded-2xl animate-slide-up border border-blue-500/30">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold"><i className="fa fa-file-code mr-2 text-blue-500"></i>Import Quiz JSON</h3>
                <button onClick={() => setShowImport(false)} className="text-slate-500 hover:text-white"><i className="fa fa-times"></i></button>
              </div>
              <textarea
                className="w-full h-40 bg-slate-950/50 p-4 font-mono text-sm rounded-xl border border-slate-800 focus:border-blue-500 outline-none mb-4"
                placeholder='{"title": "L1: Topic — Pre-Quiz", "level": 1, "category": "pre", "questions": [...]}'
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => {setShowImport(false); setImportText('');}} className="px-4 py-2 text-slate-400 hover:text-white text-sm">Cancel</button>
                <button onClick={handleImport} className="btn-gradient px-5 py-2 rounded-lg font-semibold text-sm">Import</button>
              </div>
            </div>
          )}

          {quizzes.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                <i className="fa fa-folder-open text-3xl text-slate-600"></i>
              </div>
              <h3 className="text-xl font-bold mb-2">No quizzes yet</h3>
              <p className="text-slate-500 mb-4 text-sm">Create your first quiz or import one</p>
              <button onClick={() => {setActiveQuiz({ title: 'My First Quiz', questions: [], level: 1, category: 'pre' }); setView('edit');}} className="btn-gradient px-6 py-2 rounded-xl font-bold text-sm">
                <i className="fa fa-plus mr-2"></i>Create Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLevels.map(level => {
                const levelQuizzes = getFilteredQuizzes(groupedQuizzes[level] || [])
                if (levelQuizzes.length === 0) return null

                const isExpanded = expandedLevels[level]
                const firstQuiz = groupedQuizzes[level][0]
                const levelTitle = firstQuiz?.title?.match(/L\d+:\s*([^—]+)/)?.[1]?.trim() || `Lecture ${level}`

                return (
                  <div key={level} className="glass rounded-2xl overflow-hidden">
                    {/* Level Header */}
                    <button
                      onClick={() => toggleLevel(level)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-sm">
                          L{level}
                        </div>
                        <div className="text-left">
                          <span className="font-semibold block">{levelTitle}</span>
                          <span className="text-xs text-slate-500">{levelQuizzes.length} quiz{levelQuizzes.length !== 1 ? 'zes' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Category badges preview */}
                        <div className="hidden sm:flex gap-1">
                          {['pre', 'mid', 'post'].map(cat => {
                            const hasCategory = groupedQuizzes[level]?.some(q => q.category === cat)
                            if (!hasCategory) return null
                            return (
                              <span key={cat} className={`px-2 py-0.5 rounded text-xs ${categoryConfig[cat].bgClass} ${categoryConfig[cat].textClass}`}>
                                {categoryConfig[cat].label}
                              </span>
                            )
                          })}
                        </div>
                        <i className={`fa fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-500 ml-2`}></i>
                      </div>
                    </button>

                    {/* Level Quizzes */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2">
                        {levelQuizzes.map((q) => {
                          const catConf = categoryConfig[q.category] || categoryConfig.pre
                          return (
                            <div key={q.id} className={`p-4 rounded-xl border ${catConf.borderClass} bg-slate-900/50 flex justify-between items-center group hover:bg-slate-800/50 transition-colors`}>
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${catConf.bgClass} ${catConf.textClass} shrink-0`}>
                                  {catConf.label}
                                </span>
                                <div className="min-w-0">
                                  <span className="font-medium block truncate">{q.title}</span>
                                  <span className="text-xs text-slate-500">{q.questions?.length || 0} questions</span>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleLaunch(q)} className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-1.5 rounded-lg font-semibold text-sm hover:from-green-500 hover:to-emerald-500 transition-all">
                                  <i className="fa fa-play mr-1"></i>Launch
                                </button>
                                <button onClick={() => {setActiveQuiz(q); setView('edit');}} className="bg-slate-700 p-1.5 px-3 rounded-lg hover:bg-slate-600 transition-colors text-sm">
                                  <i className="fa fa-edit"></i>
                                </button>
                                <button onClick={() => handleDelete(q)} className="text-red-500 hover:text-red-400 p-1.5 px-2 transition-colors text-sm">
                                  <i className="fa fa-trash"></i>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {dashTab === 'leaderboards' && (
        <>
          <div className="flex justify-end mb-6">
            <button onClick={() => setShowLeaderboardModal(true)} className="btn-gradient px-6 py-3 rounded-xl font-bold">
              <i className="fa fa-plus mr-2"></i>New Leaderboard
            </button>
          </div>

          {leaderboards.length === 0 ? (
            <div className="glass rounded-3xl p-16 text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
                <i className="fa fa-trophy text-4xl text-slate-600"></i>
              </div>
              <h3 className="text-2xl font-bold mb-2">No leaderboards yet</h3>
              <p className="text-slate-500 mb-6">Create a leaderboard to track cumulative scores</p>
              <button onClick={() => setShowLeaderboardModal(true)} className="btn-gradient px-8 py-3 rounded-xl font-bold">
                <i className="fa fa-plus mr-2"></i>Create Leaderboard
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {leaderboards.map((lb, idx) => {
                const playerCount = Object.keys(lb.players || {}).length
                return (
                  <div key={lb.id} className="glass p-6 rounded-2xl card-hover flex justify-between items-center animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <i className="fa fa-trophy text-xl"></i>
                      </div>
                      <div>
                        <span className="text-xl font-bold block">{lb.name}</span>
                        <span className="text-sm text-slate-500"><i className="fa fa-users mr-1"></i>{playerCount} players</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setViewingLeaderboard(lb)} className="bg-slate-800 px-5 py-2 rounded-xl font-semibold hover:bg-slate-700 transition-colors">
                        <i className="fa fa-eye mr-2"></i>View Top 20
                      </button>
                      <button onClick={() => renameLeaderboard(lb)} className="bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl hover:bg-blue-600/30 transition-colors">
                        <i className="fa fa-edit"></i>
                      </button>
                      <button onClick={() => flushLeaderboard(lb)} className="bg-yellow-600/20 text-yellow-500 px-4 py-2 rounded-xl hover:bg-yellow-600/30 transition-colors">
                        <i className="fa fa-redo"></i>
                      </button>
                      <button onClick={() => deleteLeaderboard(lb)} className="text-red-500 hover:text-red-400 p-2 px-3 transition-colors">
                        <i className="fa fa-trash"></i>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showLeaderboardModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
            <h3 className="text-2xl font-bold mb-4"><i className="fa fa-trophy text-purple-500 mr-2"></i>New Leaderboard</h3>
            <input
              className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus:border-purple-500 outline-none mb-4"
              placeholder="e.g., DevOps Spring 2026"
              value={newLeaderboardName}
              onChange={e => setNewLeaderboardName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createLeaderboard()}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => {setShowLeaderboardModal(false); setNewLeaderboardName('');}} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Cancel</button>
              <button onClick={createLeaderboard} className="flex-1 bg-purple-600 py-3 rounded-xl font-semibold hover:bg-purple-500">Create</button>
            </div>
          </div>
        </div>
      )}

      {renamingLeaderboard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
            <h3 className="text-2xl font-bold mb-4"><i className="fa fa-edit text-blue-500 mr-2"></i>Rename Leaderboard</h3>
            <input
              className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-700 focus:border-blue-500 outline-none mb-4"
              placeholder="Enter new name"
              value={renameLeaderboardName}
              onChange={e => setRenameLeaderboardName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmRenameLeaderboard()}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => {setRenamingLeaderboard(null); setRenameLeaderboardName('');}} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Cancel</button>
              <button onClick={confirmRenameLeaderboard} className="flex-1 bg-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-500">Rename</button>
            </div>
          </div>
        </div>
      )}

      {viewingLeaderboard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-8 rounded-3xl max-w-2xl w-full mx-4 animate-bounce-in max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold"><i className="fa fa-trophy text-yellow-500 mr-2"></i>{viewingLeaderboard.name}</h3>
              <button onClick={() => setViewingLeaderboard(null)} className="text-slate-500 hover:text-white"><i className="fa fa-times text-xl"></i></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {getLeaderboardPlayers(viewingLeaderboard).length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <i className="fa fa-users text-4xl mb-4 block"></i>
                  <p>No players yet. Launch a quiz with this leaderboard to start tracking scores!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getLeaderboardPlayers(viewingLeaderboard).map((player, idx) => (
                    <div key={player.key} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
                      <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-slate-400 text-black' : idx === 2 ? 'bg-amber-700' : 'bg-slate-700'}`}>
                        {idx === 0 ? <i className="fa fa-crown"></i> : idx + 1}
                      </span>
                      <div className="flex-grow">
                        <span className="font-semibold block">{player.displayName}</span>
                        <span className="text-sm text-slate-500">{player.quizzesTaken} quiz{player.quizzesTaken !== 1 ? 'zes' : ''}</span>
                      </div>
                      <span className="text-xl font-bold text-blue-400">{player.totalScore} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
              <button onClick={() => flushLeaderboard(viewingLeaderboard)} className="flex-1 bg-yellow-600/20 text-yellow-500 py-3 rounded-xl font-semibold hover:bg-yellow-600/30">
                <i className="fa fa-redo mr-2"></i>Flush Scores
              </button>
              <button onClick={() => setViewingLeaderboard(null)} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {launchingQuiz && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-8 rounded-3xl max-w-md w-full mx-4 animate-bounce-in">
            <h3 className="text-2xl font-bold mb-2"><i className="fa fa-play text-green-500 mr-2"></i>Launch Quiz</h3>
            <p className="text-slate-400 mb-6">{launchingQuiz.title}</p>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">Track scores on leaderboard:</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800">
                  <input type="radio" name="leaderboard" checked={selectedLeaderboard === null} onChange={() => setSelectedLeaderboard(null)} className="w-4 h-4 accent-blue-500" />
                  <span className="text-slate-400">No leaderboard (standalone quiz)</span>
                </label>
                {leaderboards.map(lb => (
                  <label key={lb.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800">
                    <input type="radio" name="leaderboard" checked={selectedLeaderboard === lb.id} onChange={() => setSelectedLeaderboard(lb.id)} className="w-4 h-4 accent-purple-500" />
                    <i className="fa fa-trophy text-purple-500"></i>
                    <span>{lb.name}</span>
                  </label>
                ))}
              </div>
              {leaderboards.length === 0 && (
                <p className="text-sm text-slate-500 mt-3"><i className="fa fa-info-circle mr-1"></i>Create a leaderboard in the Leaderboards tab to track cumulative scores.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setLaunchingQuiz(null)} className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700">Cancel</button>
              <button onClick={confirmLaunch} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 py-3 rounded-xl font-semibold hover:from-green-500 hover:to-emerald-500">
                <i className="fa fa-play mr-2"></i>Launch
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal {...confirmModal} />
    </div>
  )
}
