import { Check } from 'lucide-react'
import { RailCard } from './RightRail'

// startISO: first day of this stage in 2026 (used to determine done/current/future)
const STAGES: readonly { label: string; date: string; startISO: string }[] = [
  { label: '报名',         date: '03-11 → 03-30', startISO: '2026-03-11' },
  { label: '选马',         date: '04-01 → 04-03', startISO: '2026-04-01' },
  { label: '小组赛 R1',    date: '04-06',          startISO: '2026-04-06' },
  { label: '小组赛 R2',    date: '04-13',          startISO: '2026-04-13' },
  { label: '小组赛 R3',    date: '04-20',          startISO: '2026-04-20' },
  { label: '胜者组',       date: '05-06 →',        startISO: '2026-05-06' },
  { label: '败者组',       date: '05-13 →',        startISO: '2026-05-13' },
  { label: '总决赛',       date: '06-30',          startISO: '2026-06-30' },
]

function getCurrentIndex(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // Current = last stage whose start date has already passed
  let current = 0
  for (let i = 0; i < STAGES.length; i++) {
    if (new Date(STAGES[i].startISO) <= today) current = i
    else break
  }
  return current
}

const CURRENT_INDEX = getCurrentIndex()

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
