import { pool } from '../src/db.js'

test('database is reachable', async () => {
  const { rows } = await pool.query('SELECT 1 AS ok')
  expect(rows[0].ok).toBe(1)
})
