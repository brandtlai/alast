# Trophy Hero + 「炫酷明亮」视觉升级 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 ALAST Premier 2026 首页加一个奖杯入场强动效（每会话首播一次），并把「橙金 = 上位 / 紫粉 = 下位」的语义色统一铺到比分、tier、leaderboard 等所有 rank 出现位置。

**Architecture:** 纯前端视觉改动。新增 2 个组件（`TrophyHeroEntry` 入场编排 + `AmbientParticles` CSS 粒子层）；扩展 `index.css` 的 token / keyframes / 工具类、`motion.ts` 的 variants；其余为 page/component 级 winner-loser 颜色重铺。无 backend / schema 变更。

**Tech Stack:** React 18, Tailwind v4 (`@theme` tokens), framer-motion, CSS keyframes, sessionStorage。

**Spec:** `docs/superpowers/specs/2026-04-26-trophy-hero-flashy-redesign-design.md`

**Test 策略:** 此项目纯视觉，spec 明确「不写 visual regression 测试」。每个任务的「测试」步骤是 `npm run build`（type check + bundle 通过）+ 在浏览器肉眼验证；最终任务跑一次完整桌面 / 移动 / reduce-motion 三道手测。

**File map:**

| 文件 | 类型 | 责任 |
|---|---|---|
| `frontend/src/index.css` | edit | 紫粉色 tokens、`pink-gradient` 工具类、`sparkBurst` / `particleDrift` / `glowPulseRank` keyframes、reduce-motion 兜底 |
| `frontend/src/lib/motion.ts` | edit | 4 条新 variants（`rankReveal` / `glowPulse` / `headingMask` / `scoreFlip`）+ outcome→tone 颜色 helper |
| `frontend/src/components/TrophyHeroEntry.tsx` | **new** | 奖杯入场编排（seed→mask reveal→bloom burst→settle→title→idle） |
| `frontend/src/components/AmbientParticles.tsx` | **new** | 14 颗 CSS 慢飘金色粒子层 |
| `frontend/src/components/tournament/TournamentHubHero.tsx` | edit | 集成 `TrophyHeroEntry` + `AmbientParticles`；sessionStorage `alast.trophyShown` 触发逻辑 |
| `frontend/src/components/StatusBadge.tsx` | edit | LIVE 改紫粉脉冲 |
| `frontend/src/components/match/Scoreboard.tsx` | edit | 队伍 header 用 winner / loser tint（赢方金、输方紫粉） |
| `frontend/src/components/tournament/MatchRow.tsx` | edit | bracket-card 变体比分按 winner / loser 上色 |
| `frontend/src/pages/MatchesPage.tsx` | edit | 比赛卡比分 winner=金 / loser=紫粉 |
| `frontend/src/pages/MatchDetailPage.tsx` | edit | hero 总分 winner 用 `gold-gradient`，loser 用新增 `pink-gradient` |
| `frontend/src/pages/StatsPage.tsx` | edit | tier 色阶（D=紫粉）；leaderboard 末位 rank 改紫粉 |
| `frontend/src/pages/TeamDetailPage.tsx` | edit | recent results 比分按 winner / loser；hero 区挂 `AmbientParticles` |
| `frontend/src/pages/PlayerDetailPage.tsx` | edit | header 加 tier 徽章用色阶 |

---

## Task 1: 加 CSS tokens、`pink-gradient` 工具类、新 keyframes

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: 在 `@theme` 块加紫粉色变量**

打开 `frontend/src/index.css`，把 `--color-data-text-muted: rgba(255, 255, 255, 0.45);` 这一行下面（在 `}` 闭合 `@theme` 之前）加：

```css
  /* Rank semantic axis — winner=gold, loser=neon pink */
  --color-neon-pink-from: #FF2BD6;
  --color-neon-pink-to:   #B026FF;
  --color-neon-pink:      #FF2BD6;
```

- [ ] **Step 2: 加 `pink-gradient` 工具类**

在 `.gold-gradient` 块后面（约第 41 行后）添加：

```css
.pink-gradient {
  background: linear-gradient(135deg, #FF2BD6 0%, #B026FF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

注意：不复制 `.gold-gradient` 的 shimmer 动画 — winner 才需要持续 shimmer，loser 不需要吸引注意力。

- [ ] **Step 3: 加新 keyframes**

在文件末尾的 `@media (prefers-reduced-motion: reduce)` 块**之前**添加：

```css
@keyframes sparkBurst {
  0%   { opacity: 0; transform: translate(0, 0) scale(0.5); }
  20%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--spark-x, 40px), var(--spark-y, -40px)) scale(0.2); }
}

@keyframes particleDrift {
  0%   { transform: translate3d(0, 0, 0); opacity: 0; }
  10%  { opacity: var(--particle-opacity, 0.25); }
  90%  { opacity: var(--particle-opacity, 0.25); }
  100% { transform: translate3d(var(--particle-x, 20px), -100vh, 0); opacity: 0; }
}

@keyframes glowPulseRank {
  0%, 100% { box-shadow: 0 0 12px var(--rank-glow, rgba(255, 184, 0, 0.3)); }
  50%      { box-shadow: 0 0 28px var(--rank-glow, rgba(255, 184, 0, 0.55)); }
}

@keyframes trophyPendulum {
  0%, 100% { transform: rotate(0deg); }
  50%      { transform: rotate(7deg); }
}

@keyframes trophyBreath {
  0%, 100% { filter: drop-shadow(0 0 14px rgba(255,184,0,0.45)); }
  50%      { filter: drop-shadow(0 0 26px rgba(255,184,0,0.75)); }
}
```

- [ ] **Step 4: 在 reduce-motion 块加新 keyframes 的禁用兜底**

把现有的 `@media (prefers-reduced-motion: reduce)` 块替换为：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }

  .interactive-lift:hover {
    transform: none;
  }

  /* Hide ambient particle layer entirely */
  .ambient-particles { display: none !important; }
}
```

注：`*` selector 的 `animation-duration: 0.001ms` 已经把 `sparkBurst` / `particleDrift` / `glowPulseRank` / `trophyPendulum` / `trophyBreath` 等所有 keyframe 实质禁用（动画立即结束到终态）。`.ambient-particles` 加显式 hidden 是为了防止粒子在终态停在屏幕中段成为静态噪点。

