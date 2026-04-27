// src/pages/TeamDetailPage.tsx — Tactical OS re-skin (T21)
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import ReactECharts from 'echarts-for-react'
import { useTeam } from '../api/teams'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { DataReadout } from '../components/hud/DataReadout'
import { hudStagger, hudEnter } from '../design/motion'
import type { Match } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────────

function Label({ children }: { children: string }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-sm)',
        color: 'var(--color-fg-dim)',
        letterSpacing: '0.2em',
        textTransform: 'uppercase' as const,
      }}
    >
      {children}
    </span>
  )
}

function WLBadge({ win }: { win: boolean }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.15em',
        padding: '2px 6px',
        border: `1px solid ${win ? 'rgba(199,255,61,0.4)' : 'rgba(255,61,20,0.4)'}`,
        borderRadius: 'var(--radius-sm)',
        color: win ? 'var(--color-data)' : 'var(--color-fire)',
        background: win ? 'rgba(199,255,61,0.06)' : 'rgba(255,61,20,0.06)',
      }}
    >
      {win ? 'W' : 'L'}
    </span>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: team, isLoading, error } = useTeam(id!)

  if (isLoading) return <div style={{ padding: '64px 32px' }}><Spinner /></div>
  if (error)     return <div style={{ padding: '64px 32px' }}><ErrorBox message={error.message} /></div>
  if (!team)     return null

  const t = team as typeof team & {
    cn_name?: string | null
    wins?: number | null
    losses?: number | null
    rank?: number | null
    is_champion?: boolean
    coach?: string | null
    founded?: string | null
    championships?: Array<{ year: number; tournament?: string }>
  }

  const wins   = t.wins   ?? 0
  const losses = t.losses ?? 0
  const rank   = t.rank

  // Recent 5 matches
  const recentMatches = (t.recent_matches ?? []).slice(0, 5)

  // Build radar stats from players' aggregate data if available
  const players = t.players ?? []

  const hasRadarData = false // No per-team aggregate stat fields in current payload

  const radarOption = {
    backgroundColor: 'transparent',
    radar: {
      indicator: [
        { name: 'Rating',   max: 2 },
        { name: 'KDR',      max: 2 },
        { name: 'Win%',     max: 100 },
        { name: 'ADR',      max: 120 },
        { name: 'Clutches', max: 20 },
      ],
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisLine:  { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
      name: { textStyle: { color: 'var(--color-fg-muted)', fontFamily: 'JetBrains Mono', fontSize: 11 } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: hasRadarData ? [1.1, 1.1, 55, 80, 8] : [0, 0, 0, 0, 0],
        name: team.name,
        areaStyle: { color: 'rgba(199,255,61,0.18)' },
        lineStyle: { color: '#C7FF3D' },
      }],
    }],
  }

  return (
    <div>
      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '96px 32px 48px',
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: 48,
          alignItems: 'center',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        {/* Left — logo */}
        <div
          style={{
            width: 320,
            height: 320,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--color-line)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
          }}
        >
          {team.logo_url ? (
            <img
              src={team.logo_url}
              alt={team.name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
            />
          ) : (
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 64,
                color: 'var(--color-fg-dim)',
              }}
            >
              {team.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Right — meta */}
        <div>
          <TacticalLabel text={`TEAM :: ${team.id}`} />

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-display-xl)',
              lineHeight: 1,
              color: 'var(--color-fg)',
              margin: '8px 0 0',
            }}
          >
            {team.name}
          </h1>

          {t.cn_name && (
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                color: 'var(--color-fg-muted)',
                marginTop: 8,
              }}
            >
              {t.cn_name}
            </div>
          )}

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: 24,
              marginTop: 24,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              color: 'var(--color-fg-dim)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              alignItems: 'center',
            }}
          >
            <span>
              RECORD&nbsp;
              <DataReadout value={`${wins}W-${losses}L`} color="var(--color-fg)" />
            </span>
            {rank != null && (
              <span>
                RANK&nbsp;
                <DataReadout value={rank} pad={2} />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Three-column body ───────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr 280px',
          gap: 32,
          padding: '48px 32px',
          alignItems: 'start',
        }}
      >
        {/* Left — team meta */}
        <HudPanel staticCorners style={{ padding: 24 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '8px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
            }}
          >
            {t.coach != null && (
              <>
                <Label>COACH</Label>
                <span style={{ color: 'var(--color-fg)' }}>{t.coach || '—'}</span>
              </>
            )}
            {t.founded != null && (
              <>
                <Label>FOUNDED</Label>
                <span style={{ color: 'var(--color-fg)' }}>{t.founded || '—'}</span>
              </>
            )}
            {team.region != null && (
              <>
                <Label>REGION</Label>
                <span style={{ color: 'var(--color-fg)' }}>{team.region || '—'}</span>
              </>
            )}
            {team.short_name != null && (
              <>
                <Label>CODE</Label>
                <span style={{ color: 'var(--color-fg)' }}>{team.short_name}</span>
              </>
            )}
          </div>
        </HudPanel>

        {/* Center — player cards */}
        <div>
          {players.length > 0 ? (
            <>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  letterSpacing: '0.2em',
                  color: 'var(--color-data)',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}
              >
                [ROSTER]
              </div>
              <motion.div
                variants={hudStagger}
                initial="hidden"
                animate="show"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 16,
                }}
              >
                {players.map(p => (
                  <motion.div key={p.id} variants={hudEnter}>
                    <HudPanel style={{ padding: 16, textAlign: 'center' }}>
                      {/* Avatar */}
                      <div
                        style={{
                          width: 120,
                          height: 120,
                          margin: '0 auto 12px',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-line)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={p.nickname}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span
                            style={{
                              fontFamily: 'var(--font-display)',
                              fontSize: 32,
                              color: 'var(--color-fg-dim)',
                            }}
                          >
                            {p.nickname.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name */}
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 22,
                          lineHeight: 1.1,
                          color: 'var(--color-fg)',
                          marginBottom: 4,
                        }}
                      >
                        {p.nickname}
                      </div>

                      {/* Role */}
                      {p.role && (
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 'var(--text-mono-xs)',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            color: 'var(--color-fg-muted)',
                            marginBottom: 8,
                          }}
                        >
                          {p.role}
                        </div>
                      )}

                      {/* Rating placeholder — per-team roster has no rating in current payload */}
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-mono-xs)',
                          color: 'var(--color-fg-dim)',
                          letterSpacing: '0.1em',
                        }}
                      >
                        RATING&nbsp;
                        <DataReadout value={(p as any).rating != null ? (Number((p as any).rating)).toFixed(2) : '-'} />
                      </div>
                    </HudPanel>
                  </motion.div>
                ))}
              </motion.div>
            </>
          ) : (
            <HudPanel staticCorners style={{ padding: 24 }}>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-sm)',
                  color: 'var(--color-fg-dim)',
                  textAlign: 'center',
                }}
              >
                暂无阵容数据
              </p>
            </HudPanel>
          )}
        </div>

        {/* Right — recent matches + championships */}
        <HudPanel staticCorners style={{ padding: 24 }}>
          {recentMatches.length > 0 && (
            <>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  letterSpacing: '0.2em',
                  color: 'var(--color-fg-dim)',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                }}
              >
                RECENT 5
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentMatches.map((m: Match) => {
                  const isTeamA = m.team_a_id === team.id
                  const opponent = isTeamA ? (m.team_b_name ?? '?') : (m.team_a_name ?? '?')
                  const myScore  = isTeamA ? m.maps_won_a : m.maps_won_b
                  const oppScore = isTeamA ? m.maps_won_b : m.maps_won_a
                  const win      = myScore > oppScore

                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        padding: '6px 0',
                        borderBottom: '1px solid var(--color-line)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-mono-xs)',
                          color: 'var(--color-fg-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {opponent}
                      </span>
                      <WLBadge win={win} />
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--text-mono-xs)',
                          color: 'var(--color-fg-dim)',
                          flexShrink: 0,
                        }}
                      >
                        {myScore}–{oppScore}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Championships */}
          {(t.championships ?? []).length > 0 && (
            <>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  letterSpacing: '0.2em',
                  color: 'var(--color-gold-2)',
                  textTransform: 'uppercase',
                  marginTop: recentMatches.length > 0 ? 20 : 0,
                  marginBottom: 12,
                }}
              >
                CHAMPIONSHIPS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {(t.championships ?? []).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-mono-sm)',
                      color: 'var(--color-gold-1)',
                    }}
                  >
                    <DataReadout value={c.year} />
                    {c.tournament && (
                      <span style={{ color: 'var(--color-fg-dim)', marginLeft: 8 }}>{c.tournament}</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {recentMatches.length === 0 && (t.championships ?? []).length === 0 && (
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-sm)',
                color: 'var(--color-fg-dim)',
              }}
            >
              暂无数据
            </p>
          )}
        </HudPanel>
      </div>

      {/* ── Radar chart ────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 32px 64px' }}>
        <HudPanel staticCorners style={{ padding: 24 }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-xs)',
              letterSpacing: '0.2em',
              color: 'var(--color-fg-dim)',
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            TEAM RADAR
          </div>
          <ReactECharts
            option={radarOption}
            style={{ height: 320 }}
            theme={undefined}
          />
        </HudPanel>
      </div>
    </div>
  )
}
