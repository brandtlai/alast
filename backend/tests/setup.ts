import { pool } from '../src/db.js'

export async function resetTables(...tables: string[]) {
  for (const table of tables) {
    await pool.query(`TRUNCATE ${table} RESTART IDENTITY CASCADE`)
  }
}

afterAll(async () => {
  await pool.end()
})
