import { Check } from 'lucide-react'
import { RailCard } from './RightRail'

const STAGES: readonly { label: string; date: string }[] = [
  { label: '报名',         date: '03-11 → 03-30' },
  { label: '选马',         date: '04-01 → 04-03' },
  { label: '小组赛 R1',    date: '04-06' },
  { label: '小组赛 R2',    date: '04-13' },
  { label: '小组赛 R3',    date: '04-20' },
  { label: '胜者组',       date: '05-06 →' },
  { label: '败者组',       date: '05-13 →' },
  { label: '总决赛',       date: '06-30' },
]

const CURRENT_INDEX = 2 // matches StageCard

export default function StageTimeline() {
  return (
    <RailCard title="Schedule">
      <ol className="space-y-2">
        {STAGES.map((s, i) => {
          const done    = i < CURRENT_INDEX
          const current = i === CURRENT_INDEX
          return (
            <li key={s.label} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: done ? '#10B981' : current ? 'var(--color-primary)' : 'var(--color-data-chip)',
                  boxShadow: current ? '0 0 10px rgba(255,138,0,0.5)' : 'none',
                }}
              >
                {done && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold truncate ${done ? 'text-white/50' : current ? 'text-white' : 'text-white/60'}`}>
                  {s.label}
                </div>
                <div className="text-[10px] font-mono text-white/30">{s.date}</div>
              </div>
            </li>
          )
        })}
      </ol>
    </RailCard>
  )
}