- [ ] **Step 5: 验证 build**

```bash
cd frontend && npm run build
```

Expected: build 通过，无 TS 错误。

- [ ] **Step 6: 提交**

```bash
git add frontend/src/index.css
git commit -m "feat(css): add neon pink rank tokens, pink-gradient utility, rank keyframes"
```

---

## Task 2: motion.ts 加 4 条 variants + outcome 颜色 helper

**Files:**
- Modify: `frontend/src/lib/motion.ts`

- [ ] **Step 1: 在文件末尾加 outcome 类型 + helper**

打开 `frontend/src/lib/motion.ts`，在文件末尾添加：

```ts
// ── Rank semantic axis ──
export type Outcome = 'win' | 'loss' | 'neutral'

const RANK_GRADIENT: Record<Outcome, string> = {
  win:     'linear-gradient(135deg, #FFD700 0%, #FFB800 45%, #FF8A00 100%)',
  loss:    'linear-gradient(135deg, #FF2BD6 0%, #B026FF 100%)',
  neutral: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.4))',
}

const RANK_GLOW: Record<Outcome, string> = {
  win:     'rgba(255, 184, 0, 0.55)',
  loss:    'rgba(255, 43, 214, 0.5)',
  neutral: 'rgba(255, 255, 255, 0.18)',
}

export function rankGradient(outcome: Outcome): string {
  return RANK_GRADIENT[outcome]
}

export function rankGlow(outcome: Outcome): string {
  return RANK_GLOW[outcome]
}
```

- [ ] **Step 2: 加 `rankReveal` variant**

在 helper 之后添加：

```ts
// 几何 spring 入场。颜色由消费方读 rankGradient(outcome) 注入到 style.backgroundImage —
// 避免 framer-motion variants 嵌入动态颜色字符串。outcome 参数保留以让调用点语义自描述
// （未来可按 outcome 调整 spring 参数 / 错峰）。
export const rankReveal = (_outcome: Outcome): Variants => ({
  hidden: { opacity: 0, scale: 0.7 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 18,
      mass: 0.7,
    },
  },
})
```

注：`_outcome` 前缀下划线绕开 `noUnusedParameters` lint。

- [ ] **Step 3: 加 `glowPulse` variant + helper**

```ts
export const glowPulse = (tone: Outcome) => ({
  animation: 'glowPulseRank 6.5s ease-in-out infinite',
  // CSS custom prop consumed by @keyframes glowPulseRank
  ['--rank-glow' as string]: rankGlow(tone),
}) as React.CSSProperties
```

- [ ] **Step 4: 加 `headingMask` variant**

```ts
export const headingMask: Variants = {
  hidden: {
    opacity: 0,
    clipPath: 'inset(0 100% 0 0)',
  },
  show: {
    opacity: 1,
    clipPath: 'inset(0 0% 0 0)',
    transition: { duration: 0.7, ease: easeOutQuart },
  },
}
```

- [ ] **Step 5: 加 `scoreFlip` variant**

```ts
export const scoreFlip: Variants = {
  hidden: { opacity: 0, rotateX: -90, y: -8 },
  show: {
    opacity: 1,
    rotateX: 0,
    y: 0,
    transition: { duration: 0.45, ease: easeOutQuart },
  },
}
```

- [ ] **Step 6: 加 React import**

文件第 1 行 `import type { Variants } from 'framer-motion'` 后面新增一行：

```ts
import type React from 'react'
```

- [ ] **Step 7: 验证 build**

```bash
cd frontend && npm run build
```

Expected: build 通过。

- [ ] **Step 8: 提交**

```bash
git add frontend/src/lib/motion.ts
git commit -m "feat(motion): add rankReveal/glowPulse/headingMask/scoreFlip variants"
```

---

## Task 3: 创建 `AmbientParticles` 组件

**Files:**
- Create: `frontend/src/components/AmbientParticles.tsx`

- [ ] **Step 1: 写组件**

创建新文件 `frontend/src/components/AmbientParticles.tsx`：

```tsx
// 14 颗慢飘金色粒子，纯 CSS 实现。
// 仅挂在视觉密度低的 hero 区域（首页 + 战队详情），数据页不挂避免噪声。
// reduce-motion 通过 .ambient-particles 类整层 display:none。

const COLORS = ['#FFD700', '#FFB800', '#FF8A00'] as const
const COUNT = 14

interface Particle {
  size: number       // 1–3 px
  left: number       // 0–100 (%)
  startBottom: number // 0–60 (%) — 起飞高度随机化避免一齐起跳
  duration: number   // 30–60 s
  delay: number      // -60 – 0 s（负值让初始就处在动画中段）
  drift: number      // -20 – 20 px 横向终点
  color: string
  opacity: number    // 0.15–0.35
}

function makeParticles(): Particle[] {
  // 固定 seed 也行，但每次刷新轻微变化更有「活感」
  return Array.from({ length: COUNT }, () => ({
    size: 1 + Math.random() * 2,
    left: Math.random() * 100,
    startBottom: Math.random() * 60,
    duration: 30 + Math.random() * 30,
    delay: -Math.random() * 60,
    drift: -20 + Math.random() * 40,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: 0.15 + Math.random() * 0.2,
  }))
}

interface Props {
  className?: string
}

export default function AmbientParticles({ className = '' }: Props) {
  const particles = makeParticles()

  return (
    <div
      className={`ambient-particles absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      aria-hidden
      style={{ zIndex: 1 }}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: `${p.startBottom}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animation: `particleDrift ${p.duration}s linear ${p.delay}s infinite`,
            ['--particle-x' as string]: `${p.drift}px`,
            ['--particle-opacity' as string]: String(p.opacity),
          }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 验证 build**

```bash
cd frontend && npm run build
```

Expected: build 通过。组件未挂载，UI 暂无变化。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/AmbientParticles.tsx
git commit -m "feat(visual): add AmbientParticles component (CSS-only gold drift)"
```

---

## Task 4: 创建 `TrophyHeroEntry` 组件

**Files:**
- Create: `frontend/src/components/TrophyHeroEntry.tsx`

- [ ] **Step 1: 写组件骨架**

创建 `frontend/src/components/TrophyHeroEntry.tsx`：

