import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../src/index.js'
import {
  resetTables,
  insertTeam,
  insertTournament,
  insertPlayer,
  insertMatchMap,
  insertPlayerMatchStats,
  query,
} from './setup.js'

async function insertMatch(tournamentId: string, teamAId: string, teamBId: string) {
  const { rows: [m] } = await query(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
     VALUES ($1, $2, $3, 'finished') RETURNING id`,
    [tournamentId, teamAId, teamBId]
  )
  return m.id as string
}

async function insertMatchRound(matchMapId: string, roundNumber: number, overrides: {
  winner_side?: number
  end_reason?: number
  team_a_side?: number
  team_b_side?: number
  team_a_economy_type?: string
  team_b_economy_type?: string
  team_a_money_spent?: number
  team_b_money_spent?: number
  team_a_equipment_value?: number
  team_b_equipment_value?: number
} = {}) {
  const { rows: [mr] } = await query(
    `INSERT INTO match_rounds (match_map_id, round_number, winner_side, end_reason,
       team_a_side, team_b_side, team_a_economy_type, team_b_economy_type,
       team_a_money_spent, team_b_money_spent, team_a_equipment_value, team_b_equipment_value)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      matchMapId, roundNumber,
      overrides.winner_side ?? 2, overrides.end_reason ?? 1,
      overrides.team_a_side ?? 2, overrides.team_b_side ?? 3,
      overrides.team_a_economy_type ?? 'Full buy', overrides.team_b_economy_type ?? 'Force buy',
      overrides.team_a_money_spent ?? 15000, overrides.team_b_money_spent ?? 8000,
      overrides.team_a_equipment_value ?? 20000, overrides.team_b_equipment_value ?? 10000,
    ]
  )
  return mr.id as string
}

