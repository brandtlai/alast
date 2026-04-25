import { useMemo } from 'react'
import { useMatches } from '../../../api/matches.js'
import { useCurrentTournament } from '../../../api/currentTournament.js'
import BracketColumn from '../BracketColumn.js'
import type { Match } from '../../../types.js'

interface BracketRound { roundLabel: string; matches: Match[] }

const UB_PATTERN = /^胜者组/
const LB_PATTERN = /^败者组/
const GF_PATTERN = /^(GF|总决赛|Grand Final)$/

function bucketByPrefix(matches: Match[], pattern: RegExp): BracketRound[] {
  const byLabel = new Map<string, Match[]>()
  for (const m of matches) {
    if (!m.stage || !pattern.test(m.stage)) continue
    const arr = byLabel.get(m.stage) ?? []
    arr.push(m)
    byLabel.set(m.stage, arr)
  }
  return Array.from(byLabel.entries()).map(([roundLabel, ms]) => ({ roundLabel, matches: ms }))
}

export default function BracketTab() {
  const { data: tournament } = useCurrentTournament()
  const { data: matches = [] } = useMatches({ tournament_id: tournament?.id })

  const ub = useMemo(() => bucketByPrefix(matches, UB_PATTERN), [matches])
  const lb = useMemo(() => bucketByPrefix(matches, LB_PATTERN), [matches])
  const gf = useMemo(() => bucketByPrefix(matches, GF_PATTERN), [matches])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <BracketColumn title="Upper Bracket"  subtitle="胜者组" rounds={ub} />
      <BracketColumn title="Lower Bracket"  subtitle="败者组" rounds={lb} />
      <BracketColumn title="Grand Final"    subtitle="总决赛" rounds={gf} isCurrent />
    </div>
  )
}
