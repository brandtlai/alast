import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index.js'
import { resetTables, insertTeam } from './setup.js'

describe('GET /api/teams', () => {
  beforeEach(() => resetTables('teams'))

  it('returns empty array when no teams', async () => {
    const res = await app.request('/api/teams')
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(body.data).toEqual([])
  })

  it('returns teams sorted by name', async () => {
    await insertTeam({ name: 'Zephyr', region: 'EU' })
    await insertTeam({ name: 'Alpha', region: 'Asia' })
    const res = await app.request('/api/teams')
    const body = await res.json() as { data: { name: string }[] }
    expect(body.data[0].name).toBe('Alpha')
    expect(body.data[1].name).toBe('Zephyr')
  })

  it('filters by region', async () => {
    await insertTeam({ name: 'EU Team', region: 'EU' })
    await insertTeam({ name: 'Asia Team', region: 'Asia' })
    const res = await app.request('/api/teams?region=EU')
    const body = await res.json() as { data: { name: string }[] }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('EU Team')
  })
})

describe('GET /api/teams/:id', () => {
  beforeEach(() => resetTables('players', 'teams'))

  it('returns 404 for unknown id', async () => {
    const res = await app.request('/api/teams/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it('returns team with players array', async () => {
    const teamId = await insertTeam({ name: 'Test Team' })
    const res = await app.request(`/api/teams/${teamId}`)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { id: string; players: unknown[] } }
    expect(body.data.id).toBe(teamId)
    expect(Array.isArray(body.data.players)).toBe(true)
  })
})
