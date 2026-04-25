// backend/scripts/backfill-bracket-fields.ts
import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const q = (sql: string, p?: unknown[]) => pool.query(sql, p)

async function main() {
  const stageMap: Array<{ stage: string; bracket_kind: string; bracket_round: number }> = [
    { stage: '小组赛 R1', bracket_kind: 'swiss', bracket_round: 1 },
    { stage: '小组赛 R2', bracket_kind: 'swiss', bracket_round: 2 },
    { stage: '小组赛 R3', bracket_kind: 'swiss', bracket_round: 3 },
    { stage: '胜者组 QF', bracket_kind: 'ub',    bracket_round: 1 },
    { stage: '胜者组 SF', bracket_kind: 'ub',    bracket_round: 2 },
    { stage: '胜者组 Final', bracket_kind: 'ub', bracket_round: 3 },
    { stage: '败者组 R1',    bracket_kind: 'lb', bracket_round: 1 },
    { stage: '败者组 R2',    bracket_kind: 'lb', bracket_round: 2 },
    { stage: '败者组 R3',    bracket_kind: 'lb', bracket_round: 3 },
    { stage: '败者组 R4',    bracket_kind: 'lb', bracket_round: 4 },
    { stage: '败者组 Final', bracket_kind: 'lb', bracket_round: 5 },
    { stage: 'Grand Final',  bracket_kind: 'gf', bracket_round: 1 },
    { stage: 'GF',           bracket_kind: 'gf', bracket_round: 1 },
  ]

  for (const { stage, bracket_kind, bracket_round } of stageMap) {
    const { rowCount } = await q(
      `UPDATE matches SET bracket_kind = $1, bracket_round = $2
       WHERE stage = $3 AND bracket_kind IS NULL`,
      [bracket_kind, bracket_round, stage]
    )
    if (rowCount && rowCount > 0) console.log(`  ✓ ${stage} → ${bracket_kind} R${bracket_round} (${rowCount} rows)`)
  }

  await q(`UPDATE tournaments SET is_current = FALSE`)
  const { rowCount } = await q(
    `UPDATE tournaments SET is_current = TRUE WHERE name = 'ALAST Premier 2026'`
  )
  console.log(`\n✓ is_current set on ${rowCount} tournament(s)`)

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
