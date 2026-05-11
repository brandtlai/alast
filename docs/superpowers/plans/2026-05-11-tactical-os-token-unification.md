# Tactical OS Token Unification + Hero Telemetry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the dual `index.css` ↔ `tokens.css` design-token systems into a single Tactical OS palette, swap the invisible dot-grid for the existing high-contrast `.ambient-grid` utility, lift `--color-fg-dim` above WCAG AA, ship a `TelemetryStrip` HUD overlay on the home hero, and add a deprecated-token guard script so the system stays unified.

**Architecture:** Token migration first (highest blast radius, do while build is fresh): rewrite the 5 files that consume deprecated tokens (`AdminImportPage`, `Scoreboard`, `RoundTimeline`, `DraftPage`, plus removing the `index.css` `@theme` block). Then promote `.ambient-grid` in `Layout.tsx`, retire `design/grid.tsx`. Tune `--color-fg-dim` in `tokens.css` with documented contrast verification. Build a small `TelemetryStrip` HUD component (snapshot of LIVE / NEXT / LAST_RESULT counts) and mount it inside the home hero's bottom band. Finally add a token-deprecation grep guard wired into a new `scripts/check-deprecated-tokens.sh` so future commits cannot reintroduce the old palette.

**Tech Stack:** React 18 + Vite 5 + Tailwind v4 (`@tailwindcss/vite`); design tokens via CSS `@theme` variables; `framer-motion` for HUD entrances; existing HUD primitives (`HudPanel`, `TacticalLabel`, `DataReadout`, `StatusDot`); `react-query` for live data; `vitest` for any unit logic. No new dependencies.

---

## File Map

**Created (this plan):**
- `frontend/src/components/hud/TelemetryStrip.tsx` — hero telemetry overlay component
- `scripts/check-deprecated-tokens.sh` — grep guard against old palette tokens

**Modified:**
- `frontend/src/pages/AdminImportPage.tsx` — migrate 5 token references
- `frontend/src/components/match/Scoreboard.tsx` — migrate 5 token references
- `frontend/src/components/match/RoundTimeline.tsx` — migrate 1 token reference
- `frontend/src/pages/DraftPage.tsx` — migrate 5 token references
- `frontend/src/index.css` — drop deprecated `@theme` block + dead utility classes
- `frontend/src/design/tokens.css` — add semantic legend + raise `--color-fg-dim` opacity
- `frontend/src/components/Layout.tsx` — swap `<GridBackground />` → `<div className="ambient-grid" />`
- `frontend/src/pages/HomePage.tsx` — mount `<TelemetryStrip />` inside hero (overlay band)

**Deleted:**
- `frontend/src/design/grid.tsx` — superseded by `.ambient-grid` utility

---

## Pre-flight

- [ ] **Step 1: Create a feature branch (recommended) or worktree**

Run from `/home/ubuntu/alast`:
```bash
git checkout -b feat/tactical-os-unify
```
Or, if using worktrees:
```bash
git worktree add ../alast-tactical-os feat/tactical-os-unify
cd ../alast-tactical-os
```
Expected: clean working tree on the new branch.

- [ ] **Step 2: Verify baseline build passes before changing anything**

Run from `frontend/`:
```bash
cd frontend && npm run build 2>&1 | tail -10
```
Expected: ends with `✓ built in <Ns>` and no errors. If this fails, stop and fix before proceeding.

---

## Phase A — Token Unification

### Task 1: Add deprecated-token guard script (red baseline)

**Files:**
- Create: `scripts/check-deprecated-tokens.sh`

- [ ] **Step 1: Write the script**

Create `scripts/check-deprecated-tokens.sh`:
```bash
#!/usr/bin/env bash
# Fails (exit 1) if any frontend source file outside index.css references a
# deprecated Tactical-OS-era token. Update the DEPRECATED list when retiring
# additional tokens.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/frontend/src"

DEPRECATED=(
  '--color-primary\b'
  '--color-foreground\b'
  '--color-background\b'
  '--color-secondary\b'
  '--color-accent\b'
  '--color-card\b'
  '--color-border\b'
  '--color-gold\b'
  '--color-gold-orange\b'
  '--color-data-surface\b'
  '--color-data-row\b'
  '--color-data-divider\b'
  '--color-data-chip\b'
  '--color-data-text-muted\b'
  '--color-neon-pink'
)

bad=0
for pat in "${DEPRECATED[@]}"; do
  hits=$(grep -RIn --include='*.ts' --include='*.tsx' --include='*.css' \
    --exclude='index.css' \
    -E "$pat" "$SRC" 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    echo "❌ deprecated token usage: $pat"
    echo "$hits"
    bad=1
  fi
done

if [[ $bad -eq 0 ]]; then
  echo "✅ no deprecated Tactical-OS tokens in frontend/src"
fi
exit $bad
```

