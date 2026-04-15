// src/pages/AboutPage.tsx
import TrophySymbol from '../components/TrophySymbol'
import Card from '../components/Card'

const SPECS = [
  ['游戏',   'Counter-Strike 2'],
  ['赛季',   '2026'],
  ['赛制',   'BO3 + 小组循环赛'],
  ['数据源', 'CS Demo Manager v4+'],
] as const

export default function AboutPage() {
  return (
    <div className="relative max-w-7xl mx-auto px-6 py-8">
      {/* Trophy decoration */}
      <div className="absolute right-0 top-0 w-[500px] pointer-events-none select-none">
        <TrophySymbol variant="cropped" className="w-full" />
      </div>

      <div className="relative z-10 max-w-2xl space-y-10">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">About</p>
          <h1 className="text-4xl font-black italic tracking-tighter text-white/90 mb-6">关于 ALAST Premier</h1>

          <div className="space-y-4 text-sm text-white/70 leading-relaxed">
            <p>
              <span className="font-black text-primary">ALAST Premier</span> 是一项面向中国区玩家的高水平 CS2 精英赛事，
              以严格的赛制、完整的数据追踪和专业的赛事运营为核心，打造国内顶级电竞比赛体验。
            </p>
            <p>
              赛事采用 BO3 淘汰制 + 小组循环赛的混合赛制，所有比赛数据通过 CS Demo Manager 解析，
              精确追踪每位选手在每张地图的表现——包括 Rating、ADR、KAST、首杀/首死等 HLTV 级别指标。
            </p>
            <p>
              本站为 ALAST Premier 2026 官方信息平台，提供实时赛程、选手数据、战队信息及赛事新闻。
            </p>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-black italic uppercase tracking-tight text-white/80 mb-4">赛事规格</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SPECS.map(([k, v]) => (
              <Card key={k} hover={false} className="p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/35 mb-1">{k}</div>
                <div className="font-black text-sm text-white/85">{v}</div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
