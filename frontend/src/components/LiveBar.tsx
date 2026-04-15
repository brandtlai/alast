// src/components/LiveBar.tsx
import { Link } from 'react-router-dom'

const PLACEHOLDER = [
  { id: 'live-1', teamA: 'TEAM A', teamB: 'TEAM B', scoreA: 1, scoreB: 0, status: 'live' as const },
  { id: 'live-2', teamA: 'TEAM C', teamB: 'TEAM D', scoreA: 0, scoreB: 0, status: 'upcoming' as const },
  { id: 'live-3', teamA: 'TEAM E', teamB: 'TEAM F', scoreA: 2, scoreB: 1, status: 'live' as const },
  { id: 'live-4', teamA: 'TEAM G', teamB: 'TEAM H', scoreA: 0, scoreB: 0, status: 'upcoming' as const },
]

export default function LiveBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] h-16 bg-[#050714]/95 backdrop-blur-xl border-t border-white/5">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="h-full flex items-center px-4 gap-2 overflow-x-auto custom-scrollbar">
        {/* "LIVE" label */}
        <div className="flex-shrink-0 flex items-center gap-2 pr-4 border-r border-white/10 mr-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Live</span>
        </div>

        {/* Match pills */}
        {PLACEHOLDER.map(m => (
          <Link
            key={m.id}
            to="/matches"
            className={[
              'group flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
              m.status === 'live'
                ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                : 'bg-white/5 border-white/10 hover:bg-white/10',
            ].join(' ')}
            style={{ minWidth: '156px' }}
          >
            <span className="text-[11px] font-black text-white/80 truncate flex-1 text-right">{m.teamA}</span>
            <span className="text-[10px] font-black italic tabular-nums flex-shrink-0"
              style={{ color: m.status === 'live' ? 'var(--color-primary)' : 'rgba(248,250,252,0.4)' }}>
              {m.status === 'live' ? `${m.scoreA}–${m.scoreB}` : 'VS'}
            </span>
            <span className="text-[11px] font-black text-white/80 truncate flex-1">{m.teamB}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