- [ ] **Step 2: Make it executable and run to capture baseline failures**

```bash
chmod +x scripts/check-deprecated-tokens.sh
bash scripts/check-deprecated-tokens.sh
```
Expected: prints failures for `--color-primary` (Scoreboard, AdminImport), `--color-card` / `--color-border` (AdminImport), `--color-data-surface|divider|chip` (Scoreboard, RoundTimeline, DraftPage), `--color-neon-pink` (AdminImport). Exit code 1.

- [ ] **Step 3: Commit the guard script**

```bash
git add scripts/check-deprecated-tokens.sh
git commit -m "chore(frontend): add deprecated-token guard script (baseline failing)"
```

---

### Task 2: Migrate `AdminImportPage` token references

**Files:**
- Modify: `frontend/src/pages/AdminImportPage.tsx:67,79,93,100`

Token mapping for this file:
- `var(--color-card)` → `var(--color-surface)` (panel background)
- `var(--color-border)` → `var(--color-line)`
- `var(--color-primary)` (orange button) → `var(--color-data)` (Tactical OS interactive accent)
- `var(--color-neon-pink)` (warning text) → `var(--color-alert)`
- background `'rgba(255, 43, 214, 0.1)'` → `'rgba(255, 45, 45, 0.1)'`
- border `'1px solid rgba(255, 43, 214, 0.4)'` → `'1px solid rgba(255, 45, 45, 0.4)'`

- [ ] **Step 1: Open and replace the four `--color-*` references plus the two raw `rgba(255,43,214,...)` strings**

Use Edit on `frontend/src/pages/AdminImportPage.tsx`:
- replace `'var(--color-card)'` → `'var(--color-surface)'` (replace_all)
- replace `'var(--color-border)'` → `'var(--color-line)'` (replace_all)
- replace `'var(--color-primary)'` → `'var(--color-data)'` (replace_all in this file)
- replace `'var(--color-neon-pink)'` → `'var(--color-alert)'` (replace_all)
- replace `'rgba(255, 43, 214, 0.1)'` → `'rgba(255, 45, 45, 0.1)'`
- replace `'1px solid rgba(255, 43, 214, 0.4)'` → `'1px solid rgba(255, 45, 45, 0.4)'`

- [ ] **Step 2: Run guard script — AdminImport-related lines should disappear**

```bash
bash scripts/check-deprecated-tokens.sh 2>&1 | grep -i adminimport
```
Expected: no output for AdminImportPage. Other files still failing (expected).

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc -b 2>&1 | tail -5
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AdminImportPage.tsx
git commit -m "refactor(frontend): migrate AdminImportPage to Tactical OS tokens"
```

---

### Task 3: Migrate `Scoreboard` token references

**Files:**
- Modify: `frontend/src/components/match/Scoreboard.tsx:68,79,91,163,167`

Token mapping:
- `var(--color-data-surface)` → `var(--color-surface-2)`
- `var(--color-data-divider)` → `var(--color-line)`
- `var(--color-primary)` (rating ≥ 1.0 highlight color) → `var(--color-data)` (lime — semantically "good performance")

- [ ] **Step 1: Replace the references**

Use Edit on `frontend/src/components/match/Scoreboard.tsx`:
- replace `'var(--color-data-surface)'` → `'var(--color-surface-2)'` (replace_all)
- replace `'var(--color-data-divider)'` → `'var(--color-line)'` (replace_all)
- replace `'var(--color-primary)'` → `'var(--color-data)'` (replace_all in this file)

- [ ] **Step 2: Confirm via guard script**

```bash
bash scripts/check-deprecated-tokens.sh 2>&1 | grep -i scoreboard
```
Expected: no output for Scoreboard.

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc -b 2>&1 | tail -5
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/match/Scoreboard.tsx
git commit -m "refactor(frontend): migrate Scoreboard to Tactical OS tokens"
```

---

### Task 4: Migrate `RoundTimeline` token references

