import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { LeaderboardEntry } from '../types'

export function useLeaderboard(params?: {
  tournament_id?: string; stat?: 'rating' | 'adr' | 'kast'; limit?: number
}) {
  const qs = new URLSearchParams()
  if (params?.tournament_id) qs.set('tournament_id', params.tournament_id)
  if (params?.stat) qs.set('stat', params.stat)
  if (params?.limit) qs.set('limit', String(params.limit))
  const query = qs.toString()
  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: () => apiFetch<LeaderboardEntry[]>(`/api/stats/leaderboard${query ? `?${query}` : ''}`),
  })
}
