# Premium Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the ALAST frontend visual presentation into a restrained premium internal tournament site while preserving all currently useful hover, tooltip, popover, and chart information behavior.

**Architecture:** Introduce a small visual system layer first, then migrate shared surfaces and page compositions onto it. Match/stat hover details remain functional and readable; the redesign changes their tone, not their informational payload.

**Tech Stack:** React, TypeScript, Vite, Tailwind v4, Framer Motion, Radix Dialog, ECharts.

---

## Hard Constraints

- Preserve the information-carrying ability of current hover layers and popovers.
- `RoundTimeline` hover detail must continue to show round number, score, economy type, duration, and kill feed.
- ECharts tooltips in `EconomyChart` and `TierChart` must remain enabled and readable.
- Search dialog must remain a high-clarity modal with focus behavior, typed search, result grouping, and close behavior.
- Do not introduce an external font CDN. Use CSS font stacks and optional self-hosting extension points.
- Chinese / Han characters / Japanese use Source Han Serif stack. English and display numbers use Georgia. Component interiors use Fira Code.
- Keep backend and admin workflows untouched.

## File Structure

- Modify `frontend/src/index.css`: visual tokens, typography utilities, surface utilities, motion-safe hover rules, tooltip/popover classes.
- Modify `frontend/src/lib/motion.ts`: calmer shared motion presets.
- Modify `frontend/src/components/Card.tsx`: replace high-glow card behavior with refined surface behavior.
- Modify `frontend/src/components/Layout.tsx`: remove dominant ambient glow and introduce restrained page background.
- Modify `frontend/src/components/Navbar.tsx`: quiet editorial navigation.
- Modify `frontend/src/components/SearchDialog.tsx`: restyle modal without reducing search information.
- Create `frontend/src/components/EditorialHeader.tsx`: shared page header.
- Create `frontend/src/components/MetricPanel.tsx`: shared compact metric panel.
- Create `frontend/src/components/RefinedSurface.tsx`: shared low-glow surface wrapper.
- Modify `frontend/src/components/match/RoundTimeline.tsx`: preserve hover payload, restyle tooltip and markers.
- Modify `frontend/src/components/match/EconomyChart.tsx`: preserve tooltip formatter, restyle palette.
- Modify `frontend/src/components/stats/TierChart.tsx`: preserve tooltip formatter, restyle palette.
- Modify pages incrementally: `HomePage`, `TournamentHubHero`, tournament tabs, `MatchesPage`, `MatchDetailPage`, `StatsPage`, `TeamDetailPage`, `PlayerDetailPage`, `NewsPage`, `NewsDetailPage`, `AboutPage`, `TeamsPage`, `PlayersPage`, `DraftPage`.

---

### Task 1: Visual Tokens and Typography

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Replace root theme tokens with premium palette and font stacks**

Update `@theme` and add root font variables:

```css
@theme {
  --color-background: #070809;
  --color-foreground: #F4EFE6;
  --color-primary: #C9A253;
  --color-secondary: #101112;
  --color-accent: #7C9A9A;
  --color-gold: #D6B46A;
  --color-gold-orange: #B9873D;
  --color-card: rgba(244, 239, 230, 0.035);
  --color-border: rgba(244, 239, 230, 0.10);

  --color-data-surface: #0D0E10;
  --color-data-row: rgba(244, 239, 230, 0.025);
  --color-data-divider: rgba(244, 239, 230, 0.10);
  --color-data-chip: #161719;
  --color-data-text-muted: rgba(244, 239, 230, 0.48);
}

:root {
  --font-serif-cjk: "Source Han Serif SC", "Source Han Serif CN", "Noto Serif CJK SC", "Songti SC", serif;
  --font-serif-latin: Georgia, "Times New Roman", serif;
  --font-mono-ui: "Fira Code", "SFMono-Regular", Consolas, monospace;
}
```

- [ ] **Step 2: Update base typography**

Set body to the CJK serif stack and add utilities:

```css
body {
  background-color: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-serif-cjk);
  min-height: 100vh;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
}

.font-editorial {
  font-family: var(--font-serif-cjk);
}

.font-latin {
  font-family: var(--font-serif-latin);
}

.font-component {
  font-family: var(--font-mono-ui);
}
```

