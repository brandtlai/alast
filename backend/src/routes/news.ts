import { Hono } from 'hono'
import { query } from '../db.js'
import { ok, err } from '../types.js'

const r = new Hono()

r.get('/', async (c) => {
  const category = c.req.query('category')
  const q        = c.req.query('q')
  const limit    = Math.min(parseInt(c.req.query('limit') ?? '20'), 100)
  const offset   = parseInt(c.req.query('offset') ?? '0')

  let sql = 'SELECT * FROM news WHERE published_at IS NOT NULL'
  const params: unknown[] = []
  if (category) { params.push(category); sql += ` AND category = $${params.length}` }
  if (q)        { params.push(`%${q}%`); sql += ` AND (title ILIKE $${params.length} OR summary ILIKE $${params.length})` }
  params.push(limit, offset)
  sql += ` ORDER BY published_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`

  const { rows } = await query(sql, params)
  return c.json(ok(rows))
})

r.get('/:slug', async (c) => {
  const slug = c.req.param('slug')
  const { rows } = await query('SELECT * FROM news WHERE slug = $1', [slug])
  if (rows.length === 0) return c.json(err('Article not found', 'NOT_FOUND'), 404)
  return c.json(ok(rows[0]))
})

export default r
