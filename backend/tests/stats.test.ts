import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../src/index.js'
import { resetTables, insertTeam, insertTournament, insertPlayer, insertMatchMap } from './setup.js'
import { query } from '../src/db.js'

async function insertFinishedMatch(tournamentId: string, teamAId: string, teamBId: string, bracketKind = 'swiss') {
  const { rows: [m] } = await query(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, maps_won_a, maps_won_b, status, bracket_kind)
     VALUES ($1, $2, $3, 2, 0, 'finished', $4) RETURNING id`,
    [tournamentId, teamAId, teamBId, bracketKind]
  )
  return m.id as string
}

async function insertStats(
  matchMapId: string, playerId: string, teamId: string,
  { rating = 1.0, adr = 80, kast = 72, clutches_won = 1, first_kills = 2, kills = 15, deaths = 10 } = {}
) {
  await query(
    `INSERT INTO player_match_stats
       (player_id, match_map_id, team_id, kills, deaths, assists, rating, adr, kast, headshot_pct, first_kills, clutches_won)
     VALUES ($1, $2, $3, $4, $5, 3, $6, $7, $8, 40, $9, $10)`,
    [playerId, matchMapId, teamId, kills, deaths, rating, adr, kast, first_kills, clutches_won]
  )
}

describe('GET /api/stats/leaderboard', () => {
  beforeEach(async () => {
    await resetTables('player_match_stats', 'match_maps', 'matches', 'players', 'teams', 'tournaments')
  })

  it('returns empty array with no data', async () => {
    const res = await app.request('/api/stats/leaderboard')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(0)
  })

  it('returns leaderboard sorted by rating', async () => {
    const tid = await insertTournament()
    const teamId = await insertTeam()
    const p1 = await insertPlayer({ team_id: teamId })
    const p2 = await insertPlayer({ team_id: teamId })
    const matchId = await insertFinishedMatch(tid, teamId, teamId)
    const mm1 = await insertMatchMap(matchId, { map_order: 1 })
    const mm2 = await insertMatchMap(matchId, { map_order: 2 })
    const mm3 = await insertMatchMap(matchId, { map_order: 3 })
    await insertStats(mm1.id, p1.id, teamId, { rating: 1.5 })
    await insertStats(mm2.id, p1.id, teamId, { rating: 1.5 })
    await insertStats(mm3.id, p1.id, teamId, { rating: 1.5 })
    await insertStats(mm1.id, p2.id, teamId, { rating: 1.0 })
    await insertStats(mm2.id, p2.id, teamId, { rating: 1.0 })
    await insertStats(mm3.id, p2.id, teamId, { rating: 1.0 })

    const res = await app.request('/api/stats/leaderboard?tournament_id=' + tid + '&min_maps=3')
    const body = await res.json() as { data: Array<{ nickname: string; avg_stat: string }> }
    expect(body.data[0].nickname).toBe(p1.nickname)
    expect(parseFloat(body.data[0].avg_stat)).toBeCloseTo(1.5, 1)
  })

  it('supports kd_diff synthetic stat', async () => {
    const tid = await insertTournament()
    const teamId = await insertTeam()
    const p1 = await insertPlayer({ team_id: teamId })
    const matchId = await insertFinishedMatch(tid, teamId, teamId)
    const mm1 = await insertMatchMap(matchId, { map_order: 1 })
    const mm2 = await insertMatchMap(matchId, { map_order: 2 })
    const mm3 = await insertMatchMap(matchId, { map_order: 3 })
    // 15K - 10D = +5 per map
    await insertStats(mm1.id, p1.id, teamId, { kills: 15, deaths: 10 })
    await insertStats(mm2.id, p1.id, teamId, { kills: 15, deaths: 10 })
    await insertStats(mm3.id, p1.id, teamId, { kills: 15, deaths: 10 })

    const res = await app.request('/api/stats/leaderboard?tournament_id=' + tid + '&stat=kd_diff&min_maps=3')
    const body = await res.json() as { data: Array<{ avg_stat: string }> }
    expect(parseFloat(body.data[0].avg_stat)).toBeCloseTo(5, 0)
  })

  it('filters by bracket_kind', async () => {
    const tid = await insertTournament()
    const teamId = await insertTeam()
    const p1 = await insertPlayer({ team_id: teamId })
    const matchId = await insertFinishedMatch(tid, teamId, teamId, 'swiss')
    const mm1 = await insertMatchMap(matchId, { map_order: 1 })
    const mm2 = await insertMatchMap(matchId, { map_order: 2 })
    const mm3 = await insertMatchMap(matchId, { map_order: 3 })
    await insertStats(mm1.id, p1.id, teamId)
    await insertStats(mm2.id, p1.id, teamId)
    await insertStats(mm3.id, p1.id, teamId)

    const res = await app.request('/api/stats/leaderboard?tournament_id=' + tid + '&bracket_kind=ub&min_maps=1')
    const body = await res.json() as { data: unknown[] }
    expect(body.data.length).toBe(0) // p1 only played swiss, not ub
  })
})

describe('GET /api/stats/maps', () => {
  beforeEach(async () => {
    await resetTables('match_maps', 'matches', 'teams', 'tournaments')
  })

  it('returns distinct map names for tournament', async () => {
    const tid = await insertTournament()
    const teamId = await insertTeam()
    const { rows: [m] } = await query(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, maps_won_a, maps_won_b, status)
       VALUES ($1, $2, $2, 2, 0, 'finished') RETURNING id`,
      [tid, teamId]
    )
    await query(`INSERT INTO match_maps (match_id, map_name, map_order) VALUES ($1, 'de_ancient', 1)`, [m.id])
    await query(`INSERT INTO match_maps (match_id, map_name, map_order) VALUES ($1, 'de_inferno', 2)`, [m.id])
    await query(`INSERT INTO match_maps (match_id, map_name, map_order) VALUES ($1, 'de_ancient', 3)`, [m.id])

    const res = await app.request('/api/stats/maps?tournament_id=' + tid)
    const body = await res.json() as { data: string[] }
    expect(body.data).toEqual(['de_ancient', 'de_inferno'])
  })

  it('returns empty array when no maps exist', async () => {
    const res = await app.request('/api/stats/maps')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: string[] }
    expect(Array.isArray(body.data)).toBe(true)
  })
})
