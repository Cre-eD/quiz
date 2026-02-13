import { useState, useEffect, useRef } from 'react'

export default function TimerBar({ duration, onComplete, isRunning, startTime }) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const completedRef = useRef(false)

  useEffect(() => {
    completedRef.current = false
    setTimeLeft(duration)
  }, [duration, startTime])

  useEffect(() => {
    if (!isRunning || !startTime) return

    const updateTimer = () => {
      // Handle both Firestore Timestamp objects and regular numbers
      const startTimeMs = startTime?.toMillis ? startTime.toMillis() : startTime
      const elapsed = (Date.now() - startTimeMs) / 1000
      const remaining = Math.max(0, duration - elapsed)
      setTimeLeft(remaining)

      // Timer expired - call completion callback
      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true
        if (onComplete) onComplete()
      }
    }

    // Update immediately
    updateTimer()

    const timer = setInterval(updateTimer, 100)
    return () => clearInterval(timer)
  }, [isRunning, startTime, duration, onComplete])

  const percentage = (timeLeft / duration) * 100
  const color = percentage > 50 ? 'bg-green-500' : percentage > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} progress-bar rounded-full`} style={{ width: `${percentage}%` }}></div>
    </div>
  )
}
