import { Hono } from 'hono'
import { query } from '../db.js'
import { ok } from '../types.js'

const r = new Hono()

r.get('/leaderboard', async (c) => {
  const tournamentId = c.req.query('tournament_id')
  const stat = ['rating', 'adr', 'kast'].includes(c.req.query('stat') ?? '')
    ? c.req.query('stat')!
    : 'rating'
  const limit = Math.min(parseInt(c.req.query('limit') ?? '10'), 50)

  let sql = `
    SELECT p.id, p.nickname, p.avatar_url, t.name as team_name, t.logo_url as team_logo_url,
           COUNT(pms.id) as maps_played,
           ROUND(AVG(pms.${stat})::numeric, 2) as avg_stat
    FROM player_match_stats pms
    JOIN players p ON p.id = pms.player_id
    LEFT JOIN teams t ON t.id = p.team_id
    JOIN match_maps mm ON mm.id = pms.match_map_id
    JOIN matches m ON m.id = mm.match_id
    WHERE 1=1
  `
  const params: unknown[] = []
  if (tournamentId) {
    params.push(tournamentId)
    sql += ` AND m.tournament_id = $${params.length}`
  }
  params.push(limit)
  sql += `
    GROUP BY p.id, p.nickname, p.avatar_url, t.name, t.logo_url
    HAVING COUNT(pms.id) >= 3
    ORDER BY avg_stat DESC NULLS LAST
    LIMIT $${params.length}
  `

  const { rows } = await query(sql, params)
  return c.json(ok(rows))
})

export default r
