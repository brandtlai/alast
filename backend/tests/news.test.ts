import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index.js'
import { resetTables, query } from './setup.js'

async function insertNews(overrides: Partial<{
  title: string; slug: string; category: string; published_at: string; match_id: string
}> = {}) {
  const slug = overrides.slug ?? `test-article-${Date.now()}-${Math.random()}`
  const { rows } = await query<{ id: string }>(
    `INSERT INTO news (title, slug, category, published_at, match_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [overrides.title ?? 'Test Article', slug,
     overrides.category ?? '资讯', overrides.published_at ?? new Date().toISOString(),
     overrides.match_id ?? null]
  )
  return { id: rows[0].id, slug }
}

async function insertMatchWithTeams() {
  const { rows: [teamA] } = await query<{ id: string }>(
    `INSERT INTO teams (name) VALUES ('Alpha') RETURNING id`,
  )
  const { rows: [teamB] } = await query<{ id: string }>(
    `INSERT INTO teams (name) VALUES ('Beta') RETURNING id`,
  )
  const { rows: [tournament] } = await query<{ id: string }>(
    `INSERT INTO tournaments (name, year) VALUES ('ALAST Premier', 2026) RETURNING id`,
  )
  const { rows: [match] } = await query<{ id: string }>(
    `INSERT INTO matches
       (tournament_id, team_a_id, team_b_id, status, stage, maps_won_a, maps_won_b)
     VALUES ($1,$2,$3,'finished','小组赛 R1',1,0)
     RETURNING id`,
    [tournament.id, teamA.id, teamB.id],
  )
  return match.id
}

describe('GET /api/news', () => {
  beforeEach(() => resetTables('news', 'matches', 'teams', 'tournaments'))

  it('returns paginated news list', async () => {
    await insertNews({ title: 'Article A' })
    await insertNews({ title: 'Article B' })
    const res = await app.request('/api/news?limit=1')
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toHaveLength(1)
  })

  it('filters by category', async () => {
    await insertNews({ category: '战报' })
    await insertNews({ category: '资讯' })
    const res = await app.request('/api/news?category=战报')
    const body = await res.json() as { data: { category: string }[] }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].category).toBe('战报')
  })

  it('embeds match card data for match-linked articles', async () => {
    const matchId = await insertMatchWithTeams()
    await insertNews({ title: 'Linked Recap', category: '战报', match_id: matchId })

    const res = await app.request('/api/news?category=战报')
    const body = await res.json() as { data: Array<{ match: { id: string; team_a_name: string; stage: string } | null }> }

    expect(body.data[0].match).toMatchObject({
      id: matchId,
      team_a_name: 'Alpha',
      stage: '小组赛 第一轮',
    })
  })
})

describe('GET /api/news/:slug', () => {
  beforeEach(() => resetTables('news', 'matches', 'teams', 'tournaments'))

  it('returns 404 for unknown slug', async () => {
    const res = await app.request('/api/news/no-such-article')
    expect(res.status).toBe(404)
  })

  it('returns article by slug', async () => {
    const { slug } = await insertNews({ title: 'Grand Final Recap' })
    const res = await app.request(`/api/news/${slug}`)
    const body = await res.json() as { data: { title: string } }
    expect(body.data.title).toBe('Grand Final Recap')
  })

  it('embeds match card data for a match-linked article', async () => {
    const matchId = await insertMatchWithTeams()
    const { slug } = await insertNews({ title: 'Linked Detail', category: '战报', match_id: matchId })

    const res = await app.request(`/api/news/${slug}`)
    const body = await res.json() as { data: { match: { id: string; team_b_name: string; final_score: string } | null } }

    expect(body.data.match).toMatchObject({
      id: matchId,
      team_b_name: 'Beta',
      final_score: '1-0',
    })
  })
})