```tsx
import { motion, useReducedMotion } from 'framer-motion'
import { easeOutQuart } from '../lib/motion'

interface Props {
  /** true = 播完整入场；false = 直接 settle 到 idle 状态 */
  playEntry: boolean
  className?: string
}

const SPARK_COUNT = 10

// 火花径向飞散方向（10 个均布 + 抖动）
function makeSparks() {
  return Array.from({ length: SPARK_COUNT }, (_, i) => {
    const angle = (i / SPARK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
    const dist = 80 + Math.random() * 40
    return {
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      delay: 0.6 + Math.random() * 0.05,
    }
  })
}

export default function TrophyHeroEntry({ playEntry, className = '' }: Props) {
  const reduceMotion = useReducedMotion()
  const skip = !playEntry || reduceMotion
  const sparks = skip ? [] : makeSparks()

  return (
    <div className={`relative ${className}`} style={{ width: 220, height: 260 }}>
      {/* Background radial bloom — 0.6–0.8s burst */}
      {!skip && (
        <motion.div
          className="absolute inset-[-40%] pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 55%, rgba(255,184,0,0.55) 0%, rgba(255,138,0,0.25) 25%, transparent 60%)',
          }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: [0, 0, 1, 0.3, 0], scale: [0.4, 0.4, 1.2, 1, 0.9] }}
          transition={{
            duration: 1.4,
            times: [0, 0.42, 0.55, 0.7, 1],
            ease: easeOutQuart,
          }}
        />
      )}

      {/* Seed point — 0–0.2s */}
      {!skip && (
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
          style={{
            width: 6,
            height: 6,
            background: '#FFD700',
            boxShadow: '0 0 12px 2px rgba(255,215,0,0.85)',
          }}
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: [1, 1, 0], scale: [1, 1.6, 0.6] }}
          transition={{ duration: 0.4, ease: easeOutQuart }}
        />
      )}

      {/* Trophy — settle 到中央 + idle 钟摆 */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={skip ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: skip ? 0 : 0.2, ease: easeOutQuart }}
      >
        <div
          className="relative w-full h-full"
          style={{
            // idle pendulum + breath — 仅在 !reduceMotion 时跑（CSS keyframes 自动被 reduce-motion 媒体查询禁用）
            animation: skip ? undefined : 'trophyPendulum 6.5s ease-in-out 1.6s infinite, trophyBreath 5.5s ease-in-out 1.6s infinite',
            transformOrigin: '50% 5%',
          }}
        >
          <img
            src="/trophy.png"
            alt="ALAST Trophy"
            className="w-full h-full object-contain orange-gold-glow"
          />
          {/* Sheen sweep — 仅入场时一次（0.2–0.6s 段内） */}
          {!skip && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%)',
                backgroundSize: '240% 100%',
                WebkitMaskImage: 'url(/trophy.png)',
                maskImage: 'url(/trophy.png)',
                WebkitMaskRepeat: 'no-repeat',
                maskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                maskPosition: 'center',
                WebkitMaskSize: 'contain',
                maskSize: 'contain',
              }}
              initial={{ backgroundPosition: '-160% 0' }}
              animate={{ backgroundPosition: '180% 0' }}
              transition={{ duration: 0.5, delay: 0.25, ease: 'easeInOut' }}
            />
          )}
        </div>
      </motion.div>

      {/* Sparks — 0.6s start, stagger 30–50ms */}
      {!skip && sparks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
          style={{
            width: 3,
            height: 3,
            background: '#FFD700',
            boxShadow: '0 0 6px 1px rgba(255,215,0,0.9)',
            ['--spark-x' as string]: `${s.x}px`,
            ['--spark-y' as string]: `${s.y}px`,
            animation: `sparkBurst 0.7s ease-out ${s.delay}s 1 both`,
          }}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 验证 build**

```bash
cd frontend && npm run build
```

Expected: build 通过。

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/TrophyHeroEntry.tsx
git commit -m "feat(visual): add TrophyHeroEntry orchestration component"
```

---

## Task 5: TournamentHubHero 集成入场 + 粒子层 + sessionStorage 触发

**Files:**
- Modify: `frontend/src/components/tournament/TournamentHubHero.tsx`

- [ ] **Step 1: 完整重写组件**

把 `frontend/src/components/tournament/TournamentHubHero.tsx` 的内容替换为：

```tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import TrophyHeroEntry from '../TrophyHeroEntry.js'
import AmbientParticles from '../AmbientParticles.js'
import { useCurrentTournament } from '../../api/currentTournament.js'
import { fadeUp, headingMask, staggerContainer } from '../../lib/motion.js'

const SESSION_KEY = 'alast.trophyShown'

const INFO_ITEMS = [
  { label: 'Tournament Phase', value: '小组赛', accent: false },
  { label: 'Venue',            value: 'Online', accent: false },
  { label: 'Grand Prize',      value: '¥500,000', accent: true },
]

export default function TournamentHubHero() {
  const { data: tournament } = useCurrentTournament()

  // 在 mount 那一刻读取 sessionStorage —— 第一次进首页才播完整入场
  const [playEntry] = useState(() => {
    if (typeof window === 'undefined') return false
    return !window.sessionStorage.getItem(SESSION_KEY)
  })

  useEffect(() => {
    if (playEntry) {
      try { window.sessionStorage.setItem(SESSION_KEY, '1') } catch {}
    }
  }, [playEntry])

  return (
    <section className="relative overflow-hidden stage-gradient" style={{ height: 360 }}>
      {/* Ambient gold particles — 首页独享，数据页不挂 */}
      <AmbientParticles />

      {/* Single ambient blob */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none rounded-full"
        style={{
          width: '900px',
          height: '500px',
          background: 'rgba(255,138,0,0.12)',
          filter: 'blur(140px)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex items-center gap-8">
        {/* Left: brand text */}
        <motion.div
          className="flex-1"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.p variants={fadeUp} className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">
            ALAST PREMIER
          </motion.p>
          <motion.h1
            variants={headingMask}
            className="font-black italic tracking-tighter leading-none mb-2"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}
          >
            <span className="gold-gradient">PREMIER 2026</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-5">
            {tournament?.name ?? 'SEASON 2026'}
          </motion.p>

          {/* Info bar */}
          <motion.div variants={fadeUp} className="flex items-center gap-6 flex-wrap">
            {INFO_ITEMS.map((item, i) => (
              <div key={i} className="flex items-center gap-6">
                {i > 0 && <div className="w-px h-7 bg-white/10" />}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/35">
                    {item.label}
                  </p>
                  <p className={`text-sm font-black italic mt-0.5 ${item.accent ? 'text-primary' : 'text-white/80'}`}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Trophy entry */}
        <div className="flex-shrink-0 hidden md:block">
          <TrophyHeroEntry playEntry={playEntry} />
        </div>
      </div>

      {/* Hidden CTA — kept off the hub hero per design (CTA lives in tabs). Link reserved for /about. */}
      <Link to="/about" className="sr-only">关于赛事</Link>
    </section>
  )
}
```

