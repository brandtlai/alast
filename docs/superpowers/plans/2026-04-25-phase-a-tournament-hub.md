# Phase A — TournamentHub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing `/` HomePage into a TournamentHub: a compact hero band + 4-tab interface (Overview / Group Stage / Bracket / Results) + 5-card right rail + a new `/draft` page. All driven by existing schema and APIs; tabs that need C-phase data render empty states.

**Architecture:** Replace `HomePage.tsx` with a thin container that renders `<TournamentHubHero>` + `<TabPills>` + the active tab. Tabs read URL state via `?tab=` (search param). Each tab is a focused component file; widgets live under `components/tournament/`. No backend changes; one frontend hook (`useCurrentTournament`) wraps the existing `/api/tournaments` list with a "latest by year" heuristic — replaced in C phase by the `/api/tournaments/current` endpoint.

**Tech Stack:** React 18, react-router-dom v6 (`useSearchParams`), @tanstack/react-query, Tailwind v4 with CSS `@theme` tokens, framer-motion (already in use), dayjs, lucide-react.

---

## Spec reference

This plan implements Phase A of `docs/superpowers/specs/2026-04-25-alast-review-hub-design.md`. Sections covered: §2.1–2.7 (TournamentHub UI), §6.1 (data-layer tokens), §6.2 (component sediment), §8 acceptance items under "A 阶段". Phases C/B/D are out of scope for this plan.

---

## File map

**New files:**

```
frontend/src/
├── pages/
│   ├── HomePage.tsx                                # rewritten as TournamentHub container
│   └── DraftPage.tsx                               # NEW — tier grid + S-shape pick order viz (empty state in A)
├── components/tournament/
│   ├── TournamentHubHero.tsx                       # NEW — compact 360px hero band
│   ├── TabPills.tsx                                # NEW — 4-tab pill row + URL state
│   ├── MatchRow.tsx                                # NEW — shared row, 3 variants
│   ├── lib/
│   │   ├── groupByRound.ts                         # NEW — round-grouping helper
│   │   └── tournamentRounds.ts                     # NEW — stage label lookup
│   ├── tabs/
│   │   ├── OverviewTab.tsx                         # NEW
│   │   ├── GroupStageTab.tsx                       # NEW
│   │   ├── BracketTab.tsx                          # NEW
│   │   └── ResultsTab.tsx                          # NEW
│   ├── rail/
│   │   ├── RightRail.tsx                           # NEW — column wrapper
│   │   ├── StageCard.tsx                           # NEW — current stage + progress
│   │   ├── StageTimeline.tsx                       # NEW — vertical stage list
│   │   ├── MvpMini.tsx                             # NEW — empty state in A
│   │   ├── RulesAndResources.tsx                   # NEW
│   │   └── FaqWidget.tsx                           # NEW
│   ├── StandingsTable.tsx                          # NEW — empty state in A
│   ├── RoundPanel.tsx                              # NEW — collapsible round panel
│   └── BracketColumn.tsx                           # NEW — UB/LB/GF column
└── api/
    └── currentTournament.ts                        # NEW — temp wrapper around /api/tournaments
```

**Modified files:**

- `frontend/src/index.css` — add 5 data-layer `@theme` tokens (§6.1)
- `frontend/src/App.tsx` — register `/draft` route
- `frontend/src/components/Navbar.tsx` — add Draft link

**Note on testing:** Per spec §6.3, the frontend has no test framework and Phase A does not introduce one (YAGNI). Each task ends with a **manual verification** step in the browser (`npm run dev` is already running on :5173 per session-level dev sync). For pure utilities (`groupByRound`), verification is by observing the rendered tab.

---

## Task 0: Pre-flight check

**Files:** none

- [ ] **Step 1: Verify dev servers are up**

```bash
curl -sf http://localhost:3001/api/health && echo "  ✓ backend"
curl -sf http://localhost:5173/ > /dev/null && echo "  ✓ frontend"
```

Expected output:
```
{"status":"ok"}  ✓ backend
  ✓ frontend
```

If either is down, start them: `cd backend && npm run dev` (port 3001) and `cd frontend && npm run dev` (port 5173).

- [ ] **Step 2: Confirm clean working tree**

```bash
cd /Users/brandt/alast && git status -s
```

Expected: only the untracked files we already know about (`AGENTS.md`, `CLAUDE.md`, `match_data/`). No staged or unstaged changes to tracked files.

If there are stray changes, stash them: `git stash push -u -m "pre-phase-a"`.

---

## Task 1: Add data-layer CSS tokens

**Files:**
- Modify: `frontend/src/index.css`

Adds the 5 BLAST-style data-layer tokens from spec §6.1. These power the right rail, scoreboard, and other information-dense regions in later tasks. Brand-layer tokens stay untouched.

- [ ] **Step 1: Edit `@theme` block**

In `frontend/src/index.css`, find the existing `@theme {` block (lines 3–13) and add 5 new tokens directly under `--color-border:`:

```css
@theme {
  --color-background:  #050714;
  --color-foreground:  #F8FAFC;
  --color-primary:     #FF8A00;
  --color-secondary:   #0A0F2D;
  --color-accent:      #00D1FF;
  --color-gold:        #FFD700;
  --color-gold-orange: #FFB800;
  --color-card:        rgba(10, 15, 45, 0.6);
  --color-border:      rgba(255, 255, 255, 0.08);

  /* Data layer (BLAST-style information density) */
  --color-data-surface:    #0E1428;
  --color-data-row:        rgba(255, 255, 255, 0.02);
  --color-data-divider:    rgba(255, 255, 255, 0.06);
  --color-data-chip:       #1A2342;
  --color-data-text-muted: rgba(255, 255, 255, 0.45);
}
```

- [ ] **Step 2: Verify tokens compile**

Vite is running. Visit `http://localhost:5173/` — the page should still render exactly as before (no visual change yet). If the build errors, the dev server console will show a Tailwind compile error pointing at `index.css`.

- [ ] **Step 3: Commit**

```bash
cd /Users/brandt/alast
git add frontend/src/index.css
git commit -m "feat(theme): add data-layer tokens for information-dense regions"
```

---

## Task 2: Add `useCurrentTournament` hook

**Files:**
- Create: `frontend/src/api/currentTournament.ts`

Phase A doesn't yet have `/api/tournaments/current` (that's C-phase). This hook reuses the existing `/api/tournaments` list and picks the highest-`year` row as a stand-in. The hook signature stays stable so Phase C only swaps the implementation.

- [ ] **Step 1: Create the hook file**

