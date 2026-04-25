// backend/tests/tournament-detail.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../src/index.js'
import { resetTables, insertTeam, insertTournament, insertPlayer, insertMatchMap, query } from './setup.js'

async function insertMatch(tournamentId: string, teamAId: string, teamBId: string, overrides: {
  bracket_kind?: string; bracket_round?: number; status?: string
  maps_won_a?: number; maps_won_b?: number; stage?: string
} = {}) {
  const { rows: [m] } = await query(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, bracket_kind, bracket_round,
      status, maps_won_a, maps_won_b, stage)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [tournamentId, teamAId, teamBId,
     overrides.bracket_kind ?? 'swiss', overrides.bracket_round ?? 1,
     overrides.status ?? 'finished',
     overrides.maps_won_a ?? 1, overrides.maps_won_b ?? 0,
     overrides.stage ?? '小组赛 R1']
  )
  return m as { id: string }
}

beforeEach(() =>
  resetTables('player_match_stats', 'match_maps', 'matches', 'tournament_player_assignment', 'players', 'teams', 'tournaments')
)

describe('GET /api/tournaments/current', () => {
  it('returns 404 when no current tournament', async () => {
    const res = await app.request('/api/tournaments/current')
    expect(res.status).toBe(404)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(false)
  })

  it('returns the tournament marked is_current', async () => {
    const tId = await insertTournament({ name: 'ALAST 2026' })
    await query(`UPDATE tournaments SET is_current = TRUE WHERE id = $1`, [tId])
    const res = await app.request('/api/tournaments/current')
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { name: string; is_current: boolean } }
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('ALAST 2026')
    expect(body.data.is_current).toBe(true)
  })
})

describe('GET /api/tournaments/:id/standings', () => {
  it('returns empty array when no swiss matches', async () => {
    const tId = await insertTournament()
    const res = await app.request(`/api/tournaments/${tId}/standings`)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toEqual([])
  })

  it('returns standings sorted by wins then buchholz', async () => {
    const tId = await insertTournament()
    const teamAId = await insertTeam({ name: 'Alpha' })
    const teamBId = await insertTeam({ name: 'Beta' })
    const teamCId = await insertTeam({ name: 'Gamma' })
    // A beats B, A beats C, B beats C → A:2W, B:1W, C:0W
    const mAB = await insertMatch(tId, teamAId, teamBId, { maps_won_a: 1, maps_won_b: 0 })
    const mAC = await insertMatch(tId, teamAId, teamCId, { maps_won_a: 1, maps_won_b: 0 })
    const mBC = await insertMatch(tId, teamBId, teamCId, { maps_won_a: 1, maps_won_b: 0 })
    await insertMatchMap(mAB.id, { score_a: 13, score_b: 7 })
    await insertMatchMap(mAC.id, { score_a: 13, score_b: 5 })
    await insertMatchMap(mBC.id, { score_a: 13, score_b: 9 })

    const res = await app.request(`/api/tournaments/${tId}/standings`)
    const body = await res.json() as { data: Array<{ team_name: string; wins: number; losses: number; buchholz: number }> }
    expect(body.data[0].team_name).toBe('Alpha')
    expect(body.data[0].wins).toBe(2)
    expect(body.data[0].losses).toBe(0)
    expect(body.data[1].team_name).toBe('Beta')
    expect(body.data[2].team_name).toBe('Gamma')
    expect(body.data[0].buchholz).toBe(1)
  })
})

describe('GET /api/tournaments/:id/bracket', () => {
  it('returns UB/LB/GF matches, excluding swiss', async () => {
    const tId = await insertTournament()
    const teamAId = await insertTeam()
    const teamBId = await insertTeam()
    await insertMatch(tId, teamAId, teamBId, { bracket_kind: 'swiss', stage: '小组赛 R1' })
    await query(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, bracket_kind, bracket_round, status, stage)
       VALUES ($1,$2,$3,'ub',1,'upcoming','胜者组 QF')`,
      [tId, teamAId, teamBId]
    )
    const res = await app.request(`/api/tournaments/${tId}/bracket`)
    const body = await res.json() as { data: Array<{ bracket_kind: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].bracket_kind).toBe('ub')
  })
})

describe('GET /api/tournaments/:id/draft', () => {
  it('returns empty array when no assignments', async () => {
    const tId = await insertTournament()
    const res = await app.request(`/api/tournaments/${tId}/draft`)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toEqual([])
  })

  it('returns players with tier and team info', async () => {
    const tId = await insertTournament()
    const teamId = await insertTeam()
    const player = await insertPlayer({ nickname: 'NJU', team_id: teamId })
    await query(
      `INSERT INTO tournament_player_assignment (tournament_id, player_id, tier, pick_order)
       VALUES ($1,$2,'S',1)`,
      [tId, player.id]
    )
    const res = await app.request(`/api/tournaments/${tId}/draft`)
    const body = await res.json() as { data: Array<{ tier: string; nickname: string }> }
    expect(body.data[0].tier).toBe('S')
    expect(body.data[0].nickname).toBe('NJU')
  })
})
