// src/pages/PlayerDetailPage.tsx — Tactical OS re-skin (T28)
import { useParams, Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { usePlayer } from '../api/players'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { DataReadout } from '../components/hud/DataReadout'
import { hudStagger, hudEnter } from '../design/motion'

// ── Rating color ──────────────────────────────────────────────────────────────

function ratingColor(val: number | null | undefined | string): string {
  const v = typeof val === 'string' ? parseFloat(val) : (val ?? 0)
  if (isNaN(v)) return 'var(--color-fg-muted)'
  if (v >= 1.0) return 'var(--color-data)'
  if (v >= 0.9) return 'var(--color-fg)'
  return 'var(--color-fg-muted)'
}

// ── Match log col widths ──────────────────────────────────────────────────────

const LOG_COL_WIDTHS = ['100px', '1fr', '80px', '120px', '80px']
// DATE | OPPONENT | RESULT | K-D | RATING

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: player, isLoading, error } = usePlayer(id!)

  if (isLoading) return <div style={{ padding: '64px 32px' }}><Spinner /></div>
  if (error)     return <div style={{ padding: '64px 32px' }}><ErrorBox message={error.message} /></div>
  if (!player)   return null

  const cs = player.career_stats
  const history = player.match_history ?? []

  const avgRating  = cs?.avg_rating  != null ? parseFloat(cs.avg_rating)  : null
  const avgAdr     = cs?.avg_adr     != null ? parseFloat(cs.avg_adr)     : null
  const avgKast    = cs?.avg_kast    != null ? parseFloat(cs.avg_kast)    : null
  const avgHsPct   = cs?.avg_hs_pct  != null ? parseFloat(cs.avg_hs_pct) : null
  const totalKills = cs?.total_kills != null ? parseFloat(cs.total_kills) : null
  const totalDeaths = cs?.total_deaths != null ? parseFloat(cs.total_deaths) : null

  const kdr = (totalKills != null && totalDeaths != null && totalDeaths > 0)
    ? (totalKills / totalDeaths).toFixed(2)
    : null

  // Radar axes (only include if we have career stats)
  const radarOption = cs ? {
    backgroundColor: 'transparent',
    radar: {
      indicator: [
        { name: 'Rating',  max: 2 },
        { name: 'ADR',     max: 150 },
        { name: 'KAST%',   max: 100 },
        { name: 'HS%',     max: 80 },
        { name: 'KDR',     max: 3 },
      ],
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      axisLine:  { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
      name: { textStyle: { color: 'var(--color-fg-muted)', fontFamily: 'JetBrains Mono', fontSize: 11 } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: [
          avgRating ?? 0,
          avgAdr ?? 0,
          // kast is stored as fractional (0–1) or percent? Use as-is but clamp
          avgKast != null ? (avgKast > 1 ? avgKast : avgKast * 100) : 0,
          avgHsPct != null ? (avgHsPct > 1 ? avgHsPct : avgHsPct * 100) : 0,
          kdr != null ? parseFloat(kdr) : 0,
        ],
        name: player.nickname,
        areaStyle: { color: 'rgba(199,255,61,0.18)' },
        lineStyle: { color: '#C7FF3D' },
        itemStyle: { color: '#C7FF3D' },
      }],
    }],
  } : null

  const thBase: React.CSSProperties = {
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-line)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-mono-xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.2em',
    color: 'var(--color-fg-dim)',
    fontWeight: 400,
    whiteSpace: 'nowrap' as const,
  }

  return (
    <motion.div variants={hudStagger} initial="hidden" animate="show">

      {/* ── BANNER ──────────────────────────────────────────────────────────── */}
      <motion.div
        variants={hudEnter}
        style={{
          padding: '96px 32px 48px',
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: 48,
          alignItems: 'center',
          borderBottom: '1px solid var(--color-line)',
        }}
      >
        {/* Avatar */}
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.nickname}
            style={{
              width: 320, height: 320,
              objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
              display: 'block',
            }}
          />
        ) : (
          <HudPanel staticCorners style={{ width: 320, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 96,
                color: 'var(--color-fg-dim)',
                lineHeight: 1,
              }}
            >
              {player.nickname.slice(0, 2).toUpperCase()}
            </span>
          </HudPanel>
        )}

        {/* Info */}
        <div>
          <TacticalLabel text={`OPERATIVE :: ${player.id}`} />

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-display-xl)',
              lineHeight: 1,
              color: 'var(--color-fg)',
              margin: '12px 0 0',
            }}
          >
            {player.nickname}
          </h1>

          {player.real_name && (
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 24,
                color: 'var(--color-fg-muted)',
                marginTop: 8,
              }}
            >
              {player.real_name}
            </div>
          )}

          {player.team_name && (
            <Link
              to={`/teams/${player.team_id ?? ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 12, textDecoration: 'none' }}
            >
              <TeamLogo url={player.team_logo_url} name={player.team_name} size={20} />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-sm)',
                  color: 'var(--color-fg-muted)',
                  letterSpacing: '0.1em',
                }}
              >
                {player.team_name}
              </span>
            </Link>
          )}

          {/* Stats row */}
          {cs && (
            <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
              {avgRating != null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-fg-dim)' }}>RATING</span>
                  <DataReadout value={avgRating.toFixed(2)} color={ratingColor(avgRating)} size={28} />
                </div>
              )}
              {kdr != null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-fg-dim)' }}>K/D</span>
                  <DataReadout value={kdr} size={28} />
                </div>
              )}
              {avgAdr != null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-fg-dim)' }}>ADR</span>
                  <DataReadout value={avgAdr.toFixed(1)} size={28} />
                </div>
              )}
              {avgHsPct != null && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-xs)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-fg-dim)' }}>HS%</span>
                  <DataReadout value={`${(avgHsPct > 1 ? avgHsPct : avgHsPct * 100).toFixed(0)}%`} size={28} />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── BODY SECTIONS ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Section 1 — Ability radar */}
        {radarOption && (
          <motion.section variants={hudEnter} style={{ padding: '48px 32px' }}>
            <HudPanel style={{ padding: 24 }}>
              <TacticalLabel text="ABILITY PROFILE" />
              <div style={{ marginTop: 16, maxWidth: 400 }}>
                <ReactECharts option={radarOption as object} style={{ height: 280 }} />
              </div>
            </HudPanel>
          </motion.section>
        )}

        {/* Section 2 — Match log */}
        {history.length > 0 && (
          <motion.section variants={hudEnter} style={{ padding: '48px 32px' }}>
            <HudPanel staticCorners style={{ padding: 24 }}>
              <TacticalLabel text="MATCH LOG" />
              <div style={{ marginTop: 16, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    {LOG_COL_WIDTHS.map((w, i) => (
                      <col key={i} style={{ width: w }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={{ ...thBase, textAlign: 'left' }}>DATE</th>
                      <th style={{ ...thBase, textAlign: 'left' }}>OPPONENT</th>
                      <th style={{ ...thBase, textAlign: 'left' }}>MAP</th>
                      <th style={{ ...thBase, textAlign: 'right' }}>K-D</th>
                      <th style={{ ...thBase, textAlign: 'right' }}>RATING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid var(--color-line)',
                          transition: 'background 120ms',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* DATE */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-dim)' }}>
                            {h.scheduled_at ? dayjs(h.scheduled_at).format('MM-DD') : '—'}
                          </span>
                        </td>
                        {/* OPPONENT */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {h.opponent_name ?? '—'}
                          </span>
                        </td>
                        {/* MAP */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {h.map_name ?? '—'}
                          </span>
                        </td>
                        {/* K-D */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-muted)' }}>
                            {h.kills != null && h.deaths != null ? `${h.kills}-${h.deaths}` : '—'}
                          </span>
                        </td>
                        {/* RATING */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontVariantNumeric: 'tabular-nums',
                              fontSize: 'var(--text-mono-sm)',
                              color: ratingColor(h.rating),
                            }}
                          >
                            {h.rating != null ? h.rating.toFixed(2) : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </HudPanel>
          </motion.section>
        )}

      </div>
    </motion.div>
  )
}
