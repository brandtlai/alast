import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { LeaderboardEntry, TournamentSummary, TierComparison } from '../types'

type StatKey = 'rating' | 'adr' | 'kast' | 'headshot_pct' | 'first_kills' | 'clutches_won' | 'kd_diff'

export function useLeaderboard(params?: {
  tournament_id?: string
  stat?: StatKey
  bracket_kind?: string
  map?: string
  tier?: string
  min_maps?: number
  limit?: number
}) {
  const qs = new URLSearchParams()
  if (params?.tournament_id) qs.set('tournament_id', params.tournament_id)
  if (params?.stat)          qs.set('stat', params.stat)
  if (params?.bracket_kind)  qs.set('bracket_kind', params.bracket_kind)
  if (params?.map)           qs.set('map', params.map)
  if (params?.tier)          qs.set('tier', params.tier)
  if (params?.min_maps)      qs.set('min_maps', String(params.min_maps))
  if (params?.limit)         qs.set('limit', String(params.limit))
  const q = qs.toString()
  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: () => apiFetch<LeaderboardEntry[]>(`/api/stats/leaderboard${q ? `?${q}` : ''}`),
  })
}

export function useTournamentSummary(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-summary', tournamentId],
    queryFn: () => apiFetch<TournamentSummary>(`/api/stats/tournament-summary?tournament_id=${tournamentId}`),
    enabled: !!tournamentId,
  })
}

export function useTierComparison(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tier-comparison', tournamentId],
    queryFn: () => apiFetch<TierComparison[]>(`/api/stats/tier-comparison?tournament_id=${tournamentId}`),
    enabled: !!tournamentId,
  })
}

export function useAvailableMaps(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['stats-maps', tournamentId],
    queryFn: () => apiFetch<string[]>(`/api/stats/maps${tournamentId ? `?tournament_id=${tournamentId}` : ''}`),
    enabled: !!tournamentId,
  })
}
