import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Match, MatchMap, MapStatPlayer, MatchRound, EconomyRound, MatchHighlights } from '../types'

export function useMatches(params?: {
  status?: string; stage?: string; team_id?: string; tournament_id?: string
}) {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.stage) qs.set('stage', params.stage)
  if (params?.team_id) qs.set('team_id', params.team_id)
  if (params?.tournament_id) qs.set('tournament_id', params.tournament_id)
  const query = qs.toString()
  return useQuery({
    queryKey: ['matches', params],
    queryFn: () => apiFetch<Match[]>(`/api/matches${query ? `?${query}` : ''}`),
  })
}

export function useMatch(id: string) {
  return useQuery({
    queryKey: ['matches', id],
    queryFn: () => apiFetch<Match>(`/api/matches/${id}`),
    enabled: !!id,
  })
}

export function useMatchMaps(matchId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps'],
    queryFn: () => apiFetch<MatchMap[]>(`/api/matches/${matchId}/maps`),
    enabled: !!matchId,
  })
}

export function useMapStats(matchId: string | undefined, mapId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps', mapId, 'stats'],
    queryFn: () => apiFetch<MapStatPlayer[]>(`/api/matches/${matchId}/maps/${mapId}/stats`),
    enabled: !!matchId && !!mapId,
  })
}

export function useMapRounds(matchId: string | undefined, mapId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps', mapId, 'rounds'],
    queryFn: () => apiFetch<MatchRound[]>(`/api/matches/${matchId}/maps/${mapId}/rounds`),
    enabled: !!matchId && !!mapId,
  })
}

export function useMapEconomy(matchId: string | undefined, mapId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps', mapId, 'economy'],
    queryFn: () => apiFetch<EconomyRound[]>(`/api/matches/${matchId}/maps/${mapId}/economy`),
    enabled: !!matchId && !!mapId,
  })
}

export function useMapHighlights(matchId: string | undefined, mapId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps', mapId, 'highlights'],
    queryFn: () => apiFetch<MatchHighlights>(`/api/matches/${matchId}/maps/${mapId}/highlights`),
    enabled: !!matchId && !!mapId,
  })
}
