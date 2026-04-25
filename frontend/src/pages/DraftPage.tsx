import { motion } from 'framer-motion'

const TIERS = [
  { key: 'S',  label: '特等马', accent: '#FFD700', desc: '前 20% 战力 / 队长' },
  { key: 'A',  label: '上等马', accent: '#FF8A00', desc: '高战力'           },
  { key: 'B',  label: '中等马', accent: '#00D1FF', desc: '中坚'             },
  { key: 'C+', label: '下等马', accent: '#A0AEC0', desc: '潜力'             },
  { key: 'D',  label: '赠品马', accent: '#718096', desc: '友情参与'         },
] as const

const N_TEAMS = 16

export default function DraftPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">DRAFT BOARD</p>
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-white/95">选马公示 / Draft</h1>
        <p className="text-sm text-white/50 mt-2">每队 5 人 = 5 等级各 1 人。前 20% 战力为队长，第 1 轮 S 型逆向选马，第 2-4 轮按公布顺序。</p>
      </header>

      {/* Tier grid */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-4">5 Tiers</h2>
        <div className="space-y-3">
          {TIERS.map(tier => (
            <div key={tier.key}
                 className="rounded-md border p-4 flex items-center gap-4"
                 style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
              <div className="w-12 h-12 rounded-md flex items-center justify-center font-black text-xl flex-shrink-0"
                   style={{ background: tier.accent + '22', color: tier.accent, border: `1px solid ${tier.accent}66` }}>
                {tier.key}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-black text-white/90">{tier.label}</div>
                <div className="text-[11px] text-white/45">{tier.desc}</div>
              </div>
              <div className="text-xs text-white/40 hidden sm:block">尚未公布选手分配</div>
            </div>
          ))}
        </div>
      </section>

      {/* S-shape pick order viz */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-4">Pick Order</h2>
        <div className="rounded-md border p-6"
             style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
          <SnakeOrderPlaceholder rounds={4} teams={N_TEAMS} />
          <p className="text-xs text-white/40 mt-4 text-center">
            选手分配数据待 admin 录入 — 此处显示 S 型逆向选马顺序示意
          </p>
        </div>
      </section>
    </div>
  )
}

function SnakeOrderPlaceholder({ rounds, teams }: { rounds: number; teams: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rounds }, (_, r) => {
        const reverse = r % 2 === 1
        const order = Array.from({ length: teams }, (_, i) => reverse ? teams - i : i + 1)
        return (
          <motion.div
            key={r}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: reverse ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: r * 0.06 }}
          >
            <div className="text-[10px] font-black uppercase tracking-widest text-white/35 w-12 flex-shrink-0">
              R{r + 1} {reverse ? '←' : '→'}
            </div>
            <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${teams}, minmax(0, 1fr))` }}>
              {order.map(n => (
                <div key={n}
                     className="aspect-square rounded text-[9px] font-black flex items-center justify-center text-white/55 tabular-nums"
                     style={{ background: 'var(--color-data-chip)' }}>
                  {n}
                </div>
              ))}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