**Files:**
- Modify: `frontend/src/components/match/RoundTimeline.tsx:61`

- [ ] **Step 1: Replace the one line**

Use Edit on `frontend/src/components/match/RoundTimeline.tsx`:
- replace `'var(--color-data-surface)'` → `'var(--color-surface-2)'` (replace_all)
- replace `'var(--color-data-divider)'` → `'var(--color-line)'` (replace_all)

- [ ] **Step 2: Guard + type-check**

```bash
bash scripts/check-deprecated-tokens.sh 2>&1 | grep -i roundtimeline
cd frontend && npx tsc -b 2>&1 | tail -3
```
Expected: no RoundTimeline failures, no TS errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/match/RoundTimeline.tsx
git commit -m "refactor(frontend): migrate RoundTimeline to Tactical OS tokens"
```

---

### Task 5: Migrate `DraftPage` token references

**Files:**
- Modify: `frontend/src/pages/DraftPage.tsx:51,52,66,105,142`

Token mapping:
- `var(--color-data-surface)` → `var(--color-surface-2)`
- `var(--color-data-divider)` → `var(--color-line)`
- `var(--color-data-chip)` → `var(--color-surface-2)`

- [ ] **Step 1: Replace the references**

Use Edit on `frontend/src/pages/DraftPage.tsx`:
- replace `'var(--color-data-surface)'` → `'var(--color-surface-2)'` (replace_all)
- replace `'var(--color-data-divider)'` → `'var(--color-line)'` (replace_all)
- replace `'var(--color-data-chip)'` → `'var(--color-surface-2)'` (replace_all)

- [ ] **Step 2: Guard script should now pass everywhere except for `index.css` (which is intentionally excluded)**

```bash
bash scripts/check-deprecated-tokens.sh
```
Expected: `✅ no deprecated Tactical-OS tokens in frontend/src` — exit 0.

- [ ] **Step 3: Type-check + production build (sanity-check Tailwind v4 sees no missing tokens)**

```bash
cd frontend && npx tsc -b && npm run build 2>&1 | tail -10
```
Expected: `✓ built in <Ns>`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DraftPage.tsx
git commit -m "refactor(frontend): migrate DraftPage to Tactical OS tokens"
```

---

### Task 6: Drop the deprecated `@theme` block + dead utility classes from `index.css`

**Files:**
- Modify: `frontend/src/index.css:5-27` (delete `@theme` block) and `:50-91` (delete dead `.pink-gradient`, `.logo-primary`, `.stage-gradient`, `.electric-blue-accent`, `.orange-gold-glow`, `.animate-glow`, `.animate-float`, `.interactive-lift`, `.motion-safe-glow`)

Keep:
- `.gold-gradient` (used by Navbar/Footer logos)
- `.surface-sheen` (used by DraftPage + SearchDialog)
- `.ambient-grid` (will be promoted in Phase B)
- `.custom-scrollbar`
- All `@keyframes`
- `@media (prefers-reduced-motion: reduce)` block
- Body baseline + universal border-color

- [ ] **Step 1: Read the current file to confirm line numbers**

```bash
wc -l frontend/src/index.css
```

- [ ] **Step 2: Rewrite `frontend/src/index.css` with deprecated bits removed**

