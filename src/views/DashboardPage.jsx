import { useState } from 'react'
import { categoryConfig } from '@/constants'
import ConfirmModal from '@/components/ConfirmModal'
import QuizLevelGroup from '@/features/quiz/components/QuizLevelGroup'
import CourseFilter from '@/features/quiz/components/CourseFilter'
import QuizFilters from '@/features/quiz/components/QuizFilters'
import LevelControls from '@/features/quiz/components/LevelControls'
import ImportQuizPanel from '@/features/quiz/components/ImportQuizPanel'
import LaunchQuizModal from '@/features/quiz/components/LaunchQuizModal'
import LeaderboardCard from '@/features/leaderboard/components/LeaderboardCard'
import CreateLeaderboardModal from '@/features/leaderboard/components/CreateLeaderboardModal'
import RenameLeaderboardModal from '@/features/leaderboard/components/RenameLeaderboardModal'
import ViewLeaderboardModal from '@/features/leaderboard/components/ViewLeaderboardModal'

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
          <CourseFilter
            courses={courses}
            courseFilter={courseFilter}
            setCourseFilter={setCourseFilter}
            courseNames={courseNames}
            quizzes={quizzes}
          />

          <QuizFilters
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            categoryConfig={categoryConfig}
            courseFilteredQuizzes={courseFilteredQuizzes}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onImport={() => setShowImport(true)}
            onCreate={() => {setActiveQuiz({ title: 'New Quiz', questions: [], level: 1, category: 'pre' }); setView('edit');}}
          />

          <LevelControls
            levelCount={sortedLevels.length}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
          />

          <ImportQuizPanel
            isOpen={showImport}
            importText={importText}
            setImportText={setImportText}
            onImport={handleImport}
            onClose={() => {setShowImport(false); setImportText('');}}
          />

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

                return (
                  <QuizLevelGroup
                    key={level}
                    level={level}
                    quizzes={levelQuizzes}
                    isExpanded={expandedLevels[level]}
                    onToggle={() => toggleLevel(level)}
                    categoryConfig={categoryConfig}
                    onLaunch={handleLaunch}
                    onEdit={(q) => {setActiveQuiz(q); setView('edit');}}
                    onDelete={handleDelete}
                  />
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
              {leaderboards.map((lb, idx) => (
                <LeaderboardCard
                  key={lb.id}
                  leaderboard={lb}
                  index={idx}
                  playerCount={Object.keys(lb.players || {}).length}
                  onView={setViewingLeaderboard}
                  onRename={renameLeaderboard}
                  onFlush={flushLeaderboard}
                  onDelete={deleteLeaderboard}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CreateLeaderboardModal
        isOpen={showLeaderboardModal}
        name={newLeaderboardName}
        setName={setNewLeaderboardName}
        onCreate={createLeaderboard}
        onClose={() => {setShowLeaderboardModal(false); setNewLeaderboardName('');}}
      />

      <RenameLeaderboardModal
        leaderboard={renamingLeaderboard}
        name={renameLeaderboardName}
        setName={setRenameLeaderboardName}
        onRename={confirmRenameLeaderboard}
        onClose={() => {setRenamingLeaderboard(null); setRenameLeaderboardName('');}}
      />

      <ViewLeaderboardModal
        leaderboard={viewingLeaderboard}
        players={viewingLeaderboard ? getLeaderboardPlayers(viewingLeaderboard) : []}
        onFlush={flushLeaderboard}
        onClose={() => setViewingLeaderboard(null)}
      />

      <LaunchQuizModal
        quiz={launchingQuiz}
        leaderboards={leaderboards}
        selectedLeaderboard={selectedLeaderboard}
        setSelectedLeaderboard={setSelectedLeaderboard}
        onLaunch={confirmLaunch}
        onCancel={() => setLaunchingQuiz(null)}
      />

      <ConfirmModal {...confirmModal} />
    </div>
  )
}
