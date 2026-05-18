/**
 * Canonical playoff bracket structure for ALAST Premier 2026.
 *
 * 16 seeded slots, double-elimination, BO5 grand final.
 * Layout: 6 columns by round position (W5 + W6 compressed into one column).
 *
 * Bracket flow:
 *   W1 — 8 matches (UB R1 + LB R1 incl. one bye)
 *   W2 — UB R2 (2) + LB R2 (4, UB R1 losers drop in)
 *   W3 — LB R3 (2)
 *   W4 — UB Final (1) + LB SF (2, UB R2 losers drop in)
 *   W5 — LB Final stage 1 (LB SF winners face off)
 *   W6 — LB Final stage 2 (winner faces UB Final loser)
 *   W7 — Grand Final BO5
 */

export type BracketKind = 'ub' | 'lb' | 'gf'
export type SlotRow = 'ub' | 'lb' | 'gf'

export type SlotSource =
  | { type: 'seed'; seed: number }
  | { type: 'bye' }
  | { type: 'winnerOf'; slotId: string }
  | { type: 'loserOf'; slotId: string }

/** Destination edge for a result (winner or loser). */
export type SlotEdge =
  | { kind: 'champion' }
  | { kind: 'eliminated' }
  | { kind: 'slot'; slotId: string; position: 'top' | 'bottom' }

export interface BracketSlot {
  id: string
  column: number       // 1..6
  row: SlotRow         // 'ub' | 'lb' | 'gf' (drives vertical placement)
  rowOrder: number     // position within column row (0 = topmost)
  week: number         // 1..7
  bracketKind: BracketKind   // for DB lookup (matches.bracket_kind)
  bracketRound: number       // for DB lookup (matches.bracket_round)
  stageLabel: string         // short HUD label, e.g. "胜者组 R1"
  weekLabel: string          // e.g. "W1 · 胜者组晋级赛"
  bestOf: number
  topSource: SlotSource
  bottomSource: SlotSource
  winnerTo: SlotEdge
  loserTo: SlotEdge
}

export interface BracketColumn {
  index: number      // 1..6
  weeks: number[]    // e.g. [5, 6] for the compressed LB Final column
  title: string      // header text, e.g. "W4 · 第4周"
  ubSlots: BracketSlot[]
  lbSlots: BracketSlot[]
  gfSlots: BracketSlot[]
}

// ── Slot definitions ──────────────────────────────────────────────────────────

