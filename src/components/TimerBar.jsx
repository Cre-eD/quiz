import { useState, useEffect, useRef } from 'react'

export default function TimerBar({ duration, onComplete, isRunning, startTime }) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const completedRef = useRef(false)

  useEffect(() => {
    completedRef.current = false
    setTimeLeft(duration)
  }, [duration, startTime])

  useEffect(() => {
    if (!isRunning) return

    const updateTimer = () => {
      if (startTime) {
        const elapsed = (Date.now() - startTime) / 1000
        const remaining = Math.max(0, duration - elapsed)
        setTimeLeft(remaining)

        if (remaining <= 0 && !completedRef.current) {
          completedRef.current = true
          onComplete?.()
        }
      } else {
        setTimeLeft(t => {
          const newTime = t - 0.1
          if (newTime <= 0 && !completedRef.current) {
            completedRef.current = true
            onComplete?.()
          }
          return Math.max(0, newTime)
        })
      }
    }

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
