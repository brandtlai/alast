// backend/src/routes/tournament-detail.ts
import { Hono } from 'hono'
import { query } from '../db.js'
import { ok, err } from '../types.js'

const r = new Hono()

// GET /api/tournaments/current
r.get('/current', async (c) => {
  const { rows } = await query(
    `SELECT * FROM tournaments WHERE is_current = TRUE LIMIT 1`
  )
  if (rows.length === 0) return c.json(err('No current tournament', 'NOT_FOUND'), 404)
  return c.json(ok(rows[0]))
})

// GET /api/tournaments/:id/standings
r.get('/:id/standings', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT * FROM tournament_swiss_standings
     WHERE tournament_id = $1
     ORDER BY wins DESC, buchholz DESC, round_diff DESC`,
    [id]
  )
  return c.json(ok(rows))
})

// GET /api/tournaments/:id/bracket
r.get('/:id/bracket', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT m.id, m.team_a_id, m.team_b_id, m.maps_won_a, m.maps_won_b,
            m.status, m.stage, m.bracket_kind, m.bracket_round, m.best_of,
            m.scheduled_at, m.finished_at,
            ta.name AS team_a_name, ta.logo_url AS team_a_logo,
            tb.name AS team_b_name, tb.logo_url AS team_b_logo
     FROM matches m
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.tournament_id = $1
       AND m.bracket_kind IS NOT NULL
       AND m.bracket_kind != 'swiss'
     ORDER BY
       CASE m.bracket_kind WHEN 'ub' THEN 1 WHEN 'lb' THEN 2 WHEN 'gf' THEN 3 ELSE 4 END,
       m.bracket_round ASC,
       m.scheduled_at ASC NULLS LAST`,
    [id]
  )
  return c.json(ok(rows))
})

// GET /api/tournaments/:id/draft
r.get('/:id/draft', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT tpa.tier, tpa.pick_order, tpa.is_captain,
            p.id AS player_id, p.nickname, p.avatar_url, p.steam_id,
            t.id AS team_id, t.name AS team_name, t.logo_url AS team_logo_url
     FROM tournament_player_assignment tpa
     JOIN players p ON p.id = tpa.player_id
     LEFT JOIN teams t ON t.id = p.team_id
     WHERE tpa.tournament_id = $1
     ORDER BY
       CASE tpa.tier WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C+' THEN 4 WHEN 'D' THEN 5 ELSE 6 END,
       tpa.pick_order ASC NULLS LAST`,
    [id]
  )
  return c.json(ok(rows))
})

export default r