- [ ] **Step 2: 验证 build**

```bash
cd frontend && npm run build
```

Expected: build 通过。

- [ ] **Step 3: 浏览器手测入场**

- 启动 `cd frontend && npm run dev`
- 打开 `http://localhost:5173/`
- 应看到：金色种子 → 奖杯 mask 浮现 + sheen 横扫 → 辉光 burst + 火花飞散 → 奖杯 settle + 慢摆 + 呼吸 + 标题 mask reveal
- 刷新页面（同一会话）→ 应**不再播入场**，奖杯直接 idle
- 打开新隐身窗口 → 又应播一次

如行为不符，回到 step 1 调整。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/components/tournament/TournamentHubHero.tsx
git commit -m "feat(homepage): trophy hero entry + ambient particles + session-once trigger"
```

---

## Task 6: StatusBadge LIVE 改紫粉脉冲（外层 glowPulse 呼吸）

**Files:**
- Modify: `frontend/src/components/StatusBadge.tsx`

- [ ] **Step 1: 加 import**

在文件顶部加：

```tsx
import { glowPulse } from '../lib/motion'
```

- [ ] **Step 2: 改 LIVE 分支**

把 `if (status === 'live')` 整段替换为：

```tsx
  if (status === 'live') {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border"
        style={{
          background: 'rgba(255, 43, 214, 0.12)',
          borderColor: 'rgba(255, 43, 214, 0.5)',
          ...glowPulse('loss'),
        }}
      >
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: 'var(--color-neon-pink)' }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: 'var(--color-neon-pink)' }}
          />
        </span>
        <span
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: '#FF6EC7' }}
        >
          LIVE
        </span>
      </div>
    )
  }
```

`upcoming` 和 `finished` 分支保持不变。`glowPulse('loss')` 给外框加 6.5s 紫粉呼吸（reduce-motion 自动停在终态）。

- [ ] **Step 2: 验证 build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: 浏览器手测**

如当前赛季有 LIVE 比赛，访问 `/matches` 看 LIVE 徽章是否变紫粉。如无 LIVE 数据，可跳过手测（颜色逻辑由 build 保证）。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/components/StatusBadge.tsx
git commit -m "feat(visual): LIVE status uses neon pink pulse"
```

---

## Task 7: MatchesPage 比赛卡比分应用 winner=金 / loser=粉

**Files:**
- Modify: `frontend/src/pages/MatchesPage.tsx`

- [ ] **Step 1: 替换比分两个 `<span>`**

打开 `frontend/src/pages/MatchesPage.tsx`，在第 12 行 `import { fadeUp ... } from '../lib/motion'` 改为：

```tsx
import { fadeUp, pageReveal, pressTap, rankGradient, staggerContainer } from '../lib/motion'
```

然后把第 96–104 行（finished 分支两个比分 `<span>`）替换为：

```tsx
                        {m.status === 'finished' ? (
                          <>
                            <span
                              className="text-xl font-black italic tabular-nums"
                              style={{
                                backgroundImage: rankGradient(
                                  (m.maps_won_a ?? 0) > (m.maps_won_b ?? 0) ? 'win' :
                                  (m.maps_won_a ?? 0) < (m.maps_won_b ?? 0) ? 'loss' : 'neutral'
                                ),
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                              }}
                            >
                              {m.maps_won_a}
                            </span>
                            <span className="text-white/20 text-sm font-bold">:</span>
                            <span
                              className="text-xl font-black italic tabular-nums"
                              style={{
                                backgroundImage: rankGradient(
                                  (m.maps_won_b ?? 0) > (m.maps_won_a ?? 0) ? 'win' :
                                  (m.maps_won_b ?? 0) < (m.maps_won_a ?? 0) ? 'loss' : 'neutral'
                                ),
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                              }}
                            >
                              {m.maps_won_b}
                            </span>
                          </>
                        ) : (
                          <StatusBadge status={m.status} />
                        )}
```

- [ ] **Step 2: 验证 build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: 浏览器手测 `/matches`**

预期：finished 比赛卡的赢方比分是金色渐变、输方是紫粉渐变；upcoming/live 显示 StatusBadge 不变。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/MatchesPage.tsx
git commit -m "feat(matches): score colors follow winner=gold / loser=neon pink"
```

---

## Task 8: MatchDetailPage hero 总分赢方金 / 输方紫粉 + scoreFlip 入场

**Files:**
- Modify: `frontend/src/pages/MatchDetailPage.tsx`

- [ ] **Step 1: 加 import**

第 16 行 `import { fadeUp, pageReveal, panelReveal, staggerContainer } from '../lib/motion'` 改为：

```tsx
import { fadeUp, pageReveal, panelReveal, scoreFlip, staggerContainer } from '../lib/motion'
```

- [ ] **Step 2: 改 hero 总分两个 `<span>`（用 motion.span + scoreFlip）**

第 80–88 行的 finished 总分块替换为：

```tsx
              <div className="flex items-center gap-3" style={{ perspective: 600 }}>
                <motion.span
                  variants={scoreFlip}
                  initial="hidden"
                  animate="show"
                  className={`text-5xl font-black tabular-nums ${
                    teamAWon ? 'gold-gradient' : teamBWon ? 'pink-gradient' : 'text-white/40'
                  }`}
                  style={{ transformOrigin: 'center' }}
                >
                  {match.maps_won_a}
                </motion.span>
                <span className="text-3xl font-black text-white/20">–</span>
                <motion.span
                  variants={scoreFlip}
                  initial="hidden"
                  animate="show"
                  transition={{ delay: 0.12 }}
                  className={`text-5xl font-black tabular-nums ${
                    teamBWon ? 'gold-gradient' : teamAWon ? 'pink-gradient' : 'text-white/40'
                  }`}
                  style={{ transformOrigin: 'center' }}
                >
                  {match.maps_won_b}
                </motion.span>
              </div>
