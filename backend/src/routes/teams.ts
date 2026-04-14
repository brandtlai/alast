import { Hono } from 'hono'
import { query } from '../db.js'
import { ok, err } from '../types.js'

const r = new Hono()

r.get('/', async (c) => {
  const region = c.req.query('region')
  const { rows } = region
    ? await query('SELECT * FROM teams WHERE region = $1 ORDER BY name', [region])
    : await query('SELECT * FROM teams ORDER BY name')
  return c.json(ok(rows))
})

r.get('/:id', async (c) => {
  const id = c.req.param('id')
  const { rows } = await query('SELECT * FROM teams WHERE id = $1', [id])
  if (rows.length === 0) return c.json(err('Team not found', 'NOT_FOUND'), 404)

  const { rows: players } = await query(
    'SELECT * FROM players WHERE team_id = $1 ORDER BY nickname',
    [id]
  )

  const { rows: recentMatches } = await query(
    `SELECT m.*, t1.name as team_a_name, t2.name as team_b_name
     FROM matches m
     LEFT JOIN teams t1 ON t1.id = m.team_a_id
     LEFT JOIN teams t2 ON t2.id = m.team_b_id
     WHERE (m.team_a_id = $1 OR m.team_b_id = $1) AND m.status = 'finished'
     ORDER BY m.finished_at DESC LIMIT 5`,
    [id]
  )

  return c.json(ok({ ...rows[0], players, recent_matches: recentMatches }))
})

export default r
