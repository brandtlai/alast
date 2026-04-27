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

const GENERATED_NEWS_REPLACEMENTS: Array<[RegExp, string]> = [
  [/force_clutch/g, '强起残局'],
  [/force buy/gi, '强起'],
  [/full buy/gi, '全甲长枪'],
  [/anti-eco/gi, '防经济局'],
  [/eco win/gi, '经济局胜利'],
  [/\bpistol\b/gi, '手枪局'],
  [/\beco\b/gi, '经济局'],
  [/\bforce\b/gi, '强起'],
  [/\bquad\b/gi, '四杀'],
  [/\bclutch\b/gi, '残局'],
  [/\bhighlight(?:s)?\b/gi, '高光'],
  [/\bstandout\b/gi, '亮眼名单'],
  [/\breel\b/gi, '集锦'],
]

export function formatStageForNews(stage: string | null): string | null {
  if (!stage) return null
  return stage.replace(/\bR[123]\b/g, token => ROUND_LABELS[token] ?? token)
}

export function translateNewsTerm(term: string): string {
  return TERM_LABELS[term] ?? term
}

export function normalizeGeneratedNewsText(text: string): string {
  return GENERATED_NEWS_REPLACEMENTS
    .reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), text)
    .replace(/强起\s+四杀/g, '强起四杀')
    .replace(/强起残局\s*\+\s*四杀/g, '强起残局四杀')
    .replace(/先\s+高光/g, '先说高光')
    .replace(/高光\s+集锦/g, '高光集锦')
    .replace(/残局\s+K\/D/g, '残局数据')
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
}
