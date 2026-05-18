/**
 * Seeds the ALAST Premier 2026 playoff bracket matches:
 *   - Creates `matches` rows with bracket_kind / bracket_round / best_of=3
 *     for each playoff matchup that has either started or finished.
 *   - Idempotent: if a matching (team_a, team_b, bracket_kind, bracket_round)
 *     row already exists, this script does nothing for that slot.
 *
 * Also clears a single map that the May-18 batch import attached to a swiss
 * `matches` row by accident (before this playoff seed existed). Re-running
 * scripts/import-match-data.ts after this seed will re-attach it to the
 * correct playoff BO3 row.
 *
 * Run: cd /opt/alast/backend && npx tsx /home/ubuntu/alast/backend/scripts/seed-playoffs.ts
 */

import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const q = (sql: string, params?: unknown[]) => pool.query(sql, params)

type Kind = 'ub' | 'lb' | 'gf'

interface PlayoffMatch {
  label: string
  teamA: string
  teamB: string
  kind: Kind
  round: number
  scheduledAt: string
}

// All playoff matchups that have at least one map of data (finished or in-flight).
// Mapped from docs/playoff-bracket.json (M1..M13).
const PLAYOFF_MATCHES: PlayoffMatch[] = [
  { label: 'M1 UB R1',  teamA: '蓝色小药丸',           teamB: '没有人会一直等你除了老六', kind: 'ub', round: 1, scheduledAt: '2026-05-11T20:00:00+08:00' },
  { label: 'M2 UB R1',  teamA: 'CountryLove',         teamB: '干拉八条街',              kind: 'ub', round: 1, scheduledAt: '2026-05-11T20:00:00+08:00' },
  { label: 'M3 UB R1',  teamA: 'NTR',                 teamB: '英特尔首席科学家',         kind: 'ub', round: 1, scheduledAt: '2026-05-11T20:00:00+08:00' },
  { label: 'M4 UB R1',  teamA: '包包的',              teamB: 'vitALIty',                kind: 'ub', round: 1, scheduledAt: '2026-05-11T20:00:00+08:00' },
  { label: 'M5 LB R1',  teamA: '川姐你说对不队',       teamB: '冠军',                    kind: 'lb', round: 1, scheduledAt: '2026-05-11T20:00:00+08:00' },
  { label: 'M6 LB R1',  teamA: 'ShenT1Go',            teamB: '105 Thieves',             kind: 'lb', round: 1, scheduledAt: '2026-05-11T20:00:00+08:00' },
  { label: 'M7 LB R1',  teamA: '一路预瞄定吃闪队',     teamB: '达哥说的对不队',           kind: 'lb', round: 1, scheduledAt: '2026-05-11T20:00:00+08:00' },
  { label: 'M9 UB R2',  teamA: '英特尔首席科学家',     teamB: '包包的',                  kind: 'ub', round: 2, scheduledAt: '2026-05-18T20:00:00+08:00' },
  { label: 'M12 LB R2', teamA: 'ShenT1Go',            teamB: 'vitALIty',                kind: 'lb', round: 2, scheduledAt: '2026-05-15T20:00:00+08:00' },
  { label: 'M13 LB R2', teamA: 'NTR',                 teamB: '一路预瞄定吃闪队',         kind: 'lb', round: 2, scheduledAt: '2026-05-18T20:00:00+08:00' },
]

// match_maps row id that the prior import accidentally attached to a swiss
// R3 `matches` row (英特尔 vs 包包的). Cascade-deletes its stats / rounds /
// kills / clutches so the re-import can place it on the new UB R2 BO3 row.
const STRAY_MAP_ID = 'f0d2ee85-df75-4bb5-875f-92ce95002962'

async function resolveTeamId(name: string): Promise<string> {
  const { rows } = await q<{ id: string }>(
    `SELECT id FROM teams WHERE name = $1 LIMIT 1`, [name]
  )
  if (!rows[0]) throw new Error(`Team not found: ${name}`)
  return rows[0].id
}

async function currentTournament(): Promise<string> {
  const { rows } = await q<{ id: string }>(
    `SELECT id FROM tournaments WHERE is_current = TRUE LIMIT 1`
  )
  if (rows[0]) return rows[0].id
  // Fall back to season=2026 / most recent
  const { rows: r2 } = await q<{ id: string }>(
    `SELECT id FROM tournaments ORDER BY start_date DESC NULLS LAST LIMIT 1`
  )
  if (!r2[0]) throw new Error('No tournament found')
  return r2[0].id
}

async function findExistingPlayoff(
  teamA: string, teamB: string, kind: Kind, round: number
): Promise<string | null> {
  const { rows } = await q<{ id: string }>(
    `SELECT id FROM matches
     WHERE bracket_kind = $3 AND bracket_round = $4
       AND ((team_a_id = $1 AND team_b_id = $2) OR (team_a_id = $2 AND team_b_id = $1))
     LIMIT 1`,
    [teamA, teamB, kind, round]
  )
  return rows[0]?.id ?? null
}

async function insertPlayoff(
  tournamentId: string,
  teamAId: string,
  teamBId: string,
  pm: PlayoffMatch,
): Promise<string> {
  const stage = `淘汰赛 ${pm.kind.toUpperCase()} R${pm.round}`
  const { rows } = await q<{ id: string }>(
    `INSERT INTO matches (
       tournament_id, team_a_id, team_b_id,
       status, stage, scheduled_at,
       bracket_kind, bracket_round, best_of,
       maps_won_a, maps_won_b
     )
     VALUES ($1,$2,$3,'upcoming',$4,$5,$6,$7,3,0,0)
     RETURNING id`,
    [tournamentId, teamAId, teamBId, stage, pm.scheduledAt, pm.kind, pm.round]
  )
  return rows[0].id
}

async function main() {
  const tournamentId = await currentTournament()
  console.log(`Tournament: ${tournamentId}`)

  // 1. Detach the stray map first so re-import can place it correctly.
  const { rowCount } = await q(`DELETE FROM match_maps WHERE id = $1`, [STRAY_MAP_ID])
  console.log(`Stray match_map cleanup: ${rowCount} row(s) deleted`)

  // 2. Seed playoff matches.
  let created = 0, skipped = 0
  for (const pm of PLAYOFF_MATCHES) {
    const aId = await resolveTeamId(pm.teamA)
    const bId = await resolveTeamId(pm.teamB)
    const existing = await findExistingPlayoff(aId, bId, pm.kind, pm.round)
    if (existing) {
      console.log(`  ⏭  ${pm.label} ${pm.teamA} vs ${pm.teamB} — already exists (${existing})`)
      skipped++
      continue
    }
    const id = await insertPlayoff(tournamentId, aId, bId, pm)
    console.log(`  ✓ ${pm.label} ${pm.teamA} vs ${pm.teamB} — ${id}`)
    created++
  }
  console.log(`\nDone. ${created} created, ${skipped} already existed.`)
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
