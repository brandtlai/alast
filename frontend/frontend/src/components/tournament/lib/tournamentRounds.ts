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

const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

/**
 * Display-only translation of stage labels. DB stores e.g. "小组赛 R1" / "败者组 R4";
 * we render "小组赛第一轮" / "败者组第四轮". Non-R tokens (QF/SF/Final/GF) pass through.
 */
export function formatStage(stage: string | null | undefined): string {
  if (!stage) return ''
  return stage
    .replace(/\s*R(\d+)/g, (_, n) => {
      const i = parseInt(n, 10)
      const cn = i >= 1 && i <= CN_NUM.length ? CN_NUM[i - 1] : String(i)
      return `第${cn}轮`
    })
    .replace(/Grand Final|^GF$/i, '总决赛')
}
