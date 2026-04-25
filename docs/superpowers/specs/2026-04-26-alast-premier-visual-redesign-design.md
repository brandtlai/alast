# ALAST Premier Visual Redesign — Design Spec

**Date**: 2026-04-26
**Status**: Written for user review. Brainstorm direction approved; implementation plan pending.
**Repo**: `/Users/brandt/alast`
**Scope**: Frontend visual system, page composition, interaction language, and typography.

---

## 1. Positioning

ALAST Premier 2026 should read as a premium internal tournament site for Alibaba Group and Ant Group, not as a public esports live broadcast product.

The new direction is a restrained editorial tournament archive: calm, precise, confident, and high taste. It should preserve competitive energy through structure, hierarchy, statistics, and record keeping rather than through neon, aggressive motion, or live-match urgency.

The site should feel closer to a high-end internal cultural and competitive record than to a streaming companion. The design may replace the current frontend presentation deeply; technical preservation is not a priority if the result is better.

## 2. Design Principles

1. **Restrained premium tone**
   Use dark mineral surfaces, warm gold lines, ivory text, careful spacing, and quiet composition. Avoid large neon glows, loud gradients, animated shimmer text, and excessive card lift.

2. **Japanese-influenced restraint without literal motifs**
   Do not use decorative Japanese cultural symbols. The influence should appear through balance, negative space, thin rules, calm typography, asymmetry, editorial rhythm, and material quietness.

3. **Internal prestige over invitation**
   The homepage must not feel like an invitation page. It should act as the authoritative entry to the season: tournament identity, current structure, featured content, records, and navigation into matches, teams, players, news, and stats.

4. **Data remains professional**
   Stats, match detail, player detail, and team detail must stay efficient and readable. The redesign should make data surfaces calmer and more polished, not less useful.

5. **Motion as refinement**
   Motion should support attention, not spectacle. Prefer opacity, mask reveals, line sweeps, subtle numeric transitions, and restrained hover states. Avoid bouncing, constant floating, or strong transform effects.

## 3. Typography

Typography is a core part of the redesign.

### 3.1 Font Families

- Chinese / Han characters / Japanese: **Source Han Serif** (`思源宋体`)
- English and numbers in editorial text: **Georgia**
- Component interiors, controls, labels, chips, tables, score cells, and data-heavy UI: **Fira Code**

### 3.2 CSS Strategy

Define three font tokens:

```css
--font-serif-cjk: "Source Han Serif SC", "Source Han Serif CN", "Noto Serif CJK SC", "Songti SC", serif;
--font-serif-latin: Georgia, "Times New Roman", serif;
--font-mono-ui: "Fira Code", "SFMono-Regular", Consolas, monospace;
```

Use a utility approach:

- `.font-editorial` for page titles, long-form content, hero copy, news detail, and section headings.
- `.font-latin` for English titles, season labels, and large numbers when they are editorial display elements.
- `.font-component` for buttons, nav labels, stat labels, table headers, filters, chips, badges, and compact cards.

For mixed Chinese and Latin text, set the base family to Source Han Serif and explicitly wrap or style large English/numeric display elements with Georgia where needed. Component UI uses Fira Code consistently even when it contains Chinese labels, because the user explicitly wants component interiors to use Fira Code.

## 4. Visual System

### 4.1 Palette

Replace the current high-saturation esports palette with a quieter system:

- Background: near-black ink, charcoal, and deep graphite.
- Primary accent: muted warm gold, used as line, index, and restrained emphasis.
- Text: ivory and warm gray, not pure white everywhere.
- Data accents: muted cyan or desaturated blue only where comparison benefits from a second color.
- Danger/live colors: reserved for real status states, not general decoration.

The current orange/gold identity may survive, but it should be softened. The electric cyan should be reduced heavily outside charts and comparative data.

### 4.2 Surfaces

Use fewer floating cards. Prefer full-width bands, editorial grids, thin borders, inset panels, and table-like modules. Cards remain valid for repeated items such as articles, teams, players, and match rows, but they should have smaller radii and quieter hover states.

Target surface traits:

- 1px warm translucent borders.
- Low opacity fills.
- No nested cards.
- Radius around 4-8px.
- Shadow used rarely; rely on contrast, border, and spacing.

### 4.3 Imagery and Emblems

The existing trophy symbol can remain, but as a watermark, seal, or restrained emblem. It should not dominate every page. Team logos and player avatars become important visual anchors; where missing, placeholders should be typographic and elegant rather than playful.

News pages should use real cover imagery when available. Missing image states should use editorial placeholders, not emoji.

## 5. Page Designs

### 5.1 Layout and Navigation

The global layout should feel more architectural:

- Navbar becomes quieter, with editorial brand lockup and fine active indicators.
- Remove constant ambient glow as a dominant visual. Replace with subtle page-level texture or tonal gradients.
- Main content should use consistent max width, stronger vertical rhythm, and fewer isolated card stacks.
- Footer should be understated and aligned with the premium internal-event tone.

### 5.2 Homepage

