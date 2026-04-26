import { writeFile } from 'node:fs/promises'
import { pool, query } from '../src/db.js'
import { extractMatchFacts } from '../src/lib/news-generation/facts.js'
import { hashFacts } from '../src/lib/news-generation/factsHash.js'

interface MatchIdRow {
  id: string
}

async function main() {
  const outputIndex = process.argv.indexOf('--output')
  const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null
  if (!output) throw new Error('Usage: npx tsx scripts/export-match-facts.ts --output <file.jsonl> [match-id]')
  const matchId = process.argv.find(arg => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(arg))
  const rows = matchId
    ? [{ id: matchId }]
    : (await query<MatchIdRow>(
        `SELECT id
         FROM matches
         WHERE status = 'finished'
         ORDER BY scheduled_at ASC NULLS LAST, id ASC`,
      )).rows

  const lines: string[] = []
  for (const row of rows) {
    const facts = await extractMatchFacts(row.id)
    lines.push(JSON.stringify({ match_id: row.id, facts_hash: hashFacts(facts), facts }))
  }
  await writeFile(output, `${lines.join('\n')}\n`, 'utf8')
  console.log(`exported ${lines.length} match fact packages to ${output}`)
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
