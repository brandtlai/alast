/**
 * Canonical ordering of stage labels in this tournament. Used to sort
 * round groups consistently in the UI even when matches.stage is free text.
 * In Phase C this is replaced by (bracket_kind, bracket_round) tuples.
 */
export const STAGE_ORDER: readonly string[] = [
  '小组赛 R1', '小组赛 R2', '小组赛 R3',
  '胜者组 QF', '胜者组 SF', '胜者组 Final',
  '败者组 R1', '败者组 R2', '败者组 R3', '败者组 R4', '败者组 Final',
  'Grand Final', 'GF',
]

export function stageOrderIndex(stage: string | null | undefined): number {
  if (!stage) return STAGE_ORDER.length
  const i = STAGE_ORDER.indexOf(stage)
  return i === -1 ? STAGE_ORDER.length : i
}
