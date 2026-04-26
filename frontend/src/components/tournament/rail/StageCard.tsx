import { RailCard } from './RightRail'

const STAGES: readonly { label: string; startISO: string }[] = [
  { label: '报名',       startISO: '2026-03-11' },
  { label: '选马',       startISO: '2026-04-01' },
  { label: '小组赛第一轮', startISO: '2026-04-06' },
  { label: '小组赛第二轮', startISO: '2026-04-13' },
  { label: '小组赛第三轮', startISO: '2026-04-20' },
  { label: '胜者组',     startISO: '2026-05-06' },
  { label: '败者组',     startISO: '2026-05-13' },
  { label: '总决赛',     startISO: '2026-06-30' },
]

function getCurrentIndex(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let current = 0
  for (let i = 0; i < STAGES.length; i++) {
    if (new Date(STAGES[i].startISO) <= today) current = i
    else break
  }
  return current
}

const CURRENT_INDEX = getCurrentIndex()

export default function StageCard() {
  const total = STAGES.length
  const current = STAGES[Math.min(CURRENT_INDEX, total - 1)].label
  const pct = Math.round(((CURRENT_INDEX + 1) / total) * 100)

  return (
    <RailCard>
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-2">
        Current Stage
      </div>
      <div className="text-2xl font-black italic text-white mb-1">
        {current}
      </div>
      <div className="text-[11px] text-white/45 mb-3">
        阶段 {Math.min(CURRENT_INDEX + 1, total)} / {total}
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-data-row)' }}>
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%`, boxShadow: '0 0 12px rgba(255,138,0,0.5)' }}
        />
      </div>
    </RailCard>
  )
}
