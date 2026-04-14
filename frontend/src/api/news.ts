import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { NewsArticle } from '../types'

export function useNewsList(params?: { category?: string; q?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams()
  if (params?.category) qs.set('category', params.category)
  if (params?.q) qs.set('q', params.q)
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.offset) qs.set('offset', String(params.offset))
  const query = qs.toString()
  return useQuery({
    queryKey: ['news', params],
    queryFn: () => apiFetch<NewsArticle[]>(`/api/news${query ? `?${query}` : ''}`),
  })
}

export function useNewsArticle(slug: string) {
  return useQuery({
    queryKey: ['news', slug],
    queryFn: () => apiFetch<NewsArticle>(`/api/news/${slug}`),
    enabled: !!slug,
  })
}
