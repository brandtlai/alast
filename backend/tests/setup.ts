import { pool, query } from '../src/db.js'
import 'dotenv/config'

export async function resetTables(...tables: string[]) {
  for (const table of tables) {
    await pool.query(`TRUNCATE ${table} RESTART IDENTITY CASCADE`)
  }
}

export async function insertTeam(overrides: Partial<{
  name: string; short_name: string; region: string
}> = {}) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO teams (name, short_name, region)
     VALUES ($1, $2, $3) RETURNING id`,
    [overrides.name ?? 'Test Team', overrides.short_name ?? 'TT', overrides.region ?? 'Asia']
  )
  return rows[0].id
}

export async function insertTournament(overrides: Partial<{
  name: string; year: number
}> = {}) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO tournaments (name, year) VALUES ($1, $2) RETURNING id`,
    [overrides.name ?? 'ALAST Premier 2026', overrides.year ?? 2026]
  )
  return rows[0].id
}

export { query } from '../src/db.js'

afterAll(async () => {
  await pool.end()
})