- [ ] **Step 3: Replace glow-heavy utilities with restrained equivalents**

Keep class names where pages already depend on them, but reduce their intensity:

```css
.gold-gradient {
  color: var(--color-primary);
  background: none;
  -webkit-text-fill-color: currentColor;
  animation: none;
}

.logo-primary {
  font-family: var(--font-serif-latin);
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
  font-style: normal;
  color: var(--color-foreground);
  background: none;
  -webkit-text-fill-color: currentColor;
  filter: none;
}

.stage-gradient {
  background:
    linear-gradient(180deg, rgba(244,239,230,0.035), transparent 42%),
    var(--color-background);
}
```

- [ ] **Step 4: Add tooltip and popover visual utilities**

These utilities are required so hover layers remain legible after the palette change:

```css
.info-popover {
  background: rgba(10, 11, 12, 0.98);
  border: 1px solid rgba(244, 239, 230, 0.16);
  color: var(--color-foreground);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(16px);
}

.info-popover-muted {
  color: rgba(244, 239, 230, 0.52);
}

.info-popover-rule {
  border-color: rgba(244, 239, 230, 0.12);
}
```

- [ ] **Step 5: Run frontend build**

Run: `cd frontend && npm run build`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add premium visual tokens"
```

---

### Task 2: Shared Motion and Surface Components

**Files:**
- Modify: `frontend/src/lib/motion.ts`
- Modify: `frontend/src/components/Card.tsx`
- Create: `frontend/src/components/RefinedSurface.tsx`
- Create: `frontend/src/components/EditorialHeader.tsx`
- Create: `frontend/src/components/MetricPanel.tsx`

- [ ] **Step 1: Calm the shared motion presets**

In `frontend/src/lib/motion.ts`, keep exports stable and reduce spectacle:

```ts
import type { Variants } from 'framer-motion'

export const easeOutQuart = [0.22, 1, 0.36, 1] as const
export const easeSoft = [0.16, 1, 0.3, 1] as const

export const pageReveal: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.48, ease: easeOutQuart },
  },
}

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.03 } },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: easeOutQuart } },
}

export const panelReveal: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: easeSoft } },
}

export const softHover = {
  y: -1,
  transition: { duration: 0.18, ease: easeOutQuart },
}

export const pressTap = {
  scale: 0.995,
  transition: { duration: 0.08 },
}
```

- [ ] **Step 2: Create `RefinedSurface`**

```tsx
import type { ReactNode } from 'react'

interface RefinedSurfaceProps {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}

export default function RefinedSurface({ children, className = '', as: Tag = 'div' }: RefinedSurfaceProps) {
  return (
    <Tag
      className={[
        'relative overflow-hidden rounded-md border bg-card',
        'border-white/[0.10]',
        className,
      ].join(' ')}
    >
      {children}
    </Tag>
  )
}
```

- [ ] **Step 3: Create `EditorialHeader`**

```tsx
interface EditorialHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  className?: string
}

export default function EditorialHeader({ eyebrow, title, subtitle, className = '' }: EditorialHeaderProps) {
  return (
    <header className={['font-editorial', className].join(' ')}>
      {eyebrow && (
        <p className="font-component text-[10px] uppercase tracking-[0.24em] text-primary mb-3">
          {eyebrow}
        </p>
      )}
      <h1 className="text-4xl md:text-5xl font-semibold tracking-normal text-foreground leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-sm md:text-base leading-8 text-white/55">
          {subtitle}
        </p>
      )}
    </header>
  )
}
```

- [ ] **Step 4: Create `MetricPanel`**

```tsx
interface MetricPanelProps {
  label: string
  value: string | number
  detail?: string
}