Use Write to replace the whole file with:
```css
@import "./design/fonts.css";
@import "./design/tokens.css";
@import "tailwindcss";

/* All design tokens live in design/tokens.css. This file owns only
   reusable utility classes and keyframes. */

body {
  background-color: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-sans);
  min-height: 100vh;
}

*, *::before, *::after {
  border-color: var(--color-line);
}

/* ── Brand ── */
.gold-gradient {
  background: var(--gold-gradient);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 3s infinite linear;
}

/* ── Atmosphere — promoted from old "ambient" layer ── */
.ambient-grid {
  background-image:
    linear-gradient(var(--color-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-grid) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at 50% 10%, black 0%, transparent 78%);
}

/* ── Hover sheen — used by interactive cards ── */
.surface-sheen {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.surface-sheen::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  background:
    radial-gradient(circle at var(--sheen-x, 18%) var(--sheen-y, 0%), rgba(255,255,255,0.10), transparent 28%),
    linear-gradient(115deg, transparent 20%, rgba(255,184,0,0.08) 48%, transparent 72%);
  transform: translateX(-10%);
  transition: opacity var(--duration-mid) var(--ease-hud), transform var(--duration-slow) var(--ease-hud);
}

.surface-sheen:hover::before {
  opacity: 1;
  transform: translateX(0);
}

/* ── Scrollbar ── */
.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.10); border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--color-data-dim); }

/* ── Keyframes ── */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 3: Remove the now-orphaned `glowPulse` export from `lib/motion.ts`**

The deleted `@keyframes glowPulseRank` in old `index.css` was referenced by an unused `glowPulse` helper. Use Edit on `frontend/src/lib/motion.ts` to delete:
```tsx
export const glowPulse = (tone: Outcome) => ({
  animation: 'glowPulseRank 6.5s ease-in-out infinite',
  ['--rank-glow' as string]: rankGlow(tone),
}) as React.CSSProperties
```
(plus its blank surrounding lines). Confirm nothing imports it:
```bash
grep -rn "glowPulse\b" frontend/src/ 2>/dev/null
```
Expected: only the `lib/motion.ts` definition appears (which you just removed) — i.e., no output after deletion.

If `rankGlow` is now unused too, leave it — it may be wired to other rank colours. Don't chase deletions.

- [ ] **Step 4: Verify guard script still passes (should — `index.css` is excluded, but old utility classes might be referenced elsewhere)**

```bash
bash scripts/check-deprecated-tokens.sh
grep -rln "interactive-lift\|electric-blue-accent\|pink-gradient\|stage-gradient\|logo-primary\|orange-gold-glow\|animate-glow\|animate-float\|motion-safe-glow\|glowPulseRank\|ambientPulse\|sparkBurst\|particleDrift\|trophyPendulum\|trophyBreath" frontend/src/ 2>/dev/null
```
Expected: guard prints ✅; second grep returns nothing.

- [ ] **Step 5: Production build to confirm Tailwind v4 + Vite still emit the bundle**

```bash
cd frontend && npm run build 2>&1 | tail -5
```
Expected: `✓ built in <Ns>`.

- [ ] **Step 6: Visual smoke-check (manual)**

Start `npm run dev` in `frontend/`, open `http://localhost:5173/`, walk:
- `/` (Home — logo gold gradient still there, navbar SECTOR lime still there)
- `/matches` and click into a match (Scoreboard rows render with new surface-2)
- `/admin/import` (panels render with new surface, button is lime)
- `/draft` (panels render)

If any panel shows transparent/black where it should be `--color-surface-2`, fix the file before committing.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/index.css frontend/src/lib/motion.ts
git commit -m "refactor(frontend): drop deprecated @theme block + dead utilities from index.css"
```

---

## Phase B — Background Atmosphere Swap

### Task 7: Promote `.ambient-grid` in Layout, retire `design/grid.tsx`

**Files:**
- Modify: `frontend/src/components/Layout.tsx`
- Delete: `frontend/src/design/grid.tsx`

- [ ] **Step 1: Edit `Layout.tsx`**

Use Edit on `frontend/src/components/Layout.tsx`:

old:
```tsx
import { Outlet } from 'react-router-dom'
import { GridBackground } from '../design/grid'
import Navbar from './Navbar'
import Footer from './Footer'
import LiveBar from './LiveBar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <GridBackground />

      <Navbar />
```

new:
```tsx
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import LiveBar from './LiveBar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <div
        aria-hidden
        className="ambient-grid fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <Navbar />
```

- [ ] **Step 2: Delete the now-unused module**

```bash
git rm frontend/src/design/grid.tsx
```

- [ ] **Step 3: Confirm no other consumers**

```bash
grep -rn "GridBackground\|design/grid" frontend/src/ 2>/dev/null
```
Expected: no output.

- [ ] **Step 4: Type-check + visual smoke-check**

```bash
cd frontend && npx tsc -b 2>&1 | tail -3
```
Then `npm run dev` and confirm the dark background now shows a faint 54px line grid that fades out toward the bottom (radial mask). It should be visible but not loud.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Layout.tsx
git commit -m "feat(frontend): promote .ambient-grid as global atmosphere, retire GridBackground"
```

---

## Phase C — Contrast Lift

### Task 8: Raise `--color-fg-dim` opacity above WCAG AA

**Files:**
- Modify: `frontend/src/design/tokens.css:18`

Current `--color-fg-dim: rgba(242,244,247,0.38)` against `#07090C` ≈ 3.6:1 (fails AA 4.5:1). Raise to `0.56` (≈ 4.7:1, AA pass).

