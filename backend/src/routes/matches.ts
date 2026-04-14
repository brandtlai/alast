import { Hono } from 'hono'
import { query } from '../db.js'
import { ok, err } from '../types.js'

const r = new Hono()

r.get('/', async (c) => {
  const { status, stage, team_id, tournament_id } = c.req.query() as Record<string, string>

  let sql = `
    SELECT m.*,
           ta.name as team_a_name, ta.logo_url as team_a_logo,
           tb.name as team_b_name, tb.logo_url as team_b_logo,
           t.name as tournament_name
    FROM matches m
    LEFT JOIN teams ta ON ta.id = m.team_a_id
    LEFT JOIN teams tb ON tb.id = m.team_b_id
    LEFT JOIN tournaments t ON t.id = m.tournament_id
    WHERE 1=1
  `
  const params: unknown[] = []
  if (status)        { params.push(status);        sql += ` AND m.status = $${params.length}` }
  if (stage)         { params.push(stage);          sql += ` AND m.stage = $${params.length}` }
  if (tournament_id) { params.push(tournament_id);  sql += ` AND m.tournament_id = $${params.length}` }
  if (team_id)       {
    params.push(team_id)
    sql += ` AND (m.team_a_id = $${params.length} OR m.team_b_id = $${params.length})`
  }
  sql += ' ORDER BY m.scheduled_at DESC'

  const { rows } = await query(sql, params)
  return c.json(ok(rows))
})

r.get('/:id', async (c) => {
  const id = c.req.param('id')

  const { rows } = await query(
    `SELECT m.*,
            ta.name as team_a_name, ta.logo_url as team_a_logo,
            tb.name as team_b_name, tb.logo_url as team_b_logo
     FROM matches m
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.id = $1`,
    [id]
  )
  if (rows.length === 0) return c.json(err('Match not found', 'NOT_FOUND'), 404)

  const { rows: maps } = await query(
    `SELECT mm.*,
            json_agg(
              json_build_object(
                'player_id', pms.player_id,
                'nickname', p.nickname,
                'team_id', pms.team_id,
                'kills', pms.kills, 'deaths', pms.deaths, 'assists', pms.assists,
                'adr', pms.adr, 'kast', pms.kast, 'rating', pms.rating,
                'headshot_pct', pms.headshot_pct
              ) ORDER BY pms.rating DESC NULLS LAST
            ) FILTER (WHERE pms.id IS NOT NULL) as players
     FROM match_maps mm
     LEFT JOIN player_match_stats pms ON pms.match_map_id = mm.id
     LEFT JOIN players p ON p.id = pms.player_id
     WHERE mm.match_id = $1
     GROUP BY mm.id
     ORDER BY mm.map_order`,
    [id]
  )

  return c.json(ok({ ...rows[0], maps }))
})

export default r
