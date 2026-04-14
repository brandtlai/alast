import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Player } from '../types'

export function usePlayers(params?: { team_id?: string; role?: string }) {
  const qs = new URLSearchParams()
  if (params?.team_id) qs.set('team_id', params.team_id)
  if (params?.role) qs.set('role', params.role)
  const query = qs.toString()
  return useQuery({
    queryKey: ['players', params],
    queryFn: () => apiFetch<Player[]>(`/api/players${query ? `?${query}` : ''}`),
  })
}

export function usePlayer(id: string) {
  return useQuery({
    queryKey: ['players', id],
    queryFn: () => apiFetch<Player>(`/api/players/${id}`),
    enabled: !!id,
  })
}
