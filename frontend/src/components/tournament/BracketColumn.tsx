import type { Match } from '../../types.js'
import MatchRow from './MatchRow.js'

interface Props {
  title: string
  subtitle: string
  rounds: { roundLabel: string; matches: Match[] }[]
  isCurrent?: boolean
}

export default function BracketColumn({ title, subtitle, rounds, isCurrent = false }: Props) {
  const totalMatches = rounds.reduce((n, r) => n + r.matches.length, 0)

  return (
    <div className="rounded-md border p-4"
         style={{
           background: 'var(--color-data-surface)',
           borderColor: isCurrent ? 'var(--color-primary)' : 'var(--color-data-divider)',
           boxShadow: isCurrent ? '0 0 20px rgba(255,138,0,0.15)' : undefined,
         }}>
      <div className="mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-white/90">{title}</h3>
        <p className="text-[10px] text-white/40">{subtitle}</p>
      </div>
      {totalMatches === 0
        ? <p className="text-xs text-white/40 py-6 text-center">未开赛</p>
        : (
          <div className="space-y-4">
            {rounds.map(r => (
              <div key={r.roundLabel}>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-2">
                  {r.roundLabel}
                </div>
                <div className="space-y-1.5">
                  {r.matches.map(m => <MatchRow key={m.id} match={m} variant="bracket-card" />)}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
