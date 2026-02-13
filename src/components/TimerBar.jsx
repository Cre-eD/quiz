import { useState, useEffect, useRef } from 'react'
import { getElapsedSeconds, convertServerTime, syncClockOffset } from '@/shared/utils/timeSync'

export default function TimerBar({ duration, onComplete, isRunning, startTime }) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const completedRef = useRef(false)

  useEffect(() => {
    completedRef.current = false
    setTimeLeft(duration)
  }, [duration, startTime])

  // Sync clock offset when we receive a server timestamp
  useEffect(() => {
    if (startTime) {
      syncClockOffset(startTime)
    }
  }, [startTime])

  useEffect(() => {
    if (!isRunning || !startTime) return

    const updateTimer = () => {
      const elapsed = getElapsedSeconds(startTime)
      const remaining = Math.max(0, duration - elapsed)
      setTimeLeft(remaining)

      if (remaining <= 0 && !completedRef.current) {
        completedRef.current = true
        onComplete?.()
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
