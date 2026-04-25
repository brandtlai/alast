// backend/src/routes/admin/player-aliases.ts
import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

r.post('/:id/aliases', async (c) => {
  const { id } = c.req.param()
  const { steam_id, note } = await c.req.json<{ steam_id: string; note?: string }>()
  if (!steam_id) return c.json(err('steam_id required', 'BAD_REQUEST'), 400)

  const { rows: [alias] } = await query(
    `INSERT INTO player_steam_aliases (player_id, steam_id, note)
     VALUES ($1,$2,$3)
     ON CONFLICT (steam_id) DO UPDATE SET player_id = $1, note = $3
     RETURNING *`,
    [id, steam_id, note ?? null]
  )
  return c.json(ok(alias), 201)
})

r.get('/:id/aliases', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT * FROM player_steam_aliases WHERE player_id = $1 ORDER BY created_at DESC`,
    [id]
  )
  return c.json(ok(rows))
})

export default r
