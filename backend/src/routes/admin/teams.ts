import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

r.post('/', async (c) => {
  const { name, short_name, logo_url, region } =
    await c.req.json<{ name: string; short_name?: string; logo_url?: string; region?: string }>()
  if (!name) return c.json(err('name is required', 'VALIDATION_ERROR'), 400)

  const { rows } = await query(
    'INSERT INTO teams (name, short_name, logo_url, region) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, short_name ?? null, logo_url ?? null, region ?? null]
  )
  return c.json(ok(rows[0]), 201)
})

r.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<{
    name: string; short_name: string; logo_url: string; region: string
  }>>()

  const { rows: existing } = await query('SELECT id FROM teams WHERE id = $1', [id])
  if (existing.length === 0) return c.json(err('Team not found', 'NOT_FOUND'), 404)

  const { rows } = await query(
    `UPDATE teams SET
       name = COALESCE($1, name),
       short_name = COALESCE($2, short_name),
       logo_url = COALESCE($3, logo_url),
       region = COALESCE($4, region)
     WHERE id = $5 RETURNING *`,
    [body.name, body.short_name, body.logo_url, body.region, id]
  )
  return c.json(ok(rows[0]))
})

r.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const { rowCount } = await query('DELETE FROM teams WHERE id = $1', [id])
  if (rowCount === 0) return c.json(err('Team not found', 'NOT_FOUND'), 404)
  return c.json(ok({ deleted: true }))
})

export default r
