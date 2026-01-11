export default function Confetti({ show }) {
  if (!show) return null
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b']
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-40">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
            animationDelay: `${Math.random() * 0.5}s`
          }}
        />
      ))}
    </div>
  )
}
