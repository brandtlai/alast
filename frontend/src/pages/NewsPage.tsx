// src/pages/NewsPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { useNewsList } from '../api/news'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import { TacticalLabel } from '../components/hud/TacticalLabel'

const CATEGORIES = ['', '战报', '资讯', '专访']
const CATEGORY_LABELS: Record<string, string> = {
  '':   '全部',
  '战报': '战报',
  '资讯': '资讯',
  '专访': '专访',
}

export default function NewsPage() {
  const [category, setCategory] = useState('')
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null)
  const { data: articles, isLoading, error } = useNewsList({ category: category || undefined })

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '64px 32px 24px', maxWidth: 960, margin: '0 auto' }}>
        <TacticalLabel text="SECTOR :: DISPATCH" />
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-display-lg)',
          color: 'var(--color-fg)',
          margin: '12px 0 0',
          lineHeight: 1,
        }}>
          新闻
        </h1>
      </div>

      {/* Filter bar */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px 32px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${category === c ? 'var(--color-data)' : 'var(--color-line)'}`,
              background: category === c ? 'rgba(199,255,61,0.08)' : 'transparent',
              color: category === c ? 'var(--color-data)' : 'var(--color-fg-muted)',
              cursor: 'pointer',
              transition: 'border-color var(--duration-fast) var(--ease-mech), color var(--duration-fast) var(--ease-mech)',
            }}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Article list */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px 96px' }}>
        {isLoading && <Spinner />}
        {error && <ErrorBox message={error.message} />}
        {articles && (
          articles.length === 0
            ? (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-dim)' }}>
                暂无文章
              </p>
            )
            : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {articles.map(a => (
                  <li
                    key={a.slug}
                    style={{ borderBottom: '1px solid var(--color-line)', padding: '32px 0' }}
                  >
                    <header style={{
                      display: 'flex',
                      gap: 16,
                      alignItems: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-mono-sm)',
                      color: 'var(--color-fg-muted)',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                    }}>
                      {a.category && <span>{a.category}</span>}
                      <span style={{ color: 'var(--color-data)' }}>
                        {dayjs(a.published_at).format('YYYY.MM.DD')}
                      </span>
                      {a.author && <span>{a.author.toUpperCase()}</span>}
                    </header>
                    <Link
                      to={`/news/${a.slug}`}
                      onMouseEnter={() => setHoveredSlug(a.slug)}
                      onMouseLeave={() => setHoveredSlug(null)}
                      style={{
                        display: 'block',
                        marginTop: 12,
                        color: hoveredSlug === a.slug ? 'var(--color-data)' : 'var(--color-fg)',
                        textDecoration: 'none',
                        fontFamily: 'var(--font-serif)',
                        fontSize: 32,
                        fontWeight: 700,
                        lineHeight: 1.25,
                        transition: 'color var(--duration-fast) var(--ease-mech)',
                      }}
                    >
                      {a.title}
                    </Link>
                    {a.summary && (
                      <p style={{
                        marginTop: 12,
                        color: 'var(--color-fg-muted)',
                        maxWidth: '65ch',
                        lineHeight: 1.7,
                        fontSize: 15,
                        margin: '12px 0 0',
                      }}>
                        {a.summary}
                      </p>
                    )}
                    {a.match && (
                      <div style={{
                        marginTop: 12,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--text-mono-sm)',
                        color: 'var(--color-fg-dim)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}>
                        {(a.match.stage ?? '比赛').toUpperCase()} · {a.match.team_a_name ?? 'TBD'} vs {a.match.team_b_name ?? 'TBD'} · {a.match.final_score}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )
        )}
      </div>
    </div>
  )
}
