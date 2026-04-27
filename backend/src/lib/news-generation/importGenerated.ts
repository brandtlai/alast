import { readFile } from 'node:fs/promises'
import { query } from '../../db.js'
import type { GenerationMeta } from './types.js'
import { normalizeGeneratedNewsText } from './text.js'

interface GeneratedArticle {
  match_id: string
  title: string
  summary: string
  content: string
  generation_meta: GenerationMeta
}

function assertArticle(value: unknown): asserts value is GeneratedArticle {
  const article = value as Partial<GeneratedArticle>
  if (!article.match_id || !article.title || !article.summary || !article.content || !article.generation_meta) {
    throw new Error('generated article requires match_id, title, summary, content, and generation_meta')
  }
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80)
    + '-' + Date.now().toString(36)
}

export async function importGeneratedNews(filePath: string): Promise<{ updated: number; inserted: number }> {
  const raw = await readFile(filePath, 'utf8')
  const articles = raw.split('\n').map(line => line.trim()).filter(Boolean).map(line => JSON.parse(line) as unknown)
  let updated = 0
  let inserted = 0
  const seen = new Set<string>()

  for (const value of articles) {
    assertArticle(value)
    if (seen.has(value.match_id)) throw new Error(`duplicate generated article for match_id ${value.match_id}`)
    seen.add(value.match_id)
    const normalized = {
      title: normalizeGeneratedNewsText(value.title),
      summary: normalizeGeneratedNewsText(value.summary),
      content: normalizeGeneratedNewsText(value.content),
    }

    const { rows: existing } = await query<{ id: string }>(
      'SELECT id FROM news WHERE match_id = $1 AND ai_generated = TRUE LIMIT 1',
      [value.match_id],
    )
    if (existing[0]) {
      await query(
        `UPDATE news
         SET title = $1,
             summary = $2,
             content = $3,
             author = 'ALAST 解说团',
             category = '战报',
             ai_generated = TRUE,
             generation_meta = $4
         WHERE id = $5`,
        [normalized.title, normalized.summary, normalized.content, JSON.stringify(value.generation_meta), existing[0].id],
      )
      updated += 1
    } else {
      await query(
        `INSERT INTO news
           (title, slug, summary, content, category, match_id, author,
            ai_generated, generation_meta, published_at)
         VALUES ($1,$2,$3,$4,'战报',$5,'ALAST 解说团',TRUE,$6,NULL)`,
        [normalized.title, slugify(normalized.title), normalized.summary, normalized.content, value.match_id, JSON.stringify(value.generation_meta)],
      )
      inserted += 1
    }
  }

  return { updated, inserted }
}
