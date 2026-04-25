import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Tournament } from '../types'

/**
 * Returns the "current" tournament. Phase A heuristic: highest year, then alphabetical name.
 * Phase C swaps this to GET /api/tournaments/current backed by tournaments.is_current.
 */
export function useCurrentTournament() {
  return useQuery({
    queryKey: ['tournaments', 'current'],
    queryFn: async () => {
      const all = await apiFetch<Tournament[]>('/api/tournaments')
      if (all.length === 0) return null
      const sorted = [...all].sort((a, b) => {
        const ya = a.year ?? 0
        const yb = b.year ?? 0
        if (yb !== ya) return yb - ya
        return a.name.localeCompare(b.name)
      })
      return sorted[0]
    },
  })
}
