import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index.js'
import { resetTables, insertTeam, query } from './setup.js'

async function insertPlayer(teamId: string, overrides: Partial<{
  nickname: string; steam_id: string
}> = {}) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO players (nickname, team_id, steam_id)
     VALUES ($1, $2, $3) RETURNING id`,
    [overrides.nickname ?? 'player1', teamId, overrides.steam_id ?? '7656119800000001']
  )
  return rows[0].id
}

describe('GET /api/players', () => {
  beforeEach(() => resetTables('players', 'teams'))

  it('returns empty array when no players', async () => {
    const res = await app.request('/api/players')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toEqual([])
  })

  it('filters by team_id', async () => {
    const teamId = await insertTeam()
    await insertPlayer(teamId, { nickname: 'ZywOo' })
    const res = await app.request(`/api/players?team_id=${teamId}`)
    const body = await res.json() as { data: { nickname: string }[] }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].nickname).toBe('ZywOo')
  })
})

describe('GET /api/players/:id', () => {
  beforeEach(() => resetTables('players', 'teams'))

  it('returns 404 for unknown id', async () => {
    const res = await app.request('/api/players/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it('returns player with team info', async () => {
    const teamId = await insertTeam({ name: 'Vitality' })
    const playerId = await insertPlayer(teamId, { nickname: 'ZywOo' })
    const res = await app.request(`/api/players/${playerId}`)
    const body = await res.json() as { data: { nickname: string; team_name: string } }
    expect(body.data.nickname).toBe('ZywOo')
    expect(body.data.team_name).toBe('Vitality')
  })
})
