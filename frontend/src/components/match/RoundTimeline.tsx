import { useState } from 'react'
import type { MatchRound } from '../../types'

const END_REASON_EMOJI: Record<number, string> = {
  1: '💣',   // TargetBombed (bomb exploded)
  7: '💀',   // TerroristWin (last kill)
  8: '💀',   // CTWin (last kill)
  9: '✂️',   // BombDefused
  12: '⏱',  // TargetSaved (time ran out)
}

interface Props {
  rounds: MatchRound[]
  teamAName: string
  teamBName: string
}

export default function RoundTimeline({ rounds, teamAName, teamBName }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (rounds.length === 0) {
    return (
      <div className="rounded-md border py-6 text-center text-xs text-white/30"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        回合数据待导入
      </div>
    )
  }

  return (
    <div className="rounded-md border p-4 overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Round Timeline</p>
      <div className="relative flex gap-0.5 flex-wrap">
        {rounds.map((r, idx) => {
          const isHalf = idx === 11
          const ctWon = r.winner_side === 3
          const tWon = r.winner_side === 2
          const bgColor = ctWon
            ? 'var(--color-accent)'
            : tWon
              ? '#FFD700'
              : 'rgba(255,255,255,0.1)'
          const emoji = r.end_reason != null ? (END_REASON_EMOJI[r.end_reason] ?? '•') : '•'

          return (
            <div key={r.id} className="relative">
              {isHalf && <div className="inline-block w-3" />}
              <div
                className="relative w-7 h-9 flex flex-col items-center justify-center rounded-sm cursor-default select-none transition-transform hover:scale-110"
                style={{ background: bgColor + (hoveredIdx === idx ? 'ff' : '99') }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <span className="text-[8px] font-black tabular-nums text-white/80">{r.round_number}</span>
                <span className="text-[10px] leading-none">{emoji}</span>

                {hoveredIdx === idx && (
                  <div
                    className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 rounded-md border p-3 shadow-xl pointer-events-none"
                    style={{ background: '#0A0F2D', borderColor: 'var(--color-data-divider)' }}
                  >
                    <div className="text-[10px] font-black text-white/50 mb-2 uppercase tracking-widest">
                      Round {r.round_number}
                    </div>
                    <div className="text-xs font-bold tabular-nums text-white/90 mb-1">
                      {r.team_a_score ?? 0} – {r.team_b_score ?? 0}
                    </div>
                    {(r.team_a_economy_type || r.team_b_economy_type) && (
                      <div className="text-[10px] text-white/40 mb-2">
                        {teamAName}: {r.team_a_economy_type ?? '—'} · {teamBName}: {r.team_b_economy_type ?? '—'}
                      </div>
                    )}
                    {r.duration_ms != null && (
                      <div className="text-[10px] text-white/35 mb-2">
                        {(r.duration_ms / 1000).toFixed(1)}s
                      </div>
                    )}
                    {r.kills && r.kills.length > 0 && (
                      <div className="space-y-0.5">
                        {r.kills.slice(0, 5).map((k, ki) => (
                          <div key={ki} className="text-[10px] text-white/55 truncate">
                            {k.weapon_name ?? '?'}{k.is_headshot ? ' HS' : ''}
                          </div>
                        ))}
                        {r.kills.length > 5 && (
                          <div className="text-[10px] text-white/30">+{r.kills.length - 5} more</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--color-accent)' }} />
          CT Win
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#FFD700' }} />
          T Win
        </span>
        <span className="ml-auto">💣=Bomb &nbsp; ✂️=Defuse &nbsp; 💀=Frag &nbsp; ⏱=Time</span>
      </div>
    </div>
  )
}