- [ ] **Step 1: Edit `tokens.css`**

Use Edit on `frontend/src/design/tokens.css`:

old:
```css
  --color-fg-muted:    rgba(242,244,247,0.62);
  --color-fg-dim:      rgba(242,244,247,0.38);
```

new:
```css
  --color-fg-muted:    rgba(242,244,247,0.62);
  /* AA-compliant against --color-bg #07090C (≈ 4.7:1). */
  --color-fg-dim:      rgba(242,244,247,0.56);
```

- [ ] **Step 2: Verify contrast in a quick Node one-liner**

```bash
node -e "
// Channel-correct WCAG ratio for rgba(242,244,247,A) over #07090C.
const srgb = c => { const v = c/255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
const L = (r,g,b) => 0.2126*srgb(r) + 0.7152*srgb(g) + 0.0722*srgb(b);
const blend = (fg, bg, a) => Math.round(fg*a + bg*(1-a));
const A = 0.56;
const fr = blend(242, 0x07, A), fg = blend(244, 0x09, A), fb = blend(247, 0x0C, A);
const Lfg = L(fr, fg, fb), Lbg = L(0x07, 0x09, 0x0C);
const ratio = (Math.max(Lfg, Lbg) + 0.05) / (Math.min(Lfg, Lbg) + 0.05);
console.log('contrast ratio ~', ratio.toFixed(2));
"
```
Expected: ratio ≥ `4.5` (AA). If lower, bump opacity (0.60, then 0.66) until ≥ 4.5 and re-check.

- [ ] **Step 3: Visual smoke-check**

`npm run dev`, then look at:
- Navbar non-active links (still readable, not sun-bright)
- Footer copyright row
- Any "NO DATA" placeholder cells
- `⌘K` placeholder text in nav search button

Goal: noticeably more legible than before, still recognisably "secondary".

- [ ] **Step 4: Commit**

```bash
git add frontend/src/design/tokens.css
git commit -m "fix(frontend): raise --color-fg-dim opacity to meet WCAG AA"
```

---

## Phase D — Hero Telemetry Strip

### Task 9: Build `TelemetryStrip` HUD component

**Files:**
- Create: `frontend/src/components/hud/TelemetryStrip.tsx`

Renders three telemetry cells separated by mono dividers, designed to overlay the hero image's bottom band. Each cell shows a labeled value pulled from existing `useMatches` API. Uses only `--color-data` / `--color-fg-muted` / mono font — no new tokens.

- [ ] **Step 1: Write the component**

Create `frontend/src/components/hud/TelemetryStrip.tsx`:
```tsx
import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useMatches } from '../../api/matches'
import { StatusDot } from './StatusDot'
import type { Match } from '../../types'

const CELL_LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-mono-xs)',
  letterSpacing: '0.2em',
  color: 'var(--color-fg-muted)',
  textTransform: 'uppercase',
}

const CELL_VALUE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--text-mono-md)',
  color: 'var(--color-fg)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const DIVIDER: CSSProperties = {
  width: 1,
  alignSelf: 'stretch',
  background: 'var(--color-line)',
}

function pickNextUpcoming(matches: Match[]): Match | null {
  const now = Date.now()
  const upcoming = matches
    .filter(m => m.status === 'upcoming' && m.scheduled_at)
    .map(m => ({ m, t: new Date(m.scheduled_at!).getTime() }))
    .filter(({ t }) => t >= now)
    .sort((a, b) => a.t - b.t)
  return upcoming[0]?.m ?? null
}

function pickLastFinished(matches: Match[]): Match | null {
  const finished = matches
    .filter(m => m.status === 'finished')
    .slice()
    .sort((a, b) => {
      const ta = a.finished_at ? new Date(a.finished_at).getTime() : 0
      const tb = b.finished_at ? new Date(b.finished_at).getTime() : 0
      return tb - ta
    })
  return finished[0] ?? null
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '--.--'
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}.${day}`
}

