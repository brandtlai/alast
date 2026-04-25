// frontend/src/api/currentTournament.ts
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Tournament } from '../types'

export function useCurrentTournament() {
  return useQuery({
    queryKey: ['tournaments', 'current'],
    queryFn: () => apiFetch<Tournament>('/api/tournaments/current'),
  })
}
