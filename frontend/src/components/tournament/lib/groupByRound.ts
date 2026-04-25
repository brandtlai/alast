import dayjs from 'dayjs'
import type { Match } from '../../../types.js'
import { stageOrderIndex } from './tournamentRounds.js'

export interface RoundGroup {
  stage: string             // display label
  matches: Match[]          // newest first within group
  dateRange: string | null  // "04-06 → 04-08" or null if no scheduled_at
}

/**
 * Group matches by `stage` (free-text in Phase A). Sort groups by canonical
 * STAGE_ORDER, then by earliest match date descending (so the most recent
 * round appears first). Within each group, newest match first.
 */
export function groupByRound(matches: Match[]): RoundGroup[] {
  const buckets = new Map<string, Match[]>()
  for (const m of matches) {
    const key = m.stage ?? '未分组'
    const arr = buckets.get(key) ?? []
    arr.push(m)
    buckets.set(key, arr)
  }

  const groups: RoundGroup[] = []
  for (const [stage, ms] of buckets.entries()) {
    const sortedMs = [...ms].sort((a, b) => {
      const ta = a.scheduled_at ? dayjs(a.scheduled_at).valueOf() : 0
      const tb = b.scheduled_at ? dayjs(b.scheduled_at).valueOf() : 0
      return tb - ta
    })
    const dated = sortedMs.filter(m => m.scheduled_at)
    let dateRange: string | null = null
    if (dated.length > 0) {
      const first = dayjs(dated[dated.length - 1].scheduled_at!).format('MM-DD')
      const last  = dayjs(dated[0].scheduled_at!).format('MM-DD')
      dateRange = first === last ? first : `${first} → ${last}`
    }
    groups.push({ stage, matches: sortedMs, dateRange })
  }

  // Sort groups: canonical stage order first, then by latest match desc within unknowns
  groups.sort((a, b) => {
    const ia = stageOrderIndex(a.stage)
    const ib = stageOrderIndex(b.stage)
    if (ia !== ib) return ib - ia       // higher canonical index = later round = on top
    const lastA = a.matches[0]?.scheduled_at ? dayjs(a.matches[0].scheduled_at).valueOf() : 0
    const lastB = b.matches[0]?.scheduled_at ? dayjs(b.matches[0].scheduled_at).valueOf() : 0
    return lastB - lastA
  })

  return groups
}