const SLOTS: BracketSlot[] = [
  // ── Column 1 / W1 — UB R1 (胜者组晋级赛) ────────────────────────────────
  {
    id: 'ub-w1-m1', column: 1, row: 'ub', rowOrder: 0, week: 1,
    bracketKind: 'ub', bracketRound: 1,
    stageLabel: '胜者组 R1', weekLabel: 'W1 · 胜者组晋级赛',
    bestOf: 3,
    topSource:    { type: 'seed', seed: 1 },
    bottomSource: { type: 'seed', seed: 8 },
    winnerTo: { kind: 'slot', slotId: 'ub-w2-m1', position: 'top' },
    loserTo:  { kind: 'slot', slotId: 'lb-w2-m1', position: 'bottom' },
  },
  {
    id: 'ub-w1-m2', column: 1, row: 'ub', rowOrder: 1, week: 1,
    bracketKind: 'ub', bracketRound: 1,
    stageLabel: '胜者组 R1', weekLabel: 'W1 · 胜者组晋级赛',
    bestOf: 3,
    topSource:    { type: 'seed', seed: 4 },
    bottomSource: { type: 'seed', seed: 5 },
    winnerTo: { kind: 'slot', slotId: 'ub-w2-m1', position: 'bottom' },
    loserTo:  { kind: 'slot', slotId: 'lb-w2-m2', position: 'bottom' },
  },
  {
    id: 'ub-w1-m3', column: 1, row: 'ub', rowOrder: 2, week: 1,
    bracketKind: 'ub', bracketRound: 1,
    stageLabel: '胜者组 R1', weekLabel: 'W1 · 胜者组晋级赛',
    bestOf: 3,
    topSource:    { type: 'seed', seed: 2 },
    bottomSource: { type: 'seed', seed: 7 },
    winnerTo: { kind: 'slot', slotId: 'ub-w2-m2', position: 'top' },
    loserTo:  { kind: 'slot', slotId: 'lb-w2-m3', position: 'bottom' },
  },
  {
    id: 'ub-w1-m4', column: 1, row: 'ub', rowOrder: 3, week: 1,
    bracketKind: 'ub', bracketRound: 1,
    stageLabel: '胜者组 R1', weekLabel: 'W1 · 胜者组晋级赛',
    bestOf: 3,
    topSource:    { type: 'seed', seed: 3 },
    bottomSource: { type: 'seed', seed: 6 },
    winnerTo: { kind: 'slot', slotId: 'ub-w2-m2', position: 'bottom' },
    loserTo:  { kind: 'slot', slotId: 'lb-w2-m4', position: 'bottom' },
  },

  // ── Column 1 / W1 — LB R1 (败者组 第一轮) ─────────────────────────────
  {
    id: 'lb-w1-m1', column: 1, row: 'lb', rowOrder: 0, week: 1,
    bracketKind: 'lb', bracketRound: 1,
    stageLabel: '败者组 R1', weekLabel: 'W1 · 败者组第一轮',
    bestOf: 3,
    topSource:    { type: 'seed', seed: 9 },
    bottomSource: { type: 'bye' },
    winnerTo: { kind: 'slot', slotId: 'lb-w2-m1', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },
  {
    id: 'lb-w1-m2', column: 1, row: 'lb', rowOrder: 1, week: 1,
    bracketKind: 'lb', bracketRound: 1,
    stageLabel: '败者组 R1', weekLabel: 'W1 · 败者组第一轮',
    bestOf: 3,
    topSource:    { type: 'seed', seed: 12 },
    bottomSource: { type: 'seed', seed: 13 },
    winnerTo: { kind: 'slot', slotId: 'lb-w2-m2', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },
  {
    id: 'lb-w1-m3', column: 1, row: 'lb', rowOrder: 2, week: 1,
    bracketKind: 'lb', bracketRound: 1,
    stageLabel: '败者组 R1', weekLabel: 'W1 · 败者组第一轮',
    bestOf: 3,
    topSource:    { type: 'seed', seed: 10 },
    bottomSource: { type: 'seed', seed: 15 },
    winnerTo: { kind: 'slot', slotId: 'lb-w2-m3', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },
  {
    id: 'lb-w1-m4', column: 1, row: 'lb', rowOrder: 3, week: 1,
    bracketKind: 'lb', bracketRound: 1,
    stageLabel: '败者组 R1', weekLabel: 'W1 · 败者组第一轮',
    bestOf: 3,
    topSource:    { type: 'seed', seed: 11 },
    bottomSource: { type: 'seed', seed: 14 },
    winnerTo: { kind: 'slot', slotId: 'lb-w2-m4', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },

  // ── Column 2 / W2 — UB R2 (胜者组 4进2) ───────────────────────────────
  {
    id: 'ub-w2-m1', column: 2, row: 'ub', rowOrder: 0, week: 2,
    bracketKind: 'ub', bracketRound: 2,
    stageLabel: '胜者组 R2', weekLabel: 'W2 · 胜者组 4进2',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'ub-w1-m1' },
    bottomSource: { type: 'winnerOf', slotId: 'ub-w1-m2' },
    winnerTo: { kind: 'slot', slotId: 'ub-w4-final', position: 'top' },
    loserTo:  { kind: 'slot', slotId: 'lb-w4-sf1', position: 'bottom' },
  },
  {
    id: 'ub-w2-m2', column: 2, row: 'ub', rowOrder: 1, week: 2,
    bracketKind: 'ub', bracketRound: 2,
    stageLabel: '胜者组 R2', weekLabel: 'W2 · 胜者组 4进2',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'ub-w1-m3' },
    bottomSource: { type: 'winnerOf', slotId: 'ub-w1-m4' },
    winnerTo: { kind: 'slot', slotId: 'ub-w4-final', position: 'bottom' },
    loserTo:  { kind: 'slot', slotId: 'lb-w4-sf2', position: 'bottom' },
  },

  // ── Column 2 / W2 — LB R2 (败者组 8进4) ───────────────────────────────
  {
    id: 'lb-w2-m1', column: 2, row: 'lb', rowOrder: 0, week: 2,
    bracketKind: 'lb', bracketRound: 2,
    stageLabel: '败者组 R2', weekLabel: 'W2 · 败者组 8进4',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w1-m1' },
    bottomSource: { type: 'loserOf',  slotId: 'ub-w1-m1' },
    winnerTo: { kind: 'slot', slotId: 'lb-w3-m1', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },
  {
    id: 'lb-w2-m2', column: 2, row: 'lb', rowOrder: 1, week: 2,
    bracketKind: 'lb', bracketRound: 2,
    stageLabel: '败者组 R2', weekLabel: 'W2 · 败者组 8进4',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w1-m2' },
    bottomSource: { type: 'loserOf',  slotId: 'ub-w1-m2' },
    winnerTo: { kind: 'slot', slotId: 'lb-w3-m1', position: 'bottom' },
    loserTo:  { kind: 'eliminated' },
  },
  {
    id: 'lb-w2-m3', column: 2, row: 'lb', rowOrder: 2, week: 2,
    bracketKind: 'lb', bracketRound: 2,
    stageLabel: '败者组 R2', weekLabel: 'W2 · 败者组 8进4',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w1-m3' },
    bottomSource: { type: 'loserOf',  slotId: 'ub-w1-m3' },
    winnerTo: { kind: 'slot', slotId: 'lb-w3-m2', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },
  {
    id: 'lb-w2-m4', column: 2, row: 'lb', rowOrder: 3, week: 2,
    bracketKind: 'lb', bracketRound: 2,
    stageLabel: '败者组 R2', weekLabel: 'W2 · 败者组 8进4',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w1-m4' },
    bottomSource: { type: 'loserOf',  slotId: 'ub-w1-m4' },
    winnerTo: { kind: 'slot', slotId: 'lb-w3-m2', position: 'bottom' },
    loserTo:  { kind: 'eliminated' },
  },

  // ── Column 3 / W3 — LB R3 (败者组 4进2) ───────────────────────────────
  {
    id: 'lb-w3-m1', column: 3, row: 'lb', rowOrder: 0, week: 3,
    bracketKind: 'lb', bracketRound: 3,
    stageLabel: '败者组 R3', weekLabel: 'W3 · 败者组 4进2',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w2-m1' },
    bottomSource: { type: 'winnerOf', slotId: 'lb-w2-m2' },
    winnerTo: { kind: 'slot', slotId: 'lb-w4-sf1', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },
  {
    id: 'lb-w3-m2', column: 3, row: 'lb', rowOrder: 1, week: 3,
    bracketKind: 'lb', bracketRound: 3,
    stageLabel: '败者组 R3', weekLabel: 'W3 · 败者组 4进2',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w2-m3' },
    bottomSource: { type: 'winnerOf', slotId: 'lb-w2-m4' },
    winnerTo: { kind: 'slot', slotId: 'lb-w4-sf2', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },

  // ── Column 4 / W4 — UB Final ───────────────────────────────────────────
  {
    id: 'ub-w4-final', column: 4, row: 'ub', rowOrder: 0, week: 4,
    bracketKind: 'ub', bracketRound: 3,
    stageLabel: '胜者组决赛', weekLabel: 'W4 · 胜者组决赛',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'ub-w2-m1' },
    bottomSource: { type: 'winnerOf', slotId: 'ub-w2-m2' },
    winnerTo: { kind: 'slot', slotId: 'gf-w7', position: 'top' },
    loserTo:  { kind: 'slot', slotId: 'lb-w6-final2', position: 'bottom' },
  },

  // ── Column 4 / W4 — LB SF (败者组半决赛) ─────────────────────────────
  {
    id: 'lb-w4-sf1', column: 4, row: 'lb', rowOrder: 0, week: 4,
    bracketKind: 'lb', bracketRound: 4,
    stageLabel: '败者组 SF', weekLabel: 'W4 · 败者组半决赛',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w3-m1' },
    bottomSource: { type: 'loserOf',  slotId: 'ub-w2-m1' },
    winnerTo: { kind: 'slot', slotId: 'lb-w5-final1', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },
  {
    id: 'lb-w4-sf2', column: 4, row: 'lb', rowOrder: 1, week: 4,
    bracketKind: 'lb', bracketRound: 4,
    stageLabel: '败者组 SF', weekLabel: 'W4 · 败者组半决赛',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w3-m2' },
    bottomSource: { type: 'loserOf',  slotId: 'ub-w2-m2' },
    winnerTo: { kind: 'slot', slotId: 'lb-w5-final1', position: 'bottom' },
    loserTo:  { kind: 'eliminated' },
  },

  // ── Column 5 / W5+W6 — LB Final two stages ─────────────────────────────
  {
    id: 'lb-w5-final1', column: 5, row: 'lb', rowOrder: 0, week: 5,
    bracketKind: 'lb', bracketRound: 5,
    stageLabel: '败者组决赛 ①', weekLabel: 'W5 · 败者组决赛 第一阶段',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w4-sf1' },
    bottomSource: { type: 'winnerOf', slotId: 'lb-w4-sf2' },
    winnerTo: { kind: 'slot', slotId: 'lb-w6-final2', position: 'top' },
    loserTo:  { kind: 'eliminated' },
  },
  {
    id: 'lb-w6-final2', column: 5, row: 'lb', rowOrder: 1, week: 6,
    bracketKind: 'lb', bracketRound: 6,
    stageLabel: '败者组决赛 ②', weekLabel: 'W6 · 败者组决赛 第二阶段',
    bestOf: 3,
    topSource:    { type: 'winnerOf', slotId: 'lb-w5-final1' },
    bottomSource: { type: 'loserOf',  slotId: 'ub-w4-final' },
    winnerTo: { kind: 'slot', slotId: 'gf-w7', position: 'bottom' },
    loserTo:  { kind: 'eliminated' },
  },

  // ── Column 6 / W7 — Grand Final BO5 ───────────────────────────────────
  {
    id: 'gf-w7', column: 6, row: 'gf', rowOrder: 0, week: 7,
    bracketKind: 'gf', bracketRound: 1,
    stageLabel: '总决赛 BO5', weekLabel: 'W7 · 总决赛',
    bestOf: 5,
    topSource:    { type: 'winnerOf', slotId: 'ub-w4-final' },
    bottomSource: { type: 'winnerOf', slotId: 'lb-w6-final2' },
    winnerTo: { kind: 'champion' },
    loserTo:  { kind: 'eliminated' },
  },
]

export const BRACKET_SLOTS: BracketSlot[] = SLOTS

export const SLOT_BY_ID: ReadonlyMap<string, BracketSlot> =
  new Map(SLOTS.map(s => [s.id, s]))

const COLUMN_TITLES: Record<number, string> = {
  1: 'W1 · 第一周',
  2: 'W2 · 第二周',
  3: 'W3 · 第三周',
  4: 'W4 · 第四周',
  5: 'W5 · 第五-六周',
  6: 'W7 · 第七周',
}

const COLUMN_WEEKS: Record<number, number[]> = {
  1: [1], 2: [2], 3: [3], 4: [4], 5: [5, 6], 6: [7],
}

export function getBracketColumns(): BracketColumn[] {
  const cols: BracketColumn[] = []
  for (let i = 1; i <= 6; i++) {
    const slots = SLOTS.filter(s => s.column === i)
    cols.push({
      index: i,
      weeks: COLUMN_WEEKS[i],
      title: COLUMN_TITLES[i],
      ubSlots: slots.filter(s => s.row === 'ub').sort((a, b) => a.rowOrder - b.rowOrder),
      lbSlots: slots.filter(s => s.row === 'lb').sort((a, b) => a.rowOrder - b.rowOrder),
      gfSlots: slots.filter(s => s.row === 'gf').sort((a, b) => a.rowOrder - b.rowOrder),
    })
  }
  return cols
}
