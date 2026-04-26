import { Hono } from 'hono'
import { query } from '../db.js'
import { ok, err } from '../types.js'
import { formatStageForNews } from '../lib/news-generation/text.js'

const r = new Hono()

interface NewsRow {
  [key: string]: unknown
    match: {
    id: string
    stage: string | null
    final_score: string
    team_a_id: string | null
    team_a_name: string | null
    team_a_logo: string | null
    team_b_id: string | null
    team_b_name: string | null
    team_b_logo: string | null
    scheduled_at: string | null
  } | null
}

function normalizeNewsRows<T extends NewsRow>(rows: T[]): T[] {
  return rows.map(row => ({
    ...row,
    match: row.match ? { ...row.match, stage: formatStageForNews(row.match.stage) } : null,
  }))
}

r.get('/', async (c) => {
  const category = c.req.query('category')
  const q        = c.req.query('q')
  const limit    = Math.min(parseInt(c.req.query('limit') ?? '20'), 100)
  const offset   = parseInt(c.req.query('offset') ?? '0')

  let sql = `
    SELECT n.*,
           CASE WHEN m.id IS NULL THEN NULL ELSE json_build_object(
             'id', m.id,
             'stage', m.stage,
             'final_score', concat(m.maps_won_a, '-', m.maps_won_b),
             'team_a_id', m.team_a_id,
             'team_a_name', ta.name,
             'team_a_logo', ta.logo_url,
             'team_b_id', m.team_b_id,
             'team_b_name', tb.name,
             'team_b_logo', tb.logo_url,
             'scheduled_at', m.scheduled_at
           ) END AS match
    FROM news n
    LEFT JOIN matches m ON m.id = n.match_id
    LEFT JOIN teams ta ON ta.id = m.team_a_id
    LEFT JOIN teams tb ON tb.id = m.team_b_id
    WHERE n.published_at IS NOT NULL
  `
  const params: unknown[] = []
  if (category) { params.push(category); sql += ` AND n.category = $${params.length}` }
  if (q)        { params.push(`%${q}%`); sql += ` AND (n.title ILIKE $${params.length} OR n.summary ILIKE $${params.length})` }
  params.push(limit, offset)
  sql += ` ORDER BY n.published_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`

  const { rows } = await query<NewsRow>(sql, params)
  return c.json(ok(normalizeNewsRows(rows)))
})

r.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const { rows } = await query<NewsRow>(
    `SELECT n.*,
            CASE WHEN m.id IS NULL THEN NULL ELSE json_build_object(
              'id', m.id,
              'stage', m.stage,
              'final_score', concat(m.maps_won_a, '-', m.maps_won_b),
              'team_a_id', m.team_a_id,
              'team_a_name', ta.name,
              'team_a_logo', ta.logo_url,
              'team_b_id', m.team_b_id,
              'team_b_name', tb.name,
              'team_b_logo', tb.logo_url,
              'scheduled_at', m.scheduled_at
            ) END AS match
     FROM news n
     LEFT JOIN matches m ON m.id = n.match_id
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE n.slug = $1`,
    [slug],
  )
  if (rows.length === 0) return c.json(err('Article not found', 'NOT_FOUND'), 404)
  return c.json(ok(normalizeNewsRows(rows)[0]))
})

export default r