The homepage is the primary redesign surface.

It should become a premium season index:

- First viewport: ALAST Premier 2026 identity, internal tournament context, current phase, season statistics, and a refined visual module for featured match or featured story.
- Below first viewport: structured sections for stage progress, upcoming or recent matches, latest editorial content, team/player spotlights, and data focus.
- Avoid invitation language and CTA-heavy marketing composition.
- Avoid live-broadcast framing unless a status genuinely requires it.

### 5.3 Matches Page

Transform from a simple schedule list into a tournament schedule ledger:

- Group by stage and date.
- Use calm separators, compact metadata, and precise typography.
- Match rows should feel like official records.
- Status remains visible, but live status should not dominate the page.

### 5.4 Match Detail Page

Reframe as a match archive:

- Header: official result, teams, stage, BO format, date, duration.
- Map picker: restrained tabs or segmented controls.
- Scoreboard: keep data density, improve table polish.
- Round timeline and economy chart: simplify visual intensity and align chart colors to the new palette.
- Highlights: present as notable records, not video-broadcast moments unless media exists.

### 5.5 Stats Page

Keep this page data-forward, but make it feel like a precise internal report:

- Use Fira Code for filters, headers, and numeric cells.
- Summary cards become compact report metrics.
- Tables should have strong alignment, sticky readable headers where useful, and subdued row hover.
- Charts should use muted gold/cyan/gray rather than neon.

### 5.6 Team and Player Pages

These pages should become roster and profile dossiers:

- Team page: logo, name, region, roster, recent results, and optional team record summary.
- Player page: identity header, team affiliation, stat cards, radar/chart, match history.
- Replace default-looking stat cards with refined typographic panels.
- Missing avatars use initials in an editorial seal style.

### 5.7 News Pages

News should feel like an internal tournament magazine:

- News list: stronger editorial grid, featured article option, quieter categories.
- News detail: readable article width, Source Han Serif body, Georgia for English/numeric display, refined metadata.
- Remove emoji placeholders.

### 5.8 About Page

About should explain tournament background with restraint:

- Emphasize internal tournament culture, structure, rules, and record keeping.
- Avoid over-promotional copy.
- Use editorial sections and rule-like blocks rather than decorative cards.

## 6. Interaction Design

### 6.1 Motion

Use motion sparingly:

- Page entry: subtle opacity and small vertical reveal.
- Section entry: mask/clip reveal or line reveal.
- Hover: border color, slight background change, underline/line sweep.
- Press: small opacity or scale change.

Remove or reduce:

- Continuous shimmer text.
- Large floating ambient blobs.
- Strong hover lifting.
- Repeated glowing shadows.

### 6.2 Controls

Filters and tabs should use component typography and stable dimensions. Prefer segmented controls, thin-underlined tabs, and compact chips. Make active state clear through color, line, and contrast, not only filled orange pills.

### 6.3 Responsiveness

Mobile should keep the same premium tone:

- Avoid oversized hero text that crowds the viewport.
- Keep content hierarchy but reduce columns.
- Match rows and stat tables need stable, readable layouts.
- Do not let long Chinese team/player names collide with numbers or controls.

## 7. Implementation Architecture

The redesign should introduce a small visual system layer rather than rewriting every page with ad hoc styles.

Recommended additions:

- Global design tokens in `frontend/src/index.css`.
- Reusable typography utilities.
- A refined `Card` or replacement surface component.
- Page section components for editorial headers and metric panels.
- Updated motion presets in `frontend/src/lib/motion.ts`.

Potential component set:

- `EditorialHeader`
- `MetricPanel`
- `RecordRow`
- `RefinedSurface`
- `SectionLabel`
- `DataTableShell`

These should be introduced only where they reduce duplication across pages.

## 8. Testing and Verification

Frontend currently relies on build-time type checking. Verification should include:

- `cd frontend && npm run build`
- Manual viewport checks for desktop and mobile.
- Visual checks for homepage, matches, match detail, stats, team detail, player detail, news list, and news detail.
- Confirm font fallbacks work if Source Han Serif or Fira Code is unavailable locally.
- Confirm reduced-motion behavior remains acceptable.

## 9. Non-Goals

- No live broadcast dashboard.
- No streaming-first match center.
- No invitation-page concept.
- No literal Japanese decorative motifs.
- No backend schema changes.
- No admin workflow changes.
- No attempt to preserve current frontend visuals when they conflict with the new direction.

## 10. Implementation Decisions

These decisions remove ambiguity before implementation planning:

1. Do not use an external font CDN. Use CSS font stacks first, with clear `@font-face` extension points if self-hosted font files are added later.
2. Homepage should be primarily typographic, emblem-led, and content-led. It should not depend on a large photographic hero.
3. The first implementation phase should cover global visual tokens, layout/navigation, homepage, shared surfaces, and enough page-level updates to make the direction coherent across major routes.
4. Keep the current trophy symbol only as a restrained seal or watermark. If it cannot support the quieter tone, reduce its usage rather than centering it.
