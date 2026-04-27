import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, it, expect, beforeEach } from 'vitest'
import { importGeneratedNews } from '../../src/lib/news-generation/importGenerated.js'
import { insertTeam, insertTournament, query, resetTables } from '../setup.js'

async function insertFinishedMatch() {
  const tournamentId = await insertTournament()
  const teamA = await insertTeam({ name: 'Alpha' })
  const teamB = await insertTeam({ name: 'Beta' })
  const { rows } = await query<{ id: string }>(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status, maps_won_a, maps_won_b)
     VALUES ($1,$2,$3,'finished',1,0)
     RETURNING id`,
    [tournamentId, teamA, teamB],
  )
  return rows[0].id
}

describe('importGeneratedNews', () => {
  beforeEach(() => resetTables('news', 'matches', 'teams', 'tournaments'))

  it('overwrites an existing AI recap while preserving id, slug, and published_at', async () => {
    const matchId = await insertFinishedMatch()
    const publishedAt = '2026-04-26T00:00:00.000Z'
    const { rows: [existing] } = await query<{ id: string; slug: string }>(
      `INSERT INTO news
         (title, slug, summary, content, category, match_id, author, published_at, ai_generated)
       VALUES ('old', 'old-slug', 'old summary', 'old content', '战报', $1, 'ALAST 解说团', $2, true)
       RETURNING id, slug`,
      [matchId, publishedAt],
    )
    const dir = await mkdtemp(join(tmpdir(), 'alast-news-'))
    const file = join(dir, 'generated.jsonl')
    await writeFile(file, `${JSON.stringify({
      match_id: matchId,
      title: '新标题 quad',
      summary: 'Flet4 force_clutch + quad',
      content: 'pistol 双吃后 eco win，不是 full buy；Kaumi 双 clutch。',
      generation_meta: {
        model: 'gpt-5.5',
        prompt_version: 'offline-v1',
        generated_at: '2026-04-26T01:00:00.000Z',
        facts_hash: 'abc',
        retry_count: 0,
        warnings: [],
      },
    })}\n`, 'utf8')

    const result = await importGeneratedNews(file)

    expect(result.updated).toBe(1)
    const { rows: [news] } = await query<{
      id: string
      slug: string
      title: string
      summary: string
      content: string
      published_at: string
      generation_meta: { model: string }
    }>('SELECT * FROM news WHERE match_id = $1', [matchId])
    expect(news.id).toBe(existing.id)
    expect(news.slug).toBe(existing.slug)
    expect(news.title).toBe('新标题四杀')
    expect(news.summary).toBe('Flet4 强起残局四杀')
    expect(news.content).toBe('手枪局双吃后经济局胜利，不是全甲长枪；Kaumi 双残局。')
    expect(new Date(news.published_at).toISOString()).toBe(publishedAt)
    expect(news.generation_meta.model).toBe('gpt-5.5')
  })
})
