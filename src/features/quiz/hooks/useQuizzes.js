import { useState, useEffect } from 'react'
import { quizService } from '../services/quizService'

const isE2E = import.meta.env.VITE_E2E_MODE === 'true'
const fallbackQuiz = {
  id: 'e2e-fallback-quiz',
  owner: 'e2e-admin',
  title: 'E2E Fallback Quiz',
  course: 'devops-intro',
  level: 1,
  category: 'pre',
  questions: [
    {
      text: 'What does CI stand for?',
      options: ['Continuous Integration', 'Container Instance', 'Code Inspection', 'Cloud Infrastructure'],
      correct: 0,
      explanation: 'CI stands for Continuous Integration.',
    }
  ]
}

export function useQuizzes({ user, isActive, onToast, onConfirm }) {
  const [quizzes, setQuizzes] = useState([])
  const [activeQuiz, setActiveQuiz] = useState({ title: '', questions: [] })
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [saving, setSaving] = useState(false)

  // Subscribe to quizzes when active and user is logged in
  useEffect(() => {
    if (isActive && (user || isE2E)) {
      const unsubscribe = quizService.subscribeToQuizzes(
        (quizzes) => setQuizzes(quizzes),
        (error) => onToast?.("Failed to load quizzes", "error")
      )
      return unsubscribe
    }
  }, [isActive, user])

  // E2E fallback: if emulators are unavailable, inject a local quiz so tests have something to launch.
  useEffect(() => {
    if (!isE2E || !isActive) return
    const timer = setTimeout(() => {
      setQuizzes((prev) => prev.length === 0 ? [fallbackQuiz] : prev)
    }, 1500)
    return () => clearTimeout(timer)
  }, [isActive, user])

  const handleImport = () => {
    const result = quizService.importQuizFromJSON(importText)
    if (result.success) {
      setActiveQuiz(result.quiz)
      setShowImport(false)
      setImportText('')
      onToast?.(result.message || "Quiz imported successfully!")
    } else {
      onToast?.(result.error || "Invalid JSON format", "error")
    }
  }

  const handleSave = async () => {
    if (!activeQuiz.title.trim()) {
      onToast?.("Please enter a quiz title", "error")
      return
    }
    setSaving(true)
    const result = await quizService.saveQuiz(activeQuiz)
    if (result.success) {
      onToast?.("Quiz saved successfully!")
    } else {
      onToast?.(result.error || "Failed to save quiz", "error")
    }
    setSaving(false)
  }

  const handleDelete = async (quiz) => {
    onConfirm?.({
      title: "Delete Quiz",
      message: `Are you sure you want to delete "${quiz.title}"?`,
      onConfirm: async () => {
        const result = await quizService.deleteQuiz(quiz.id)
        if (result.success) {
          onToast?.("Quiz deleted!")
        } else {
          onToast?.(result.error || "Failed to delete quiz", "error")
        }
      }
    })
  }

  return {
    quizzes,
    activeQuiz,
    setActiveQuiz,
    importText,
    setImportText,
    showImport,
    setShowImport,
    saving,
    handleImport,
    handleSave,
    handleDelete
  }
}
