import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { RailCard } from './RightRail'

const FAQ: { q: string; a: string }[] = [
  {
    q: '什么是 5 等级 Tier？',
    a: '组委会按战力把选手分为特等马 / 上等马 / 中等马 / 下等马 / 赠品马五级；每队 5 人，每级各 1 人，保证队伍均衡。',
  },
  {
    q: '选马规则是什么？',
    a: '前 20% 战力为队长。第 1 轮 S 型逆向选马，第 2-4 轮按公布顺序。被选选手有 1 次拒绝权；队长被拒 2 次后下次强制接受。',
  },
  {
    q: '替补怎么算？',
    a: '被借选手"被选中位次"不得高于借出方；每场最多 1 人替补。',
  },
  {
    q: '小组赛排名怎么算？',
    a: '胜场数 → Buchholz 系数（对手累计胜场） → 净回合数。',
  },
  {
    q: '决赛是几局几胜？',
    a: 'BO5。胜者组 1 图优势（领先 1-0 开局）。',
  },
]

export default function FaqWidget() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <RailCard title="FAQ">
      <ul className="space-y-1">
        {FAQ.map((item, i) => {
          const isOpen = open === i
          return (
            <li key={i} className="border-b last:border-0" style={{ borderColor: 'var(--color-data-divider)' }}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-2 py-2 text-left group"
              >
                <span className="text-xs font-bold text-white/85 group-hover:text-white">{item.q}</span>
                <ChevronDown
                  size={12}
                  className={`text-white/40 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <p className="text-[11px] leading-relaxed text-white/55 pb-3 pr-5">{item.a}</p>
              )}
            </li>
          )
        })}
      </ul>
    </RailCard>
  )
}
