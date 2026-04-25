import { useMemo } from 'react'
import { useMatches } from '../../../api/matches.js'
import { useCurrentTournament } from '../../../api/currentTournament.js'
import { groupByRound } from '../lib/groupByRound.js'
import MatchRow from '../MatchRow.js'
import Spinner from '../../Spinner.js'

export default function OverviewTab() {
  const { data: tournament } = useCurrentTournament()
  const { data: matches, isLoading } = useMatches({
    tournament_id: tournament?.id,
  })

  const groups = useMemo(() => groupByRound(matches ?? []), [matches])

  if (isLoading) return <div className="py-12"><Spinner /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Center column — match flow */}
      <div className="space-y-8 min-w-0">
        {groups.length === 0 && (
          <div className="text-sm text-white/40 py-12 text-center">
            暂无比赛数据
          </div>
        )}
        {groups.map(g => (
          <section key={g.stage}>
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary">
                {g.stage}
              </h2>
              {g.dateRange && (
                <span className="text-[10px] font-mono text-white/35">{g.dateRange}</span>
              )}
            </div>
            <div className="space-y-2">
              {g.matches.map(m => (
                <MatchRow key={m.id} match={m} variant="overview" />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Right rail placeholder — filled in Task 13 */}
      <div className="hidden lg:block">
        <div className="text-xs text-white/30">Right rail — Task 13</div>
      </div>
    </div>
  )
}
