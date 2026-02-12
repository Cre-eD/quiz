import { useState, useEffect } from 'react'
import { leaderboardService } from '../services/leaderboardService'

export function useLeaderboards({ user, isAdmin, isActive, onToast, onConfirm }) {
  const [leaderboards, setLeaderboards] = useState([])
  const [selectedLeaderboard, setSelectedLeaderboard] = useState(null)
  const [dashTab, setDashTab] = useState('quizzes')
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [newLeaderboardName, setNewLeaderboardName] = useState('')
  const [renamingLeaderboard, setRenamingLeaderboard] = useState(null)
  const [renameLeaderboardName, setRenameLeaderboardName] = useState('')
  const [viewingLeaderboard, setViewingLeaderboard] = useState(null)

  // Subscribe to leaderboards
  useEffect(() => {
    if (isActive && user && isAdmin) {
      return leaderboardService.subscribeToLeaderboards(
        (leaderboards) => setLeaderboards(leaderboards),
        (error) => onToast?.("Failed to load leaderboards", "error")
      )
    }
  }, [isActive, user, isAdmin])

  const createLeaderboard = async () => {
    if (!newLeaderboardName.trim()) {
      onToast?.("Please enter a leaderboard name", "error")
      return
    }
    const result = await leaderboardService.createLeaderboard(newLeaderboardName)
    if (result.success) {
      setNewLeaderboardName('')
      setShowLeaderboardModal(false)
      onToast?.("Leaderboard created!")
    } else {
      onToast?.(result.error || "Failed to create leaderboard", "error")
    }
  }

  const flushLeaderboard = async (lb) => {
    onConfirm?.({
      title: "Flush Leaderboard",
      message: `Are you sure you want to reset "${lb.name}"? All scores will be deleted.`,
      onConfirm: async () => {
        const result = await leaderboardService.flushLeaderboard(lb.id)
        if (result.success) {
          onToast?.("Leaderboard reset!")
          setViewingLeaderboard(null)
        } else {
          onToast?.(result.error || "Failed to reset leaderboard", "error")
        }
      }
    })
  }

  const deleteLeaderboard = async (lb) => {
    onConfirm?.({
      title: "Delete Leaderboard",
      message: `Are you sure you want to delete "${lb.name}"? This cannot be undone.`,
      onConfirm: async () => {
        const result = await leaderboardService.deleteLeaderboard(lb.id)
        if (result.success) {
          onToast?.("Leaderboard deleted!")
          setViewingLeaderboard(null)
        } else {
          onToast?.(result.error || "Failed to delete leaderboard", "error")
        }
      }
    })
  }

  const renameLeaderboard = async (lb) => {
    setRenamingLeaderboard(lb)
    setRenameLeaderboardName(lb.name)
  }

  const confirmRenameLeaderboard = async () => {
    if (!renameLeaderboardName.trim()) {
      onToast?.("Please enter a leaderboard name", "error")
      return
    }
    const result = await leaderboardService.renameLeaderboard({
      leaderboardId: renamingLeaderboard.id,
      newName: renameLeaderboardName
    })
    if (result.success) {
      onToast?.("Leaderboard renamed!")
      setRenamingLeaderboard(null)
      setRenameLeaderboardName('')
    } else {
      onToast?.(result.error || "Failed to rename leaderboard", "error")
    }
  }

  const saveToLeaderboard = async (leaderboardId, sessionPlayers, sessionScores) => {
    if (!leaderboardId) return
    const result = await leaderboardService.saveScoresToLeaderboard({
      leaderboardId,
      sessionPlayers,
      sessionScores
    })
    if (!result.success) {
      console.error('Failed to save to leaderboard:', result.error)
    }
  }

  const getLeaderboardPlayers = (lb) => {
    if (!lb?.players) return []
    return Object.entries(lb.players)
      .map(([key, data]) => ({ key, ...data }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 20)
  }

  return {
    leaderboards,
    selectedLeaderboard,
    setSelectedLeaderboard,
    dashTab,
    setDashTab,
    showLeaderboardModal,
    setShowLeaderboardModal,
    newLeaderboardName,
    setNewLeaderboardName,
    renamingLeaderboard,
    setRenamingLeaderboard,
    renameLeaderboardName,
    setRenameLeaderboardName,
    viewingLeaderboard,
    setViewingLeaderboard,
    createLeaderboard,
    flushLeaderboard,
    deleteLeaderboard,
    renameLeaderboard,
    confirmRenameLeaderboard,
    saveToLeaderboard,
    getLeaderboardPlayers
  }
}
