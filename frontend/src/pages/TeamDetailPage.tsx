// src/pages/TeamDetailPage.tsx — Tactical OS re-skin (T21)
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTeam } from '../api/teams'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { DataReadout } from '../components/hud/DataReadout'
import { hudStagger, hudEnter } from '../design/motion'
import type { Match } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  S:    'var(--color-gold-2)',
  A:    'var(--color-data)',
  B:    'var(--color-fg)',
  'C+': 'var(--color-fg-muted)',
  D:    'var(--color-fg-dim)',
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
    wins?: number | null
    losses?: number | null
  }

  const wins   = t.wins   ?? 0
  const losses = t.losses ?? 0

  const recentMatches = (t.recent_matches ?? []).slice(0, 5)
  type RosterPlayer = NonNullable<typeof t.players>[number] & {
    tier?: string | null; is_captain?: boolean; pick_order?: number | null
  }
  const players: RosterPlayer[] = (t.players ?? []) as RosterPlayer[]

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

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: 32,
              marginTop: 24,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-mono-sm)',
              color: 'var(--color-fg-dim)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              alignItems: 'baseline',
            }}
          >
            <span>
              RECORD&nbsp;
              <span style={{ color: 'var(--color-data)', fontVariantNumeric: 'tabular-nums' }}>{wins}</span>
              <span style={{ color: 'var(--color-fg-dim)' }}>W</span>
              <span style={{ margin: '0 6px', color: 'var(--color-fg-dim)' }}>·</span>
              <span style={{ color: 'var(--color-fire)', fontVariantNumeric: 'tabular-nums' }}>{losses}</span>
              <span style={{ color: 'var(--color-fg-dim)' }}>L</span>
            </span>
            <span>
              ROSTER&nbsp;
              <DataReadout value={players.length} pad={2} color="var(--color-fg)" />
            </span>
          </div>
        </div>
      </div>

      {/* ── Body: roster (left) + recent (right) ────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 32,
          padding: '48px 32px 64px',
          alignItems: 'start',
        }}
      >
        {/* Left — player cards */}
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
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: 16,
                }}
              >
                {players.map(p => {
                  const tier = p.tier ?? null
                  const tierColor = tier ? TIER_COLOR[tier] ?? 'var(--color-fg-muted)' : 'var(--color-fg-dim)'
                  const subLabel = p.is_captain ? 'CAPTAIN' : tier ? `TIER ${tier}` : 'SUBSTITUTE'
                  return (
                    <motion.div key={p.id} variants={hudEnter} style={{ display: 'flex' }}>
                      <HudPanel style={{
                        padding: 16,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        minHeight: 220,
                        borderColor: p.is_captain ? 'var(--color-gold-2)' : undefined,
                      }}>
                        {/* Avatar */}
                        <div
                          style={{
                            width: 96,
                            height: 96,
                            margin: '0 auto 12px',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-line)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
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
                                fontSize: 28,
                                color: 'var(--color-fg-dim)',
                              }}
                            >
                              {(p.real_name ?? p.nickname).slice(0, 2)}
                            </span>
                          )}
                        </div>

                        {/* Real name */}
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 18,
                            lineHeight: 1.15,
                            color: 'var(--color-fg)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={p.real_name ?? p.nickname}
                        >
                          {p.real_name ?? p.nickname}
                        </div>

                        {/* Game ID */}
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            color: 'var(--color-fg-muted)',
                            marginTop: 4,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={p.nickname}
                        >
                          {p.nickname}
                        </div>

                        <div style={{ flex: 1 }} />

                        {/* Tier badge */}
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop: '1px solid var(--color-line)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.2em',
                            color: tierColor,
                          }}
                        >
                          {subLabel}
                        </div>
                      </HudPanel>
                    </motion.div>
                  )
                })}
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

        {/* Right — recent matches */}
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

          {recentMatches.length === 0 && (
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
    </div>
  )
}
