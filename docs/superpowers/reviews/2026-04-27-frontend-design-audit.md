# ALAST Frontend Design Audit — Tactical OS Aesthetic

**Date:** 2026-04-27
**Scope:** redesign branch, 11 public pages + Layout shell + design system + HUD components
**Auditor:** frontend-design subagent

---

## Verdict at a glance

The redesign has a credible Tactical OS foundation — token system is solid, the HUD component kit (HudPanel, CornerBracket, TacticalLabel, DataReadout, ScanLine, StatusDot) is coherent and well-implemented, and migrated pages are broadly consistent. However, the codebase is split between cleanly migrated pages and a substantial layer of **un-migrated "old world" components** (match/*, tournament/*, SearchDialog, Spinner, TeamLogo, EconomyChart, MapPicker) that leak obsolete tokens (`--color-primary`, `--color-data-surface`, `--color-accent`, `#0A0F2D`, `#00D1FF`, etc.) into live render paths. The most urgent issue is that `src/index.css` silently overrides `body` font-family to `'Inter', system-ui` **after** the new tokens load, affecting all text not explicitly styled. The aesthetic is fighting itself on the pages where old components surface.

---

## What's working ✓

- **Design token architecture**: `frontend/src/design/tokens.css` is clean — no legacy values, semantic naming is clear and complete. The split into atmosphere / info / heat / trophy / alert layers is upheld in all newly-authored components.
- **HUD primitive kit**: The six HUD components (`HudPanel`, `CornerBracket`, `TacticalLabel`, `DataReadout`, `ScanLine`, `StatusDot`) are exceptionally well-implemented. `CornerBracket` animate-on-hover via CSS transition is exactly the right level of restraint. `DataReadout`'s per-character odometer roll is the best motion moment in the codebase.
- **LiveBar**: `LiveBar.tsx` is a standout. It correctly composes `ScanLine` + `StatusDot` + `DataReadout`, uses only design-system tokens, the pause-on-hover cycle is UX-sensible, and the overall bar feels like a genuine real-time HUD element, not a decoration.
- **Navbar SECTOR indicator**: The `SECTOR :: MATCH_LOG` contextual label is a strong brand-specific detail — it costs nothing but makes the nav feel purpose-built for this tournament. The `--color-data` lime underline using `layoutId` spring is the correct motion primitive for this use case.
- **MatchesPage grouped list**: Date-bucketed rows with left-edge hover tick marks, `DataReadout` score, and mono timestamp is dense, readable, and distinctly tactical — zero cookie-cutter card patterns.

---

## Critical issues

### 1. `index.css` body font overrides all page text to Inter/system-ui
**File:** `frontend/src/index.css:32`
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```
`Inter` is not loaded (no `@font-face` for it), so the body falls through to `system-ui`. This is the exact "generic font" anti-pattern the design system forbids. Every component that doesn't explicitly set `fontFamily` (e.g., `NewsDetailPage` body prose, `AboutPage` body paragraphs) renders in the OS system font, not Geist.
**Fix:** Change `body` font-family to `var(--font-sans)` in `index.css:32`. This is a one-line change with broad impact.

### 2. `src/lib/motion.ts` is a parallel motion system with banned patterns
**File:** `frontend/src/lib/motion.ts:7-120`
The old `lib/motion.ts` defines `pageReveal` (blur fade), `panelReveal` (scale entrance), `scoreFlip` (rotateX), `softHover`/`pressTap` (scale on hover), `rankReveal` (scale spring), `headingMask` (clipPath wipe), and `glowPulse` (CSS animation bridge). These are **6+ primitives outside the declared 5**, and several hit forbidden patterns: `scale` on hover (`softHover` line 48), `rotateX` (`scoreFlip` line 116), `blur` filter in `pageReveal` (line 8), and `scale` entrance in `rankReveal` (line 84). `MatchDetailPage.tsx` actively uses `pageReveal`, `staggerContainer`, and `fadeUp` from this file (lines 16, 482, 617, 622). `DraftPage.tsx` uses `pageReveal`, `panelReveal`, `staggerContainer`, `fadeUp`.
**Fix:** Migrate `MatchDetailPage` to use `hudEnter`/`hudStagger` from `design/motion.ts`. Delete or quarantine `src/lib/motion.ts` — it belongs to the old design system.

### 3. `EconomyChart.tsx` uses `#FF8A00` (old gold-3) and `#00D1FF` (cyan accent) as team colors
**File:** `frontend/src/components/match/EconomyChart.tsx:90-102`
```
lineStyle: { color: '#FF8A00', width: 2 }  // Team A
lineStyle: { color: '#00D1FF', width: 2 }  // Team B
```
`#FF8A00` (`--color-gold-3`) is a trophy-semantic color and should not be a data series. `#00D1FF` is the old `--color-accent` (electric blue) which has no place in Tactical OS. These colors appear on the STATS tab of every MatchDetailPage.
**Fix:** Use `var(--color-data)` (`#C7FF3D`) for Team A and `var(--color-fire)` (`#FF3D14`) for Team B — the same green/orange binary used throughout round timelines.

### 4. `RoundTimeline.tsx` uses `--color-accent` and `#FFD700` as T/CT side colors
**File:** `frontend/src/components/match/RoundTimeline.tsx:40-41`
```ts
const CT_COLOR = 'var(--color-accent)'  // → old electric blue
const T_COLOR  = '#FFD700'              // → raw gold outside trophy context
```
`--color-accent` resolves to old `#00D1FF` — not in the new token set. `#FFD700` raw hex used for a non-trophy context (T-side rounds) violates gold-reserve semantics. `RoundTimeline` is embedded in `NewsDetailPage` and surfaces this color pairing on every battle-report article page.
**Fix:** CT_COLOR → `var(--color-data-2)` (`#5EEAD4` — teal, distinct from lime), T_COLOR → `var(--color-fg)` or a warm dim. Avoid using gold for side differentiation.

### 5. `Spinner.tsx` and `TeamLogo.tsx` use `--color-primary` / `--color-secondary`
**Files:** `frontend/src/components/Spinner.tsx:6`, `frontend/src/components/TeamLogo.tsx:10`
These components appear on nearly every page (loading states, player/team tables). They reference `--color-primary` (old orange #FF8A00) and `--color-secondary` (old dark navy #0A0F2D), making loading states and fallback logo placeholders render with old-world colors.
**Fix:** `Spinner.tsx` → border `var(--color-data)`. `TeamLogo.tsx` placeholder background → `var(--color-surface-2)`, text color → `var(--color-fg-dim)`.

### 6. `PlayersPage.tsx` DraftBoard tier colors include `#00D1FF` (B tier) and hardcoded `#FFD700` (S tier)
**File:** `frontend/src/pages/PlayersPage.tsx:20-24` (TIER_META)
```ts
'S':  { accent: '#FFD700', ...}  // gold outside trophy context
'B':  { accent: '#00D1FF', ...}  // old accent, not in token set
```
The DraftBoard and SnakeOrderViz use these accent colors for tier badges on a page that's in the migrated set. S-tier uses raw gold as a generic ranking accent (not trophy/champion use), and B-tier uses the banned cyan accent.
**Fix:** Map tiers to system tokens: S→`--color-data` (lime, elite), A→`--color-fg` (neutral bright), B→`--color-fg-muted`, C+→`--color-fg-dim`, D→`--color-fire` (bottom risk). Reserve gold strictly for `is_champion`. `DraftPage.tsx:10-14` has the identical problem.

---

## Important issues

### 7. `MapPicker.tsx` uses `--color-primary` as selected state background
**File:** `frontend/src/components/match/MapPicker.tsx:23-25`
`background: selected ? 'var(--color-primary)' : 'var(--color-data-chip)'` — `--color-primary` is the old orange, and `--color-data-chip` has no equivalent in new tokens. Map chip selector uses wrong palette on MatchDetailPage and NewsDetailPage.
**Fix:** Selected → `var(--color-data)` border + transparent bg (match the pill pattern used on MatchesPage), unselected → `var(--color-surface-2)` bg.

### 8. Gold used for Standings #1 rank border in HomePage is correct in intent but citation is missing
**File:** `frontend/src/pages/HomePage.tsx:406`
```ts
borderLeft: idx === 0 ? '2px solid var(--color-gold-2)' : '2px solid transparent'
```
This is actually a valid trophy context (rank 1 = champion position). However, the `StatsPage.tsx:61` TIER_COLORS map assigns `--color-gold-1` to the S tier (best players) — this reads as "gold for best," not specifically "gold for champion/MVP," which is a semantic stretch. Fine for S-tier leaderboard leaders as they are implicitly MVP-adjacent, but watch this precedent.

### 9. `MatchesPage.tsx` h1 has `fontWeight: 700` but Anton has only 400 weight loaded
**File:** `frontend/src/pages/MatchesPage.tsx:243`
Anton is defined only at `font-weight: 400` in `fonts.css:37-41`. Specifying `fontWeight: 700` on a `--font-display` element causes faux-bold, which degrades the geometric integrity of Anton glyphs. Same pattern in `AboutPage.tsx` and several other h1 uses that mix `fontWeight` with `--font-display`.
**Fix:** Remove `fontWeight` from any element using `--font-display`. Anton's weight has been pre-selected; let it be.

### 10. `AboutPage.tsx` section `h2` elements apply `letterSpacing: '0.2em'` to mixed CN/Latin headings
**File:** `frontend/src/pages/AboutPage.tsx:47, 76, 123`
The spec requires no letter-spacing on CN text. `letterSpacing: '0.2em'` is set globally on these h2s that include CN strings like "赛事规格". CN characters get the same tracking as Latin, which distorts them visually.
**Fix:** Only apply `letterSpacing` when the heading is guaranteed ASCII/Latin. For mixed or CN headings, omit or use `0` tracking.

### 11. `StatsPage.tsx` leaderboard avatar uses `borderRadius: '50%'` (circular)
**File:** `frontend/src/pages/StatsPage.tsx:414`
```ts
borderRadius: '50%'
```
This is an inconsistency: all other avatar/thumbnail elements in the migrated pages use `var(--radius-sm)` (2px square). Circular avatars evoke a social-media aesthetic that conflicts with the HUD's industrial-square grid. This file escaped the radius audit.
**Fix:** Change to `borderRadius: 'var(--radius-sm)'` to match.

### 12. Motion proliferation in un-migrated components — `lib/motion.ts` scale animations active in render
`softHover` (scale 1.01) is defined in `lib/motion.ts` as a motion preset, `pressTap` (scale 0.985) similarly. `SearchDialog.tsx:79` applies `scale: 0.985` on both enter and exit. These are scale animations in active render paths, violating the "no scale on hover" rule.

---

## Minor issues / polish

### 13. `Navbar.tsx` search button uses `whileHover={{ scale: 1.04 }}` and `whileTap={{ scale: 0.96 }}`
**File:** `frontend/src/components/Navbar.tsx:173-174, 242-243`
The spec forbids scale on hover. The ⌘K button and hamburger both scale. Replace with border-color transition to `--color-data` (same pattern as CornerBracket activate).

### 14. `EconomyChart.tsx` background hardcoded `#0A0F2D` (old navy)
**File:** `frontend/src/components/match/EconomyChart.tsx:46`
`backgroundColor: '#0A0F2D'` — this is the old `--color-secondary` dark navy, predating Tactical OS. The chart background should use `transparent` or `var(--color-surface)`.

### 15. `ErrorBox.tsx` uses raw hex `#FF6B6B` and unstyled `rounded-lg`
**File:** `frontend/src/components/ErrorBox.tsx:3`
`color: '#FF6B6B'` is not a system token (should be `var(--color-alert)`). `rounded-lg` is a banned radius class. Error boxes appear as loading-state fallbacks across all pages.

### 16. `GridBackground` dot size: 1px dot on 24px grid may be invisible at typical DPR
**File:** `frontend/src/design/grid.tsx:9`
`radial-gradient(var(--color-grid) 1px, transparent 1px)` — at 1x DPR the dot grid reads clearly; at Retina (2x) sub-pixel rounding can make 1px dots render at 0.5px effective, becoming invisible. Consider `1.5px` for better cross-DPR visibility. This is the only background texture — its invisibility would leave pages feeling flat over solid black.

### 17. `TournamentHubHero.tsx` uses `.gold-gradient` class from old CSS
**File:** `frontend/src/components/tournament/TournamentHubHero.tsx:64`
```tsx
<span className="gold-gradient">PREMIER 2026</span>
```
The `.gold-gradient` class is defined in `index.css` with the shimmer animation. This component is in the un-migrated tournament tree, but `gold-gradient` is technically a trophy-context use (PREMIER branding), so this is borderline acceptable. However the shimmer `animation: shimmer 3s infinite linear` is an `index.css` pattern that the new design system doesn't authorize.

---

## By the 7 lenses

### Typography

Strong overall. `--font-display` (Anton) is consistently used for team names, headings, match scores — display contexts only. `--font-mono` (JetBrains Mono) carries all data labels, timestamps, tactical markers. `--font-serif` (Georgia/Noto Serif SC) appears correctly in NewsPage article titles and NewsCard headings — good editorial vs. data separation.

Issues: (a) `fontWeight: 700` on Anton elements in `MatchesPage.tsx:243`, `AboutPage.tsx:42`, causing faux-bold rendering; Anton has only weight 400. (b) `letterSpacing: '0.2em'` applied to CN headings in `AboutPage.tsx` — violates "no tracking on CN" rule. (c) `AboutPage.tsx` body paragraphs have no explicit `fontFamily`, so they fall through to the `index.css` `body` override — they render in `system-ui`, not Geist. (d) The `--font-display` size on `HomePage.tsx` match hero — `var(--text-display-xl)` clamp(48px–128px) is appropriately theatrical. (e) Numerals in tables consistently use `fontVariantNumeric: 'tabular-nums'` — well-executed.

### Color discipline

The 4-layer semantic system is respected in all migrated pages. Atmosphere tokens (bg, surface, surface-2, line) are used consistently. `--color-data` lime green is correctly deployed for data, wins, active filters, and HUD info. `--color-alert` is exclusively used for LIVE pulse. `--color-fire` is mostly correct — used for loss state and combat actions — but `StatsPage.tsx:65` assigns it to "D tier" (weakest players) which is a generic-ranking use, not a combat action. The "CTA to match" button in `HomePage.tsx:193-201` uses fire orange, which is the right call (go watch the combat action).

Leakage: `--color-primary` leaks from `Spinner.tsx:6`, `TeamLogo.tsx:10`, `Scoreboard.tsx:163`, `HighlightCards.tsx:52,90`, `MapPicker.tsx:23`, `BracketColumn.tsx:19`, `AdminImportPage.tsx:93`. `--color-accent` leaks from `RoundTimeline.tsx:40`. `--color-data-surface`/`--color-data-divider` leak throughout `match/*` and `tournament/*` components. Raw hex `#0A0F2D` (old navy), `#00D1FF` (old cyan), and `#FFD700` (gold outside trophy) appear in EconomyChart, RoundTimeline, TierChart, AmbientParticles, and PlayersPage/DraftPage tier configs.

Gold discipline: Gold is correctly used for champion border in `TeamsPage.tsx:101`, standings rank-1 row in `HomePage.tsx:406`, and championship list in `TeamDetailPage.tsx:460-475`. The Navbar and Footer ALAST wordmark use `--gold-gradient` — this is arguably brand identity use, not trophy overreach, though the brief says gold only for trophy/champion/MVP. ALAST-wordmark-in-gold is probably fine as the brand mark itself is a gold trophy.

### Motion

The 5 declared primitives (hudEnter, hudStagger, scanLine, statusPulse, cornerActivate) are cleanly implemented and well-applied. `DataReadout` odometer roll is a custom but thematically appropriate animation that lives within the system spirit.

Violations: (a) `src/lib/motion.ts` is an active parallel system with `pageReveal` (blur filter), `scoreFlip` (rotateX 3D), `softHover` (scale 1.01), `pressTap` (scale 0.985), `rankReveal` (spring scale), `headingMask` (clipPath wipe) — at least 4 of these hit forbidden patterns. `MatchDetailPage.tsx` and `DraftPage.tsx` actively consume this file. (b) `Navbar.tsx` `whileHover={{ scale: 1.04 }}` on search button and hamburger. (c) `SearchDialog.tsx:79` uses `scale: 0.985` and `filter: 'blur(8px)'` on dialog entrance. (d) `trophyPendulum` keyframe in `index.css:188-190` defines a `rotate(7deg)` decoration animation (forbidden pattern). (e) `ambientPulse` keyframe uses `scale(1.04)` — forbidden animated scale. These keyframes are defined but may not be actively applied to visible elements on migrated pages; they survive in the stylesheet.

Entrance staggers are deployed at appropriate moments: `TeamsPage` grid, `PlayersPage` table rows, `StandingsAndRecent` on HomePage. Not scattered too thin or too thick.

### Spatial composition

The pages show meaningful variety:
- **HomePage**: Full-bleed 85vh hero image → constrained 1280px featured match panel → 1680px standings grid → 1280px KPI quad → 1280px news strip. The widths vary with intent and the vertical rhythm (96px gaps) breathes well.
- **MatchDetailPage**: 1200px max-width with centered 3-column score grid and tab navigation is appropriate and earned.
- **MatchesPage**: 960px max-width intentionally narrow for the list format — right call for scan-ability.
- **TeamDetailPage**: 320px logo column + 1fr meta is a strong asymmetric layout. The three-column body (280px meta sidebar | 1fr roster center | 280px matches right) uses the available width purposefully.

Weakness: The KPI quad on `HomePage.tsx` (4 identical `KpiPanel` cards) is the most default-symmetric pattern in the codebase. Four equal-width HudPanel cards with single-value readouts feel generic. The `StandingsAndRecent` 50/50 grid immediately above is more interesting by comparison.

HUD element pacing is well-controlled. `TacticalLabel` appears as a section initiator (not decoration), `ScanLine` only on live match cards, `CornerBracket` on all HudPanels (hover-activated), `StatusDot` only on live/upcoming indicators. The density feels tactical rather than noisy.

### Backgrounds & textures

The `GridBackground` (24px dot grid, `rgba(255,255,255,0.025)`) is the sole texture layer. At 2.5% opacity it reads as deliberate at 1x DPR but risks invisibility at Retina. There is no other atmospheric depth — no vignette, no concentric radar circles, no subtle grain. The result is that the bg can feel like "transparent over solid black" on page sections with no HudPanel surfaces, particularly `AboutPage` body text sections and the `NewsDetailPage` article body.

This is not a catastrophic problem — the Tactical OS spec doesn't mandate noise/grain — but the absence of any secondary atmospheric layer leaves the design a single texture short of feeling fully realized. A subtle radial vignette in the hero area of `AboutPage`, or a radar concentric ring SVG behind the `StandingsAndRecent` section, would add depth without crossing into decoration.

### Brand identity

`/trophy.png` appears at four touchpoints: Navbar logo (24px, gold drop-shadow), Footer logo (18px), `HudPanel watermark` (96px, 4% opacity, grayscale+brighten), and `TeamsPage` champion card (28px, 85% opacity, gold glow). This is a credible recurring touchpoint — present but not overused. The watermark usage in `HudPanel` is genuinely elegant.

`/images/alast-hero.png` is the best asset integration: full-bleed 85vh with only a bottom fade-to-bg gradient, no overlay text competing with the key visual. It earns its weight.

`/images/alast-premier.jpeg` in `AboutPage.tsx` has a more complex overlay: gradient from transparent to 45% to full `--color-bg`, with TacticalLabel and h1 overlaid at `bottom: 32`. The overlay text treatment is well-executed.

The gold ALAST wordmark in Navbar and Footer uses `var(--gold-gradient)` via inline style — consistent with the brand-mark exception (this IS the trophy mark). No issues.

### Anti-patterns / AI-slop check

- **Generic font**: `index.css` body font is `Inter, system-ui` — the canonical AI-slop default. Partially mitigated because migrated components explicitly set `fontFamily`, but body text falls through.
- **Predictable layout**: KPI quad (4× equal HudPanel) is the closest thing to a default pattern. All other pages avoid the 3-column-card-grid-on-white paradigm.
- **Cookie-cutter cards**: HudPanel is the only card primitive — but it's used at enough size and density variation (from the 96px watermark version to the 320px logo container in TeamDetail) that it doesn't feel monotonous. The table-based layouts on PlayersPage and StatsPage provide real contrast.
- **Generic UI**: The `SECTOR :: MATCH_LOG` / `OPERATIVE :: ${id}` pattern, the T-countdown format, the `RD 00` round label, and the `→` arrow link glyph all read as purpose-built for this tournament. No Dribbble-style dashboard vibes.
- **Missing context-specific character**: AboutPage body prose sections have no tactical dressing — no side labels, no HudPanel wrapping. Three walls of Geist-body text feel removed from the Tactical OS context. A `TacticalLabel` separator between sections or a side-rail spec panel would tie it in.

---

## Recommended next steps (in order)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | Fix `index.css:32` body font to `var(--font-sans)` — single line, prevents every unmigrated text element rendering in system-ui | S | ★★★ |
| 2 | Migrate `MatchDetailPage.tsx` off `src/lib/motion.ts` to `hudEnter`/`hudStagger`; add `blur` filter on `pageReveal` as a distinct violation to fix | M | ★★★ |
| 3 | Migrate `Spinner.tsx`, `TeamLogo.tsx`, `ErrorBox.tsx` to new tokens — these appear on nearly every page during loading states | S | ★★★ |
| 4 | Fix `EconomyChart.tsx` team colors (#FF8A00, #00D1FF) → `--color-data` / `--color-fire`; fix background `#0A0F2D` → transparent | S | ★★ |
| 5 | Fix `RoundTimeline.tsx` CT/T side colors (`--color-accent`, `#FFD700`) → `--color-data-2` / `--color-fg` | S | ★★ |
| 6 | Fix `MapPicker.tsx` selected state from `--color-primary` to the standard pill pattern (`--color-data` border, transparent bg) | S | ★★ |
| 7 | Fix tier color palette in `PlayersPage.tsx:20-24` and `DraftPage.tsx:10-14` — replace `#FFD700` S-tier and `#00D1FF` B-tier with system tokens | S | ★★ |
| 8 | Remove `fontWeight: 700` from all `--font-display` elements (Anton has no 700 weight — faux-bold is degrading glyph quality on page headers across Matches, About, Teams, Players) | S | ★ |
| 9 | Fix CN-text `letterSpacing` in `AboutPage.tsx` h2 headings (lines 47, 76, 123) — remove tracking from mixed CN/Latin headings | S | ★ |
| 10 | Add a second atmospheric layer to `AboutPage` and `NewsDetailPage` — a subtle radial glow behind the hero, or `HudPanel`-wrapped spec sections in About, to tie prose into the Tactical OS world | M | ★ |
