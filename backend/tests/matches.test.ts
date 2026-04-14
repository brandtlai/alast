import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index.js'
import { resetTables, insertTeam, insertTournament, query } from './setup.js'

async function insertMatch(tournamentId: string, teamAId: string, teamBId: string,
  overrides: Partial<{ status: string; stage: string }> = {}
) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status, stage)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [tournamentId, teamAId, teamBId,
     overrides.status ?? 'upcoming', overrides.stage ?? 'Group Stage']
  )
  return rows[0].id
}

describe('GET /api/matches', () => {
  beforeEach(() => resetTables('matches', 'teams', 'tournaments'))

  it('returns empty array with no matches', async () => {
    const res = await app.request('/api/matches')
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toEqual([])
  })

  it('filters by status', async () => {
    const tid = await insertTournament()
    const ta = await insertTeam({ name: 'Team A' })
    const tb = await insertTeam({ name: 'Team B' })
    await insertMatch(tid, ta, tb, { status: 'finished' })
    await insertMatch(tid, ta, tb, { status: 'upcoming' })

    const res = await app.request('/api/matches?status=finished')
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toHaveLength(1)
  })
})

describe('GET /api/matches/:id', () => {
  beforeEach(() => resetTables('matches', 'teams', 'tournaments'))

  it('returns 404 for unknown id', async () => {
    const res = await app.request('/api/matches/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it('returns match with maps and player stats', async () => {
    const tid = await insertTournament()
    const ta = await insertTeam({ name: 'Alpha' })
    const tb = await insertTeam({ name: 'Beta' })
    const matchId = await insertMatch(tid, ta, tb)
    const res = await app.request(`/api/matches/${matchId}`)
    const body = await res.json() as { data: { id: string; maps: unknown[] } }
    expect(body.data.id).toBe(matchId)
    expect(Array.isArray(body.data.maps)).toBe(true)
  })
})
