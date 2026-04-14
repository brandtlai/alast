import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Tournament } from '../types'

export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: () => apiFetch<Tournament[]>('/api/tournaments'),
  })
}
