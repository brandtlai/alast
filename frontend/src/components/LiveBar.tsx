// src/components/LiveBar.tsx
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ScanLine } from './hud/ScanLine'
import { StatusDot } from './hud/StatusDot'
import { DataReadout } from './hud/DataReadout'
import { apiFetch } from '../api/client'
import { ChevronRight } from 'lucide-react'

interface LiveMatch {
  id: number | string
  team_a_name?: string
  team_b_name?: string
  team_a?: { name: string }
  team_b?: { name: string }
  score_a?: number
  score_b?: number
  map?: string
  current_round?: number
  status: 'live' | 'upcoming' | 'finished'
  start_at?: string
  scheduled_at?: string
}

interface NormalizedMatch {
  id: string
  teamA: string
  teamB: string
  scoreA: number
  scoreB: number
  map: string
  round: number
  status: 'live' | 'upcoming'
}

function normalize(m: LiveMatch): NormalizedMatch {
  return {
    id: String(m.id),
    teamA: m.team_a_name ?? m.team_a?.name ?? 'TBD',
    teamB: m.team_b_name ?? m.team_b?.name ?? 'TBD',
    scoreA: m.score_a ?? 0,
    scoreB: m.score_b ?? 0,
    map: m.map ?? '—',
    round: m.current_round ?? 0,
    status: m.status === 'live' ? 'live' : 'upcoming',
  }
}

function isWithin60Min(m: LiveMatch): boolean {
  const ts = m.start_at ?? m.scheduled_at
  if (!ts) return false
  const diff = new Date(ts).getTime() - Date.now()
  return diff >= 0 && diff <= 60 * 60 * 1000
}

export default function LiveBar() {
  const [matches, setMatches] = useState<NormalizedMatch[]>([])
  const [idx, setIdx]         = useState(0)
  const [hover, setHover]     = useState(false)
  const intervalRef           = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fetch live + upcoming
  useEffect(() => {
    let cancelled = false

    async function fetchMatches() {
      try {
        const [liveRaw, upcomingRaw] = await Promise.allSettled([
          apiFetch<LiveMatch[]>('/api/matches?status=live'),
          apiFetch<LiveMatch[]>('/api/matches?status=upcoming'),
        ])

        const live: LiveMatch[] = liveRaw.status === 'fulfilled' && Array.isArray(liveRaw.value)
          ? liveRaw.value
          : []
        const upcoming: LiveMatch[] = upcomingRaw.status === 'fulfilled' && Array.isArray(upcomingRaw.value)
          ? upcomingRaw.value.filter(isWithin60Min)
          : []

        if (!cancelled) {
          const merged = [...live, ...upcoming].map(normalize)
          setMatches(merged)
          setIdx(prev => (merged.length > 0 ? prev % merged.length : 0))
        }
      } catch {
        // silently ignore
      }
    }

    fetchMatches()
    const pollId = setInterval(fetchMatches, 30_000)
    return () => { cancelled = true; clearInterval(pollId) }
  }, [])

  // Auto-cycle every 6s, pause on hover
  useEffect(() => {
    if (matches.length <= 1 || hover) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setIdx(prev => (prev + 1) % matches.length)
    }, 6_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [matches.length, hover])

  if (matches.length === 0) return null

  const current = matches[idx]

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100]"
      style={{
        height: 64,
        background: 'rgba(7,9,12,0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--color-line)',
        position: 'fixed',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Scan line along top edge */}
      <ScanLine />

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="h-full max-w-7xl mx-auto px-6 flex items-center gap-6"
        >
          {/* STATUS */}
          <div
            className="flex items-center gap-2 flex-shrink-0"
            style={{ minWidth: 72 }}
          >
            <StatusDot status={current.status} size={7} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-xs)',
                letterSpacing: '0.2em',
                color: current.status === 'live' ? 'var(--color-alert)' : 'var(--color-data)',
                textTransform: 'uppercase',
              }}
            >
              {current.status === 'live' ? 'LIVE' : 'SOON'}
            </span>
          </div>

          {/* TEAM-A vs TEAM-B */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span
              className="truncate"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                color: 'var(--color-fg)',
                letterSpacing: '0.04em',
                textAlign: 'right',
                flex: 1,
              }}
            >
              {current.teamA}
            </span>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-xs)',
                letterSpacing: '0.15em',
                color: 'var(--color-fg-dim)',
                flexShrink: 0,
              }}
            >
              VS
            </span>

            <span
              className="truncate"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                color: 'var(--color-fg)',
                letterSpacing: '0.04em',
                flex: 1,
              }}
            >
              {current.teamB}
            </span>
          </div>

          {/* MAP / ROUND */}
          <div
            className="hidden sm:flex flex-col items-center flex-shrink-0"
            style={{ minWidth: 72 }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-xs)',
                letterSpacing: '0.15em',
                color: 'var(--color-fg-dim)',
                textTransform: 'uppercase',
              }}
            >
              {current.map}
            </span>
            {current.status === 'live' && current.round > 0 && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  color: 'var(--color-fg-dim)',
                  letterSpacing: '0.1em',
                }}
              >
                RD {String(current.round).padStart(2, '0')}
              </span>
            )}
          </div>

          {/* SCORE */}
          <div
            className="flex items-center gap-2 flex-shrink-0"
            style={{ minWidth: 64 }}
          >
            {current.status === 'live' ? (
              <>
                <DataReadout value={current.scoreA} pad={1} size={16} />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-fg-dim)',
                    fontSize: 14,
                  }}
                >
                  —
                </span>
                <DataReadout value={current.scoreB} pad={1} size={16} />
              </>
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  color: 'var(--color-fg-dim)',
                  letterSpacing: '0.15em',
                }}
              >
                TBD
              </span>
            )}
          </div>

          {/* Arrow link + cycle indicator */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {matches.length > 1 && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  color: 'var(--color-fg-dim)',
                  letterSpacing: '0.1em',
                }}
              >
                {idx + 1}/{matches.length}
              </span>
            )}
            <Link
              to={`/matches/${current.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                color: 'var(--color-data)',
                transition: 'opacity 150ms',
              }}
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
