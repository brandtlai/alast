import { useState, useMemo } from 'react'
import { useMatches } from '../../../api/matches.js'
import { useCurrentTournament } from '../../../api/currentTournament.js'
import MatchRow from '../MatchRow.js'

const FILTERS: readonly { key: string; label: string; test: (s: string | null) => boolean }[] = [
  { key: 'all',     label: '全部',    test: (_s) => true },
  { key: 'swiss',   label: '小组赛',  test: (s) => !!s && /^小组赛/.test(s) },
  { key: 'ub',      label: '胜者组',  test: (s) => !!s && /^胜者组/.test(s) },
  { key: 'lb',      label: '败者组',  test: (s) => !!s && /^败者组/.test(s) },
  { key: 'gf',      label: '决赛',    test: (s) => !!s && /^(GF|总决赛|Grand Final)$/.test(s) },
]

type FilterKey = string

export default function ResultsTab() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const { data: tournament } = useCurrentTournament()
  const { data: matches = [] } = useMatches({
    tournament_id: tournament?.id,
    status: 'finished',
  })

  const filtered = useMemo(() => {
    const f = FILTERS.find(f => f.key === filter)!
    return matches
      .filter(m => f.test(m.stage))
      .sort((a, b) => {
        const ta = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0
        const tb = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0
        return tb - ta
      })
  }, [matches, filter])

  return (
    <div className="space-y-4">
      {/* Chip filter row */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                'px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors',
                active ? 'bg-primary text-black' : 'text-white/60 hover:text-white',
              ].join(' ')}
              style={!active ? { background: 'var(--color-data-chip)' } : undefined}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {filtered.length === 0
        ? <div className="text-sm text-white/40 py-12 text-center">暂无已结束比赛</div>
        : (
          <div className="space-y-2">
            {filtered.map(m => <MatchRow key={m.id} match={m} variant="results" />)}
          </div>
        )}
    </div>
  )
}