```

颜色逻辑：自己赢 → gold；对方赢（自己输）→ pink；平 → 白。`scoreFlip` 给两个数字加翻转入场，B 队比 A 队晚 120ms 错峰。

- [ ] **Step 2: 验证 build**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: 浏览器手测**

打开任一 finished 比赛详情页，hero 总分应有一边金一边紫粉。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/MatchDetailPage.tsx
git commit -m "feat(match-detail): hero score uses pink-gradient for losing team"
```

---

## Task 9: MatchRow bracket-card 比分按 winner / loser 上色

**Files:**
- Modify: `frontend/src/components/tournament/MatchRow.tsx`

- [ ] **Step 1: 加 import**

打开 `frontend/src/components/tournament/MatchRow.tsx`，第 5 行 `import type { Match } from '../../types.js'` 后面新增：

```tsx
import { rankGradient } from '../../lib/motion.js'
```

- [ ] **Step 2: 改 bracket-card 比分两个 `<span>`**

把第 30–32 行的 Team A score `<span>` 替换为：

```tsx
          <span
            className="text-sm font-black tabular-nums"
            style={finished ? {
              backgroundImage: rankGradient(
                (match.maps_won_a ?? 0) > (match.maps_won_b ?? 0) ? 'win' :
                (match.maps_won_a ?? 0) < (match.maps_won_b ?? 0) ? 'loss' : 'neutral'
              ),
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            } : { color: 'rgba(255,255,255,0.4)' }}
          >
            {finished ? match.maps_won_a : '–'}
          </span>
```

把第 39–41 行的 Team B score `<span>` 替换为：

```tsx
          <span
            className="text-sm font-black tabular-nums"
            style={finished ? {
              backgroundImage: rankGradient(
                (match.maps_won_b ?? 0) > (match.maps_won_a ?? 0) ? 'win' :
                (match.maps_won_b ?? 0) < (match.maps_won_a ?? 0) ? 'loss' : 'neutral'
              ),
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            } : { color: 'rgba(255,255,255,0.4)' }}
          >
            {finished ? match.maps_won_b : '–'}
          </span>
```

`overview` / `results` 横排变体（第 47-93 行）保持不变 —— 它当前用 chip 形式显示 `13:7`，没有 winner/loser 色彩区分，超出本次 spec 影响面。

- [ ] **Step 3: 验证 build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: 浏览器手测**

打开首页，进 Bracket / 双败图相关 tab，bracket-card 比分应分金 / 粉。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/tournament/MatchRow.tsx
git commit -m "feat(bracket): MatchRow bracket-card score colors follow rank semantic"
```

---

## Task 10: TeamDetailPage recent results 比分 + AmbientParticles

**Files:**
- Modify: `frontend/src/pages/TeamDetailPage.tsx`

- [ ] **Step 1: 加 imports**

打开 `frontend/src/pages/TeamDetailPage.tsx`，第 13 行 `import { fadeUp ... } from '../lib/motion'` 改为：

```tsx
import { fadeUp, pageReveal, pressTap, rankGradient, softHover, staggerContainer } from '../lib/motion'
```

第 12 行 `formatStage` import 后追加：

```tsx
import AmbientParticles from '../components/AmbientParticles'
```

- [ ] **Step 2: 在 hero 区挂 AmbientParticles**

第 24 行的根 `<motion.div ...>` 改成 wrapper 模式，把 header 块包进一个 `relative` 容器。简单做法：在第 30 行 `{/* Header */}` 注释**前**插入：

```tsx
      {/* Hero ambient particles — 仅这块区域内 */}
      <div className="absolute inset-x-0 top-0 h-[200px] pointer-events-none -z-0">
        <AmbientParticles />
      </div>
```

注：根 `<motion.div>` 已有 `relative` 类（第 24 行），粒子层 absolute 定位在 hero 区域内即可。

- [ ] **Step 3: 改 recent_matches 卡片比分**

把第 88–104 行 recent_matches 的 `<Card>` 内容替换为：

```tsx
                <Card href={`/matches/${m.id}`} className="p-3">
                  <div className="flex items-center justify-between gap-4">
                    <StatusBadge status={m.status} />
                    <span className="text-xs font-black text-white/50">{formatStage(m.stage)}</span>
                    <div className="flex-1 text-center font-black text-sm flex items-center justify-center gap-2 text-white/70">
                      <span>{m.team_a_name}</span>
                      <span
                        className="font-black italic tabular-nums text-base"
                        style={m.status === 'finished' ? {
                          backgroundImage: rankGradient(
                            (m.maps_won_a ?? 0) > (m.maps_won_b ?? 0) ? 'win' :
                            (m.maps_won_a ?? 0) < (m.maps_won_b ?? 0) ? 'loss' : 'neutral'
                          ),
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        } : { color: 'rgba(255,255,255,0.4)' }}
                      >
                        {m.maps_won_a}
                      </span>
                      <span className="text-white/30">–</span>
                      <span
                        className="font-black italic tabular-nums text-base"
                        style={m.status === 'finished' ? {
                          backgroundImage: rankGradient(
                            (m.maps_won_b ?? 0) > (m.maps_won_a ?? 0) ? 'win' :
                            (m.maps_won_b ?? 0) < (m.maps_won_a ?? 0) ? 'loss' : 'neutral'
                          ),
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        } : { color: 'rgba(255,255,255,0.4)' }}
                      >
                        {m.maps_won_b}
                      </span>
                      <span>{m.team_b_name}</span>
                    </div>
                    {m.scheduled_at && (
                      <span className="text-xs text-white/30 flex-shrink-0">
                        {dayjs(m.scheduled_at).format('MM-DD')}
                      </span>
                    )}
                  </div>
                </Card>
