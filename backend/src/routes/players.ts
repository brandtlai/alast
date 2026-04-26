import { Hono } from 'hono'
import { query } from '../db.js'
import { ok, err } from '../types.js'

const r = new Hono()

r.get('/', async (c) => {
  const teamId = c.req.query('team_id')
  const role = c.req.query('role')

  let sql = `
    SELECT p.*, t.name as team_name, t.logo_url as team_logo_url
    FROM players p
    LEFT JOIN teams t ON t.id = p.team_id
    WHERE 1=1
  `
  const params: unknown[] = []

  if (teamId) { params.push(teamId); sql += ` AND p.team_id = $${params.length}` }
  if (role)   { params.push(role);   sql += ` AND p.role = $${params.length}` }
  sql += ' ORDER BY p.nickname'

  const { rows } = await query(sql, params)
  return c.json(ok(rows))
})

r.get('/:id', async (c) => {
  const id = c.req.param('id')

  const { rows } = await query(
    `SELECT p.*, t.name as team_name, t.logo_url as team_logo_url,
            tpa.tier as tier
     FROM players p
     LEFT JOIN teams t ON t.id = p.team_id
     LEFT JOIN tournament_player_assignment tpa
       ON tpa.player_id = p.id
       AND tpa.tournament_id = (SELECT id FROM tournaments WHERE is_current = TRUE LIMIT 1)
     WHERE p.id = $1`,
    [id]
  )
  if (rows.length === 0) return c.json(err('Player not found', 'NOT_FOUND'), 404)

  const { rows: stats } = await query(
    `SELECT
       COUNT(DISTINCT pms.match_map_id) as maps_played,
       ROUND(AVG(pms.rating)::numeric, 2) as avg_rating,
       ROUND(AVG(pms.adr)::numeric, 1) as avg_adr,
       ROUND(AVG(pms.kast)::numeric, 1) as avg_kast,
       ROUND(AVG(pms.headshot_pct)::numeric, 1) as avg_hs_pct,
       SUM(pms.kills) as total_kills,
       SUM(pms.deaths) as total_deaths
     FROM player_match_stats pms WHERE pms.player_id = $1`,
    [id]
  )

  const { rows: history } = await query(
    `SELECT pms.*, mm.map_name, mm.score_a, mm.score_b,
            m.stage, m.scheduled_at,
            t.name as opponent_name
     FROM player_match_stats pms
     JOIN match_maps mm ON mm.id = pms.match_map_id
     JOIN matches m ON m.id = mm.match_id
     LEFT JOIN teams t ON t.id = (
       CASE WHEN m.team_a_id = pms.team_id THEN m.team_b_id ELSE m.team_a_id END
     )
     WHERE pms.player_id = $1
     ORDER BY m.scheduled_at DESC LIMIT 10`,
    [id]
  )

  return c.json(ok({ ...rows[0], career_stats: stats[0], match_history: history }))
})

export default r
