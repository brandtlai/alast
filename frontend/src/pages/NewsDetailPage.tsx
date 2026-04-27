// src/pages/NewsDetailPage.tsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dayjs from 'dayjs'
import { useNewsArticle } from '../api/news'
import { useMatchMaps, useMapRounds, useMapStats } from '../api/matches'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import MapPicker from '../components/match/MapPicker'
import RoundTimeline from '../components/match/RoundTimeline'
import Scoreboard from '../components/match/Scoreboard'
import { TacticalLabel } from '../components/hud/TacticalLabel'

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: article, isLoading, error } = useNewsArticle(slug!)
  const matchId = article?.match?.id
  const { data: maps = [] } = useMatchMaps(matchId)
  const [selectedMapId, setSelectedMapId] = useState('')

  useEffect(() => {
    if (!matchId) {
      setSelectedMapId('')
      return
    }
    if (!selectedMapId && maps.length > 0) {
      const first = maps.find(m => m.score_a !== null) ?? maps[0]
      setSelectedMapId(first.id)
    }
  }, [maps, matchId, selectedMapId])

  const selectedMap = maps.find(m => m.id === selectedMapId) ?? null
  const { data: stats = [] } = useMapStats(matchId, selectedMapId || undefined)
  const { data: rounds = [] } = useMapRounds(matchId, selectedMapId || undefined)

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error.message} />
  if (!article) return null

  return (
    <article style={{ maxWidth: 720, margin: '0 auto', padding: '96px 24px' }}>
      {/* Back link */}
      <Link
        to="/news"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-mono-xs)',
          color: 'var(--color-fg-muted)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          textDecoration: 'none',
        }}
      >
        ← BACK TO DISPATCH
      </Link>

      {/* Category label */}
      <div style={{ marginTop: 24 }}>
        <TacticalLabel text={`DISPATCH :: ${article.category?.toUpperCase() ?? 'ARTICLE'}`} />
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 'var(--text-display-lg)',
        fontWeight: 900,
        lineHeight: 1.15,
        marginTop: 16,
        color: 'var(--color-fg)',
      }}>
        {article.title}
      </h1>

      {/* Meta row */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 16,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-sm)',
        color: 'var(--color-fg-muted)',
      }}>
        <span>{dayjs(article.published_at).format('YYYY.MM.DD')}</span>
        {article.author && <span>{article.author}</span>}
      </div>

      {/* Cover image */}
      {article.cover_image_url && (
        <img
          src={article.cover_image_url}
          alt=""
          style={{ width: '100%', marginTop: 32, borderRadius: 'var(--radius-sm)' }}
        />
      )}

      {/* Linked match banner */}
      {article.match && (
        <div style={{
          marginTop: 32,
          padding: '16px 20px',
          border: '1px solid var(--color-line-strong)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-xs)',
              color: 'var(--color-fg-dim)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              {(article.match.stage ?? '比赛').toUpperCase()} · {article.match.final_score}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              color: 'var(--color-fg)',
              fontWeight: 700,
            }}>
              {article.match.team_a_name ?? 'TBD'} vs {article.match.team_b_name ?? 'TBD'}
            </div>
          </div>
          <Link
            to={`/matches/${article.match.id}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-xs)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--color-data)',
              textDecoration: 'none',
              border: '1px solid var(--color-data)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            查看比赛数据
          </Link>
        </div>
      )}

      {/* In-article match data (scoreboard + round timeline) */}
      {article.match && selectedMap && (
        <section style={{
          marginTop: 48,
          border: '1px solid var(--color-line)',
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-xs)',
                color: 'var(--color-fg-dim)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}>
                比赛经过 / 最终数据
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg)', fontWeight: 700 }}>
                {article.match.team_a_name ?? 'TBD'} vs {article.match.team_b_name ?? 'TBD'}
              </div>
              <div style={{
                marginTop: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-xs)',
                color: 'var(--color-fg-dim)',
                letterSpacing: '0.1em',
              }}>
                {(article.match.stage ?? '比赛').toUpperCase()} · {selectedMap.map_name.replace('de_', '').toUpperCase()} · {selectedMap.score_a ?? 0}–{selectedMap.score_b ?? 0}
              </div>
            </div>
            {maps.length > 1 && (
              <div style={{ minWidth: 240 }}>
                <MapPicker maps={maps} selectedId={selectedMapId} onSelect={setSelectedMapId} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-xs)',
                color: 'var(--color-fg-dim)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                {selectedMap.map_name.replace('de_', '').toUpperCase()} Scoreboard
              </div>
              <Scoreboard
                players={stats}
                teamAId={article.match.team_a_id}
                teamBId={article.match.team_b_id}
                teamAName={article.match.team_a_name ?? 'Team A'}
                teamBName={article.match.team_b_name ?? 'Team B'}
                rounds={rounds}
              />
            </div>
            <RoundTimeline
              rounds={rounds}
              teamAName={article.match.team_a_name ?? 'Team A'}
              teamBName={article.match.team_b_name ?? 'Team B'}
              teamAId={article.match.team_a_id}
              teamBId={article.match.team_b_id}
              players={stats}
            />
          </div>
        </section>
      )}

      {/* Article body */}
      {article.content && (
        <div style={{ marginTop: 32, maxWidth: '65ch' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p:  (p) => <p {...p} style={{ marginTop: 20, lineHeight: 1.85, color: 'var(--color-fg)' }} />,
              h2: (p) => <h2 {...p} style={{ marginTop: 48, marginBottom: 8, fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--color-fg)' }} />,
              h3: (p) => <h3 {...p} style={{ marginTop: 36, marginBottom: 8, fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--color-fg)' }} />,
              a:  (p) => <a {...p} style={{ color: 'var(--color-data)', textDecoration: 'underline' }} />,
              code: (p) => <code {...p} style={{ fontFamily: 'var(--font-mono)', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }} />,
              blockquote: (p) => <blockquote {...p} style={{ marginTop: 24, paddingLeft: 16, borderLeft: '2px solid var(--color-data)', color: 'var(--color-fg-muted)', fontStyle: 'italic' }} />,
            }}
          >
            {article.content}
          </ReactMarkdown>
        </div>
      )}

      {article.ai_generated && (
        <p style={{
          marginTop: 32,
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-mono-xs)',
          color: 'var(--color-fg-dim)',
          fontStyle: 'italic',
        }}>
          本文由 AI 模仿「玩机器」解说风格生成，仅为致敬，与本人无关。
        </p>
      )}

      {/* Match link footer */}
      {article.match && (
        <div style={{ marginTop: 48 }}>
          <Link
            to={`/matches/${article.match.id}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--color-data)',
              textDecoration: 'none',
            }}
          >
            返回本场比赛数据 →
          </Link>
        </div>
      )}
    </article>
  )
}