```

- [ ] **Step 4: 验证 build**

```bash
cd frontend && npm run build
```

- [ ] **Step 5: 浏览器手测**

打开任一战队详情页：
- hero 区上方应有少量金色粒子缓飘（注意：粒子从下往上飘，需要顶部有溢出空间；如效果不明显 OK，仍应可见）
- recent matches 比分应分金 / 粉

- [ ] **Step 6: 提交**

```bash
git add frontend/src/pages/TeamDetailPage.tsx
git commit -m "feat(team-detail): rank score colors + ambient particles in hero"
```

---

## Task 11: Scoreboard 队伍 header 用 winner / loser tint

**Files:**
- Modify: `frontend/src/components/match/Scoreboard.tsx`

- [ ] **Step 1: 把 winner 信息传进 Scoreboard**

`Scoreboard` 组件目前不知道哪个队赢；需要从父组件传 winner 信息。先改 prop 接口（第 4–11 行）：

```tsx
interface Props {
  players: MapStatPlayer[]
  teamAId: string | null
  teamBId: string | null
  teamAName: string
  teamBName: string
  rounds?: MatchRound[]
  /** 'a' | 'b' | null — 整场比赛的赢方（不是单图）；null = 平 / 未结束 */
  matchWinner?: 'a' | 'b' | null
}
```

- [ ] **Step 2: 改 Scoreboard 主函数签名 + accent 颜色**

把第 35 行的 `function Scoreboard(...)` 签名改为：

```tsx
export default function Scoreboard({ players, teamAId, teamBId, teamAName, teamBName, rounds, matchWinner = null }: Props) {
```

把第 80–87 行的两次 `<TeamSection ... accentColor=... borderColor=... />` 改为：

```tsx
          <TeamSection
            team={teamA}
            teamName={teamAName}
            logoUrl={teamALogo}
            mvpId={mvpId}
            outcome={matchWinner === 'a' ? 'win' : matchWinner === 'b' ? 'loss' : 'neutral'}
          />

          {/* Half-time divider */}
          <tr style={{ background: 'var(--color-data-divider)' }}>
            <td colSpan={8} className="py-1 px-4 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                半场
                {halfScore && (
                  <span className="ml-2 tabular-nums font-mono">
                    {halfScore.a} – {halfScore.b}
                  </span>
                )}
              </span>
            </td>
          </tr>

          <TeamSection
            team={teamB}
            teamName={teamBName}
            logoUrl={teamBLogo}
            mvpId={mvpId}
            outcome={matchWinner === 'b' ? 'win' : matchWinner === 'a' ? 'loss' : 'neutral'}
          />
```

- [ ] **Step 3: 改 TeamSection 签名 + tint 颜色**

把第 119–146 行的 `TeamSection` 整段替换为：

```tsx
const OUTCOME_TINT: Record<'win' | 'loss' | 'neutral', { accent: string; border: string }> = {
  win:     { accent: 'rgba(255, 184, 0, 0.18)',  border: 'rgba(255, 184, 0, 0.45)' },
  loss:    { accent: 'rgba(255, 43, 214, 0.14)', border: 'rgba(255, 43, 214, 0.45)' },
  neutral: { accent: 'rgba(255, 255, 255, 0.05)', border: 'rgba(255, 255, 255, 0.15)' },
}

function TeamSection({
  team, teamName, logoUrl, mvpId, outcome,
}: {
  team: MapStatPlayer[]
  teamName: string
  logoUrl: string | null
  mvpId: string | null
  outcome: 'win' | 'loss' | 'neutral'
}) {
  const tint = OUTCOME_TINT[outcome]
  return (
    <>
      {/* Team header row */}
      <tr style={{ background: tint.accent, borderBottom: `1px solid ${tint.border}` }}>
        <td className="py-2 pl-4 pr-2 w-full">
          <div className="flex items-center gap-2">
            {logoUrl && (
              <img src={logoUrl} alt={teamName} className="w-5 h-5 object-contain flex-shrink-0" />
            )}
            <span className="font-black text-sm text-white tracking-wide">{teamName}</span>
          </div>
        </td>
        {COL_HEADERS.map(h => (
          <td key={h} className="py-2 px-2 text-right text-[10px] font-black uppercase tracking-widest text-white/35 whitespace-nowrap">
            {h}
          </td>
        ))}
      </tr>

      {/* Player rows */}
      {team.map(p => (
        <PlayerRow key={p.player_id} player={p} isMvp={p.player_id === mvpId} />
      ))}
    </>
  )
}
```

- [ ] **Step 4: MatchDetailPage 传入 matchWinner**

打开 `frontend/src/pages/MatchDetailPage.tsx`，第 140 行的 `<Scoreboard ... rounds={rounds} />` 改为：

```tsx
        <Scoreboard
          players={stats}
          teamAId={match.team_a_id}
          teamBId={match.team_b_id}
          teamAName={match.team_a_name ?? 'Team A'}
          teamBName={match.team_b_name ?? 'Team B'}
          rounds={rounds}
          matchWinner={teamAWon ? 'a' : teamBWon ? 'b' : null}
        />
```

- [ ] **Step 5: 验证 build**

```bash
cd frontend && npm run build
```

- [ ] **Step 6: 浏览器手测**

打开任一 finished 比赛详情页，scoreboard 赢方队 header 应是金色 tint，输方紫粉 tint，中间半场分隔条不变。

- [ ] **Step 7: 提交**

```bash
git add frontend/src/components/match/Scoreboard.tsx frontend/src/pages/MatchDetailPage.tsx
git commit -m "feat(scoreboard): team header tint follows match winner (gold) / loser (pink)"
```

---

## Task 12: StatsPage tier 色阶 + leaderboard 末位 rank 紫粉

**Files:**
- Modify: `frontend/src/pages/StatsPage.tsx`

- [ ] **Step 1: 改 TIER_COLORS**

打开 `frontend/src/pages/StatsPage.tsx`，第 50–56 行 `TIER_COLORS` 整块替换为：

```tsx
const TIER_COLORS: Record<string, string> = {
  S:    'var(--color-gold)',                       // 顶 — 金
  A:    'var(--color-primary)',                    // 上 — 橙
  B:    'rgba(255, 255, 255, 0.65)',                // 中 — 白
  'C+': 'rgba(255, 255, 255, 0.4)',                 // 偏下 — 灰白
  D:    'var(--color-neon-pink)',                   // 末 — 紫粉
}
```

- [ ] **Step 2: 改 RANK_STYLE — 加末位紫粉**

`RANK_STYLE` 当前固定 0/1/2 用金 / 银 / 铜。前 3 名保持，但末名（数组最后一项）改紫粉。删掉第 58–62 行的 `RANK_STYLE` 常量，改成在 leaderboard map 内部用 helper：

第 58 行 `const RANK_STYLE: Record<number, string> = { ... }` 整块替换为：

```tsx
function rankColor(index: number, total: number): string {
  if (index === 0) return 'var(--color-gold)'                  // 金 #1
  if (index === 1) return 'rgba(255, 255, 255, 0.7)'           // 银 #2
  if (index === 2) return '#CD7F32'                            // 铜 #3
  if (total > 5 && index === total - 1) return 'var(--color-neon-pink)' // 末位紫粉
  return 'rgba(255, 255, 255, 0.3)'                            // 其余灰
}
```

- [ ] **Step 3: 改 import — 加 `rankReveal`**

第 12 行的 `import { fadeUp, ... } from '../lib/motion'` 改为（注意保留 Task 14 会再加的 `headingMask`）：

```tsx
import { fadeUp, pageReveal, panelReveal, pressTap, rankReveal, staggerContainer } from '../lib/motion'
```

- [ ] **Step 4: 改 leaderboard rank cell — 加 rankReveal 弹入**

第 215–219 行的 rank `<td>` 替换为：

```tsx
                      <td className="px-4 py-3 w-10 text-center">
                        <motion.span
                          variants={rankReveal(
                            i === 0 ? 'win' :
                            (leaderboard.length > 5 && i === leaderboard.length - 1) ? 'loss' :
                            'neutral'
                          )}
                          className="inline-block text-sm font-black italic tabular-nums"
                          style={{ color: rankColor(i, leaderboard.length) }}
                        >
                          #{i + 1}
                        </motion.span>
                      </td>
```

`rankReveal` 是函数式 variant；`outcome` 在这里只用于命名清晰（spring 几何动效与 outcome 无关 —— 颜色仍来自 `rankColor`）。父级的 `staggerContainer` 已经把入场错峰好。

- [ ] **Step 5: 验证 build**

```bash
cd frontend && npm run build
```

- [ ] **Step 6: 浏览器手测 `/stats`**

- 切换 tier 过滤器：S/A/B/C+/D 标签颜色应分别是 金 / 橙 / 白 / 灰 / 紫粉
- leaderboard 表格里：#1 金、#2 银、#3 铜、末位紫粉、中段灰白；rank 数字应有 spring 弹入
- 翻不同 stat tab 时颜色逻辑不变

- [ ] **Step 7: 提交**

```bash
git add frontend/src/pages/StatsPage.tsx
git commit -m "feat(stats): tier D + leaderboard last rank use neon pink + spring reveal"
```

---

## Task 13: PlayerDetailPage header 加 tier 徽章

**Files:**
- Modify: `frontend/src/pages/PlayerDetailPage.tsx`

注：当前 PlayerDetailPage header 只显示 nickname / real_name / team；tier 字段已存在于 player 数据但未渲染。本任务在 header 加一颗徽章并按色阶上色。

- [ ] **Step 1: 加 TIER_COLORS（与 StatsPage 一致）**

打开 `frontend/src/pages/PlayerDetailPage.tsx`，在第 9 行 import 之后加：

```tsx
const TIER_COLORS: Record<string, string> = {
  S:    'var(--color-gold)',
  A:    'var(--color-primary)',
  B:    'rgba(255, 255, 255, 0.65)',
  'C+': 'rgba(255, 255, 255, 0.4)',
  D:    'var(--color-neon-pink)',
}
```

- [ ] **Step 2: 在 header 块加徽章**

第 67–76 行的 `<div>` header 块（包含 h1 / real_name / team link）替换为：

```tsx
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">{player.nickname}</h1>
            {player.tier && (
              <span
                className="inline-flex items-center justify-center w-9 h-9 rounded-md text-base font-black"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: TIER_COLORS[player.tier] ?? 'rgba(255,255,255,0.4)',
                  border: `1px solid ${TIER_COLORS[player.tier] ?? 'rgba(255,255,255,0.2)'}`,
                  boxShadow: player.tier === 'S' || player.tier === 'D'
                    ? `0 0 14px ${TIER_COLORS[player.tier]}40`
                    : undefined,
                }}
                title={`Tier ${player.tier}`}
              >
                {player.tier}
              </span>
            )}
          </div>
          {player.real_name && <div className="opacity-60">{player.real_name}</div>}
          {player.team_name && (
            <Link to={`/teams/${player.team_id}`} className="flex items-center gap-2 mt-1 hover:opacity-80">
              <TeamLogo url={player.team_logo_url} name={player.team_name} size={20} />
              <span className="text-sm opacity-70">{player.team_name}</span>
            </Link>
          )}
        </div>
