import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

r.post('/', async (c) => {
  const body = await c.req.json<{
    nickname: string; real_name?: string; avatar_url?: string;
    team_id?: string; steam_id?: string; country?: string; role?: string
  }>()
  if (!body.nickname) return c.json(err('nickname is required', 'VALIDATION_ERROR'), 400)

  const { rows } = await query(
    `INSERT INTO players (nickname, real_name, avatar_url, team_id, steam_id, country, role)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [body.nickname, body.real_name ?? null, body.avatar_url ?? null,
     body.team_id ?? null, body.steam_id ?? null, body.country ?? null, body.role ?? null]
  )
  return c.json(ok(rows[0]), 201)
})

r.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<Partial<{
    nickname: string; real_name: string; avatar_url: string;
    team_id: string; steam_id: string; country: string; role: string
  }>>()

  const { rows } = await query(
    `UPDATE players SET
       nickname = COALESCE($1, nickname),
       real_name = COALESCE($2, real_name),
       avatar_url = COALESCE($3, avatar_url),
       team_id = COALESCE($4, team_id),
       steam_id = COALESCE($5, steam_id),
       country = COALESCE($6, country),
       role = COALESCE($7, role)
     WHERE id = $8 RETURNING *`,
    [body.nickname, body.real_name, body.avatar_url, body.team_id,
     body.steam_id, body.country, body.role, id]
  )
  if (rows.length === 0) return c.json(err('Player not found', 'NOT_FOUND'), 404)
  return c.json(ok(rows[0]))
})

r.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const { rowCount } = await query('DELETE FROM players WHERE id = $1', [id])
  if (rowCount === 0) return c.json(err('Player not found', 'NOT_FOUND'), 404)
  return c.json(ok({ deleted: true }))
})

export default r
