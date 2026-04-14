import { readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool } from './db.js'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id        SERIAL PRIMARY KEY,
        filename  TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `)

    const migrationsDir = join(__dirname, 'migrations')
    const files = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT 1 FROM _migrations WHERE filename = $1',
        [file]
      )
      if (rows.length > 0) {
        console.log(`Skip (already applied): ${file}`)
        continue
      }

      const sql = await readFile(join(migrationsDir, file), 'utf-8')
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        )
        await client.query('COMMIT')
        console.log(`Applied: ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Migration failed for ${file}: ${err}`)
      }
    }

    console.log('Migrations complete.')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch(err => { console.error(err); process.exit(1) })