```

- [ ] **Step 3: 验证 build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: 浏览器手测**

打开几个不同 tier 的选手详情页，header 右侧应显示对应色徽章（S 金、A 橙、B 白、C+ 灰、D 紫粉），S 和 D 还带光晕。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/pages/PlayerDetailPage.tsx
git commit -m "feat(player): show tier badge in header with rank semantic colors"
```

---

## Task 14: 把 `headingMask` 应用到 5 个页面 H1

**Files:**
- Modify: `frontend/src/pages/MatchesPage.tsx`
- Modify: `frontend/src/pages/StatsPage.tsx`
- Modify: `frontend/src/pages/NewsPage.tsx`
- Modify: `frontend/src/pages/TeamDetailPage.tsx`
- Modify: `frontend/src/pages/PlayerDetailPage.tsx`

注：`TournamentHubHero` 的 H1 在 Task 5 已经改用 `headingMask`。这里把同样的 mask reveal 应用到 5 个二级页面 H1，让动效语言一致。

- [ ] **Step 1: MatchesPage H1**

打开 `frontend/src/pages/MatchesPage.tsx`，第 12 行 import 加 `headingMask`（如未加）：

```tsx
import { fadeUp, headingMask, pageReveal, pressTap, rankGradient, staggerContainer } from '../lib/motion'
```

第 48 行 `<motion.h1 variants={fadeUp} ...>` 改为 `<motion.h1 variants={headingMask} ...>`。