async function insertMatchClutch(matchMapId: string, playerId: string, overrides: {
  round_number?: number
  opponent_count?: number
  won?: boolean
  kill_count?: number
  has_survived?: boolean
} = {}) {
  const { rows: [mc] } = await query(
    `INSERT INTO match_clutches (match_map_id, player_id, round_number, opponent_count, won, kill_count, has_survived)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [
      matchMapId, playerId,
      overrides.round_number ?? 1,
      overrides.opponent_count ?? 2,
      overrides.won ?? true,
      overrides.kill_count ?? 2,
      overrides.has_survived ?? true,
    ]
  )
  return mc.id as string
}

describe('Match Maps API', () => {
  let tournamentId: string
  let teamAId: string
  let teamBId: string
  let matchId: string

  beforeEach(async () => {
    await resetTables(
      'match_clutches',
      'match_kills',
      'match_rounds',
      'player_match_stats',
      'match_maps',
      'match_substitutes',
      'matches',
      'players',
      'teams',
      'tournaments'
    )
    tournamentId = await insertTournament()
    teamAId = await insertTeam({ name: 'Team Alpha', short_name: 'TA' })
    teamBId = await insertTeam({ name: 'Team Beta', short_name: 'TB' })
    matchId = await insertMatch(tournamentId, teamAId, teamBId)
  })

  describe('GET /api/matches/:id/maps', () => {
    it('returns empty array when no maps exist', async () => {
      const res = await app.request(`/api/matches/${matchId}/maps`)
      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: unknown[] }
      expect(body.success).toBe(true)
      expect(body.data).toEqual([])
    })

    it('returns maps in map_order ascending', async () => {
      await insertMatchMap(matchId, { map_name: 'de_nuke', map_order: 2, score_a: 13, score_b: 7 })
      await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1, score_a: 16, score_b: 14 })

      const res = await app.request(`/api/matches/${matchId}/maps`)
      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: Array<{ map_name: string; map_order: number }> }
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.data[0].map_order).toBe(1)
      expect(body.data[0].map_name).toBe('de_dust2')
      expect(body.data[1].map_order).toBe(2)
      expect(body.data[1].map_name).toBe('de_nuke')
    })

    it('returns correct fields per map', async () => {
      await insertMatchMap(matchId, { map_name: 'de_inferno', map_order: 1, score_a: 13, score_b: 8 })

      const res = await app.request(`/api/matches/${matchId}/maps`)
      const body = await res.json() as { success: boolean; data: Array<Record<string, unknown>> }
      const map = body.data[0]
      expect(map).toHaveProperty('id')
      expect(map).toHaveProperty('match_id')
      expect(map).toHaveProperty('map_name', 'de_inferno')
      expect(map).toHaveProperty('map_order', 1)
      expect(map).toHaveProperty('score_a', 13)
      expect(map).toHaveProperty('score_b', 8)
    })
  })

  describe('GET /api/matches/:id/maps/:mapId/stats', () => {
    it('returns player stats with nickname and team info', async () => {
      const map = await insertMatchMap(matchId, { map_name: 'de_mirage', map_order: 1 })
      const player = await insertPlayer({ nickname: 'Ace', team_id: teamAId })
      await insertPlayerMatchStats(map.id, player.id, teamAId, {
        kills: 25, deaths: 10, assists: 5, rating: 1.45, adr: 95.5
      })

      const res = await app.request(`/api/matches/${matchId}/maps/${map.id}/stats`)
      expect(res.status).toBe(200)
      const body = await res.json() as {
        success: boolean
        data: Array<{
          nickname: string; team_name: string; kills: number; rating: number; is_sub: boolean
        }>
      }
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      const stat = body.data[0]
      expect(stat.nickname).toBe('Ace')
      expect(stat.team_name).toBe('Team Alpha')
      expect(stat.kills).toBe(25)
      expect(stat.rating).toBeCloseTo(1.45)
      expect(stat.is_sub).toBe(false)
    })

    it('returns stats ordered by rating descending', async () => {
      const map = await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1 })
      const p1 = await insertPlayer({ nickname: 'Low', team_id: teamAId })
      const p2 = await insertPlayer({ nickname: 'High', team_id: teamAId, steam_id: 'steam2' })
      await insertPlayerMatchStats(map.id, p1.id, teamAId, { rating: 0.8 })
      await insertPlayerMatchStats(map.id, p2.id, teamAId, { rating: 1.6 })

      const res = await app.request(`/api/matches/${matchId}/maps/${map.id}/stats`)
      const body = await res.json() as { data: Array<{ nickname: string; rating: number }> }
      expect(body.data[0].nickname).toBe('High')
      expect(body.data[1].nickname).toBe('Low')
    })

    it('marks player as is_sub when in match_substitutes', async () => {
      const map = await insertMatchMap(matchId, { map_name: 'de_overpass', map_order: 1 })
      const player = await insertPlayer({ nickname: 'SubGuy', team_id: teamBId })
      await insertPlayerMatchStats(map.id, player.id, teamBId, {})
      await query(
        `INSERT INTO match_substitutes (match_id, player_id, lender_team_id, borrower_team_id)
         VALUES ($1, $2, $3, $4)`,
        [matchId, player.id, teamBId, teamAId]
      )

      const res = await app.request(`/api/matches/${matchId}/maps/${map.id}/stats`)
      const body = await res.json() as { data: Array<{ nickname: string; is_sub: boolean }> }
      expect(body.data[0].is_sub).toBe(true)
    })
  })

  describe('GET /api/matches/:id/maps/:mapId/economy', () => {
    it('returns empty array when no rounds exist', async () => {
      const map = await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1 })
      const res = await app.request(`/api/matches/${matchId}/maps/${map.id}/economy`)
      expect(res.status).toBe(200)
      const body = await res.json() as { success: boolean; data: unknown[] }
      expect(body.success).toBe(true)
      expect(body.data).toEqual([])
    })

    it('returns round economy data ordered by round_number', async () => {
      const map = await insertMatchMap(matchId, { map_name: 'de_cache', map_order: 1 })
      await insertMatchRound(map.id, 2, { team_a_economy_type: 'Eco', team_a_money_spent: 1000 })
      await insertMatchRound(map.id, 1, { team_a_economy_type: 'Full buy', team_a_money_spent: 15000 })

      const res = await app.request(`/api/matches/${matchId}/maps/${map.id}/economy`)
      expect(res.status).toBe(200)
      const body = await res.json() as {
        success: boolean
        data: Array<{
          round_number: number
          team_a_economy_type: string
          team_a_money_spent: number
        }>
      }
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.data[0].round_number).toBe(1)
      expect(body.data[1].round_number).toBe(2)
      expect(body.data[0].team_a_economy_type).toBe('Full buy')
      expect(body.data[1].team_a_economy_type).toBe('Eco')
    })

    it('returns the correct economy fields', async () => {
      const map = await insertMatchMap(matchId, { map_name: 'de_train', map_order: 1 })
      await insertMatchRound(map.id, 1, {
        team_a_side: 2, team_b_side: 3,
        team_a_economy_type: 'Full buy', team_b_economy_type: 'Force buy',
        team_a_money_spent: 15000, team_b_money_spent: 8000,
        team_a_equipment_value: 20000, team_b_equipment_value: 10000,
        winner_side: 2, end_reason: 1,
      })

      const res = await app.request(`/api/matches/${matchId}/maps/${map.id}/economy`)
      const body = await res.json() as { data: Array<Record<string, unknown>> }
      const round = body.data[0]
      expect(round.round_number).toBe(1)
      expect(round.team_a_side).toBe(2)
      expect(round.team_b_side).toBe(3)
      expect(round.team_a_economy_type).toBe('Full buy')
      expect(round.team_b_economy_type).toBe('Force buy')
      expect(round.team_a_money_spent).toBe(15000)
      expect(round.team_b_money_spent).toBe(8000)
      expect(round.team_a_equipment_value).toBe(20000)
      expect(round.team_b_equipment_value).toBe(10000)
      expect(round.winner_side).toBe(2)
      expect(round.end_reason).toBe(1)
    })
  })

  describe('GET /api/matches/:id/maps/:mapId/highlights', () => {
    it('returns empty clutches and top_players when nothing exists', async () => {
      const map = await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1 })
      const res = await app.request(`/api/matches/${matchId}/maps/${map.id}/highlights`)
      expect(res.status).toBe(200)
      const body = await res.json() as {
        success: boolean
        data: { clutches: unknown[]; top_players: unknown[] }
      }
      expect(body.success).toBe(true)
      expect(body.data.clutches).toEqual([])
      expect(body.data.top_players).toEqual([])
    })

    it('returns clutches with player info ordered by opponent_count desc', async () => {
      const map = await insertMatchMap(matchId, { map_name: 'de_inferno', map_order: 1 })
      const player = await insertPlayer({ nickname: 'Clutcher', team_id: teamAId })
      await insertMatchClutch(map.id, player.id, { round_number: 5, opponent_count: 3, won: true, kill_count: 3 })
      await insertMatchClutch(map.id, player.id, { round_number: 12, opponent_count: 2, won: true, kill_count: 2 })

      const res = await app.request(`/api/matches/${matchId}/maps/${map.id}/highlights`)
      expect(res.status).toBe(200)
      const body = await res.json() as {
        data: {
          clutches: Array<{ opponent_count: number; nickname: string; won: boolean; kill_count: number }>
          top_players: unknown[]
        }
      }
      expect(body.data.clutches).toHaveLength(2)
      expect(body.data.clutches[0].opponent_count).toBe(3)
      expect(body.data.clutches[0].nickname).toBe('Clutcher')
      expect(body.data.clutches[0].won).toBe(true)
      expect(body.data.clutches[0].kill_count).toBe(3)
      expect(body.data.clutches[1].opponent_count).toBe(2)
    })

    it('returns top 3 players by rating', async () => {
      const map = await insertMatchMap(matchId, { map_name: 'de_mirage', map_order: 1 })
      const p1 = await insertPlayer({ nickname: 'P1', team_id: teamAId })
      const p2 = await insertPlayer({ nickname: 'P2', team_id: teamAId, steam_id: 'st2' })
      const p3 = await insertPlayer({ nickname: 'P3', team_id: teamBId, steam_id: 'st3' })
      const p4 = await insertPlayer({ nickname: 'P4', team_id: teamBId, steam_id: 'st4' })
      await insertPlayerMatchStats(map.id, p1.id, teamAId, { rating: 1.1 })
      await insertPlayerMatchStats(map.id, p2.id, teamAId, { rating: 1.5 })
      await insertPlayerMatchStats(map.id, p3.id, teamBId, { rating: 0.9 })
      await insertPlayerMatchStats(map.id, p4.id, teamBId, { rating: 1.3 })

      const res = await app.request(`/api/matches/${matchId}/maps/${map.id}/highlights`)
      const body = await res.json() as {
        data: {
          clutches: unknown[]
          top_players: Array<{ nickname: string; rating: number }>
        }
      }
      expect(body.data.top_players).toHaveLength(3)
      expect(body.data.top_players[0].nickname).toBe('P2')
      expect(body.data.top_players[1].nickname).toBe('P4')
      expect(body.data.top_players[2].nickname).toBe('P1')
    })
  })
})
