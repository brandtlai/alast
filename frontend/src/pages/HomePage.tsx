// frontend/src/pages/HomePage.tsx
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { DataReadout } from '../components/hud/DataReadout'
import { ScanLine } from '../components/hud/ScanLine'
import { StatusDot } from '../components/hud/StatusDot'
import { hudEnter, hudStagger } from '../design/motion'
import { useMatches } from '../api/matches'
import { useCurrentTournament } from '../api/currentTournament'
import { useStandings } from '../api/tournaments'
import { useNewsList } from '../api/news'
import { useTournamentSummary } from '../api/stats'
import type { Match, NewsArticle } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function useLiveCountdown(targetIso: string | null | undefined) {
  const [label, setLabel] = useState('T-00:00:00')
  useEffect(() => {
    if (!targetIso) return
    const tick = () => {
      const diff = new Date(targetIso).getTime() - Date.now()
      if (diff <= 0) { setLabel('T-00:00:00'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setLabel(`T-${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [targetIso])
  return label
}

function featuredLabel(match: Match): string {
  if (match.status === 'live') {
    const map = match.maps?.[0]?.map_name ?? 'UNKNOWN'
    return `LIVE :: ${map.toUpperCase()}`
  }
  if (match.status === 'upcoming') {
    return 'UPCOMING :: SCHEDULED'
  }
  const map = match.maps?.[0]?.map_name ?? 'COMPLETED'
  return `RESULT :: ${map.toUpperCase()}`
}

// ── Section 1: Hero ───────────────────────────────────────────────────────────

interface HeroSectionProps {
  featured: Match | null
}

function HeroSection({ featured }: HeroSectionProps) {
  const countdown = useLiveCountdown(
    featured?.status === 'upcoming' ? featured.scheduled_at : null
  )
  const label = featured ? featuredLabel(featured) : 'FEATURED // —'
  const teamA = featured?.team_a_name ?? '—'
  const teamB = featured?.team_b_name ?? '—'
  const matchId = featured?.id ?? ''

  const [ctaHover, setCtaHover] = useState(false)

  return (
    <section>
      {/* Full-bleed brand hero — ~85vh, image is self-contained, no overlay UI */}
      <div style={{
        position: 'relative',
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        height: 'min(85vh, 1080px)',
        overflow: 'hidden',
        borderBottom: '1px solid var(--color-line)',
      }}>
        <img
          src="/images/alast-hero.png"
          alt="ALAST Premier 2026 — Born to Win. Play as One."
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />
        {/* Subtle dark gradient at bottom for separation from page below */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 160,
          background: 'linear-gradient(180deg, transparent 0%, var(--color-bg) 100%)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Featured match block — second screen below the hero image */}
      <div style={{ padding: '64px 32px', maxWidth: 1280, margin: '0 auto' }}>
        <HudPanel style={{ padding: 48 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <TacticalLabel
              key={matchId}
              text={label}
              typewriter
            />

            {/* Team names */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-display-xl)',
                  fontStyle: 'italic',
                  color: 'var(--color-fg)',
                  lineHeight: 1,
                  flex: '1 1 auto',
                  textAlign: 'right',
                }}
              >
                {teamA}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'clamp(20px, 3vw, 36px)',
                  color: 'var(--color-fg-muted)',
                  letterSpacing: '0.2em',
                  flexShrink: 0,
                }}
              >
                VS
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-display-xl)',
                  fontStyle: 'italic',
                  color: 'var(--color-fg)',
                  lineHeight: 1,
                  flex: '1 1 auto',
                }}
              >
                {teamB}
              </span>
            </div>

            {/* Match time */}
            {featured?.scheduled_at && (
              <DataReadout
                value={formatTime(featured.scheduled_at)}
                size={24}
                color="var(--color-fg-muted)"
              />
            )}

            {/* Score for finished/live */}
            {featured && featured.status !== 'upcoming' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DataReadout value={featured.maps_won_a} size={32} />
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-fg-dim)' }}>:</span>
                <DataReadout value={featured.maps_won_b} size={32} />
              </div>
            )}

            {/* Countdown — upcoming only */}
            {featured?.status === 'upcoming' && (
              <DataReadout value={countdown} size={18} color="var(--color-fg-muted)" />
            )}

            {/* CTA */}
            {matchId && (
              <Link
                to={`/matches/${matchId}`}
                onMouseEnter={() => setCtaHover(true)}
                onMouseLeave={() => setCtaHover(false)}
                style={{
                  display: 'inline-block',
                  alignSelf: 'flex-start',
                  border: '1px solid var(--color-fire)',
                  padding: '12px 20px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-sm)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  color: ctaHover ? '#fff' : 'var(--color-fire)',
                  background: ctaHover ? 'var(--color-fire)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background var(--duration-mid) var(--ease-hud), color var(--duration-mid) var(--ease-hud)',
                }}
              >
                查看战报 →
              </Link>
            )}
          </div>
        </HudPanel>
      </div>
    </section>
  )
}

// ── Section 2: Live / Upcoming row ───────────────────────────────────────────

function matchStatusKind(m: Match): 'live' | 'upcoming' | 'completed' {
  if (m.status === 'live') return 'live'
  if (m.status === 'upcoming') return 'upcoming'
  return 'completed'
}

interface MatchCardProps {
  match: Match
}

function MatchCard({ match }: MatchCardProps) {
  const statusKind = matchStatusKind(match)
  const isLive = statusKind === 'live'
  return (
    <motion.div variants={hudEnter} style={{ flex: '1 1 280px' }}>
      <HudPanel style={{ padding: 20, position: 'relative', overflow: 'hidden', minHeight: 120 }}>
        {/* Scan line for live cards */}
        {isLive && <ScanLine />}

        {/* Status row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <StatusDot status={statusKind} size={8} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-xs)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: isLive ? 'var(--color-alert)' : 'var(--color-fg-muted)',
            }}
          >
            {statusKind}
          </span>
        </div>

        {/* Teams + score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-mono-md)',
              color: 'var(--color-fg)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {match.team_a_name ?? '—'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <DataReadout value={match.maps_won_a} size={16} />
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-fg-dim)', fontSize: 14 }}>:</span>
            <DataReadout value={match.maps_won_b} size={16} />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-mono-md)',
              color: 'var(--color-fg)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textAlign: 'right',
            }}
          >
            {match.team_b_name ?? '—'}
          </span>
        </div>

        {/* Map name */}
        {match.maps && match.maps.length > 0 && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              color: 'var(--color-fg-muted)',
              marginTop: 8,
            }}
          >
            {match.maps[0].map_name}
          </div>
        )}

        {/* Stage label fallback */}
        {(!match.maps || match.maps.length === 0) && match.stage && (
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              color: 'var(--color-fg-muted)',
              marginTop: 8,
            }}
          >
            {match.stage}
          </div>
        )}
      </HudPanel>
    </motion.div>
  )
}

interface LiveRowProps {
  matches: Match[]
}

function LiveUpcomingRow({ matches }: LiveRowProps) {
  const shown = matches.slice(0, 4)
  if (shown.length === 0) return null
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
      <motion.div
        variants={hudStagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}
      >
        {shown.map(m => <MatchCard key={m.id} match={m} />)}
      </motion.div>
    </section>
  )
}

// ── Section 3: Standings + Recent results ────────────────────────────────────

interface StandingsRecentProps {
  tournamentId: string | undefined
  recentFinished: Match[]
}

function StandingsAndRecent({ tournamentId, recentFinished }: StandingsRecentProps) {
  const { data: standings } = useStandings(tournamentId)

  return (
    <section
      style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 32px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 32,
      }}
      className="standings-grid"
    >
      {/* Standings */}
      <HudPanel label="积分榜" style={{ padding: 24 }}>
        <TacticalLabel text="STANDINGS" />
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-mono-sm)',
          }}
        >
          <thead>
            <tr>
              {['#', '队伍', 'W', 'L', 'PTS'].map(h => (
                <th
                  key={h}
                  style={{
                    textAlign: h === '队伍' ? 'left' : 'center',
                    color: 'var(--color-fg-muted)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 400,
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--color-line)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(standings ?? []).map((row, idx) => (
              <tr
                key={row.team_id}
                style={{
                  borderLeft: idx === 0 ? '2px solid var(--color-gold-2)' : '2px solid transparent',
                }}
              >
                <td style={{ textAlign: 'center', padding: '8px 4px', color: 'var(--color-fg-muted)' }}>
                  {idx === 0
                    ? <img src="/trophy.png" width={14} height={14} alt="" style={{ display: 'inline-block', verticalAlign: 'middle', filter: 'drop-shadow(0 0 4px rgba(255,184,0,0.5))' }} />
                    : <DataReadout value={idx + 1} size={12} color="var(--color-fg-dim)" />}
                </td>
                <td style={{ padding: '8px 4px', color: 'var(--color-fg)' }}>
                  {row.team_logo_url && (
                    <img
                      src={row.team_logo_url}
                      alt=""
                      style={{ width: 16, height: 16, objectFit: 'contain', display: 'inline', marginRight: 6, verticalAlign: 'middle' }}
                    />
                  )}
                  {row.team_short_name ?? row.team_name}
                </td>
                <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                  <DataReadout value={row.wins} size={12} color="var(--color-data)" />
                </td>
                <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                  <DataReadout value={row.losses} size={12} color="var(--color-fg-dim)" />
                </td>
                <td style={{ textAlign: 'center', padding: '8px 4px' }}>
                  <DataReadout value={row.buchholz} size={12} color="var(--color-fg-muted)" />
                </td>
              </tr>
            ))}
            {(!standings || standings.length === 0) && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-fg-dim)', padding: '16px 0' }}>
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </HudPanel>

      {/* Recent results */}
      <HudPanel label="近期战报" style={{ padding: 24 }}>
        <TacticalLabel text="RECENT RESULTS" />
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {recentFinished.slice(0, 5).map(m => {
            const aWon = m.maps_won_a > m.maps_won_b
            return (
              <Link
                key={m.id}
                to={`/matches/${m.id}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr auto 1fr',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--color-line)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', color: 'var(--color-fg-dim)' }}>
                  {formatDate(m.finished_at ?? m.scheduled_at)}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-mono-sm)',
                    textAlign: 'right',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: aWon ? 'var(--color-data)' : 'var(--color-fg-dim)',
                  }}
                >
                  {m.team_a_name ?? '—'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <DataReadout value={m.maps_won_a} size={13} color={aWon ? 'var(--color-data)' : 'var(--color-fg-dim)'} />
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-fg-dim)', fontSize: 12 }}>:</span>
                  <DataReadout value={m.maps_won_b} size={13} color={!aWon ? 'var(--color-data)' : 'var(--color-fg-dim)'} />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-mono-sm)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: !aWon ? 'var(--color-data)' : 'var(--color-fg-dim)',
                  }}
                >
                  {m.team_b_name ?? '—'}
                </span>
              </Link>
            )
          })}
          {recentFinished.length === 0 && (
            <span style={{ color: 'var(--color-fg-dim)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)' }}>
              暂无战报
            </span>
          )}
        </div>
      </HudPanel>

      <style>{`
        @media (max-width: 720px) {
          .standings-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  )
}

// ── Section 4: KPI quad ───────────────────────────────────────────────────────

interface KpiPanelProps {
  label: string
  value: number | string
}

function KpiPanel({ label, value }: KpiPanelProps) {
  return (
    <motion.div variants={hudEnter}>
      <HudPanel staticCorners style={{ padding: 32 }}>
        <TacticalLabel text={label} />
        <div style={{ marginTop: 12 }}>
          <DataReadout value={value} size={48} />
        </div>
      </HudPanel>
    </motion.div>
  )
}

interface KpiQuadProps {
  tournamentId: string | undefined
}

function KpiQuad({ tournamentId }: KpiQuadProps) {
  // TODO: wire to /api/stats/summary when a dedicated summary endpoint is available
  // Spec §7.1 KPI quad — currently using /api/stats/tournament-summary which returns
  // matches_played, total_kills, avg_headshot_pct (no clutches / avg match time yet)
  const { data: summary } = useTournamentSummary(tournamentId)

  const kpis: KpiPanelProps[] = [
    { label: 'ROUNDS PLAYED', value: summary?.matches_played ?? 0 },
    { label: 'TOTAL KILLS',   value: summary?.total_kills ?? 0 },
    { label: 'CLUTCHES',      value: 0 }, // TODO: wire to /api/stats/summary clutches field
    { label: 'AVG MATCH TIME', value: '—' }, // TODO: wire to /api/stats/summary avg_match_time field
  ]

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
      <motion.div
        variants={hudStagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}
        className="kpi-grid"
      >
        {kpis.map(k => <KpiPanel key={k.label} {...k} />)}
      </motion.div>
      <style>{`
        @media (max-width: 720px) {
          .kpi-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

// ── Section 5: News strip ────────────────────────────────────────────────────

function NewsStrip() {
  const { data: newsItems } = useNewsList({ limit: 3 })
  const shown = newsItems?.slice(0, 3) ?? []

  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px' }}>
      <TacticalLabel text="DISPATCH // LATEST" />
      <div
        style={{
          marginTop: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}
        className="news-grid"
      >
        {shown.map(article => (
          <NewsCard key={article.id} article={article} />
        ))}
        {shown.length === 0 &&
          [0, 1, 2].map(i => (
            <HudPanel key={i} style={{ padding: 20, minHeight: 80 }}>
              <span style={{ color: 'var(--color-fg-dim)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)' }}>
                暂无新闻
              </span>
            </HudPanel>
          ))
        }
      </div>
      <style>{`
        @media (max-width: 720px) {
          .news-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}

function NewsCard({ article }: { article: NewsArticle }) {
  const [hover, setHover] = useState(false)
  return (
    <Link
      to={`/news/${article.slug}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ textDecoration: 'none' }}
    >
      <HudPanel style={{ padding: 20, height: '100%' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-mono-xs)',
            color: 'var(--color-fg-dim)',
            letterSpacing: '0.12em',
            marginBottom: 8,
          }}
        >
          {formatDate(article.published_at)}
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 24,
            fontWeight: 700,
            color: hover ? 'var(--color-data)' : 'var(--color-fg)',
            margin: 0,
            lineHeight: 1.4,
            transition: 'color var(--duration-mid) var(--ease-hud)',
          }}
        >
          {article.title}
        </h3>
      </HudPanel>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { data: tournament } = useCurrentTournament()
  const tournamentId = tournament?.id

  const { data: allMatches } = useMatches()

  // Featured: live first, then upcoming soonest, then most recently finished
  const featured = useRef<Match | null>(null)
  if (allMatches) {
    const live = allMatches.find(m => m.status === 'live')
    if (live) {
      featured.current = live
    } else {
      const upcoming = allMatches
        .filter(m => m.status === 'upcoming' && m.scheduled_at)
        .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0]
      if (upcoming) {
        featured.current = upcoming
      } else {
        const finished = allMatches
          .filter(m => m.status === 'finished' && m.finished_at)
          .sort((a, b) => new Date(b.finished_at!).getTime() - new Date(a.finished_at!).getTime())[0]
        featured.current = finished ?? null
      }
    }
  }

  // Live + upcoming for row (exclude featured)
  const liveUpcoming = (allMatches ?? [])
    .filter(m => (m.status === 'live' || m.status === 'upcoming') && m.id !== featured.current?.id)
    .slice(0, 4)

  // Recent finished
  const recentFinished = (allMatches ?? [])
    .filter(m => m.status === 'finished')
    .sort((a, b) => {
      const ta = a.finished_at ?? a.scheduled_at ?? ''
      const tb = b.finished_at ?? b.scheduled_at ?? ''
      return tb.localeCompare(ta)
    })
    .slice(0, 5)

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        minHeight: '100vh',
        color: 'var(--color-fg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 96,
        paddingBottom: 96,
      }}
    >
      {/* Section 1: Hero */}
      <HeroSection featured={featured.current} />

      {/* Section 2: Live / upcoming row */}
      {liveUpcoming.length > 0 && <LiveUpcomingRow matches={liveUpcoming} />}

      {/* Section 3: Standings + recent results */}
      <StandingsAndRecent tournamentId={tournamentId} recentFinished={recentFinished} />

      {/* Section 4: KPI quad */}
      <KpiQuad tournamentId={tournamentId} />

      {/* Section 5: News strip */}
      <NewsStrip />
    </div>
  )
}