- [ ] **Step 2: StatsPage H1**

打开 `frontend/src/pages/StatsPage.tsx`。Task 12 已经把第 12 行 import 改成包含 `rankReveal`；现在再加 `headingMask`：

```tsx
import { fadeUp, headingMask, pageReveal, panelReveal, pressTap, rankReveal, staggerContainer } from '../lib/motion'
```

第 138 行 `<motion.h1 variants={fadeUp} ...>` 改为 `<motion.h1 variants={headingMask} ...>`。

- [ ] **Step 3: NewsPage H1**

打开 `frontend/src/pages/NewsPage.tsx`，第 9 行 import 加 `headingMask`：

```tsx
import { fadeUp, headingMask, pageReveal, pressTap, softHover, staggerContainer } from '../lib/motion'
```

第 21 行 `<motion.h1 variants={fadeUp} ...>` 改为 `<motion.h1 variants={headingMask} ...>`。

- [ ] **Step 4: TeamDetailPage H1**

打开 `frontend/src/pages/TeamDetailPage.tsx`。注意此页 H1（第 37 行）当前用纯 `<h1>` 不挂 motion variant —— header 整块用 `variants={fadeUp}`。把第 31–47 行的 header 块改为：

```tsx
      <motion.div
        className="relative z-10 flex items-center gap-6"
        variants={fadeUp}
      >
        <TeamLogo url={team.logo_url} name={team.name} size={88} />
        <div>
          <motion.h1
            variants={headingMask}
            initial="hidden"
            animate="show"
            className="text-4xl font-black italic tracking-tighter text-white/90"
          >
            {team.name}
          </motion.h1>
          {team.short_name && (
            <p className="text-sm font-black uppercase tracking-widest text-white/40 mt-0.5">{team.short_name}</p>
          )}
          {team.region && (
            <span className="inline-flex mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-accent/10 border border-accent/20 text-accent">
              {team.region}
            </span>
          )}
        </div>
      </motion.div>
```

第 13 行 import 加 `headingMask`：

```tsx
import { fadeUp, headingMask, pageReveal, pressTap, rankGradient, softHover, staggerContainer } from '../lib/motion'
```

注意：H1 自己声明 `initial="hidden" animate="show"` 因为父 `<motion.div>` 的 `staggerContainer` 不在这条链上（仅 fadeUp）。

- [ ] **Step 5: PlayerDetailPage H1**

打开 `frontend/src/pages/PlayerDetailPage.tsx`，第 9 行 import 加 `headingMask`：

```tsx
import { fadeUp, headingMask, pageReveal, panelReveal, staggerContainer } from '../lib/motion'
```

把 Task 13 改过的 header H1 行：

```tsx
            <h1 className="text-3xl font-bold">{player.nickname}</h1>
```

替换为：

```tsx
            <motion.h1
              variants={headingMask}
              initial="hidden"
              animate="show"
              className="text-3xl font-bold"
            >
              {player.nickname}
            </motion.h1>
```

- [ ] **Step 6: 验证 build**

```bash
cd frontend && npm run build
```

- [ ] **Step 7: 浏览器手测**

依次访问 `/matches`、`/stats`、`/news`、`/teams/<id>`、`/players/<id>`，每个页面 H1 应有从左到右的 mask reveal 入场。

- [ ] **Step 8: 提交**

```bash
git add frontend/src/pages/MatchesPage.tsx frontend/src/pages/StatsPage.tsx frontend/src/pages/NewsPage.tsx frontend/src/pages/TeamDetailPage.tsx frontend/src/pages/PlayerDetailPage.tsx
git commit -m "feat(motion): apply headingMask reveal to 5 page H1s"
```

---

## Task 15: 完整三道手测 + 终验

**Files:** none (verification only)

- [ ] **Step 1: 桌面 viewport 全站走查**

启动 `cd frontend && npm run dev`，依次：

- `/`（首页）：sessionStorage 清空后第一次访问 → 完整奖杯入场 + 粒子层 + 标题 mask；刷新 → 直接 idle 无入场
- `/matches`：H1 mask 入场；finished 比赛分卡比分赢方金、输方紫粉
- 任一 finished `/matches/:id`：hero 总分赢方金、输方紫粉；scoreboard 赢方队 header 金 tint、输方紫粉 tint
- `/stats`：H1 mask；tier 色阶（D=紫粉）；leaderboard 末位紫粉
- `/news`：H1 mask
- `/teams/:id`：H1 mask；hero 区有金色粒子飘；recent matches 比分按 winner/loser 上色
- `/players/:id`：H1 mask；header tier 徽章按色阶上色（找一个 D tier 选手验证紫粉）

- [ ] **Step 2: 移动 viewport（375 宽）走查**

DevTools 切到 iPhone SE 尺寸：

- 首页：奖杯入场区是 `hidden md:block`，移动端不显示奖杯但也不应空白塌陷；标题 mask 仍应工作
- 各页 H1 mask 仍工作
- MatchesPage 比分两侧仍可见、不溢出
- StatsPage tier 标签仍可读

- [ ] **Step 3: reduce-motion 走查**

macOS：System Settings → Accessibility → Display → "Reduce motion" 开启；浏览器需要重启或 hard reload。

或在 DevTools 的 Rendering 面板里 emulate `prefers-reduced-motion: reduce`。

- 清 sessionStorage 后访问 `/`：奖杯应直接是终态（居中静止 + 标题已显示），无种子 / 无 sheen / 无火花 / 无粒子 / 无慢摆
- 各页 H1 应直接显示（不做 mask 入场）
- LIVE 徽章应显示但不脉冲

- [ ] **Step 4: 终验通过则关闭手测**

如三道走查发现 bug，回到对应 Task 修复并跑该 Task 的 build / 手测；如必要补一次 commit。

- [ ] **Step 5: 终态提交（可选 — 仅当本任务有遗留改动）**

如本步无新代码改动，跳过 commit；否则：

```bash
git add -p
git commit -m "fix(visual): manual QA round of trophy hero redesign"
```

---

## 完成标志

- 所有 14 个实施 task 已 commit
- `cd frontend && npm run build` 干净通过
- 三道手测（桌面 / 移动 / reduce-motion）走完无 P0/P1 bug
- spec 中所有 winner=金 / loser=粉的语义位置一致
