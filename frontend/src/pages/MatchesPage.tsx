// src/pages/MatchesPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import { useMatches } from '../api/matches'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { DataReadout } from '../components/hud/DataReadout'
import { StatusDot } from '../components/hud/StatusDot'
import type { StatusKind } from '../components/hud/StatusDot'
import { hudStagger, hudEnter } from '../design/motion'
import type { Match } from '../types'

// ── Filter definitions ─────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '',          label: 'ALL' },
  { value: 'live',      label: 'LIVE' },
  { value: 'upcoming',  label: 'UPCOMING' },
  { value: 'finished',  label: 'COMPLETED' },
] as const

const BRACKET_FILTERS = [
  { value: '',          label: '小组赛' },
  { value: 'knockout',  label: '淘汰赛' },
] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

function matchStatusKind(status: Match['status']): StatusKind {
  if (status === 'live')     return 'live'
  if (status === 'upcoming') return 'upcoming'
  return 'completed'
}

function groupByDate(matches: Match[]): { date: string; matches: Match[] }[] {
  const map = new Map<string, Match[]>()
  for (const m of matches) {
    const raw = m.scheduled_at
    const key = raw ? dayjs(raw).format('YYYY-MM-DD') : 'TBD'
    const bucket = map.get(key)
    if (bucket) bucket.push(m)
    else map.set(key, [m])
  }
  // sort ascending by date key
  const sorted = Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return sorted.map(([date, matches]) => ({ date, matches }))
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const pillBase: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  padding: '8px 14px',
  border: '1px solid var(--color-line)',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'border-color 120ms, color 120ms',
  color: 'var(--color-fg-muted)',
}
const pillActive: React.CSSProperties = {
  ...pillBase,
  borderColor: 'var(--color-data)',
  color: 'var(--color-data)',
}

function Pill({ label, active, onClick, noTracking }: {
  label: string; active: boolean; onClick: () => void; noTracking?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={active ? { ...pillActive, letterSpacing: noTracking ? undefined : '0.2em' }
                    : { ...pillBase,  letterSpacing: noTracking ? undefined : '0.2em' }}
    >
      {label}
    </button>
  )
}

function MatchRow({ m }: { m: Match }) {
  const [hovered, setHovered] = useState(false)

  const winA = (m.maps_won_a ?? 0) > (m.maps_won_b ?? 0)
  const winB = (m.maps_won_b ?? 0) > (m.maps_won_a ?? 0)
  const isFinished = m.status === 'finished'

  const scoreColorA = isFinished
    ? (winA ? 'var(--color-fg)' : 'var(--color-fg-dim)')
    : 'var(--color-fg-dim)'
  const scoreColorB = isFinished
    ? (winB ? 'var(--color-fg)' : 'var(--color-fg-dim)')
    : 'var(--color-fg-dim)'

  const time = m.scheduled_at ? dayjs(m.scheduled_at).format('HH:mm') : '--:--'

  return (
    <Link
      to={`/matches/${m.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '64px 1fr auto 1fr 20px 20px',
        alignItems: 'center',
        gap: 16,
        padding: '14px 8px',
        textDecoration: 'none',
        color: 'var(--color-fg)',
        borderBottom: '1px solid var(--color-line)',
        background: hovered ? 'rgba(0, 255, 170, 0.03)' : 'transparent',
        transition: 'background 120ms',
      }}
    >
      {/* Hover tick — left edge */}
      <span style={{
        position: 'absolute',
        left: 0, top: '50%',
        transform: 'translateY(-50%)',
        width: 2, height: 16,
        background: 'var(--color-data)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 120ms',
      }} />
      {/* Hover tick — right edge */}
      <span style={{
        position: 'absolute',
        right: 0, top: '50%',
        transform: 'translateY(-50%)',
        width: 2, height: 16,
        background: 'var(--color-data)',
        opacity: hovered ? 1 : 0,
        transition: 'opacity 120ms',
      }} />

      {/* Time */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-sm)',
        color: 'var(--color-fg-muted)',
        letterSpacing: '0.05em',
      }}>
        {time}
      </span>

      {/* Team A */}
      <span style={{
        textAlign: 'right',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: 'flex-end',
        minWidth: 0,
      }}>
        {m.team_a_logo && (
          <img src={m.team_a_logo} width={20} height={20} alt="" style={{ flexShrink: 0, objectFit: 'contain' }} />
        )}
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          opacity: isFinished && !winA ? 0.45 : 1,
        }}>
          {m.team_a_name ?? 'TBD'}
        </span>
      </span>

      {/* Score */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <DataReadout value={isFinished ? (m.maps_won_a ?? '-') : '-'} size={20} color={scoreColorA} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-fg-dim)',
          fontSize: 'var(--text-mono-sm)',
        }}>:</span>
        <DataReadout value={isFinished ? (m.maps_won_b ?? '-') : '-'} size={20} color={scoreColorB} />
      </span>

      {/* Team B */}
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          opacity: isFinished && !winB ? 0.45 : 1,
        }}>
          {m.team_b_name ?? 'TBD'}
        </span>
        {m.team_b_logo && (
          <img src={m.team_b_logo} width={20} height={20} alt="" style={{ flexShrink: 0, objectFit: 'contain' }} />
        )}
      </span>

      {/* Status dot */}
      <StatusDot status={matchStatusKind(m.status)} />

      {/* Arrow */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-data)',
        fontSize: 14,
      }}>→</span>
    </Link>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [bracketFilter, setBracketFilter] = useState('')

  const { data: matches, isLoading, error } = useMatches({
    status: statusFilter || undefined,
    stage:  bracketFilter || undefined,
  })

  const groups = matches ? groupByDate(matches) : []

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 32px 64px' }}>
      {/* Header */}
      <div style={{ padding: '64px 0 24px' }}>
        <TacticalLabel text="SECTOR :: MATCH_LOG" typewriter />
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-display-lg)',
          color: 'var(--color-fg)',
          margin: '8px 0 0',
        }}>
          赛程
        </h1>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32, alignItems: 'center' }}>
        {STATUS_FILTERS.map(f => (
          <Pill
            key={f.value}
            label={f.label}
            active={statusFilter === f.value}
            onClick={() => setStatusFilter(f.value)}
          />
        ))}
        <span style={{ width: 1, height: 24, background: 'var(--color-line)', margin: '0 4px' }} />
        {BRACKET_FILTERS.map(f => (
          <Pill
            key={f.value}
            label={f.label}
            active={bracketFilter === f.value}
            onClick={() => setBracketFilter(f.value)}
            noTracking
          />
        ))}
      </div>

      {/* States */}
      {isLoading && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-muted)' }}>
          LOADING…
        </p>
      )}
      {error && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-alert)' }}>
          ERR :: {error.message}
        </p>
      )}

      {/* Match list grouped by date */}
      {matches && matches.length === 0 && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-dim)' }}>
          NO MATCHES FOUND
        </p>
      )}

      {groups.length > 0 && (
        <motion.div variants={hudStagger} initial="hidden" animate="show">
          {groups.map(g => (
            <motion.section key={g.date} variants={hudEnter}>
              {/* Date header */}
              <header style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '24px 0 8px',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-sm)',
                  color: 'var(--color-data)',
                  letterSpacing: '0.2em',
                  flexShrink: 0,
                }}>
                  {g.date}
                </span>
                <span style={{ flex: 1, height: 1, background: 'var(--color-line)' }} />
              </header>

              {/* Rows */}
              {g.matches.map(m => (
                <MatchRow key={m.id} m={m} />
              ))}
            </motion.section>
          ))}
        </motion.div>
      )}
    </div>
  )
}
