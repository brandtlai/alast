import bcrypt from 'bcryptjs'
import { query, pool } from './db.js'
import 'dotenv/config'

const username = process.argv[2] ?? 'admin'
const password = process.argv[3] ?? 'changeme123'

const hash = await bcrypt.hash(password, 12)
await query(
  'INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
  [username, hash]
)
console.log(`Admin '${username}' created (or already exists).`)
await pool.end()
