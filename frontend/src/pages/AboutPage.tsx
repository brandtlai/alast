export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">关于 ALAST Premier</h1>

      <section className="space-y-3" style={{ color: 'rgba(248,250,252,0.8)' }}>
        <p>
          <strong style={{ color: 'var(--color-primary)' }}>ALAST Premier</strong> 是一项面向中国区玩家的高水平 CS2 精英赛事，
          以严格的赛制、完整的数据追踪和专业的赛事运营为核心，打造国内顶级电竞比赛体验。
        </p>
        <p>
          赛事采用 BO3 淘汰制 + 小组循环赛的混合赛制，所有比赛数据通过 CS Demo Manager 解析，
          精确追踪每位选手在每张地图的表现——包括 Rating、ADR、KAST、首杀/首死等 HLTV 级别指标。
        </p>
        <p>
          本站为 ALAST Premier 2026 官方信息平台，提供实时赛程、选手数据、战队信息及赛事新闻。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-3">赛事规格</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['游戏', 'Counter-Strike 2'],
            ['赛季', '2026'],
            ['赛制', 'BO3 + 小组循环'],
            ['数据源', 'CS Demo Manager v4+'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
              <div className="text-xs opacity-50 mb-1">{k}</div>
              <div className="font-semibold">{v}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
