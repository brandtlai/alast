import { describe, it, expect } from 'vitest'
import app from '../src/index.js'

describe('GET /api/stats/leaderboard', () => {
  it('returns empty leaderboard with no data', async () => {
    const res = await app.request('/api/stats/leaderboard')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(Array.isArray(body.data)).toBe(true)
  })
})
