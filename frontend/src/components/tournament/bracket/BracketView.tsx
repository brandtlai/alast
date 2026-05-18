import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useCurrentTournament } from '../../../api/currentTournament'
import { useBracket, useStandings } from '../../../api/tournaments'
import { hudEnter } from '../../../design/motion'
import { BRACKET_SLOTS, getBracketColumns } from './structure'
import { computeLayout } from './layout'
import { CARD_WIDTH } from './BracketMatchCard'
import { BracketMatchCard } from './BracketMatchCard'
import { BracketConnectors } from './BracketConnectors'
import { deriveSeeds } from './seeds'
import { resolveBracket } from './matchLookup'

export function BracketView() {
  const { data: tournament, isLoading: tLoading } = useCurrentTournament()
  const { data: bracketMatches, isLoading: bLoading, error: bErr } = useBracket(tournament?.id)
  const { data: standings, isLoading: sLoading } = useStandings(tournament?.id)

  const layout = useMemo(() => computeLayout(), [])
  const seeds = useMemo(() => deriveSeeds(standings), [standings])
  const resolved = useMemo(
    () => resolveBracket(BRACKET_SLOTS, bracketMatches, seeds),
    [bracketMatches, seeds],
  )

  const columns = useMemo(() => getBracketColumns(), [])

  if (tLoading || bLoading || sLoading) {
    return (
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-fg-muted)' }}>
        LOADING BRACKET…
      </p>
    )
  }
  if (bErr) {
    return (
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-mono-sm)', color: 'var(--color-alert)' }}>
        ERR :: {bErr.message}
      </p>
    )
  }

  const { positions, totalWidth, totalHeight, lbSectionTop } = layout

  return (
    <div
      className="custom-scrollbar"
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        paddingBottom: 24,
        marginLeft: -32,
        marginRight: -32,
        paddingLeft: 32,
        paddingRight: 32,
      }}
    >
      <motion.div
        variants={hudEnter}
        initial="hidden"
        animate="show"
        style={{
          position: 'relative',
          width: totalWidth,
          height: totalHeight,
        }}
      >
        {/* Column headers */}
        {columns.map(col => {
          const x = (col.index - 1) * (CARD_WIDTH + 56)
          return (
            <div
              key={`col-header-${col.index}`}
              style={{
                position: 'absolute',
                top: 0,
                left: x,
                width: CARD_WIDTH,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '0 4px',
                borderBottom: '1px solid var(--color-line)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-mono-xs)',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--color-data)',
              }}
            >
              [ {col.title} ]
            </div>
          )
        })}

        {/* Section labels (UB / LB on the left edge) */}
        <SectionLabel y={20} label="UPPER" sub="胜者组" />
        <SectionLabel y={lbSectionTop + 20} label="LOWER" sub="败者组" />

        {/* Connector lines beneath cards */}
        <BracketConnectors
          positions={positions}
          resolved={resolved}
          width={totalWidth}
          height={totalHeight}
        />

        {/* Cards */}
        {BRACKET_SLOTS.map(slot => {
          const pos = positions.get(slot.id)
          const r = resolved.get(slot.id)
          if (!pos || !r) return null
          return (
            <div
              key={slot.id}
              style={{
                position: 'absolute',
                top: pos.y,
                left: pos.x,
                width: pos.width,
              }}
            >
              <BracketMatchCard resolved={r} />
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}

function SectionLabel({ y, label, sub }: { y: number; label: string; sub: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: -12,
        transform: 'translateX(-100%)',
        width: 80,
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-xs)',
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: 'var(--color-fg-dim)',
      }}
    >
      <div style={{ color: 'var(--color-data)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '0.1em', color: 'var(--color-fg-muted)', marginTop: 2 }}>
        {sub}
      </div>
    </div>
  )
}
