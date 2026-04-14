import { Hono } from 'hono'
import { query } from '../db.js'
import { ok } from '../types.js'

const r = new Hono()

r.get('/', async (c) => {
  const q = c.req.query('q')?.trim()
  if (!q) return c.json(ok({ teams: [], players: [], news: [] }))

  const pattern = `%${q}%`

  const [{ rows: teams }, { rows: players }, { rows: news }] = await Promise.all([
    query('SELECT id, name, logo_url, region FROM teams WHERE name ILIKE $1 LIMIT 5', [pattern]),
    query(`SELECT p.id, p.nickname, p.avatar_url, t.name as team_name
           FROM players p LEFT JOIN teams t ON t.id = p.team_id
           WHERE p.nickname ILIKE $1 OR p.real_name ILIKE $1 LIMIT 5`, [pattern]),
    query(`SELECT id, title, slug, summary, published_at FROM news
           WHERE (title ILIKE $1 OR summary ILIKE $1) AND published_at IS NOT NULL
           LIMIT 5`, [pattern]),
  ])

  return c.json(ok({ teams, players, news }))
})

export default r
