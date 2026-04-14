const config = {
  upcoming: { label: '即将开始', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  live:     { label: '进行中',   color: '#00D1FF', bg: 'rgba(0,209,255,0.15)' },
  finished: { label: '已结束',   color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' },
}

export default function StatusBadge({ status }: { status: 'upcoming' | 'live' | 'finished' }) {
  const c = config[status] ?? config.upcoming
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ color: c.color, background: c.bg }}>
      {status === 'live' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />}
      {c.label}
    </span>
  )
}
