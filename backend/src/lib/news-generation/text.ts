const ROUND_LABELS: Record<string, string> = {
  R1: '第一轮',
  R2: '第二轮',
  R3: '第三轮',
}

const TERM_LABELS: Record<string, string> = {
  HS: '爆头率',
  'first kill': '首杀',
  clutch: '残局',
  won: '胜利',
}

export function formatStageForNews(stage: string | null): string | null {
  if (!stage) return null
  return stage.replace(/\bR[123]\b/g, token => ROUND_LABELS[token] ?? token)
}

export function translateNewsTerm(term: string): string {
  return TERM_LABELS[term] ?? term
}
