// src/pages/AboutPage.tsx
import { TacticalLabel } from '../components/hud/TacticalLabel'

const SPECS = [
  ['游戏',   'Counter-Strike 2'],
  ['赛季',   '2026'],
  ['赛制',   'BO3 + 小组循环赛'],
  ['数据源', 'CS Demo Manager v4+'],
] as const

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '120px 24px 96px', position: 'relative' }}>

        {/* Header */}
        <TacticalLabel text="SECTOR :: BRIEFING" />
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-display-xl)',
          marginTop: 16,
          lineHeight: 1,
          color: 'var(--color-fg)',
        }}>
          ABOUT ALAST
        </h1>
        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 32,
          color: 'var(--color-fg-muted)',
          marginTop: 12,
          fontWeight: 500,
        }}>
          关于 ALAST Premier 2026
        </h2>

        {/* Intro section */}
        <section style={{ marginTop: 64 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            textTransform: 'uppercase',
            color: 'var(--color-fg)',
            letterSpacing: '0.2em',
            paddingBottom: 12,
            borderBottom: '1px solid var(--color-data)',
            display: 'inline-block',
          }}>
            OVERVIEW
          </h2>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--color-fg)', lineHeight: 1.85 }}>
              <strong style={{ color: 'var(--color-data)' }}>ALAST Premier</strong> 是一项面向中国区玩家的高水平 CS2 精英赛事，
              以严格的赛制、完整的数据追踪和专业的赛事运营为核心，打造国内顶级电竞比赛体验。
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--color-fg)', lineHeight: 1.85 }}>
              赛事采用 BO3 淘汰制 + 小组循环赛的混合赛制，所有比赛数据通过 CS Demo Manager 解析，
              精确追踪每位选手在每张地图的表现——包括 Rating、ADR、KAST、首杀/首死等 HLTV 级别指标。
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--color-fg)', lineHeight: 1.85 }}>
              本站为 ALAST Premier 2026 官方信息平台，提供实时赛程、选手数据、战队信息及赛事新闻。
            </p>
          </div>
        </section>

        {/* Specs section */}
        <section style={{ marginTop: 64 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            textTransform: 'uppercase',
            color: 'var(--color-fg)',
            letterSpacing: '0.2em',
            paddingBottom: 12,
            borderBottom: '1px solid var(--color-data)',
            display: 'inline-block',
          }}>
            赛事规格
          </h2>
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {SPECS.map(([k, v]) => (
              <div
                key={k}
                style={{
                  padding: '20px 24px',
                  border: '1px solid var(--color-line)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)',
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-xs)',
                  color: 'var(--color-fg-dim)',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  {k}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-mono-md)',
                  color: 'var(--color-fg)',
                  fontWeight: 700,
                }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mission section */}
        <section style={{ marginTop: 64 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            textTransform: 'uppercase',
            color: 'var(--color-fg)',
            letterSpacing: '0.2em',
            paddingBottom: 12,
            borderBottom: '1px solid var(--color-data)',
            display: 'inline-block',
          }}>
            MISSION
          </h2>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--color-fg)', lineHeight: 1.85 }}>
              我们相信，竞技游戏的核心是数据与公平。ALAST Premier 致力于为每一位参赛选手提供透明、可追溯的比赛记录，让每一次击杀、每一轮战术都有据可查。
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, color: 'var(--color-fg)', lineHeight: 1.85 }}>
              通过 HLTV 级别的数据指标体系，我们让玩家、教练和观众都能深度理解比赛——从宏观战术到微观决策，从团队配合到个人发挥。
            </p>
          </div>
        </section>

        {/* Data sources section */}
        <section id="data" style={{ marginTop: 96 }}>
          <TacticalLabel text="DATA SOURCES" />
          <ul style={{
            marginTop: 16,
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-mono-md)',
            color: 'var(--color-fg-muted)',
            listStyle: 'none',
            padding: 0,
          }}>
            <li style={{ padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>CSDM batch JSON imports</li>
            <li style={{ padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>Tournament admin entry</li>
            <li style={{ padding: '6px 0', borderBottom: '1px solid var(--color-line)' }}>CS Demo Manager v4+ parse pipeline</li>
          </ul>
        </section>

      </div>
    </div>
  )
}
