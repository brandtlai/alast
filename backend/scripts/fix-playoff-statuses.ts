/**
 * One-time fixup: the import-match-data script (pre-fix) flipped every match
 * with a new map to status='finished' regardless of whether the BO3 series was
 * actually complete. This recomputes status for the playoff matches just
 * seeded by scripts/seed-playoffs.ts.
 *
 * Run once: cd /opt/alast/backend && npx tsx scripts/fix-playoff-statuses.ts
 */
import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const { rows } = await pool.query<{
    id: string; best_of: number; maps_won_a: number; maps_won_b: number;
    status: string; stage: string | null;
  }>(`
    SELECT id, best_of, maps_won_a, maps_won_b, status, stage
    FROM matches
    WHERE bracket_kind IN ('ub','lb','gf')
  `)
  let updated = 0
  for (const m of rows) {
    const threshold = Math.ceil((m.best_of ?? 1) / 2)
    const finished = m.maps_won_a >= threshold || m.maps_won_b >= threshold
    const live = !finished && (m.maps_won_a + m.maps_won_b) > 0
    const correct = finished ? 'finished' : live ? 'live' : 'upcoming'
    if (m.status !== correct) {
      await pool.query(
        `UPDATE matches SET status = $1,
                            finished_at = CASE WHEN $1 = 'finished' THEN COALESCE(finished_at, now()) ELSE NULL END
         WHERE id = $2`,
        [correct, m.id]
      )
      console.log(`  ${m.stage} ${m.id}: ${m.status} → ${correct} (${m.maps_won_a}-${m.maps_won_b}, bo${m.best_of})`)
      updated++
    }
  }
  console.log(`\n${updated} match(es) updated.`)
  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
