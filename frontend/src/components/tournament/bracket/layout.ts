import { BRACKET_SLOTS, SLOT_BY_ID } from './structure'
import type { BracketSlot, SlotSource, SlotRow } from './structure'
import { CARD_HEIGHT, CARD_WIDTH } from './BracketMatchCard'

export const COLUMN_GAP = 56            // horizontal spacing between columns
export const ROW_GAP = 24               // baseline vertical spacing for col-1 cards
export const SECTION_GAP = 96           // extra vertical space between UB and LB sections
export const COLUMN_HEADER_HEIGHT = 28
export const COLUMN_HEADER_GAP = 20

/** Top-left position of a slot within the bracket coordinate space. */
export interface SlotPosition {
  x: number
  y: number
  width: number
  height: number
}

function baseY(rowOrder: number): number {
  return rowOrder * (CARD_HEIGHT + ROW_GAP)
}

function isSameRowSource(src: SlotSource, row: SlotRow): boolean {
  if (src.type !== 'winnerOf' && src.type !== 'loserOf') return false
  const ref = SLOT_BY_ID.get(src.slotId)
  return ref?.row === row
}

/**
 * Layout the canonical bracket using a per-row recurrence.
 *
 *   • Col-1 slots sit at evenly-spaced rowOrder positions.
 *   • A slot with TWO same-row predecessors averages their y (classic fork).
 *   • A slot with ONE same-row predecessor inherits that y (chain through a round).
 *   • If a chain's predecessor is in the SAME column (e.g. LB Final stage 2 in
 *     col 5), the slot is offset vertically to stack beneath it.
 *   • Cross-section drops (UB → LB) don't affect layout — they're connector-only.
 */
export function computeLayout(): {
  positions: Map<string, SlotPosition>
  totalWidth: number
  totalHeight: number
  ubSectionHeight: number
  lbSectionTop: number
  columnXs: number[]   // x of each column (1..6)
} {
  const positions = new Map<string, SlotPosition>()
  const yByRowSlot = new Map<string, number>()

  const ordered = [...BRACKET_SLOTS].sort((a, b) =>
    a.column - b.column ||
    (a.row === b.row ? 0 : a.row === 'ub' ? -1 : 1) ||
    a.rowOrder - b.rowOrder
  )

  for (const slot of ordered) {
    if (slot.row === 'gf') continue
    if (slot.column === 1) {
      yByRowSlot.set(slot.id, baseY(slot.rowOrder))
      continue
    }
    const sameRowSources: BracketSlot[] = []
    for (const src of [slot.topSource, slot.bottomSource]) {
      if (isSameRowSource(src, slot.row)) {
        const ref = SLOT_BY_ID.get((src as { slotId: string }).slotId)
        if (ref) sameRowSources.push(ref)
      }
    }
    if (sameRowSources.length === 2) {
      const ys = sameRowSources.map(s => yByRowSlot.get(s.id) ?? 0)
      yByRowSlot.set(slot.id, (ys[0] + ys[1]) / 2)
    } else if (sameRowSources.length === 1) {
      const src = sameRowSources[0]
      const srcY = yByRowSlot.get(src.id) ?? 0
      if (src.column === slot.column) {
        // chain in same column → stack below
        yByRowSlot.set(slot.id, srcY + CARD_HEIGHT + ROW_GAP)
      } else {
        yByRowSlot.set(slot.id, srcY)
      }
    } else {
      // no same-row predecessor (shouldn't happen for ub/lb slots beyond col 1)
      yByRowSlot.set(slot.id, baseY(slot.rowOrder))
    }
  }

  const ubSlots = BRACKET_SLOTS.filter(s => s.row === 'ub')
  const lbSlots = BRACKET_SLOTS.filter(s => s.row === 'lb')

  const ubMaxY = Math.max(0, ...ubSlots.map(s => yByRowSlot.get(s.id) ?? 0))
  const ubSectionHeight = ubMaxY + CARD_HEIGHT
  const lbSectionTop = ubSectionHeight + SECTION_GAP

  const lbMaxY = Math.max(0, ...lbSlots.map(s => yByRowSlot.get(s.id) ?? 0))
  const lbSectionHeight = lbMaxY + CARD_HEIGHT

  // GF: vertically centered between UB Final (absolute y) and the LB → GF feeder.
  // Done after we know lbSectionTop.
  const ubFinalAbsY = (yByRowSlot.get('ub-w4-final') ?? 0)
  const lbFinalAbsY = (yByRowSlot.get('lb-w6-final2') ?? 0) + lbSectionTop
  const gfY = (ubFinalAbsY + lbFinalAbsY) / 2
  yByRowSlot.set('gf-w7', gfY)

  const headerOffset = COLUMN_HEADER_HEIGHT + COLUMN_HEADER_GAP

  const columnXs: number[] = []
  for (let c = 1; c <= 6; c++) {
    columnXs.push((c - 1) * (CARD_WIDTH + COLUMN_GAP))
  }

  for (const slot of BRACKET_SLOTS) {
    const x = columnXs[slot.column - 1]
    let y = yByRowSlot.get(slot.id) ?? 0
    if (slot.row === 'lb') y += lbSectionTop
    positions.set(slot.id, {
      x,
      y: y + headerOffset,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    })
  }

  const totalWidth = 6 * CARD_WIDTH + 5 * COLUMN_GAP
  const totalHeight = lbSectionTop + lbSectionHeight + headerOffset + 16

  return { positions, totalWidth, totalHeight, ubSectionHeight, lbSectionTop, columnXs }
}

export function getSlot(id: string): BracketSlot | undefined {
  return SLOT_BY_ID.get(id)
}
