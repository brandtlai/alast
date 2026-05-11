import { Hono } from 'hono'
import { query } from '../db.js'
import { ok, err } from '../types.js'

const r = new Hono()

r.get('/', async (c) => {
  const region = c.req.query('region')
  // Use the same swiss standings view that /api/tournaments/:id/standings uses,
  // so the teams list and the homepage STANDINGS share one ranking logic.
  const sql = `
    SELECT t.*,
      COALESCE(s.wins, 0)::int       AS wins,
      COALESCE(s.losses, 0)::int     AS losses,
      COALESCE(s.buchholz, 0)::int   AS buchholz,
      COALESCE(s.round_diff, 0)::int AS round_diff
    FROM teams t
    LEFT JOIN tournament_swiss_standings s
      ON s.team_id = t.id
      AND s.tournament_id = (SELECT id FROM tournaments WHERE is_current = TRUE LIMIT 1)
    ${region ? 'WHERE t.region = $1' : ''}
    ORDER BY
      COALESCE(s.wins, 0) DESC,
      COALESCE(s.buchholz, 0) DESC,
      COALESCE(s.round_diff, 0) DESC,
      t.name
  `
  const { rows } = region ? await query(sql, [region]) : await query(sql)
  return c.json(ok(rows))
})

r.get('/:id', async (c) => {
  const id = c.req.param('id')
  const { rows } = await query(
    `SELECT t.*,
       COALESCE(s.wins, 0)::int       AS wins,
       COALESCE(s.losses, 0)::int     AS losses,
       COALESCE(s.buchholz, 0)::int   AS buchholz,
       COALESCE(s.round_diff, 0)::int AS round_diff
     FROM teams t
     LEFT JOIN tournament_swiss_standings s
       ON s.team_id = t.id
       AND s.tournament_id = (SELECT id FROM tournaments WHERE is_current = TRUE LIMIT 1)
     WHERE t.id = $1`,
    [id]
  )
  if (rows.length === 0) return c.json(err('Team not found', 'NOT_FOUND'), 404)

  const { rows: players } = await query(
    `SELECT p.*, tpa.tier, tpa.is_captain, tpa.pick_order
     FROM players p
     LEFT JOIN tournament_player_assignment tpa ON tpa.player_id = p.id
     WHERE p.team_id = $1
     ORDER BY tpa.is_captain DESC NULLS LAST,
              array_position(ARRAY['S','A','B','C+','D'], tpa.tier) NULLS LAST,
              p.nickname`,
    [id]
  )

  const { rows: recentMatches } = await query(
    `SELECT m.*, t1.name as team_a_name, t2.name as team_b_name
     FROM matches m
     LEFT JOIN teams t1 ON t1.id = m.team_a_id
     LEFT JOIN teams t2 ON t2.id = m.team_b_id
     WHERE (m.team_a_id = $1 OR m.team_b_id = $1) AND m.status = 'finished'
     ORDER BY COALESCE(m.finished_at, m.scheduled_at) DESC NULLS LAST LIMIT 5`,
    [id]
  )

  return c.json(ok({ ...rows[0], players, recent_matches: recentMatches }))
})

export default r
