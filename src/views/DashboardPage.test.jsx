import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DashboardPage from './DashboardPage'

// Regression coverage for the "Collapse All" button. A render-time auto-expand
// effect used to re-expand every level the instant the user collapsed them
// (it depended on `sortedLevels`, a fresh array each render), so Collapse All
// never stuck. Quiz titles render only inside an expanded level, so their
// presence/absence is a direct probe of expand state.
function makeProps(overrides = {}) {
  const noop = vi.fn()
  const quizzes = [
    { id: 'devops-lec1-post', title: 'Quiz-Alpha', level: 1, category: 'post', questions: [{}] },
    { id: 'devops-lec2-post', title: 'Quiz-Beta', level: 2, category: 'post', questions: [{}] },
  ]
  return {
    user: { email: 'admin@test.com' },
    isAdmin: true,
    handleSignInWithGoogle: noop,
    signOutAdmin: noop,
    dashTab: 'quizzes',
    setDashTab: noop,
    showImport: false,
    setShowImport: noop,
    importText: '',
    setImportText: noop,
    handleImport: noop,
    quizzes,
    setActiveQuiz: noop,
    setView: noop,
    handleLaunch: noop,
    handleDelete: noop,
    leaderboards: [],
    setShowLeaderboardModal: noop,
    showLeaderboardModal: false,
    newLeaderboardName: '',
    setNewLeaderboardName: noop,
    newLeaderboardCourse: 'devops',
    setNewLeaderboardCourse: noop,
    newLeaderboardYear: 2026,
    setNewLeaderboardYear: noop,
    createLeaderboard: noop,
    setViewingLeaderboard: noop,
    viewingLeaderboard: null,
    getLeaderboardPlayers: () => [],
    flushLeaderboard: noop,
    deleteLeaderboard: noop,
    renameLeaderboard: noop,
    renamingLeaderboard: null,
    setRenamingLeaderboard: noop,
    renameLeaderboardName: '',
    setRenameLeaderboardName: noop,
    confirmRenameLeaderboard: noop,
    launchingQuiz: null,
    setLaunchingQuiz: noop,
    selectedLeaderboard: null,
    setSelectedLeaderboard: noop,
    confirmLaunch: noop,
    confirmModal: { isOpen: false },
    showToast: noop,
    ...overrides,
  }
}

describe('DashboardPage — Collapse All', () => {
  it('auto-expands on load, then Collapse All collapses and stays collapsed', () => {
    render(<DashboardPage {...makeProps()} />)

    // One-time auto-expand ran on mount → both levels' quizzes visible.
    expect(screen.getByText('Quiz-Alpha')).toBeInTheDocument()
    expect(screen.getByText('Quiz-Beta')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }))

    // The bug: the auto-expand effect re-fired and re-expanded. It must not.
    expect(screen.queryByText('Quiz-Alpha')).not.toBeInTheDocument()
    expect(screen.queryByText('Quiz-Beta')).not.toBeInTheDocument()
  })

  it('Expand All re-expands after a collapse', () => {
    render(<DashboardPage {...makeProps()} />)

    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }))
    expect(screen.queryByText('Quiz-Alpha')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /expand all/i }))
    expect(screen.getByText('Quiz-Alpha')).toBeInTheDocument()
    expect(screen.getByText('Quiz-Beta')).toBeInTheDocument()
  })

  it('toggling a single level off does not auto-expand it back', () => {
    render(<DashboardPage {...makeProps()} />)

    // Collapse only the first level via its header button.
    fireEvent.click(screen.getByRole('button', { name: /Lecture 1/i }))
    expect(screen.queryByText('Quiz-Alpha')).not.toBeInTheDocument()
    // The other level is untouched.
    expect(screen.getByText('Quiz-Beta')).toBeInTheDocument()
  })
})
