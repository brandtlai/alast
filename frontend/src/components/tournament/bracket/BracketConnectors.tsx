import { BRACKET_SLOTS } from './structure'
import type { SlotPosition } from './layout'
import type { ResolvedSlot } from './matchLookup'

interface Props {
  positions: Map<string, SlotPosition>
  resolved: Map<string, ResolvedSlot>
  width: number
  height: number
}

interface Edge {
  fromId: string
  toId: string
  toPosition: 'top' | 'bottom'
  kind: 'winner' | 'loser'
  realized: boolean  // source match is finished
}

function collectEdges(resolved: Map<string, ResolvedSlot>): Edge[] {
  const edges: Edge[] = []
  for (const slot of BRACKET_SLOTS) {
    const r = resolved.get(slot.id)
    const realized = r?.match?.status === 'finished'
    if (slot.winnerTo.kind === 'slot') {
      edges.push({
        fromId: slot.id,
        toId: slot.winnerTo.slotId,
        toPosition: slot.winnerTo.position,
        kind: 'winner',
        realized,
      })
    }
    if (slot.loserTo.kind === 'slot') {
      edges.push({
        fromId: slot.id,
        toId: slot.loserTo.slotId,
        toPosition: slot.loserTo.position,
        kind: 'loser',
        realized,
      })
    }
  }
  return edges
}

/**
 * Orthogonal connector path: out from right edge of source midline,
 * jog horizontally to halfway, then vertical jog, then enter target on left side
 * at the appropriate team-row midline (top row vs bottom row).
 */
function pathFor(from: SlotPosition, to: SlotPosition, toPosition: 'top' | 'bottom'): string {
  const TEAM_ROW_HEIGHT = 32   // matches BracketMatchCard.TeamRow height
  const HEADER_STRIP = 24      // matches BracketMatchCard header height
  const fromX = from.x + from.width
  const fromY = from.y + from.height / 2
  const toX = to.x
  const targetRowMidY = toPosition === 'top'
    ? to.y + HEADER_STRIP + TEAM_ROW_HEIGHT / 2
    : to.y + HEADER_STRIP + TEAM_ROW_HEIGHT + TEAM_ROW_HEIGHT / 2
  const midX = (fromX + toX) / 2
  return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${targetRowMidY} L ${toX} ${targetRowMidY}`
}

export function BracketConnectors({ positions, resolved, width, height }: Props) {
  const edges = collectEdges(resolved)

  return (
    <svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      {edges.map((edge, i) => {
        const from = positions.get(edge.fromId)
        const to = positions.get(edge.toId)
        if (!from || !to) return null
        const d = pathFor(from, to, edge.toPosition)

        const stroke = edge.realized
          ? edge.kind === 'winner'
            ? 'var(--color-data)'
            : 'var(--color-fg-dim)'
          : 'var(--color-line)'
        const strokeOpacity = edge.realized ? 0.7 : 0.35
        const strokeDasharray = edge.kind === 'loser' && !edge.realized ? '4 4' : undefined

        return (
          <path
            key={`${edge.fromId}->${edge.toId}-${i}`}
            d={d}
            fill="none"
            stroke={stroke}
            strokeOpacity={strokeOpacity}
            strokeWidth={1}
            strokeDasharray={strokeDasharray}
          />
        )
      })}
    </svg>
  )
}
