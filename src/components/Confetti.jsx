import { useMemo } from 'react'

export default function Confetti({ show }) {
  // Regenerate particles each time show becomes true
  const particles = useMemo(() => {
    if (!show) return []
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
    return [...Array(40)].map((_, i) => ({
      id: `${Date.now()}-${i}`,
      left: `${Math.random() * 100}%`,
      top: `${-10 - Math.random() * 20}%`,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: `${Math.random() * 0.5}s`,
      size: 8 + Math.random() * 8
    }))
  }, [show])

  if (!show) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            top: p.top,
            backgroundColor: p.color,
            animationDelay: p.delay,
            width: p.size,
            height: p.size
          }}
        />
      ))}
    </div>
  )
}
