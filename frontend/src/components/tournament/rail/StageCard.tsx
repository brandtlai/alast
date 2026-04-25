import { RailCard } from './RightRail'

const STAGES = [
  '报名', '选马',
  '小组赛 R1', '小组赛 R2', '小组赛 R3',
  '胜者组', '败者组', '总决赛',
]

const CURRENT_INDEX = 2 // 小组赛 R1

export default function StageCard() {
  const total = STAGES.length
  const current = STAGES[CURRENT_INDEX]
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
        阶段 {CURRENT_INDEX + 1} / {total}
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