export default function MetricPanel({ label, value, detail }: MetricPanelProps) {
  return (
    <div className="rounded-md border border-white/[0.10] bg-white/[0.025] px-4 py-3">
      <p className="font-component text-[10px] uppercase tracking-[0.18em] text-white/38">
        {label}
      </p>
      <p className="font-latin mt-2 text-2xl leading-none text-primary">
        {value}
      </p>
      {detail && <p className="font-component mt-2 text-[10px] text-white/35">{detail}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Restyle `Card` without removing API**

Keep `href`, `hover`, and `className` behavior:

```tsx
import { Link } from 'react-router-dom'

interface CardProps {
  children: React.ReactNode
  className?: string
  href?: string
  hover?: boolean
}

export default function Card({ children, className = '', href, hover = true }: CardProps) {
  const base = [
    'relative group block bg-card border border-white/[0.10] rounded-md overflow-hidden',
    'transition-colors duration-200',
    hover ? 'hover:border-primary/45 hover:bg-white/[0.045]' : '',
    className,
  ].join(' ')

  const accent = hover ? (
    <div className="absolute inset-x-0 bottom-0 h-px bg-primary/70 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
  ) : null

  if (href) {
    return (
      <Link to={href} className={base}>
        {children}
        {accent}
      </Link>
    )
  }

  return (
    <div className={base}>
      {children}
      {accent}
    </div>
  )
}
```

- [ ] **Step 6: Run build**

Run: `cd frontend && npm run build`

Expected: Build passes.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/motion.ts frontend/src/components/Card.tsx frontend/src/components/RefinedSurface.tsx frontend/src/components/EditorialHeader.tsx frontend/src/components/MetricPanel.tsx
git commit -m "feat: add refined frontend primitives"
```

---

### Task 3: Layout, Navigation, and Search Dialog

**Files:**
- Modify: `frontend/src/components/Layout.tsx`
- Modify: `frontend/src/components/Navbar.tsx`
- Modify: `frontend/src/components/Footer.tsx`
- Modify: `frontend/src/components/SearchDialog.tsx`

- [ ] **Step 1: Replace dominant ambient glow in `Layout`**

Use a restrained background with texture only:

```tsx
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-70">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(244,239,230,0.035),transparent_42%)]" />
        <div className="ambient-grid absolute inset-0 opacity-35" />
      </div>

      <Navbar />

      <main className="flex-1 pt-[64px] pb-16 relative z-10">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
```

- [ ] **Step 2: Restyle `Navbar` without changing routes or search behavior**

Keep links, mobile menu state, active route detection, and `SearchDialog`. Use `font-component` for nav labels and Georgia for `ALAST`.

- [ ] **Step 3: Restyle `SearchDialog` and preserve behavior**

Required checks after editing:

- `Dialog.Title` remains present.
- Input still focuses when opened.
- Query still debounces.
- Results are still grouped as `TEAMS` and `PLAYERS`.
- Close button and ESC still close.

Use these core classes:

```tsx
className="fixed inset-0 z-[200] bg-background/88 backdrop-blur-md"
className="relative flex items-center bg-white/[0.035] border border-white/[0.12] rounded-md overflow-hidden"
className="mt-3 info-popover rounded-md overflow-hidden custom-scrollbar max-h-[60vh] overflow-y-auto"
```

- [ ] **Step 4: Run build**

Run: `cd frontend && npm run build`

Expected: Build passes.

- [ ] **Step 5: Manual check**

Run: `cd frontend && npm run dev`

Open the Vite URL and verify:

- Navbar active indicator remains visible.
- Mobile menu opens and closes.
- Search opens, focuses input, shows team/player results, and closes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Layout.tsx frontend/src/components/Navbar.tsx frontend/src/components/Footer.tsx frontend/src/components/SearchDialog.tsx
git commit -m "feat: refine global shell"
```

---

### Task 4: Preserve and Restyle Hover Information Layers

**Files:**
- Modify: `frontend/src/components/match/RoundTimeline.tsx`
- Modify: `frontend/src/components/match/EconomyChart.tsx`
- Modify: `frontend/src/components/stats/TierChart.tsx`
- Inspect: `frontend/src/pages/DraftPage.tsx`
- Inspect: `frontend/src/pages/PlayersPage.tsx`

- [ ] **Step 1: Update `RoundTimeline` colors without changing data calculations**

Keep `hoveredIdx`, `playerTeamMap`, `playerNameMap`, survivor calculation, and kill feed mapping intact. Change only colors and tooltip classes:

```ts
const CT_COLOR = '#8FA8A8'
const T_COLOR = 'var(--color-primary)'
```

Tooltip wrapper must become:

```tsx
<div
  className={`absolute z-50 bottom-full mb-2 min-w-[15rem] w-max max-w-xs rounded-md border pointer-events-none info-popover ${tooltipRight ? 'left-0' : 'right-0'}`}
>
```

- [ ] **Step 2: Verify `RoundTimeline` hover payload remains complete**

In the rendered tooltip, verify these fields still exist:

- `Round {r.round_number}`
- `{r.team_a_score} – {r.team_b_score}`
- team A economy type
- team B economy type
- duration seconds when present
- kill rows with killer, weapon, victim

- [ ] **Step 3: Restyle `EconomyChart` tooltip and series colors**

Keep `tooltip.trigger = 'axis'` and keep the formatter returning round number and both series values.

Use:

```ts
tooltip: {
  trigger: 'axis',
  backgroundColor: 'rgba(10,11,12,0.98)',
  borderColor: 'rgba(244,239,230,0.16)',
  textStyle: { color: 'rgba(244,239,230,0.82)', fontSize: 11, fontFamily: 'Fira Code' },
  formatter: (params: Array<{ seriesName: string; value: number; dataIndex: number }>) => {
    const r = rounds[params[0]?.dataIndex]
    if (!r) return ''
    return `<b>Round ${r.round_number}</b><br>${params.map(p => `${p.seriesName}: $${p.value?.toLocaleString()}`).join('<br>')}`
  },
}
```

- [ ] **Step 4: Restyle `TierChart` tooltip and series colors**

Keep `tooltip.trigger = 'axis'` and keep the formatter returning tier, player count, rating, and ADR.

- [ ] **Step 5: Inspect native title tooltips in draft/player pick grids**

Confirm `title={p ? p.nickname : \`Pick ${globalPick}\`}` remains in `DraftPage` and `PlayersPage` unless replaced by an equal or better accessible popover.

- [ ] **Step 6: Run build**

Run: `cd frontend && npm run build`

Expected: Build passes.

- [ ] **Step 7: Manual hover check**

Open a match detail page with round data and verify:

- Hovering a round opens a readable tooltip.
- Tooltip stays inside the viewport as well as current behavior allows.
- Economy chart hover shows the axis tooltip.
- Tier chart hover shows the axis tooltip.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/match/RoundTimeline.tsx frontend/src/components/match/EconomyChart.tsx frontend/src/components/stats/TierChart.tsx frontend/src/pages/DraftPage.tsx frontend/src/pages/PlayersPage.tsx
git commit -m "feat: refine hover information surfaces"
```

---

### Task 5: Homepage and Tournament Hub

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx`
- Modify: `frontend/src/components/tournament/TournamentHubHero.tsx`
- Modify: `frontend/src/components/tournament/TabPills.tsx`
- Modify: `frontend/src/components/tournament/tabs/OverviewTab.tsx`
- Modify: `frontend/src/components/tournament/rail/*.tsx`
- Modify: `frontend/src/components/tournament/MatchRow.tsx`

- [ ] **Step 1: Reframe hero as season index, not invitation or broadcast**

In `TournamentHubHero`, keep `useCurrentTournament`, but remove glow-heavy trophy dominance. Use a two-column editorial layout: identity and season metrics on the left, featured match/story module on the right.

- [ ] **Step 2: Convert tab pills into restrained navigation**

Use `font-component`, thin active underline, stable height, and no filled orange pills.

- [ ] **Step 3: Update `MatchRow` to official-record style**

Keep `href`, match status, team names, logos, score, BO/stage/date data. Restyle with thin borders and muted hover.

- [ ] **Step 4: Restyle right rail cards**

Keep Stage Card, Stage Timeline, MVP Mini, Resources, and FAQ information. Reduce card ornament and use section labels, thin rules, and component typography.

- [ ] **Step 5: Run build**

Run: `cd frontend && npm run build`

Expected: Build passes.

- [ ] **Step 6: Manual check**

Verify homepage first viewport:

- Does not read as an invitation page.
- Does not emphasize live broadcast consumption.
- Shows tournament identity, current stage/context, and navigable content.
- Tabs and right rail remain discoverable.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/HomePage.tsx frontend/src/components/tournament
git commit -m "feat: redesign tournament hub"
```

---

### Task 6: Listing and Detail Pages

**Files:**
- Modify: `frontend/src/pages/MatchesPage.tsx`
- Modify: `frontend/src/pages/MatchDetailPage.tsx`
- Modify: `frontend/src/pages/StatsPage.tsx`
- Modify: `frontend/src/pages/TeamDetailPage.tsx`
- Modify: `frontend/src/pages/PlayerDetailPage.tsx`
- Modify: `frontend/src/pages/TeamsPage.tsx`
- Modify: `frontend/src/pages/PlayersPage.tsx`
- Modify: `frontend/src/pages/DraftPage.tsx`

- [ ] **Step 1: Apply `EditorialHeader` to page headings**

Use `EditorialHeader` on major pages with page-specific subtitles. Keep route behavior and API hooks unchanged.

- [ ] **Step 2: Convert stat summary cards to `MetricPanel`**

Use `MetricPanel` in `StatsPage`, `PlayerDetailPage`, and team/player overview sections where metric cards exist.

- [ ] **Step 3: Make match detail an archive**

Keep all current data sections: header, map picker, scoreboard, round timeline, economy chart, highlights. Change copy and layout from match center to match archive.

- [ ] **Step 4: Keep table density**

Do not convert scoreboards or leaderboards into oversized cards. Tables should remain scannable with component font, aligned numeric cells, and muted hover rows.

- [ ] **Step 5: Run build**

Run: `cd frontend && npm run build`

Expected: Build passes.

- [ ] **Step 6: Manual check**

Verify:

- Matches page remains easy to scan.
- Match detail hover layers still work after surrounding layout changes.
- Stats filters remain readable and clickable.
- Team/player pages feel like dossiers, not default dashboards.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/MatchesPage.tsx frontend/src/pages/MatchDetailPage.tsx frontend/src/pages/StatsPage.tsx frontend/src/pages/TeamDetailPage.tsx frontend/src/pages/PlayerDetailPage.tsx frontend/src/pages/TeamsPage.tsx frontend/src/pages/PlayersPage.tsx frontend/src/pages/DraftPage.tsx
git commit -m "feat: refine tournament record pages"
```

---

### Task 7: News, About, and Final Verification

**Files:**
- Modify: `frontend/src/pages/NewsPage.tsx`
- Modify: `frontend/src/pages/NewsDetailPage.tsx`
- Modify: `frontend/src/pages/AboutPage.tsx`

- [ ] **Step 1: Redesign news list as editorial grid**

Keep category filtering and article links. Remove emoji placeholder and use typographic placeholder when no cover image exists.

- [ ] **Step 2: Redesign news detail for reading**

Use Source Han Serif body, Georgia for English/numeric display elements, constrained article width, and restrained metadata.

- [ ] **Step 3: Redesign about page**

Use editorial sections and rule-like blocks. Avoid promotional invitation tone.

- [ ] **Step 4: Run build**

Run: `cd frontend && npm run build`

Expected: Build passes.

- [ ] **Step 5: Start dev server for visual review**

Run: `cd frontend && npm run dev`

Expected: Vite prints a local URL.

- [ ] **Step 6: Full manual route sweep**

Check these routes:

- `/`
- `/matches`
- one `/matches/:id`
- `/stats`
- `/teams`
- one `/teams/:id`
- `/players`
- one `/players/:id`
- `/news`
- one `/news/:slug`
- `/about`
- `/draft`

For each route, verify desktop and mobile widths.

- [ ] **Step 7: Hover and popover regression sweep**

Verify:

- Search dialog opens, searches, groups results, and closes.
- Round timeline hover gives complete round details.
- Economy chart tooltip still shows round money values.
- Tier chart tooltip still shows tier count, rating, and ADR.
- Native title hover for pick cells remains or is replaced with equal information.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/NewsPage.tsx frontend/src/pages/NewsDetailPage.tsx frontend/src/pages/AboutPage.tsx
git commit -m "feat: refine editorial pages"
```

---

## Final Verification

- [ ] Run: `cd frontend && npm run build`
- [ ] Run: `git status --short`
- [ ] Confirm no `.superpowers/` files are tracked.
- [ ] Confirm no backend files changed.
- [ ] Confirm hover/popover information behavior was manually checked.
- [ ] Prepare final summary with changed files and verification commands.

