const BASE = ''  // same origin; Vite proxy handles /api in dev

export class ApiError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const json = await res.json() as { success: boolean; data?: T; error?: string; code?: string }
  if (!json.success) {
    throw new ApiError(json.code ?? 'ERROR', json.error ?? 'Unknown error')
  }
  return json.data as T
}
