import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Tournament, StandingRow, BracketMatch, DraftPlayer } from '../types'

export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: () => apiFetch<Tournament[]>('/api/tournaments'),
  })
}

export function useStandings(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['standings', tournamentId],
    queryFn: () => apiFetch<StandingRow[]>(`/api/tournaments/${tournamentId}/standings`),
    enabled: !!tournamentId,
  })
}

export function useBracket(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['bracket', tournamentId],
    queryFn: () => apiFetch<BracketMatch[]>(`/api/tournaments/${tournamentId}/bracket`),
    enabled: !!tournamentId,
  })
}

export function useDraft(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['draft', tournamentId],
    queryFn: () => apiFetch<DraftPlayer[]>(`/api/tournaments/${tournamentId}/draft`),
    enabled: !!tournamentId,
  })
}
