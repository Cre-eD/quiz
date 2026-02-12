export default function MyBadges({ badges, badgeTypes }) {
  const earnedBadges = Object.keys(badges).filter(k => badges[k])
  if (earnedBadges.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-2 mb-4">
      {earnedBadges.map(badge => (
        <span key={badge} className="bg-slate-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
          <span>{badgeTypes[badge]?.icon}</span>
          <span>{badgeTypes[badge]?.name}</span>
        </span>
      ))}
    </div>
  )
}
