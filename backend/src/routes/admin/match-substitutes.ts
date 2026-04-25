// backend/src/routes/admin/match-substitutes.ts
import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

r.post('/:id/substitutes', async (c) => {
  const { id } = c.req.param()
  const { player_id, lender_team_id, borrower_team_id } =
    await c.req.json<{ player_id: string; lender_team_id?: string; borrower_team_id?: string }>()
  if (!player_id) return c.json(err('player_id required', 'BAD_REQUEST'), 400)

  const { rows: [sub] } = await query(
    `INSERT INTO match_substitutes (match_id, player_id, lender_team_id, borrower_team_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (match_id, player_id) DO UPDATE SET lender_team_id=$3, borrower_team_id=$4
     RETURNING *`,
    [id, player_id, lender_team_id ?? null, borrower_team_id ?? null]
  )
  return c.json(ok(sub), 201)
})

r.get('/:id/substitutes', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT ms.*, p.nickname, tl.name AS lender_team_name, tb.name AS borrower_team_name
     FROM match_substitutes ms
     JOIN players p ON p.id = ms.player_id
     LEFT JOIN teams tl ON tl.id = ms.lender_team_id
     LEFT JOIN teams tb ON tb.id = ms.borrower_team_id
     WHERE ms.match_id = $1`,
    [id]
  )
  return c.json(ok(rows))
})

export default r
