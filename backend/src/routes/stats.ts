// backend/src/routes/stats.ts
import { Hono } from 'hono'
import { query } from '../db.js'
import { ok } from '../types.js'

const r = new Hono()

const VALID_STATS = ['rating', 'adr', 'kast', 'headshot_pct', 'kills', 'first_kills'] as const
type StatKey = typeof VALID_STATS[number]

r.get('/leaderboard', async (c) => {
  const tournamentId = c.req.query('tournament_id')
  const stat = (VALID_STATS.includes(c.req.query('stat') as StatKey)
    ? c.req.query('stat')!
    : 'rating') as string
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 50)
  const stage = c.req.query('stage') ?? null
  const map = c.req.query('map') ?? null
  const tier = c.req.query('tier') ?? null
  const minMaps = parseInt(c.req.query('min_maps') ?? '3')

  const params: unknown[] = []
  const conditions: string[] = ['1=1']

  if (tournamentId) { params.push(tournamentId); conditions.push(`m.tournament_id = $${params.length}`) }
  if (stage) { params.push(stage); conditions.push(`m.stage = $${params.length}`) }
  if (map)   { params.push(map);   conditions.push(`mm.map_name = $${params.length}`) }

  let tierJoin = ''
  if (tier && tournamentId) {
    params.push(tier)
    tierJoin = `JOIN tournament_player_assignment tpa ON tpa.player_id = p.id AND tpa.tournament_id = m.tournament_id AND tpa.tier = $${params.length}`
  }

  params.push(minMaps)
  const minMapsParam = params.length

  params.push(limit)
  const limitParam = params.length

  const sql = `
    SELECT p.id, p.nickname, p.avatar_url, t.name as team_name, t.logo_url as team_logo_url,
           COUNT(pms.id) as maps_played,
           ROUND(AVG(pms.${stat})::numeric, 2) as avg_stat
    FROM player_match_stats pms
    JOIN players p ON p.id = pms.player_id
    LEFT JOIN teams t ON t.id = p.team_id
    JOIN match_maps mm ON mm.id = pms.match_map_id
    JOIN matches m ON m.id = mm.match_id
    ${tierJoin}
    WHERE ${conditions.join(' AND ')}
    GROUP BY p.id, p.nickname, p.avatar_url, t.name, t.logo_url
    HAVING COUNT(pms.id) >= $${minMapsParam}
    ORDER BY avg_stat DESC NULLS LAST
    LIMIT $${limitParam}
  `

  const { rows } = await query(sql, params)
  return c.json(ok(rows))
})

r.get('/tournament-summary', async (c) => {
  const tournamentId = c.req.query('tournament_id')
  if (!tournamentId) return c.json(ok({ matches_played: 0, total_kills: 0, avg_headshot_pct: null }))

  const { rows: [summary] } = await query(
    `SELECT
       COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'finished') AS matches_played,
       COALESCE(SUM(pms.kills), 0) AS total_kills,
       ROUND(AVG(pms.headshot_pct)::numeric, 1) AS avg_headshot_pct
     FROM matches m
     LEFT JOIN match_maps mm ON mm.match_id = m.id
     LEFT JOIN player_match_stats pms ON pms.match_map_id = mm.id
     WHERE m.tournament_id = $1`,
    [tournamentId]
  )
  return c.json(ok(summary))
})

r.get('/tier-comparison', async (c) => {
  const tournamentId = c.req.query('tournament_id')
  if (!tournamentId) return c.json(ok([]))

  const { rows } = await query(
    `SELECT
       tpa.tier,
       ROUND(AVG(pms.rating)::numeric, 3) AS avg_rating,
       ROUND(AVG(pms.adr)::numeric, 1) AS avg_adr,
       COUNT(DISTINCT pms.player_id) AS players
     FROM player_match_stats pms
     JOIN players p ON p.id = pms.player_id
     JOIN match_maps mm ON mm.id = pms.match_map_id
     JOIN matches m ON m.id = mm.match_id
     JOIN tournament_player_assignment tpa
       ON tpa.player_id = pms.player_id AND tpa.tournament_id = m.tournament_id
     WHERE m.tournament_id = $1
     GROUP BY tpa.tier
     ORDER BY
       CASE tpa.tier WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C+' THEN 4 WHEN 'D' THEN 5 ELSE 6 END`,
    [tournamentId]
  )
  return c.json(ok(rows))
})

export default r
