import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index.js'
import { resetTables, query } from './setup.js'

async function insertNews(overrides: Partial<{
  title: string; slug: string; category: string; published_at: string
}> = {}) {
  const slug = overrides.slug ?? `test-article-${Date.now()}-${Math.random()}`
  const { rows } = await query<{ id: string }>(
    `INSERT INTO news (title, slug, category, published_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [overrides.title ?? 'Test Article', slug,
     overrides.category ?? '资讯', overrides.published_at ?? new Date().toISOString()]
  )
  return { id: rows[0].id, slug }
}

describe('GET /api/news', () => {
  beforeEach(() => resetTables('news'))

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
})

describe('GET /api/news/:slug', () => {
  beforeEach(() => resetTables('news'))

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
})