function formatHm(iso: string | null | undefined): string {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function TelemetryStrip() {
  const { data: live = [] } = useMatches({ status: 'live' })
  const { data: all = [] } = useMatches({})

  const next = pickNextUpcoming(all)
  const last = pickLastFinished(all)
  const liveCount = live.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      role="region"
      aria-label="赛事遥测概览"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '14px 24px',
        background: 'rgba(7, 9, 12, 0.72)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* LIVE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StatusDot status={liveCount > 0 ? 'live' : 'completed'} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={CELL_LABEL}>LIVE</span>
          <span style={{ ...CELL_VALUE, color: liveCount > 0 ? 'var(--color-fire)' : 'var(--color-fg-muted)' }}>
            {liveCount > 0 ? `${liveCount} ONGOING` : 'STANDBY'}
          </span>
        </div>
      </div>

      <div style={DIVIDER} />

      {/* NEXT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={CELL_LABEL}>NEXT</span>
        <span style={{ ...CELL_VALUE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {next
            ? `${formatShortDate(next.scheduled_at)} ${formatHm(next.scheduled_at)} · ${next.team_a_name} vs ${next.team_b_name}`
            : '— NO UPCOMING'}
        </span>
      </div>

      <div style={DIVIDER} />

      {/* LAST RESULT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={CELL_LABEL}>LAST</span>
        <span style={{ ...CELL_VALUE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {last
            ? `${last.team_a_name} ${last.maps_won_a}-${last.maps_won_b} ${last.team_b_name}`
            : '— NO RESULT'}
        </span>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Sanity-check the StatusDot import resolves (it accepts `status: 'live' | 'upcoming' | 'completed' | 'eliminated'`, verified before plan was written)**

```bash
grep -n "export type StatusKind\|export function StatusDot" frontend/src/components/hud/StatusDot.tsx
```
Expected: prints both lines. If the prop API has drifted, update the JSX to match — do not invent props.

- [ ] **Step 3: Type-check**

```bash
cd frontend && npx tsc -b 2>&1 | tail -5
```
Expected: no errors.

- [ ] **Step 4: Commit (component standalone, not yet wired)**

```bash
git add frontend/src/components/hud/TelemetryStrip.tsx
git commit -m "feat(frontend): add TelemetryStrip HUD component for hero overlay"
```

---

### Task 10: Mount `TelemetryStrip` inside the home hero

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx:82-110` (the hero `<div>` wrapper)

Strategy: keep the static brand image; overlay the strip absolutely-positioned 32px from the bottom, max-width 980px, centred. The existing bottom gradient fade stays beneath the strip.

- [ ] **Step 1: Add the import at the top of `HomePage.tsx`**

Use Edit on `frontend/src/pages/HomePage.tsx`:

old:
```tsx
import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { DataReadout } from '../components/hud/DataReadout'
import { ScanLine } from '../components/hud/ScanLine'
import { StatusDot } from '../components/hud/StatusDot'
```

new:
```tsx
import { HudPanel } from '../components/hud/HudPanel'
import { TacticalLabel } from '../components/hud/TacticalLabel'
import { DataReadout } from '../components/hud/DataReadout'
import { ScanLine } from '../components/hud/ScanLine'
import { StatusDot } from '../components/hud/StatusDot'
import { TelemetryStrip } from '../components/hud/TelemetryStrip'
```

- [ ] **Step 2: Insert `<TelemetryStrip />` inside the hero wrapper, after the bottom gradient div**

Use Edit on `frontend/src/pages/HomePage.tsx` to add the strip just before the closing `</div>` of the hero wrapper. Find:

old:
```tsx
        {/* Subtle dark gradient at bottom for separation from page below */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 160,
          background: 'linear-gradient(180deg, transparent 0%, var(--color-bg) 100%)',
          pointerEvents: 'none',
        }} />
      </div>
```

new:
```tsx
        {/* Subtle dark gradient at bottom for separation from page below */}
        <div aria-hidden style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 160,
          background: 'linear-gradient(180deg, transparent 0%, var(--color-bg) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Hero telemetry — first-fold "the data feed is live" cue */}
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: 32,
          transform: 'translateX(-50%)',
          width: 'min(980px, calc(100% - 48px))',
          zIndex: 2,
        }}>
          <TelemetryStrip />
        </div>
      </div>
```

- [ ] **Step 3: Type-check + production build**

```bash
cd frontend && npx tsc -b && npm run build 2>&1 | tail -5
```
Expected: `✓ built`.

- [ ] **Step 4: Visual smoke-check**

`npm run dev`, open `/`. Confirm:
- Telemetry strip is visible at the bottom of the hero image, centred, with a faint blur glass background
- LIVE cell shows "STANDBY" (no live matches)
- NEXT cell shows next upcoming match with `MM.DD HH:mm · TeamA vs TeamB`
- LAST cell shows the most recent finished match with `TeamA n-m TeamB`
- Strip fades up after the page settles (≈400ms after mount)

If text overflows on narrow viewports, reduce `gap: 24` or shrink `--text-mono-md` for the values inside the component (don't change global tokens).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/HomePage.tsx
git commit -m "feat(frontend): mount TelemetryStrip on home hero (LIVE / NEXT / LAST)"
```

