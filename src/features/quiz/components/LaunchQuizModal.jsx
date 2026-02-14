import { useState, useMemo } from 'react'
import CreateLeaderboardModal from '@/features/leaderboard/components/CreateLeaderboardModal'

export default function LaunchQuizModal({
  quiz,
  leaderboards,
  selectedLeaderboard,
  setSelectedLeaderboard,
  onLaunch,
  onCancel,
  // Props for inline leaderboard creation
  newLeaderboardName,
  setNewLeaderboardName,
  newLeaderboardCourse,
  setNewLeaderboardCourse,
  newLeaderboardYear,
  setNewLeaderboardYear,
  createLeaderboard
}) {
  // ALL hooks must be called before any early returns - Rules of Hooks
  const [courseFilter, setCourseFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Course display names
  const courseNames = {
    'devops': 'DevOps',
    'devops-intro': 'DevOps Intro',
    'devops-intro-rus': 'DevOps Intro (RU)',
    'devsecops-intro': 'DevSecOps Intro',
    'devsecops-intro-rus': 'DevSecOps Intro (RU)'
  }

  // Extract unique courses and years from leaderboards
  const courses = useMemo(() =>
    [...new Set(leaderboards.map(lb => lb.course).filter(Boolean))].sort(),
    [leaderboards]
  )

  const years = useMemo(() =>
    [...new Set(leaderboards.map(lb => lb.year).filter(Boolean))].sort((a, b) => b - a),
    [leaderboards]
  )

  // Filter leaderboards based on selected filters
  const filteredLeaderboards = useMemo(() => {
    return leaderboards.filter(lb => {
      if (courseFilter !== 'all' && lb.course !== courseFilter) return false
      if (yearFilter !== 'all' && lb.year !== parseInt(yearFilter)) return false
      return true
    })
  }, [leaderboards, courseFilter, yearFilter])

  // Early return AFTER all hooks to comply with Rules of Hooks
  if (!quiz) return null

  // Handle inline leaderboard creation
  const handleCreateLeaderboard = async () => {
    // Call the createLeaderboard function from useLeaderboards hook
    const result = await createLeaderboard()

    // Close the create modal
    setShowCreateModal(false)

    // Auto-select the newly created leaderboard
    if (result?.success && result.leaderboardId) {
      setSelectedLeaderboard(result.leaderboardId)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass p-8 rounded-3xl max-w-2xl w-full mx-4 animate-bounce-in max-h-[90vh] overflow-y-auto">
          <h3 className="text-2xl font-bold mb-2"><i className="fa fa-play text-green-500 mr-2"></i>Launch Quiz</h3>
          <p className="text-slate-400 mb-6">{quiz.title}</p>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-semibold">Track scores on leaderboard:</label>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-sm bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 px-3 py-1.5 rounded-lg font-medium transition-all"
              >
                <i className="fa fa-plus mr-1.5"></i>New Leaderboard
              </button>
            </div>

            {/* Filters - only show if there are multiple courses or years */}
            {(courses.length > 1 || years.length > 1) && (
              <div className="mb-4 flex flex-wrap gap-3 p-3 bg-slate-800/30 rounded-xl">
                {courses.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs"><i className="fa fa-book mr-1"></i>Course:</span>
                    <button
                      onClick={() => setCourseFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        courseFilter === 'all'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      All
                    </button>
                    {courses.map(course => (
                      <button
                        key={course}
                        onClick={() => setCourseFilter(course)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          courseFilter === course
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {courseNames[course] || course}
                      </button>
                    ))}
                  </div>
                )}

                {years.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs"><i className="fa fa-calendar mr-1"></i>Year:</span>
                    <button
                      onClick={() => setYearFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        yearFilter === 'all'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      All
                    </button>
                    {years.map(year => (
                      <button
                        key={year}
                        onClick={() => setYearFilter(year.toString())}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          yearFilter === year.toString()
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Leaderboard selection */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800">
                <input
                  type="radio"
                  name="leaderboard"
                  checked={selectedLeaderboard === null}
                  onChange={() => setSelectedLeaderboard(null)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-slate-400">No leaderboard (standalone quiz)</span>
              </label>

              {filteredLeaderboards.map(lb => (
                <label key={lb.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800">
                  <input
                    type="radio"
                    name="leaderboard"
                    checked={selectedLeaderboard === lb.id}
                    onChange={() => setSelectedLeaderboard(lb.id)}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <i className="fa fa-trophy text-purple-500"></i>
                  <div className="flex-1">
                    <div className="font-medium">{lb.name}</div>
                    <div className="text-xs text-slate-500">
                      {courseNames[lb.course] || lb.course} · {lb.year}
                    </div>
                  </div>
                </label>
              ))}

              {filteredLeaderboards.length === 0 && leaderboards.length > 0 && (
                <p className="text-sm text-slate-500 mt-3 text-center p-4">
                  <i className="fa fa-filter mr-1"></i>No leaderboards match the selected filters
                </p>
              )}

              {leaderboards.length === 0 && (
                <p className="text-sm text-slate-500 mt-3 text-center p-4">
                  <i className="fa fa-info-circle mr-1"></i>No leaderboards yet. Create one to track cumulative scores.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 bg-slate-800 py-3 rounded-xl font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={onLaunch}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 py-3 rounded-xl font-semibold hover:from-green-500 hover:to-emerald-500"
            >
              <i className="fa fa-play mr-2"></i>Launch
            </button>
          </div>
        </div>
      </div>

      {/* Inline leaderboard creation modal */}
      <CreateLeaderboardModal
        isOpen={showCreateModal}
        name={newLeaderboardName}
        setName={setNewLeaderboardName}
        course={newLeaderboardCourse}
        setCourse={setNewLeaderboardCourse}
        year={newLeaderboardYear}
        setYear={setNewLeaderboardYear}
        onCreate={handleCreateLeaderboard}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  )
}
