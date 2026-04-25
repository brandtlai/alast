import type { MatchHighlights } from '../../types'

interface Props {
  highlights: MatchHighlights
}

const OPPONENT_LABEL: Record<number, string> = {
  1: '1v1', 2: '1v2', 3: '1v3', 4: '1v4', 5: '1v5',
}

export default function HighlightCards({ highlights }: Props) {
  const { clutches, top_players } = highlights
  const hasClutches = clutches.length > 0
  const hasTopPlayers = top_players.length > 0

  if (!hasClutches && !hasTopPlayers) {
    return (
      <div className="rounded-md border py-6 text-center text-xs text-white/30"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        精彩数据待导入
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Clutches */}
      <div className="rounded-md border p-4"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Clutches</p>
        {hasClutches ? (
          <div className="space-y-2">
            {clutches.map((cl, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0"
                   style={{ borderColor: 'var(--color-data-divider)' }}>
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                  {cl.avatar_url
                    ? <img src={cl.avatar_url} alt={cl.nickname ?? ''} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">
                        {cl.nickname?.[0] ?? '?'}
                      </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white/90 truncate">{cl.nickname ?? 'Unknown'}</div>
                  <div className="text-[10px] text-white/40">
                    {OPPONENT_LABEL[cl.opponent_count] ?? `1v${cl.opponent_count}`}
                    {' · R'}{cl.round_number}
                    {' · '}{cl.kill_count}K
                  </div>
                </div>
                <div className="flex-shrink-0 text-sm font-black"
                     style={{ color: cl.won ? 'var(--color-primary)' : 'rgba(255,255,255,0.3)' }}>
                  {cl.won ? 'WIN' : 'LOSE'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30 py-2">无残局数据</p>
        )}
      </div>

      {/* Top Frags */}
      <div className="rounded-md border p-4"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Top Frags</p>
        {hasTopPlayers ? (
          <div className="space-y-2">
            {top_players.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0"
                   style={{ borderColor: 'var(--color-data-divider)' }}>
                <div className="text-2xl font-black tabular-nums w-7 flex-shrink-0"
                     style={{ color: i === 0 ? 'var(--color-gold)' : 'rgba(255,255,255,0.25)' }}>
                  {i + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">
                        {p.nickname[0]}
                      </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white/90 truncate">{p.nickname}</div>
                  <div className="text-[10px] text-white/40">
                    {p.kills ?? '—'}K / {p.deaths ?? '—'}D · ADR {p.adr != null ? p.adr.toFixed(1) : '—'}
                  </div>
                </div>
                <div className="text-sm font-black tabular-nums flex-shrink-0"
                     style={{ color: (p.rating ?? 0) >= 1.0 ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)' }}>
                  {p.rating != null ? p.rating.toFixed(2) : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30 py-2">无数据</p>
        )}
      </div>
    </div>
  )
}
