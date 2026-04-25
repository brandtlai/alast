import { Hono } from 'hono'
import { query } from '../db.js'
import { ok } from '../types.js'

const r = new Hono()

// GET /api/matches/:id/maps
r.get('/:id/maps', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT id, match_id, map_name, map_order, score_a, score_b,
            winner_team_id, duration_seconds
     FROM match_maps WHERE match_id = $1 ORDER BY map_order ASC`,
    [id]
  )
  return c.json(ok(rows))
})

// GET /api/matches/:id/maps/:mapId/stats
r.get('/:id/maps/:mapId/stats', async (c) => {
  const { mapId } = c.req.param()
  const { rows } = await query(
    `SELECT pms.id, pms.player_id, pms.team_id,
            pms.kills, pms.deaths, pms.assists, pms.headshots, pms.headshot_pct,
            pms.adr, pms.kast, pms.rating, pms.first_kills, pms.first_deaths,
            pms.clutches_won, pms.clutches_played,
            p.nickname, p.avatar_url, p.steam_id,
            t.name AS team_name, t.logo_url AS team_logo_url,
            EXISTS(
              SELECT 1 FROM match_substitutes ms2
              WHERE ms2.player_id = pms.player_id
                AND ms2.match_id = (SELECT match_id FROM match_maps WHERE id = $1)
            ) AS is_sub
     FROM player_match_stats pms
     JOIN players p ON p.id = pms.player_id
     LEFT JOIN teams t ON t.id = pms.team_id
     WHERE pms.match_map_id = $1
     ORDER BY pms.rating DESC NULLS LAST`,
    [mapId]
  )
  return c.json(ok(rows))
})

// GET /api/matches/:id/maps/:mapId/rounds
r.get('/:id/maps/:mapId/rounds', async (c) => {
  const { mapId } = c.req.param()
  const { rows } = await query(
    `SELECT mr.*,
       (SELECT json_agg(
         json_build_object(
           'weapon_name', mk.weapon_name,
           'is_headshot', mk.is_headshot,
           'killer_player_id', mk.killer_player_id,
           'victim_player_id', mk.victim_player_id,
           'tick', mk.tick
         ) ORDER BY mk.tick ASC
       )
       FROM match_kills mk WHERE mk.match_map_id = mr.match_map_id AND mk.round_number = mr.round_number
       ) AS kills
     FROM match_rounds mr
     WHERE mr.match_map_id = $1
     ORDER BY mr.round_number ASC`,
    [mapId]
  )
  return c.json(ok(rows))
})

// GET /api/matches/:id/maps/:mapId/economy
r.get('/:id/maps/:mapId/economy', async (c) => {
  const { mapId } = c.req.param()
  const { rows } = await query(
    `SELECT round_number, team_a_side, team_b_side,
            team_a_economy_type, team_b_economy_type,
            team_a_money_spent, team_b_money_spent,
            team_a_equipment_value, team_b_equipment_value,
            winner_side, end_reason
     FROM match_rounds
     WHERE match_map_id = $1
     ORDER BY round_number ASC`,
    [mapId]
  )
  return c.json(ok(rows))
})

// GET /api/matches/:id/maps/:mapId/highlights
r.get('/:id/maps/:mapId/highlights', async (c) => {
  const { mapId } = c.req.param()

  const { rows: clutches } = await query(
    `SELECT mc.round_number, mc.opponent_count, mc.won, mc.kill_count, mc.has_survived,
            p.nickname, p.avatar_url
     FROM match_clutches mc
     LEFT JOIN players p ON p.id = mc.player_id
     WHERE mc.match_map_id = $1
     ORDER BY mc.opponent_count DESC, mc.won DESC`,
    [mapId]
  )

  const { rows: top_players } = await query(
    `SELECT p.nickname, p.avatar_url, pms.rating,
            pms.kills, pms.deaths, pms.adr
     FROM player_match_stats pms
     JOIN players p ON p.id = pms.player_id
     WHERE pms.match_map_id = $1
     ORDER BY pms.rating DESC NULLS LAST
     LIMIT 3`,
    [mapId]
  )

  return c.json(ok({ clutches, top_players }))
})

export default r
