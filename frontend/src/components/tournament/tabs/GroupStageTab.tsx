import { useMemo } from 'react'
import { useMatches } from '../../../api/matches'
import { useCurrentTournament } from '../../../api/currentTournament'
import { useStandings } from '../../../api/tournaments'
import StandingsTable from '../StandingsTable'
import RoundPanel from '../RoundPanel'
import MatchRow from '../MatchRow'
import type { StandingRow as ApiStandingRow } from '../../../types'

const SWISS_ROUNDS = ['小组赛 R1', '小组赛 R2', '小组赛 R3'] as const

function computeStatus(wins: number, losses: number): '晋级胜者组' | '进入败者组' | '待赛' {
  if (wins >= 3) return '晋级胜者组'
  if (losses >= 3) return '进入败者组'
  return '待赛'
}

export default function GroupStageTab() {
  const { data: tournament } = useCurrentTournament()
  const { data: matches } = useMatches({ tournament_id: tournament?.id })
  const { data: standingsRaw } = useStandings(tournament?.id)

  const standings = useMemo(() => {
    if (!standingsRaw || standingsRaw.length === 0) return null
    return standingsRaw.map((s: ApiStandingRow) => ({
      team: { id: s.team_id, name: s.team_name, short_name: s.team_short_name, logo_url: s.team_logo_url },
      wins: s.wins,
      losses: s.losses,
      buchholz: s.buchholz,
      roundDiff: s.round_diff,
      status: computeStatus(s.wins, s.losses),
    }))
  }, [standingsRaw])

  const matchesByRound = useMemo(() => {
    const byRound = new Map<string, NonNullable<typeof matches>>()
    for (const r of SWISS_ROUNDS) byRound.set(r, [])
    for (const m of matches ?? []) {
      if ((SWISS_ROUNDS as readonly string[]).includes(m.stage ?? '')) {
        byRound.get(m.stage!)!.push(m)
      }
    }
    return byRound
  }, [matches])

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-3">Standings</h2>
        <StandingsTable rows={standings} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary">Rounds</h2>
        {SWISS_ROUNDS.map((round, i) => {
          const ms = matchesByRound.get(round) ?? []
          return (
            <RoundPanel
              key={round}
              title={round}
              subtitle={ms.length > 0 ? `${ms.length} 场` : '待抽签'}
              defaultOpen={i === 0}
            >
              {ms.length === 0
                ? <p className="text-xs text-white/40 py-2">待小组赛 R{i} 结束后抽签</p>
                : <div className="space-y-2">{ms.map(m => <MatchRow key={m.id} match={m} variant="overview" />)}</div>}
            </RoundPanel>
          )
        })}
      </section>
    </div>
  )
}
