import type { StandingRow } from '../../../types'

export interface SeededTeam {
  seed: number
  teamId: string
  name: string
  shortName: string | null
  logoUrl: string | null
}

/**
 * Convert Swiss-final standings into a seed→team mapping.
 * Standings rows are already sorted by (wins desc, buchholz desc, round_diff desc).
 * Seed 1 = first row, seed 15 = last row.
 */
export function deriveSeeds(standings: StandingRow[] | undefined): Map<number, SeededTeam> {
  const map = new Map<number, SeededTeam>()
  if (!standings) return map
  standings.forEach((row, i) => {
    map.set(i + 1, {
      seed: i + 1,
      teamId: row.team_id,
      name: row.team_name,
      shortName: row.team_short_name,
      logoUrl: row.team_logo_url,
    })
  })
  return map
}

/** Look up a seed; returns null if standings haven't loaded or seed is out of range. */
export function teamForSeed(seeds: Map<number, SeededTeam>, seed: number): SeededTeam | null {
  return seeds.get(seed) ?? null
}
