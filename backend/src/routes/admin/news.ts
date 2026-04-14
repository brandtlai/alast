import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80)
    + '-' + Date.now().toString(36)
}

const r = new Hono()

r.post('/', async (c) => {
  const body = await c.req.json<{
    title: string; summary?: string; content?: string;
    cover_image_url?: string; category?: string;
    match_id?: string; author?: string; published_at?: string; slug?: string
  }>()
  if (!body.title) return c.json(err('title is required', 'VALIDATION_ERROR'), 400)

  const slug = body.slug ?? slugify(body.title)
  const { rows } = await query(
    `INSERT INTO news (title, slug, summary, content, cover_image_url, category,
                       match_id, author, published_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [body.title, slug, body.summary ?? null, body.content ?? null,
     body.cover_image_url ?? null, body.category ?? null,
     body.match_id ?? null, body.author ?? null, body.published_at ?? null]
  )
  return c.json(ok(rows[0]), 201)
})

r.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<{
    title: string; slug: string; summary: string; content: string;
    cover_image_url: string; category: string;
    match_id: string; author: string; published_at: string
  }>>()

  const { rows } = await query(
    `UPDATE news SET
       title = COALESCE($1, title),
       slug = COALESCE($2, slug),
       summary = COALESCE($3, summary),
       content = COALESCE($4, content),
       cover_image_url = COALESCE($5, cover_image_url),
       category = COALESCE($6, category),
       match_id = COALESCE($7, match_id),
       author = COALESCE($8, author),
       published_at = COALESCE($9, published_at)
     WHERE id = $10 RETURNING *`,
    [body.title, body.slug, body.summary, body.content, body.cover_image_url,
     body.category, body.match_id, body.author, body.published_at, id]
  )
  if (rows.length === 0) return c.json(err('Article not found', 'NOT_FOUND'), 404)
  return c.json(ok(rows[0]))
})

r.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const { rowCount } = await query('DELETE FROM news WHERE id = $1', [id])
  if (rowCount === 0) return c.json(err('Article not found', 'NOT_FOUND'), 404)
  return c.json(ok({ deleted: true }))
})

export default r
