import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Team } from '../types'

export function useTeams(region?: string) {
  return useQuery({
    queryKey: ['teams', region],
    queryFn: () => apiFetch<Team[]>(`/api/teams${region ? `?region=${region}` : ''}`),
  })
}

export function useTeam(id: string) {
  return useQuery({
    queryKey: ['teams', id],
    queryFn: () => apiFetch<Team>(`/api/teams/${id}`),
    enabled: !!id,
  })
}
