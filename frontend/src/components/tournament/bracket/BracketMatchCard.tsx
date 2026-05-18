import { Link } from 'react-router-dom'
import { forwardRef } from 'react'
import type { CSSProperties } from 'react'
import { StatusDot } from '../../hud/StatusDot'
import type { StatusKind } from '../../hud/StatusDot'
import TeamLogo from '../../TeamLogo'
import type { ResolvedSlot, ResolvedTeam } from './matchLookup'

export const CARD_WIDTH = 248
export const CARD_HEIGHT = 96   // header strip + 2 team rows

interface Props {
  resolved: ResolvedSlot
}

function statusKindFor(slot: ResolvedSlot): StatusKind {
  const status = slot.match?.status
  if (status === 'live')     return 'live'
  if (status === 'finished') return 'completed'
  return 'upcoming'
}

function TeamRow({
  team, score, isWinner, isLoser, dimAll,
}: {
  team: ResolvedTeam
  score: number | null
  isWinner: boolean
  isLoser: boolean
  dimAll: boolean
}) {
  const isTbd = team.type !== 'team'
  const isBye = team.type === 'bye'

  const baseStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '22px 22px 1fr 28px',
    alignItems: 'center',
    gap: 8,
    padding: '6px 10px',
    height: 32,
    borderBottom: '1px solid var(--color-line)',
  }

  const seedColor = isWinner
    ? 'var(--color-data)'
    : 'var(--color-fg-muted)'

  const nameColor =
    dimAll || isTbd ? 'var(--color-fg-dim)' :
    isLoser ? 'var(--color-fg-dim)' :
    isWinner ? 'var(--color-fg)' :
    'var(--color-fg)'

  const scoreColor = isWinner ? 'var(--color-data)' :
                     isLoser ? 'var(--color-fg-dim)' :
                     'var(--color-fg-muted)'

  const seedText = team.type === 'team' && team.seed
    ? String(team.seed).padStart(2, '0')
    : '--'

  let teamCell: React.ReactNode
  if (team.type === 'team') {
    teamCell = (
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: 14,
        color: nameColor,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        opacity: isLoser ? 0.6 : 1,
      }}>
        {team.name}
      </span>
    )
  } else if (isBye) {
    teamCell = (
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-xs)',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--color-fg-dim)',
      }}>
        — 轮空 —
      </span>
    )
  } else {
    teamCell = (
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-xs)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--color-fg-dim)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {team.sourceLabel}
      </span>
    )
  }

  return (
    <div style={baseStyle}>
      {/* seed badge */}
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-xs)',
        color: seedColor,
        letterSpacing: '0.05em',
      }}>
        {seedText}
      </span>
      {/* logo or placeholder */}
      {team.type === 'team' ? (
        <TeamLogo url={team.logoUrl} name={team.name} size={20} />
      ) : (
        <span style={{
          width: 20, height: 20,
          border: '1px dashed var(--color-line)',
          borderRadius: 2,
        }} />
      )}
      {/* name / source label */}
      {teamCell}
      {/* score */}
      <span style={{
        textAlign: 'right',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-mono-md)',
        fontWeight: isWinner ? 700 : 500,
        color: scoreColor,
      }}>
        {score === null ? '–' : score}
      </span>
    </div>
  )
}

export const BracketMatchCard = forwardRef<HTMLDivElement, Props>(function BracketMatchCard(
  { resolved },
  ref,
) {
  const { slot, match } = resolved
  const status = statusKindFor(resolved)
  const isFinished = match?.status === 'finished'
  const isLive = match?.status === 'live'
  const isTBD = !match || (resolved.top.type !== 'team' && resolved.bottom.type !== 'team')

  const topIsWinner = isFinished && resolved.winnerTeamId !== null && resolved.top.type === 'team' && resolved.top.teamId === resolved.winnerTeamId
  const bottomIsWinner = isFinished && resolved.winnerTeamId !== null && resolved.bottom.type === 'team' && resolved.bottom.teamId === resolved.winnerTeamId
  const topIsLoser = isFinished && !topIsWinner && resolved.top.type === 'team'
  const bottomIsLoser = isFinished && !bottomIsWinner && resolved.bottom.type === 'team'

  const scoreTop = match?.maps_won_a ?? null
  const scoreBottom = match?.maps_won_b ?? null

  // Swap scores when our top/bottom is flipped relative to DB team_a/team_b
  let displayedTopScore = scoreTop
  let displayedBottomScore = scoreBottom
  if (match && resolved.top.type === 'team' && match.team_b_id === resolved.top.teamId) {
    displayedTopScore = scoreBottom
    displayedBottomScore = scoreTop
  }

  const borderStyle: string = isTBD
    ? '1px dashed var(--color-line)'
    : isLive
      ? '1px solid var(--color-alert)'
      : '1px solid var(--color-line-strong)'

  const headerColor = isLive
    ? 'var(--color-alert)'
    : isFinished
      ? 'var(--color-fg-muted)'
      : 'var(--color-data)'

  const cardStyle: CSSProperties = {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
    background: 'var(--color-surface)',
    border: borderStyle,
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    position: 'relative',
    opacity: isTBD ? 0.78 : 1,
    transition: 'border-color 120ms, background 120ms',
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 10px',
    height: 24,
    background: 'var(--color-surface-2)',
    borderBottom: '1px solid var(--color-line)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-mono-xs)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: headerColor,
  }

  const inner = (
    <div ref={ref} style={cardStyle} data-slot-id={slot.id}>
      <div style={headerStyle}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <StatusDot status={status} size={6} />
          <span>{slot.stageLabel}</span>
        </span>
        <span style={{ color: 'var(--color-fg-dim)' }}>BO{slot.bestOf}</span>
      </div>
      <TeamRow
        team={resolved.top}
        score={displayedTopScore}
        isWinner={topIsWinner}
        isLoser={topIsLoser}
        dimAll={isTBD}
      />
      <TeamRow
        team={resolved.bottom}
        score={displayedBottomScore}
        isWinner={bottomIsWinner}
        isLoser={bottomIsLoser}
        dimAll={isTBD}
      />
    </div>
  )

  if (match) {
    return (
      <Link to={`/matches/${match.id}`} style={{ textDecoration: 'none' }}>
        {inner}
      </Link>
    )
  }
  return inner
})
