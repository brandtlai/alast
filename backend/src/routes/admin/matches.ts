import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

r.post('/', async (c) => {
  const body = await c.req.json<{
    tournament_id: string; team_a_id?: string; team_b_id?: string;
    status?: string; stage?: string; scheduled_at?: string
  }>()
  if (!body.tournament_id) return c.json(err('tournament_id is required', 'VALIDATION_ERROR'), 400)

  const { rows } = await query(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status, stage, scheduled_at)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [body.tournament_id, body.team_a_id ?? null, body.team_b_id ?? null,
     body.status ?? 'upcoming', body.stage ?? null, body.scheduled_at ?? null]
  )
  return c.json(ok(rows[0]), 201)
})

r.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<{
    status: string; stage: string; maps_won_a: number;
    maps_won_b: number; finished_at: string
  }>>()

  const { rows } = await query(
    `UPDATE matches SET
       status = COALESCE($1, status),
       stage = COALESCE($2, stage),
       maps_won_a = COALESCE($3, maps_won_a),
       maps_won_b = COALESCE($4, maps_won_b),
       finished_at = COALESCE($5, finished_at)
     WHERE id = $6 RETURNING *`,
    [body.status, body.stage, body.maps_won_a, body.maps_won_b, body.finished_at, id]
  )
  if (rows.length === 0) return c.json(err('Match not found', 'NOT_FOUND'), 404)
  return c.json(ok(rows[0]))
})

r.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const { rowCount } = await query('DELETE FROM matches WHERE id = $1', [id])
  if (rowCount === 0) return c.json(err('Match not found', 'NOT_FOUND'), 404)
  return c.json(ok({ deleted: true }))
})

export default r
