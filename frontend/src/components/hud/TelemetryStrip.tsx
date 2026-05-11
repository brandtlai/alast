import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useMatches } from '../../api/matches'
import { StatusDot } from './StatusDot'
import type { Match } from '../../types'

const CELL_LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-mono-xs)',
  letterSpacing: '0.2em',
  color: 'var(--color-fg-muted)',
  textTransform: 'uppercase',
}

const CELL_VALUE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-mono-md)',
  color: 'var(--color-fg)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const DIVIDER: CSSProperties = {
  width: 1,
  alignSelf: 'stretch',
  background: 'var(--color-line)',
}

function pickNextUpcoming(matches: Match[]): Match | null {
  const now = Date.now()
  const upcoming = matches
    .filter(m => m.status === 'upcoming' && m.scheduled_at)
    .map(m => ({ m, t: new Date(m.scheduled_at!).getTime() }))
    .filter(({ t }) => t >= now)
    .sort((a, b) => a.t - b.t)
  return upcoming[0]?.m ?? null
}

function pickLastFinished(matches: Match[]): Match | null {
  const finished = matches
    .filter(m => m.status === 'finished')
    .slice()
    .sort((a, b) => {
      const ta = a.finished_at ? new Date(a.finished_at).getTime() : 0
      const tb = b.finished_at ? new Date(b.finished_at).getTime() : 0
      return tb - ta
    })
  return finished[0] ?? null
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '--.--'
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}.${day}`
}

function formatHm(iso: string | null | undefined): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function TelemetryStrip() {
  const { data: all = [] } = useMatches({})

  const next = pickNextUpcoming(all)
  const last = pickLastFinished(all)
  const liveCount = all.filter(m => m.status === 'live').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      role="region"
      aria-label="赛事遥测概览"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '14px 24px',
        background: 'rgba(7, 9, 12, 0.72)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* LIVE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusDot status={liveCount > 0 ? 'live' : 'completed'} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={CELL_LABEL}>LIVE</span>
          <span style={{ ...CELL_VALUE, color: liveCount > 0 ? 'var(--color-fire)' : 'var(--color-fg-muted)' }}>
            {liveCount > 0 ? `${liveCount} ONGOING` : 'STANDBY'}
          </span>
        </div>
      </div>

      <div style={DIVIDER} />

      {/* NEXT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={CELL_LABEL}>NEXT</span>
        <span style={{ ...CELL_VALUE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {next
            ? `${formatShortDate(next.scheduled_at)} ${formatHm(next.scheduled_at)} · ${next.team_a_name} vs ${next.team_b_name}`
            : '— NO UPCOMING'}
        </span>
      </div>

      <div style={DIVIDER} />

      {/* LAST RESULT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={CELL_LABEL}>LAST</span>
        <span style={{ ...CELL_VALUE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {last
            ? `${last.team_a_name} ${last.maps_won_a}-${last.maps_won_b} ${last.team_b_name}`
            : '— NO RESULT'}
        </span>
      </div>
    </motion.div>
  )
}
