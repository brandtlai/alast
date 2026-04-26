import { pool } from '../src/db.js'
import { importGeneratedNews } from '../src/lib/news-generation/importGenerated.js'

async function main() {
  const input = process.argv[2]
  if (!input) throw new Error('Usage: npx tsx scripts/import-generated-news.ts <generated-news.jsonl>')
  const result = await importGeneratedNews(input)
  console.log(`updated=${result.updated} inserted=${result.inserted}`)
}

main()
  .catch(err => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