```typescript
// frontend/src/api/currentTournament.ts
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Tournament } from '../types'

/**
 * Returns the "current" tournament. Phase A heuristic: highest year, then alphabetical name.
 * Phase C swaps this to GET /api/tournaments/current backed by tournaments.is_current.
 */
export function useCurrentTournament() {
  return useQuery({
    queryKey: ['tournaments', 'current'],
    queryFn: async () => {
      const all = await apiFetch<Tournament[]>('/api/tournaments')
      if (all.length === 0) return null
      const sorted = [...all].sort((a, b) => {
        const ya = a.year ?? 0
        const yb = b.year ?? 0
        if (yb !== ya) return yb - ya
        return a.name.localeCompare(b.name)
      })
      return sorted[0]
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
```

Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/currentTournament.ts
git commit -m "feat(api): add useCurrentTournament hook (year-fallback heuristic)"
```

---

## Task 3: Build `<TournamentHubHero>` (compact ~360px band)

**Files:**
- Create: `frontend/src/components/tournament/TournamentHubHero.tsx`

Spec §2.1: shrink the existing full-screen奖杯 hero to a header band. Three-section info row stays (phase / venue / prize). Trophy stays on the right at ~180px. Light beams + ambient glow are simplified to one subtle blob (full hero version is reserved for `/about` etc.).

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/tournament/TournamentHubHero.tsx
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import TrophySymbol from '../TrophySymbol'
import { useCurrentTournament } from '../../api/currentTournament'

const INFO_ITEMS = [
  { label: 'Tournament Phase', value: '小组赛', accent: false },
  { label: 'Venue',            value: 'Online', accent: false },
  { label: 'Grand Prize',      value: '¥500,000', accent: true },
]

export default function TournamentHubHero() {
  const { data: tournament } = useCurrentTournament()

  return (
    <section className="relative overflow-hidden stage-gradient" style={{ height: 360 }}>
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
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">
            ALAST PREMIER
          </p>
          <h1 className="font-black italic tracking-tighter leading-none mb-2"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
            <span className="gold-gradient">PREMIER 2026</span>
          </h1>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-5">
            {tournament?.name ?? 'SEASON 2026'}
          </p>

          {/* Info bar */}
          <div className="flex items-center gap-6 flex-wrap">
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
          </div>
        </motion.div>

        {/* Trophy */}
        <motion.div
          className="flex-shrink-0 hidden md:block"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <TrophySymbol variant="full" className="w-[180px] lg:w-[220px]" />
        </motion.div>
      </div>

      {/* Hidden CTA — kept off the hub hero per design (CTA lives in tabs). Link reserved for /about. */}
      <Link to="/about" className="sr-only">关于赛事</Link>
    </section>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tournament/TournamentHubHero.tsx
git commit -m "feat(hub): compact TournamentHubHero (360px band)"
```

(Visual verification happens in Task 5 once it's wired into the page.)

---

## Task 4: Build `<TabPills>` with `?tab=` URL state

**Files:**
- Create: `frontend/src/components/tournament/TabPills.tsx`

Spec §2.2: 4 pills, URL-synced via `useSearchParams`. Active pill uses brand orange; inactive uses data-layer chip color. Order: Overview / Group Stage / Bracket / Results. Default is `overview`.

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/tournament/TabPills.tsx
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'

export const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'groups',   label: 'Group Stage' },
  { key: 'bracket',  label: 'Bracket' },
  { key: 'results',  label: 'Results' },
] as const

export type TabKey = (typeof TABS)[number]['key']

export function useActiveTab(): [TabKey, (k: TabKey) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const active: TabKey =
    (TABS.find(t => t.key === raw)?.key) ?? 'overview'
  const setActive = (k: TabKey) => {
    const next = new URLSearchParams(params)
    if (k === 'overview') next.delete('tab')
    else next.set('tab', k)
    setParams(next, { replace: false })
  }
  return [active, setActive]
}

