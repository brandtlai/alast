import { pool, query } from '../src/db.js'
import { app } from '../src/index.js'
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

export async function insertPlayer(overrides: {
  nickname?: string
  team_id?: string
  steam_id?: string
} = {}) {
  const { rows: [p] } = await query(
    `INSERT INTO players (nickname, team_id, steam_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [overrides.nickname ?? 'TestPlayer', overrides.team_id ?? null, overrides.steam_id ?? null]
  )
  return p as { id: string; nickname: string; team_id: string | null; steam_id: string | null }
}

export async function insertMatchMap(matchId: string, overrides: {
  map_name?: string
  map_order?: number
  score_a?: number
  score_b?: number
} = {}) {
  const { rows: [mm] } = await query(
    `INSERT INTO match_maps (match_id, map_name, map_order, score_a, score_b)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [matchId, overrides.map_name ?? 'de_dust2', overrides.map_order ?? 1,
     overrides.score_a ?? null, overrides.score_b ?? null]
  )
  return mm as { id: string; match_id: string; map_name: string }
}

export async function insertPlayerMatchStats(matchMapId: string, playerId: string, teamId: string, overrides: {
  kills?: number; deaths?: number; assists?: number
  adr?: number; kast?: number; rating?: number; headshot_pct?: number
} = {}) {
  const { rows: [pms] } = await query(
    `INSERT INTO player_match_stats (match_map_id, player_id, team_id, kills, deaths, assists, adr, kast, rating, headshot_pct)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [matchMapId, playerId, teamId,
     overrides.kills ?? 15, overrides.deaths ?? 15, overrides.assists ?? 3,
     overrides.adr ?? 75.0, overrides.kast ?? 72.0, overrides.rating ?? 1.0,
     overrides.headshot_pct ?? 40.0]
  )
  return pms as { id: string }
}

export async function getAdminToken(): Promise<string> {
  const bcrypt = await import('bcrypt')
  const hash = await bcrypt.hash('testpass', 10)
  await query(
    `INSERT INTO admins (username, password_hash) VALUES ('testadmin', $1)
     ON CONFLICT (username) DO UPDATE SET password_hash = $1`,
    [hash]
  )
  const res = await app.request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testadmin', password: 'testpass' }),
  })
  const body = await res.json() as { success: boolean; data?: { token: string } }
  if (!body.success || !body.data?.token) throw new Error('getAdminToken: login failed')
  return body.data.token
}

afterAll(async () => {
  await pool.end()
})
