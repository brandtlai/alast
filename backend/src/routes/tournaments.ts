import { Hono } from 'hono'
import { query } from '../db.js'
import { ok } from '../types.js'

const r = new Hono()

r.get('/', async (c) => {
  const { rows } = await query(
    'SELECT * FROM tournaments ORDER BY year DESC, name ASC'
  )
  return c.json(ok(rows))
})

export default r
