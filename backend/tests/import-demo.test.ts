import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../src/index.js'
import {
  resetTables,
  insertTeam,
  insertTournament,
  insertPlayer,
  getAdminToken,
  query,
} from './setup.js'

const TABLES = [
  'match_rounds','match_kills','match_clutches','player_round_economies',
  'player_match_stats','match_maps','match_substitutes','csdm_imports',
  'player_steam_aliases','players','matches','teams','tournaments','admins',
]

const DEMO = {
  mapName: 'de_ancient', date: '2026-04-10T14:00:00Z', duration: 2400, checksum: 'abc123',
  teamA: { name: 'Alpha', score: 13, scoreFirstHalf: 9, scoreSecondHalf: 4 },
  teamB: { name: 'Beta',  score: 7,  scoreFirstHalf: 3, scoreSecondHalf: 4 },
  players: [] as unknown[],
  rounds: [], kills: [], clutches: [], playersEconomies: [],
}

async function insertMatch(tournamentId: string, teamAId: string, teamBId: string) {
  const { rows: [m] } = await query(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
     VALUES ($1,$2,$3,'upcoming') RETURNING id`,
    [tournamentId, teamAId, teamBId]
  )
  return m.id as string
}

beforeEach(async () => {
  await resetTables(...TABLES)
})

describe('POST /api/admin/import/demo/preview', () => {
  it('returns 401 without a Bearer token', async () => {
    const res = await app.request('/api/admin/import/demo/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: 'fake', demoJson: DEMO }),
    })
    expect(res.status).toBe(401)
  })

  it('identifies a matched player by steam_id', async () => {
    const token = await getAdminToken()
    const tournamentId = await insertTournament()
    const teamAId = await insertTeam({ name: 'Alpha' })
    const teamBId = await insertTeam({ name: 'Beta' })
    const matchId = await insertMatch(tournamentId, teamAId, teamBId)
    const player = await insertPlayer({ nickname: 'xPlayer', steam_id: 'STEAM_0:0:12345', team_id: teamAId })

    const demo = {
      ...DEMO,
      players: [{
        steamId: 'STEAM_0:0:12345', name: 'xPlayer', teamName: 'Alpha',
        hltvRating2: 1.15, kast: 75.0, averageDamagePerRound: 82.3, headshotPercentage: 42.0,
        killCount: 22, deathCount: 14, assistCount: 3,
        firstKillCount: 4, firstDeathCount: 2,
        mvpCount: 3, vsOneWonCount: 2, vsTwoWonCount: 1,
      }],
    }

    const res = await app.request('/api/admin/import/demo/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matchId, demoJson: demo }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { playerMatches: { identity: string; playerId: string }[] } }
    expect(body.success).toBe(true)
    expect(body.data.playerMatches).toHaveLength(1)
    expect(body.data.playerMatches[0].identity).toBe('matched')
    expect(body.data.playerMatches[0].playerId).toBe(player.id)
  })

  it('marks unrecognized player as new', async () => {
    const token = await getAdminToken()
    const tournamentId = await insertTournament()
    const teamAId = await insertTeam({ name: 'Alpha' })
    const teamBId = await insertTeam({ name: 'Beta' })
    const matchId = await insertMatch(tournamentId, teamAId, teamBId)

    const demo = {
      ...DEMO,
      checksum: 'xyz999',
      players: [{
        steamId: 'STEAM_0:0:99999', name: 'Unknown', teamName: 'Alpha',
        hltvRating2: 1.0, kast: 70.0, averageDamagePerRound: 70.0, headshotPercentage: 30.0,
        killCount: 15, deathCount: 15, assistCount: 2,
        firstKillCount: 2, firstDeathCount: 3,
        mvpCount: 1, vsOneWonCount: 0, vsTwoWonCount: 0,
      }],
    }

    const res = await app.request('/api/admin/import/demo/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matchId, demoJson: demo }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { playerMatches: { identity: string; playerId: null }[] } }
    expect(body.success).toBe(true)
    expect(body.data.playerMatches[0].identity).toBe('new')
    expect(body.data.playerMatches[0].playerId).toBeNull()
  })
})

describe('POST /api/admin/import/demo/confirm', () => {
  it('writes match_map + player_match_stats and marks import confirmed', async () => {
    const token = await getAdminToken()
    const tournamentId = await insertTournament()
    const teamAId = await insertTeam({ name: 'Alpha' })
    const teamBId = await insertTeam({ name: 'Beta' })
    const matchId = await insertMatch(tournamentId, teamAId, teamBId)
    const player = await insertPlayer({ nickname: 'xPlayer', steam_id: 'STEAM_0:0:12345', team_id: teamAId })

    const demo = {
      ...DEMO,
      players: [{
        steamId: 'STEAM_0:0:12345', name: 'xPlayer', teamName: 'Alpha',
        hltvRating2: 1.20, kast: 78.0, averageDamagePerRound: 90.0, headshotPercentage: 50.0,
        killCount: 25, deathCount: 12, assistCount: 4,
        firstKillCount: 5, firstDeathCount: 1,
        mvpCount: 4, vsOneWonCount: 3, vsTwoWonCount: 1,
      }],
    }

    // First preview to create a pending import
    const prevRes = await app.request('/api/admin/import/demo/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matchId, demoJson: demo }),
    })
    expect(prevRes.status).toBe(200)
    const prevBody = await prevRes.json() as { success: boolean; data: { importId: string } }
    const importId = prevBody.data.importId

    // Now confirm
    const confRes = await app.request('/api/admin/import/demo/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        importId,
        matchId,
        mapOrder: 1,
        playerMappings: [
          { steamId: 'STEAM_0:0:12345', action: 'use', playerId: player.id },
        ],
      }),
    })
    expect(confRes.status).toBe(200)
    const confBody = await confRes.json() as { success: boolean; data: { matchMapId: string } }
    expect(confBody.success).toBe(true)
    expect(confBody.data.matchMapId).toBeTruthy()

    // Verify match_map was created
    const { rows: maps } = await query(`SELECT * FROM match_maps WHERE id = $1`, [confBody.data.matchMapId])
    expect(maps).toHaveLength(1)
    expect(maps[0].map_name).toBe('de_ancient')
    expect(maps[0].score_a).toBe(13)
    expect(maps[0].score_b).toBe(7)

    // Verify player_match_stats
    const { rows: stats } = await query(
      `SELECT * FROM player_match_stats WHERE match_map_id = $1 AND player_id = $2`,
      [confBody.data.matchMapId, player.id]
    )
    expect(stats).toHaveLength(1)
    expect(stats[0].kills).toBe(25)
    expect(stats[0].imported_from_csdm).toBe(true)

    // Verify import is confirmed
    const { rows: imp } = await query(`SELECT status FROM csdm_imports WHERE id = $1`, [importId])
    expect(imp[0].status).toBe('confirmed')

    // Verify match is finished
    const { rows: match } = await query(`SELECT status FROM matches WHERE id = $1`, [matchId])
    expect(match[0].status).toBe('finished')
  })
})