export default function TabPills() {
  const [active, setActive] = useActiveTab()

  return (
    <div className="border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
      <div className="max-w-7xl mx-auto px-6 flex gap-2 overflow-x-auto custom-scrollbar">
        {TABS.map(t => {
          const isActive = active === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={[
                'relative px-5 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors',
                isActive ? 'text-primary' : 'text-white/45 hover:text-white/80',
              ].join(' ')}
            >
              {t.label}
              {isActive && (
                <motion.div
                  layoutId="hub-tab-active"
                  className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary"
                  style={{ boxShadow: '0 0 10px rgba(255,138,0,0.5)' }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tournament/TabPills.tsx
git commit -m "feat(hub): TabPills with ?tab= URL state"
```

---

## Task 5: Wire HomePage as TournamentHub container

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx` (full rewrite)

Replace the existing 320-line HomePage with a thin container: `<TournamentHubHero>` + `<TabPills>` + lazy-loaded tab body. Tab bodies are stub strings for now; later tasks will swap them in. The old HomePage's "Recent Matches / Teams / News" sections are dropped — they get re-homed in the Overview tab in Task 7.

- [ ] **Step 1: Rewrite HomePage.tsx**

```tsx
// frontend/src/pages/HomePage.tsx
import TournamentHubHero from '../components/tournament/TournamentHubHero'
import TabPills, { useActiveTab } from '../components/tournament/TabPills'

export default function HomePage() {
  const [active] = useActiveTab()

  return (
    <div>
      <TournamentHubHero />
      <TabPills />
      <div className="max-w-7xl mx-auto px-6 py-10">
        {active === 'overview' && <div className="text-white/40 text-sm">Overview — coming in Task 7</div>}
        {active === 'groups'   && <div className="text-white/40 text-sm">Group Stage — coming in Task 14</div>}
        {active === 'bracket'  && <div className="text-white/40 text-sm">Bracket — coming in Task 15</div>}
        {active === 'results'  && <div className="text-white/40 text-sm">Results — coming in Task 16</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:5173/`. Expected:
- Compact hero (~360px high) with "PREMIER 2026" gold-gradient title and trophy on the right
- 4 tab pills below the hero ("Overview" active by default)
- Body shows "Overview — coming in Task 7"

Click each pill:
- Clicking "Group Stage" → URL becomes `/?tab=groups`, body shows "Group Stage — coming in Task 14"
- Clicking "Bracket"  → URL becomes `/?tab=bracket`
- Clicking "Results"  → URL becomes `/?tab=results`
- Clicking "Overview" → URL `?tab=` is cleared (back to `/`)

Browser back/forward buttons should restore tab state.

- [ ] **Step 3: TypeScript + production build check**

```bash
cd /Users/brandt/alast/frontend && npm run build
```

Expected: exit 0, dist/ produced.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/HomePage.tsx
git commit -m "feat(hub): wire HomePage as TournamentHub container with tab routing"
```

---

## Task 6: Round-grouping utility + stage label lookup

**Files:**
- Create: `frontend/src/components/tournament/lib/groupByRound.ts`
- Create: `frontend/src/components/tournament/lib/tournamentRounds.ts`

Spec §2.3 calls for matches grouped by tournament round with date-range headers. Phase A drives this from the existing free-text `matches.stage` field (e.g., "小组赛 R1", "胜者组 QF", "GF"). C phase replaces this with `bracket_kind` + `bracket_round` queries.

- [ ] **Step 1: Create `tournamentRounds.ts`**

```typescript
// frontend/src/components/tournament/lib/tournamentRounds.ts

/**
 * Canonical ordering of stage labels in this tournament. Used to sort
 * round groups consistently in the UI even when matches.stage is free text.
 * In Phase C this is replaced by (bracket_kind, bracket_round) tuples.
 */
export const STAGE_ORDER: readonly string[] = [
  '小组赛 R1', '小组赛 R2', '小组赛 R3',
  '胜者组 QF', '胜者组 SF', '胜者组 Final',
  '败者组 R1', '败者组 R2', '败者组 R3', '败者组 R4', '败者组 Final',
  'Grand Final', 'GF',
]

export function stageOrderIndex(stage: string | null | undefined): number {
  if (!stage) return STAGE_ORDER.length
  const i = STAGE_ORDER.indexOf(stage)
  return i === -1 ? STAGE_ORDER.length : i
}
```

- [ ] **Step 2: Create `groupByRound.ts`**

```typescript
// frontend/src/components/tournament/lib/groupByRound.ts
import dayjs from 'dayjs'
import type { Match } from '../../../types'
import { stageOrderIndex } from './tournamentRounds'

export interface RoundGroup {
  stage: string             // display label
  matches: Match[]          // newest first within group
  dateRange: string | null  // "04-06 → 04-08" or null if no scheduled_at
}

/**
 * Group matches by `stage` (free-text in Phase A). Sort groups by canonical
 * STAGE_ORDER, then by earliest match date descending (so the most recent
 * round appears first). Within each group, newest match first.
 */
export function groupByRound(matches: Match[]): RoundGroup[] {
  const buckets = new Map<string, Match[]>()
  for (const m of matches) {
    const key = m.stage ?? '未分组'
    const arr = buckets.get(key) ?? []
    arr.push(m)
    buckets.set(key, arr)
  }

  const groups: RoundGroup[] = []
  for (const [stage, ms] of buckets.entries()) {
    const sortedMs = [...ms].sort((a, b) => {
      const ta = a.scheduled_at ? dayjs(a.scheduled_at).valueOf() : 0
      const tb = b.scheduled_at ? dayjs(b.scheduled_at).valueOf() : 0
      return tb - ta
    })
    const dated = sortedMs.filter(m => m.scheduled_at)
    let dateRange: string | null = null
    if (dated.length > 0) {
      const first = dayjs(dated[dated.length - 1].scheduled_at!).format('MM-DD')
      const last  = dayjs(dated[0].scheduled_at!).format('MM-DD')
      dateRange = first === last ? first : `${first} → ${last}`
    }
    groups.push({ stage, matches: sortedMs, dateRange })
  }

  // Sort groups: canonical stage order first, then by latest match desc within unknowns
  groups.sort((a, b) => {
    const ia = stageOrderIndex(a.stage)
    const ib = stageOrderIndex(b.stage)
    if (ia !== ib) return ib - ia       // higher canonical index = later round = on top
    const lastA = a.matches[0]?.scheduled_at ? dayjs(a.matches[0].scheduled_at).valueOf() : 0
    const lastB = b.matches[0]?.scheduled_at ? dayjs(b.matches[0].scheduled_at).valueOf() : 0
    return lastB - lastA
  })

  return groups
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/tournament/lib/
git commit -m "feat(hub): round-grouping utility + canonical stage order"
```

---

## Task 7: Build `<MatchRow>` shared component (3 variants)

**Files:**
- Create: `frontend/src/components/tournament/MatchRow.tsx`

Per spec §6.2: one `MatchRow` with three variants. `overview` is the standard row, `results` is the same with a `finished` badge, `bracket-card` is a vertical card variant for the bracket tab. Reusing one component keeps visual consistency.

- [ ] **Step 1: Create the component**

```tsx
// frontend/src/components/tournament/MatchRow.tsx
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import TeamLogo from '../TeamLogo'
import StatusBadge from '../StatusBadge'
import type { Match } from '../../types'

interface Props {
  match: Match
  variant?: 'overview' | 'results' | 'bracket-card'
}

export default function MatchRow({ match, variant = 'overview' }: Props) {
  const finished = match.status === 'finished'

  if (variant === 'bracket-card') {
    return (
      <Link
        to={`/matches/${match.id}`}
        className="block rounded-md border px-3 py-2 transition-colors"
        style={{
          background: 'var(--color-data-row)',
          borderColor: 'var(--color-data-divider)',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={20} />
            <span className="text-xs font-bold truncate text-white/85">{match.team_a_name ?? 'TBD'}</span>
          </div>
          <span className={`text-sm font-black tabular-nums ${finished ? 'text-primary' : 'text-white/40'}`}>
            {finished ? match.maps_won_a : '–'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={20} />
            <span className="text-xs font-bold truncate text-white/85">{match.team_b_name ?? 'TBD'}</span>
          </div>
          <span className={`text-sm font-black tabular-nums ${finished ? 'text-primary' : 'text-white/40'}`}>
            {finished ? match.maps_won_b : '–'}
          </span>
        </div>
      </Link>
    )
  }

  // overview / results — horizontal row
  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-md border transition-colors hover:border-primary/40"
      style={{
        background: 'var(--color-data-row)',
        borderColor: 'var(--color-data-divider)',
      }}
    >
      {/* Time */}
      <div className="hidden sm:block text-[10px] font-mono text-white/35 w-14 flex-shrink-0">
        {match.scheduled_at ? dayjs(match.scheduled_at).format('MM-DD HH:mm') : ''}
      </div>

      {/* Team A */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="font-black text-sm truncate text-white/90">{match.team_a_name ?? 'TBD'}</span>
        <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={28} />
      </div>

      {/* Score capsule */}
      <div className="text-center flex-shrink-0 min-w-[70px]">
        {finished
          ? (
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-md font-black tabular-nums text-base"
              style={{ background: 'var(--color-data-chip)' }}>
              <span className="text-white">{match.maps_won_a}</span>
              <span className="text-white/30">:</span>
              <span className="text-white">{match.maps_won_b}</span>
            </div>
          )
          : <StatusBadge status={match.status} />}
      </div>

      {/* Team B */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={28} />
        <span className="font-black text-sm truncate text-white/90">{match.team_b_name ?? 'TBD'}</span>
      </div>

      {/* BO badge (placeholder — `best_of` arrives in C phase) */}
      <div className="hidden md:block text-[9px] font-black uppercase tracking-widest text-white/30 w-10 text-right flex-shrink-0">
        {variant === 'results' ? 'FT' : 'BO?'}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tournament/MatchRow.tsx
git commit -m "feat(hub): MatchRow shared component (overview/results/bracket-card variants)"
```

---

## Task 8: Build `<OverviewTab>` (rounds-grouped match flow)

**Files:**
- Create: `frontend/src/components/tournament/tabs/OverviewTab.tsx`
- Modify: `frontend/src/pages/HomePage.tsx` (wire it in)

Spec §2.3 center column: matches grouped by round, newest round on top, each group has a date-range subheader. Right rail is added in Task 13. News mini-strip is added in Task 12.

- [ ] **Step 1: Create OverviewTab.tsx**

```tsx
// frontend/src/components/tournament/tabs/OverviewTab.tsx
import { useMemo } from 'react'
import { useMatches } from '../../../api/matches'
import { useCurrentTournament } from '../../../api/currentTournament'
import { groupByRound } from '../lib/groupByRound'
import MatchRow from '../MatchRow'
import Spinner from '../../Spinner'

export default function OverviewTab() {
  const { data: tournament } = useCurrentTournament()
  const { data: matches, isLoading } = useMatches({
    tournament_id: tournament?.id,
  })

  const groups = useMemo(() => groupByRound(matches ?? []), [matches])

  if (isLoading) return <div className="py-12"><Spinner /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Center column — match flow */}
      <div className="space-y-8 min-w-0">
        {groups.length === 0 && (
          <div className="text-sm text-white/40 py-12 text-center">
            暂无比赛数据
          </div>
        )}
        {groups.map(g => (
          <section key={g.stage}>
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary">
                {g.stage}
              </h2>
              {g.dateRange && (
                <span className="text-[10px] font-mono text-white/35">{g.dateRange}</span>
              )}
            </div>
            <div className="space-y-2">
              {g.matches.map(m => (
                <MatchRow key={m.id} match={m} variant="overview" />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Right rail placeholder — filled in Task 13 */}
      <aside className="hidden lg:block">
        <div className="text-xs text-white/30">Right rail — Task 13</div>
      </aside>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into HomePage**

In `frontend/src/pages/HomePage.tsx`, replace the line:

```tsx
{active === 'overview' && <div className="text-white/40 text-sm">Overview — coming in Task 7</div>}
```

with:

```tsx
{active === 'overview' && <OverviewTab />}
```

And add the import at the top:

```tsx
import OverviewTab from '../components/tournament/tabs/OverviewTab'
```

- [ ] **Step 3: Verify in browser**

`http://localhost:5173/` → Overview tab shows match groups (or "暂无比赛数据" if DB is empty). Each row links to `/matches/:id`. No layout shift on load.

If you want to populate test data, the existing admin UI lets you create matches with stage labels matching `STAGE_ORDER` (e.g., "小组赛 R1"). Otherwise the empty state suffices.

- [ ] **Step 4: TypeScript check + commit**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
git add frontend/src/components/tournament/tabs/OverviewTab.tsx frontend/src/pages/HomePage.tsx
git commit -m "feat(hub): OverviewTab with round-grouped match flow"
```

---

## Task 9: Build `<RightRail>` container

**Files:**
- Create: `frontend/src/components/tournament/rail/RightRail.tsx`

Skeleton container for the 5 widgets. Each child gets consistent spacing and a data-layer surface treatment. Children are passed in as props, so we can compose the rail from the OverviewTab.

- [ ] **Step 1: Create RightRail.tsx**

```tsx
// frontend/src/components/tournament/rail/RightRail.tsx
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function RightRail({ children }: Props) {
  return (
    <aside className="space-y-4">
      {children}
    </aside>
  )
}

interface CardProps {
  title?: string
  children: ReactNode
}

export function RailCard({ title, children }: CardProps) {
  return (
    <div
      className="rounded-md border p-4"
      style={{
        background: 'var(--color-data-surface)',
        borderColor: 'var(--color-data-divider)',
      }}
    >
      {title && (
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40 mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check + commit**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
git add frontend/src/components/tournament/rail/RightRail.tsx
git commit -m "feat(hub): RightRail container + RailCard"
```

---

## Task 10: Right-rail widgets — StageCard + StageTimeline

**Files:**
- Create: `frontend/src/components/tournament/rail/StageCard.tsx`
- Create: `frontend/src/components/tournament/rail/StageTimeline.tsx`

Two widgets share the same notion of "current stage". For Phase A both compute their state from a hardcoded stage list (matches the spec's tournament timeline: 报名 → 选马 → 小组赛 R1/R2/R3 → 双败各轮 → 决赛). C phase will swap the stage list to be derived from `bracket_kind` data.

- [ ] **Step 1: Create StageCard.tsx**

```tsx
// frontend/src/components/tournament/rail/StageCard.tsx
import { RailCard } from './RightRail'

const STAGES = [
  '报名', '选马',
  '小组赛 R1', '小组赛 R2', '小组赛 R3',
  '胜者组', '败者组', '总决赛',
]

// Phase A heuristic: read from a hardcoded "current index" until C phase wires bracket data.
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
```

- [ ] **Step 2: Create StageTimeline.tsx**

```tsx
// frontend/src/components/tournament/rail/StageTimeline.tsx
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
```

- [ ] **Step 3: TypeScript check + commit**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
git add frontend/src/components/tournament/rail/StageCard.tsx frontend/src/components/tournament/rail/StageTimeline.tsx
git commit -m "feat(hub): StageCard + StageTimeline rail widgets"
```

---

## Task 11: Right-rail widgets — MvpMini + RulesAndResources + FaqWidget + Draft link card

**Files:**
- Create: `frontend/src/components/tournament/rail/MvpMini.tsx`
- Create: `frontend/src/components/tournament/rail/RulesAndResources.tsx`
- Create: `frontend/src/components/tournament/rail/FaqWidget.tsx`

The remaining 3 rail cards. MVP shows an empty state (real data lands in D phase). Rules/Resources is a static link list. FAQ is a static list of 5 short Q&A pulled from the rules document.

- [ ] **Step 1: Create MvpMini.tsx**

```tsx
// frontend/src/components/tournament/rail/MvpMini.tsx
import { Trophy } from 'lucide-react'
import { RailCard } from './RightRail'

export default function MvpMini() {
  return (
    <RailCard title="MVP / Top Fragger">
      <div className="flex items-center gap-3 py-2 text-white/40">
        <Trophy size={20} className="text-white/20" />
        <p className="text-xs">待赛事进行中后填充</p>
      </div>
    </RailCard>
  )
}
```

- [ ] **Step 2: Create RulesAndResources.tsx**

```tsx
// frontend/src/components/tournament/rail/RulesAndResources.tsx
import { Link } from 'react-router-dom'
import { FileText, Users, Info, ChevronRight, Trophy } from 'lucide-react'
import { RailCard } from './RightRail'

const ITEMS: { label: string; href: string; icon: typeof FileText }[] = [
  { label: '规则书',     href: '/about#rules',  icon: FileText },
  { label: '战队报名',   href: '/teams',         icon: Users },
  { label: '关于赛事',   href: '/about',         icon: Info },
]

export default function RulesAndResources() {
  return (
    <RailCard title="Resources">
      <ul className="space-y-1">
        {ITEMS.map(item => {
          const Icon = item.icon
          return (
            <li key={item.label}>
              <Link
                to={item.href}
                className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-white/5 transition-colors group"
              >
                <Icon size={14} className="text-white/40 group-hover:text-primary transition-colors flex-shrink-0" />
                <span className="text-xs font-bold text-white/75 group-hover:text-white flex-1">{item.label}</span>
                <ChevronRight size={12} className="text-white/25 group-hover:text-primary transition-colors" />
              </Link>
            </li>
          )
        })}
        <li>
          <Link
            to="/draft"
            className="flex items-center gap-3 py-2 px-2 rounded-md transition-colors group"
            style={{ background: 'var(--color-data-chip)' }}
          >
            <Trophy size={14} className="text-primary flex-shrink-0" />
            <span className="text-xs font-bold text-white/90 flex-1">选马公示 / Draft</span>
            <ChevronRight size={12} className="text-primary" />
          </Link>
        </li>
      </ul>
    </RailCard>
  )
}
```

- [ ] **Step 3: Create FaqWidget.tsx**

```tsx
// frontend/src/components/tournament/rail/FaqWidget.tsx
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
```

- [ ] **Step 4: TypeScript check + commit**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
git add frontend/src/components/tournament/rail/MvpMini.tsx \
        frontend/src/components/tournament/rail/RulesAndResources.tsx \
        frontend/src/components/tournament/rail/FaqWidget.tsx
git commit -m "feat(hub): MvpMini + RulesAndResources + FaqWidget rail widgets"
```

---

## Task 12: News mini-strip in OverviewTab

**Files:**
- Modify: `frontend/src/components/tournament/tabs/OverviewTab.tsx`

Per spec §2.3 bottom: up to 3 news cards under the match flow. **Hide the entire strip when there are no news items** (per user feedback that news supply is low).

- [ ] **Step 1: Edit OverviewTab.tsx — add news strip**

In `frontend/src/components/tournament/tabs/OverviewTab.tsx`, add the news fetch and a strip beneath the rounds groups. Replace the file with:

```tsx
// frontend/src/components/tournament/tabs/OverviewTab.tsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { useMatches } from '../../../api/matches'
import { useNewsList } from '../../../api/news'
import { useCurrentTournament } from '../../../api/currentTournament'
import { groupByRound } from '../lib/groupByRound'
import MatchRow from '../MatchRow'
import Spinner from '../../Spinner'
import Card from '../../Card'

export default function OverviewTab() {
  const { data: tournament } = useCurrentTournament()
  const { data: matches, isLoading } = useMatches({
    tournament_id: tournament?.id,
  })
  const { data: news } = useNewsList({ limit: 3 })

  const groups = useMemo(() => groupByRound(matches ?? []), [matches])

  if (isLoading) return <div className="py-12"><Spinner /></div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      <div className="space-y-8 min-w-0">
        {groups.length === 0 && (
          <div className="text-sm text-white/40 py-12 text-center">
            暂无比赛数据
          </div>
        )}
        {groups.map(g => (
          <section key={g.stage}>
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary">
                {g.stage}
              </h2>
              {g.dateRange && (
                <span className="text-[10px] font-mono text-white/35">{g.dateRange}</span>
              )}
            </div>
            <div className="space-y-2">
              {g.matches.map(m => (
                <MatchRow key={m.id} match={m} variant="overview" />
              ))}
            </div>
          </section>
        ))}

        {/* News mini-strip — hidden entirely when empty */}
        {news && news.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3 px-1">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary">最新资讯</h2>
              <Link to="/news" className="text-[10px] font-black uppercase tracking-widest text-white/35 hover:text-primary transition-colors">
                更多 →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {news.map(a => (
                <Card key={a.id} href={`/news/${a.slug}`}>
                  {a.cover_image_url && (
                    <div className="h-28 overflow-hidden">
                      <img src={a.cover_image_url} alt={a.title}
                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-black text-xs leading-snug line-clamp-2 text-white/90">{a.title}</h3>
                    <p className="text-[10px] text-white/30 mt-1.5">{dayjs(a.published_at).format('YYYY-MM-DD')}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Right rail placeholder — filled in Task 13 */}
      <aside className="hidden lg:block">
        <div className="text-xs text-white/30">Right rail — Task 13</div>
      </aside>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

`http://localhost:5173/`. If news exists in DB, the strip appears below the match groups; if not, no strip is rendered (no empty section).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/tournament/tabs/OverviewTab.tsx
git commit -m "feat(hub): OverviewTab news mini-strip (hidden when empty)"
```

---

## Task 13: Wire RightRail into OverviewTab

**Files:**
- Modify: `frontend/src/components/tournament/tabs/OverviewTab.tsx`

Replace the rail placeholder with the actual 5 widgets in the order spec §2.3 dictates: StageCard → StageTimeline → MvpMini → RulesAndResources (which contains the Draft link) → FaqWidget.

- [ ] **Step 1: Edit OverviewTab.tsx — add imports**

Add these imports near the top of `frontend/src/components/tournament/tabs/OverviewTab.tsx`:

```tsx
import RightRail from '../rail/RightRail'
import StageCard from '../rail/StageCard'
import StageTimeline from '../rail/StageTimeline'
import MvpMini from '../rail/MvpMini'
import RulesAndResources from '../rail/RulesAndResources'
import FaqWidget from '../rail/FaqWidget'
```

- [ ] **Step 2: Replace the rail placeholder**

Find this block in `OverviewTab.tsx`:

```tsx
{/* Right rail placeholder — filled in Task 13 */}
<aside className="hidden lg:block">
  <div className="text-xs text-white/30">Right rail — Task 13</div>
</aside>
```

Replace with:

```tsx
{/* Right rail */}
<div className="hidden lg:block">
  <RightRail>
    <StageCard />
    <StageTimeline />
    <MvpMini />
    <RulesAndResources />
    <FaqWidget />
  </RightRail>
</div>
```

(`RightRail` returns its own `<aside>`, so we use a `div` wrapper here for the responsive hide.)

- [ ] **Step 3: Verify in browser**

`http://localhost:5173/` at viewport ≥1024px wide:
- Right column ~320px shows 5 stacked cards in order
- StageCard shows "小组赛 R1", progress bar at ~38% (3/8)
- StageTimeline shows 8 rows, first 2 with green check, 3rd with orange dot, rest gray
- MvpMini shows the empty state text
- RulesAndResources shows 3 link rows + a highlighted "选马公示 / Draft" row
- FaqWidget shows 5 Q items, clicking one expands its A

At viewport <1024px the rail hides; only the center column is visible.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/tournament/tabs/OverviewTab.tsx
git commit -m "feat(hub): wire 5-widget right rail into OverviewTab"
```

---

## Task 14: GroupStageTab — Standings + Round panels

**Files:**
- Create: `frontend/src/components/tournament/StandingsTable.tsx`
- Create: `frontend/src/components/tournament/RoundPanel.tsx`
- Create: `frontend/src/components/tournament/tabs/GroupStageTab.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`

Spec §2.4: Swiss standings table (W-L / Buchholz / RD / Status) + 3 collapsible round panels. Phase A renders both with empty-state copy because Buchholz / RD / `bracket_kind` data lands in C phase.

- [ ] **Step 1: Create StandingsTable.tsx (empty state)**

```tsx
// frontend/src/components/tournament/StandingsTable.tsx
import type { Team } from '../../types'

export interface StandingRow {
  team: Pick<Team, 'id' | 'name' | 'short_name' | 'logo_url'>
  wins: number
  losses: number
  buchholz: number
  roundDiff: number
  status: '晋级胜者组' | '进入败者组' | '待赛'
}

interface Props {
  rows: StandingRow[] | null
}

const HEADERS = [
  { key: 'rank',   label: '#',         align: 'left' },
  { key: 'team',   label: 'Team',      align: 'left' },
  { key: 'wl',     label: 'W-L',       align: 'right' },
  { key: 'buch',   label: 'Buchholz',  align: 'right' },
  { key: 'rd',     label: 'RD',        align: 'right' },
  { key: 'status', label: 'Status',    align: 'left' },
] as const

export default function StandingsTable({ rows }: Props) {
  if (rows === null || rows.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center text-sm text-white/40"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        小组赛尚未开始 — 待 admin 录入比赛数据后此处显示排名
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <table className="w-full">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
            {HEADERS.map(h => (
              <th key={h.key}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/40 text-${h.align}`}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team.id} className="border-b last:border-0"
                style={{ borderColor: 'var(--color-data-divider)' }}>
              <td className="px-4 py-3 text-sm font-black tabular-nums text-white/60">{i + 1}</td>
              <td className="px-4 py-3 text-sm font-bold text-white/90">{r.team.short_name ?? r.team.name}</td>
              <td className="px-4 py-3 text-sm font-mono text-right tabular-nums">{r.wins}-{r.losses}</td>
              <td className="px-4 py-3 text-sm font-mono text-right tabular-nums text-white/70">{r.buchholz}</td>
              <td className="px-4 py-3 text-sm font-mono text-right tabular-nums text-white/70">
                {r.roundDiff > 0 ? `+${r.roundDiff}` : r.roundDiff}
              </td>
              <td className="px-4 py-3 text-xs text-white/60">{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Create RoundPanel.tsx**

```tsx
// frontend/src/components/tournament/RoundPanel.tsx
import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function RoundPanel({ title, subtitle, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-black text-white/90">{title}</span>
          {subtitle && <span className="text-[10px] font-mono text-white/35">{subtitle}</span>}
        </div>
        <ChevronDown
          size={14}
          className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: 'var(--color-data-divider)' }}>
          {children}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create GroupStageTab.tsx**

```tsx
// frontend/src/components/tournament/tabs/GroupStageTab.tsx
import { useMemo } from 'react'
import { useMatches } from '../../../api/matches'
import { useCurrentTournament } from '../../../api/currentTournament'
import StandingsTable from '../StandingsTable'
import RoundPanel from '../RoundPanel'
import MatchRow from '../MatchRow'

const SWISS_ROUNDS = ['小组赛 R1', '小组赛 R2', '小组赛 R3'] as const

export default function GroupStageTab() {
  const { data: tournament } = useCurrentTournament()
  const { data: matches } = useMatches({ tournament_id: tournament?.id })

  // Phase A: standings need bracket_kind=swiss + Buchholz, both arrive in C phase.
  const standings = null

  const matchesByRound = useMemo(() => {
    const byRound = new Map<string, typeof matches>()
    for (const r of SWISS_ROUNDS) byRound.set(r, [])
    for (const m of matches ?? []) {
      if (SWISS_ROUNDS.includes(m.stage as typeof SWISS_ROUNDS[number])) {
        const arr = byRound.get(m.stage!)!
        arr.push(m)
      }
    }
    return byRound
  }, [matches])

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-3">Standings</h2>
        <StandingsTable rows={standings} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary">Rounds</h2>
        {SWISS_ROUNDS.map((round, i) => {
          const ms = matchesByRound.get(round) ?? []
          return (
            <RoundPanel
              key={round}
              title={round}
              subtitle={ms.length > 0 ? `${ms.length} 场` : '待抽签'}
              defaultOpen={i === 0}
            >
              {ms.length === 0
                ? <p className="text-xs text-white/40 py-2">待小组赛 R{i} 结束后抽签</p>
                : <div className="space-y-2">{ms.map(m => <MatchRow key={m.id} match={m} variant="overview" />)}</div>}
            </RoundPanel>
          )
        })}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Wire into HomePage**

In `frontend/src/pages/HomePage.tsx`, replace the `groups` placeholder line:

```tsx
{active === 'groups'   && <div className="text-white/40 text-sm">Group Stage — coming in Task 14</div>}
```

with:

```tsx
{active === 'groups'   && <GroupStageTab />}
```

And add the import:

```tsx
import GroupStageTab from '../components/tournament/tabs/GroupStageTab'
```

- [ ] **Step 5: Verify in browser**

Click "Group Stage" pill. Expected:
- Empty Standings card with the placeholder copy
- Three collapsible round panels (R1 / R2 / R3); R1 starts open
- Each panel either shows matches with stage="小组赛 R1/R2/R3" or "待小组赛 R{N-1} 结束后抽签"
- Clicking the panel header toggles expand/collapse with chevron rotation

- [ ] **Step 6: TypeScript check + commit**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
git add frontend/src/components/tournament/StandingsTable.tsx \
        frontend/src/components/tournament/RoundPanel.tsx \
        frontend/src/components/tournament/tabs/GroupStageTab.tsx \
        frontend/src/pages/HomePage.tsx
git commit -m "feat(hub): GroupStageTab with standings (empty state) + 3 round panels"
```

---

## Task 15: BracketTab — 3-column simplified card view

**Files:**
- Create: `frontend/src/components/tournament/BracketColumn.tsx`
- Create: `frontend/src/components/tournament/tabs/BracketTab.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`

Spec §2.5: 3 columns (UB / LB / GF), each holding stacked round groups of `<MatchRow variant="bracket-card">`. No SVG tree. Phase A keys columns off `matches.stage` text patterns ("胜者组", "败者组", "GF" / "总决赛"). Empty state per column when no matches match.

- [ ] **Step 1: Create BracketColumn.tsx**

```tsx
// frontend/src/components/tournament/BracketColumn.tsx
import type { Match } from '../../types'
import MatchRow from './MatchRow'

interface Props {
  title: string
  subtitle: string
  rounds: { roundLabel: string; matches: Match[] }[]
  isCurrent?: boolean
}

export default function BracketColumn({ title, subtitle, rounds, isCurrent = false }: Props) {
  const totalMatches = rounds.reduce((n, r) => n + r.matches.length, 0)

  return (
    <div className="rounded-md border p-4"
         style={{
           background: 'var(--color-data-surface)',
           borderColor: isCurrent ? 'var(--color-primary)' : 'var(--color-data-divider)',
           boxShadow: isCurrent ? '0 0 20px rgba(255,138,0,0.15)' : undefined,
         }}>
      <div className="mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-white/90">{title}</h3>
        <p className="text-[10px] text-white/40">{subtitle}</p>
      </div>
      {totalMatches === 0
        ? <p className="text-xs text-white/40 py-6 text-center">未开赛</p>
        : (
          <div className="space-y-4">
            {rounds.map(r => (
              <div key={r.roundLabel}>
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35 mb-2">
                  {r.roundLabel}
                </div>
                <div className="space-y-1.5">
                  {r.matches.map(m => <MatchRow key={m.id} match={m} variant="bracket-card" />)}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
```

- [ ] **Step 2: Create BracketTab.tsx**

```tsx
// frontend/src/components/tournament/tabs/BracketTab.tsx
import { useMemo } from 'react'
import { useMatches } from '../../../api/matches'
import { useCurrentTournament } from '../../../api/currentTournament'
import BracketColumn from '../BracketColumn'
import type { Match } from '../../../types'

interface BracketRound { roundLabel: string; matches: Match[] }

const UB_PATTERN = /^胜者组/
const LB_PATTERN = /^败者组/
const GF_PATTERN = /^(GF|总决赛|Grand Final)$/

function bucketByPrefix(matches: Match[], pattern: RegExp): BracketRound[] {
  const byLabel = new Map<string, Match[]>()
  for (const m of matches) {
    if (!m.stage || !pattern.test(m.stage)) continue
    const arr = byLabel.get(m.stage) ?? []
    arr.push(m)
    byLabel.set(m.stage, arr)
  }
  return Array.from(byLabel.entries()).map(([roundLabel, ms]) => ({ roundLabel, matches: ms }))
}

export default function BracketTab() {
  const { data: tournament } = useCurrentTournament()
  const { data: matches = [] } = useMatches({ tournament_id: tournament?.id })

  const ub = useMemo(() => bucketByPrefix(matches, UB_PATTERN), [matches])
  const lb = useMemo(() => bucketByPrefix(matches, LB_PATTERN), [matches])
  const gf = useMemo(() => bucketByPrefix(matches, GF_PATTERN), [matches])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <BracketColumn title="Upper Bracket"  subtitle="胜者组" rounds={ub} />
      <BracketColumn title="Lower Bracket"  subtitle="败者组" rounds={lb} />
      <BracketColumn title="Grand Final"    subtitle="总决赛" rounds={gf} isCurrent />
    </div>
  )
}
```

- [ ] **Step 3: Wire into HomePage**

In `frontend/src/pages/HomePage.tsx`, replace:

```tsx
{active === 'bracket'  && <div className="text-white/40 text-sm">Bracket — coming in Task 15</div>}
```

with:

```tsx
{active === 'bracket'  && <BracketTab />}
```

Add import:

```tsx
import BracketTab from '../components/tournament/tabs/BracketTab'
```

- [ ] **Step 4: Verify in browser**

Click "Bracket" pill. Expected:
- Three columns side by side (collapses to one column on narrow viewport)
- Each column shows "未开赛" if no matching matches exist
- GF column has the orange highlighted border (current marker)
- Cards inside use the `bracket-card` variant (compact two-row team layout)

- [ ] **Step 5: TypeScript check + commit**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
git add frontend/src/components/tournament/BracketColumn.tsx \
        frontend/src/components/tournament/tabs/BracketTab.tsx \
        frontend/src/pages/HomePage.tsx
git commit -m "feat(hub): BracketTab with 3 simplified card columns (UB/LB/GF)"
```

---

## Task 16: ResultsTab — flat reverse-chronological list with chip filters

**Files:**
- Create: `frontend/src/components/tournament/tabs/ResultsTab.tsx`
- Modify: `frontend/src/pages/HomePage.tsx`

Spec §2.6: only `status='finished'` matches, newest first, with chip filters: 全部 / 小组赛 / 胜者组 / 败者组 / 决赛.

- [ ] **Step 1: Create ResultsTab.tsx**

```tsx
// frontend/src/components/tournament/tabs/ResultsTab.tsx
import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { useMatches } from '../../../api/matches'
import { useCurrentTournament } from '../../../api/currentTournament'
import MatchRow from '../MatchRow'

const FILTERS = [
  { key: 'all',     label: '全部',    test: (_s: string | null) => true },
  { key: 'swiss',   label: '小组赛',  test: (s: string | null) => !!s && /^小组赛/.test(s) },
  { key: 'ub',      label: '胜者组',  test: (s: string | null) => !!s && /^胜者组/.test(s) },
  { key: 'lb',      label: '败者组',  test: (s: string | null) => !!s && /^败者组/.test(s) },
  { key: 'gf',      label: '决赛',    test: (s: string | null) => !!s && /^(GF|总决赛|Grand Final)$/.test(s) },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

export default function ResultsTab() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const { data: tournament } = useCurrentTournament()
  const { data: matches = [] } = useMatches({
    tournament_id: tournament?.id,
    status: 'finished',
  })

  const filtered = useMemo(() => {
    const test = FILTERS.find(f => f.key === filter)!.test
    return matches.filter(m => test(m.stage))
  }, [matches, filter])

  return (
    <div className="space-y-4">
      {/* Chip filter row */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={[
                'px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-colors',
                active ? 'bg-primary text-black' : 'text-white/60 hover:text-white',
              ].join(' ')}
              style={!active ? { background: 'var(--color-data-chip)' } : undefined}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Flat list, grouped only by date for readability */}
      {filtered.length === 0
        ? <div className="text-sm text-white/40 py-12 text-center">暂无已结束比赛</div>
        : <DateGroupedList matches={filtered} />}
    </div>
  )
}

function DateGroupedList({ matches }: { matches: ReturnType<typeof useMatches>['data'] }) {
  const buckets = useMemo(() => {
    const m = new Map<string, NonNullable<typeof matches>>()
    for (const item of matches ?? []) {
      const day = item.scheduled_at ? dayjs(item.scheduled_at).format('YYYY-MM-DD') : '未排定'
      const arr = m.get(day) ?? []
      arr.push(item)
      m.set(day, arr)
    }
    return Array.from(m.entries())
  }, [matches])

  return (
    <div className="space-y-6">
      {buckets.map(([day, ms]) => (
        <section key={day}>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/35 mb-2 px-1">
            {day}
          </div>
          <div className="space-y-2">
            {ms.map(m => <MatchRow key={m.id} match={m} variant="results" />)}
          </div>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Wire into HomePage**

In `frontend/src/pages/HomePage.tsx`, replace:

```tsx
{active === 'results'  && <div className="text-white/40 text-sm">Results — coming in Task 16</div>}
```

with:

```tsx
{active === 'results'  && <ResultsTab />}
```

Add import:

```tsx
import ResultsTab from '../components/tournament/tabs/ResultsTab'
```

- [ ] **Step 3: Verify in browser**

Click "Results" pill. Expected:
- 5 chip filters at the top, "全部" active by default (orange background)
- Below: matches grouped by date (descending), only finished ones
- Click "胜者组" → only matches with `stage` starting "胜者组" appear; chip turns orange
- Empty state if no finished matches in the active filter

- [ ] **Step 4: TypeScript check + commit**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
git add frontend/src/components/tournament/tabs/ResultsTab.tsx frontend/src/pages/HomePage.tsx
git commit -m "feat(hub): ResultsTab with chip filters + date-grouped list"
```

---

## Task 17: DraftPage + `/draft` route + Navbar link

**Files:**
- Create: `frontend/src/pages/DraftPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Navbar.tsx`

Spec §2.7: standalone page, 5-tier grid + S-shape pick order viz. Phase A renders both as empty state with the spec's tier names visible (real `tournament_player_assignment` data lands in C phase).

- [ ] **Step 1: Create DraftPage.tsx**

```tsx
// frontend/src/pages/DraftPage.tsx
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

      {/* S-shape pick order viz (skeleton) */}
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
```

- [ ] **Step 2: Register route in App.tsx**

Edit `frontend/src/App.tsx`. Add the import:

```tsx
import DraftPage from './pages/DraftPage'
```

Add the route inside `<Route element={<Layout />}>` (between `/about` and the closing tag works fine):

```tsx
<Route path="/draft" element={<DraftPage />} />
```

- [ ] **Step 3: Add Draft link in Navbar**

Edit `frontend/src/components/Navbar.tsx`. In the `LINKS` array (line 8), add a new entry between `/news` and `/stats`:

```tsx
const LINKS = [
  { to: '/matches', label: '赛程' },
  { to: '/teams',   label: '战队' },
  { to: '/players', label: '选手' },
  { to: '/draft',   label: '选马' },
  { to: '/news',    label: '新闻' },
  { to: '/stats',   label: '数据' },
  { to: '/about',   label: '关于' },
]
```

- [ ] **Step 4: Verify in browser**

Visit `http://localhost:5173/draft` directly:
- Header reads "选马公示 / Draft" with the rules sub-text
- 5-tier section: 5 rows, each with the colored tier badge (S=gold / A=orange / B=cyan / C+=gray / D=darker gray) + label + "尚未公布选手分配"
- Pick Order section: 4 rows of 16 numbered cells; row 1 is left-to-right (1…16), row 2 is right-to-left (16…1, S-shape), rows 3 and 4 alternate
- Caption "选手分配数据待 admin 录入 — 此处显示 S 型逆向选马顺序示意" beneath the grid

Visit `/` and click the "选马" link in the navbar — navigates to `/draft`. Click any other nav link — navigates correctly.

Also verify the rail's "选马公示 / Draft" link in `RulesAndResources` (added in Task 11) navigates here.

- [ ] **Step 5: TypeScript check + commit**

```bash
cd /Users/brandt/alast/frontend && npx tsc -b --noEmit
git add frontend/src/pages/DraftPage.tsx frontend/src/App.tsx frontend/src/components/Navbar.tsx
git commit -m "feat(hub): DraftPage at /draft with tier grid + S-shape pick order viz"
```

---

## Task 18: Production build + acceptance walkthrough

**Files:** none (verification only)

Final task: production build must succeed, and a manual walkthrough confirms every spec §8 "A 阶段" acceptance line.

- [ ] **Step 1: Production build**

```bash
cd /Users/brandt/alast/frontend && npm run build
```

Expected: exit 0, `dist/` produced, no TypeScript errors, no Vite warnings about missing exports.

- [ ] **Step 2: Walk acceptance checklist in browser at `http://localhost:5173/`**

Run through each spec §8 "A 阶段" item explicitly. Mark each ✓ in this checklist below as you confirm:

- [ ] `/` 加载后看到紧凑 hero + 4 tab pills；URL `?tab=...` 切换不刷新
- [ ] Overview tab 显示按轮次分组的比赛流，最新在最上；行点击 → `/matches/:id`
- [ ] Group Stage tab 显示 Swiss standings 表（W-L、Buchholz、RD）+ 三轮折叠面板（Phase A: empty-state copy is acceptable per spec §7)
- [ ] Bracket tab 显示 3 列卡片（UB / LB / GF），不画 SVG
- [ ] Results tab 显示扁平倒序列表，筛选 chip 工作
- [ ] 右栏 5 张卡片 + `/draft` 链接齐全
- [ ] `/draft` 页 5 行 Tier grid + 选马顺序蛇形可视化

Also walk these auxiliary checks:

- [ ] Navbar "选马" link works from any page
- [ ] Browser back/forward through tabs preserves `?tab=` URL state
- [ ] No console errors in browser devtools at any tab
- [ ] At viewport <1024px the right rail hides cleanly; the center column reflows; no horizontal scroll

- [ ] **Step 3: Final commit (if any cleanup tweaks were made)**

If the walkthrough surfaced any small fixes, commit them as a focused follow-up:

```bash
git status -s
# if there are changes:
git add -p   # stage selectively
git commit -m "fix(hub): <description of acceptance-walkthrough fix>"
```

If nothing changed, skip this step.

---

## Out of scope (defer to later phases)

Per spec §6.5 YAGNI boundaries — the following are explicitly NOT in Phase A:

- Real Swiss standings calculation (Buchholz, RD) — needs C-phase migration 007 view
- Bracket data driven by `bracket_kind` enum — needs C-phase migration 002
- Tournament `is_current` flag — Phase A uses year-fallback heuristic in `useCurrentTournament`
- Real `tournament_player_assignment` data on `/draft` — needs C-phase migration 003
- MatchDetail page upgrades — Phase B
- Stats page upgrades — Phase D
- Frontend test framework — out of scope per spec §6.3

### Minor deviations from spec §6.2 component sediment list

- `<StagePill>` is not introduced as a separate component. Its role (labeling the round of a list of matches) is filled by the h2 stage headings in OverviewTab / GroupStageTab / BracketColumn. Re-introduce only when a row-level pill is genuinely needed.
- `<Card brand|data>` is implemented as two sister components (`Card` keeps the brand styling; `RailCard` from `RightRail.tsx` is the data-layer equivalent), not as a single component with a `variant` prop. Same expressive power, slightly different shape than the spec note.

---

## Cross-references

- **Spec:** `docs/superpowers/specs/2026-04-25-alast-review-hub-design.md` §2.1–2.7, §6.1, §6.2, §8 (A 阶段)
- **Project memory:**
  - `~/.claude/projects/-Users-brandt-alast/memory/project_alast_audience.md` — review-oriented (no live widgets)
  - `~/.claude/projects/-Users-brandt-alast/memory/project_alast_format.md` — Swiss + double-elim + 5-tier
- **Existing files referenced in plan:**
  - `frontend/src/index.css` — `@theme` block we extend in Task 1
  - `frontend/src/pages/HomePage.tsx` — full rewrite in Task 5
  - `frontend/src/components/Navbar.tsx` — add Draft link in Task 17
  - `frontend/src/components/Card.tsx`, `TeamLogo.tsx`, `Spinner.tsx`, `StatusBadge.tsx`, `TrophySymbol.tsx` — reused as-is
  - `frontend/src/api/matches.ts`, `news.ts`, `client.ts` — reused as-is