---

## Phase E — Semantic Color Guard + Documentation

### Task 11: Add color-semantic legend to `tokens.css` and wire guard into `npm run build`

**Files:**
- Modify: `frontend/src/design/tokens.css` (add header comment block)
- Modify: `frontend/package.json` (chain guard before build)

- [ ] **Step 1: Add legend at the top of `tokens.css`**

Use Edit on `frontend/src/design/tokens.css`:

old:
```css
/* Tactical OS design tokens — single source of truth.
   Spec: docs/superpowers/specs/2026-04-27-alast-frontend-impeccable.md §3 */
```

new:
```css
/* Tactical OS design tokens — single source of truth.
   Spec: docs/superpowers/specs/2026-04-27-alast-frontend-impeccable.md §3

   Color semantics — keep these axes clean:

     --color-data        (lime  #C7FF3D)  Data / interactive accent / "good"
     --color-data-2      (teal  #5EEAD4)  Secondary data, charts series #2
     --color-fire        (red-orange)     Heat / attack / urgent CTA
     --color-alert       (red   #FF2D2D)  Errors, destructive
     --color-gold-1..3   (gold)           Champion / MVP / trophy ONLY
                                          Do NOT use for generic accents.
     --color-fg / muted / dim             Text — fg-dim is AA-compliant
                                          but reserve for non-critical UI.

   If you need a new color, extend this block — never inline hex codes
   into pages. Run scripts/check-deprecated-tokens.sh before committing. */
```

- [ ] **Step 2: Chain the guard script before `npm run build`**

Use Edit on `frontend/package.json` to update the `build` script. Find the `"scripts"` section, change the `build` value:

old:
```json
    "build": "tsc -b && vite build",
```

new:
```json
    "build": "bash ../scripts/check-deprecated-tokens.sh && tsc -b && vite build",
```

- [ ] **Step 3: Verify chained build succeeds**

```bash
cd frontend && npm run build 2>&1 | tail -8
```
Expected: first line is `✅ no deprecated Tactical-OS tokens in frontend/src`, then `✓ built in <Ns>`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/design/tokens.css frontend/package.json
git commit -m "docs(frontend): add color-semantic legend, gate build on token guard"
```

---

## Wrap-up

- [ ] **Step 1: Run the full suite once more from scratch**

```bash
cd frontend && rm -rf dist && npm run build 2>&1 | tail -10
```
Expected: guard ✅, `✓ built in <Ns>`.

- [ ] **Step 2: Quick visual walkthrough on dev server**

Walk: `/`, `/matches`, `/matches/<some-id>`, `/news`, `/news/<some-slug>`, `/teams`, `/players`, `/stats`, `/about`, `/admin/import`, `/draft`. On each page confirm:
- No flash of unstyled content / missing background panels
- Navbar SECTOR readout still shows the right value
- No hard-pink (#FF2BD6) or pure-cyan (#00D1FF) anywhere
- Footer + dim text visibly more legible

- [ ] **Step 3: Push the branch + open a PR (optional, ask user first)**

```bash
git push -u origin feat/tactical-os-unify
gh pr create --title "Unify Tactical OS tokens + hero telemetry strip" --body "$(cat <<'EOF'
## Summary
- Collapse the dual index.css/tokens.css palettes into a single Tactical OS token set
- Promote .ambient-grid as the global atmosphere; retire invisible dot-grid
- Raise --color-fg-dim opacity to meet WCAG AA on dark background
- Add hero TelemetryStrip overlay (LIVE / NEXT / LAST) above the brand poster
- Wire scripts/check-deprecated-tokens.sh into npm run build to prevent regression

## Test plan
- [ ] npm run build passes (guard script + tsc + vite)
- [ ] Visual walkthrough across all routes — no missing surfaces, no rogue accents
- [ ] Telemetry strip on / renders LIVE/NEXT/LAST pulled from API
- [ ] Footer / nav-secondary text visibly legible
EOF
)"
```
