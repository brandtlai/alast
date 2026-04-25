# Phase B: MatchDetail L2 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the MatchDetail page from a basic scoreboard to a full L2 review experience — Map Picker, rich Scoreboard with MVP/SUB badges, Round Timeline with hover tooltips, Economy Chart (ECharts dual-line), and Highlight Cards.

**Architecture:** Five new focused components under `frontend/src/components/match/`. The `MatchDetailPage` is rewritten to hold `selectedMapId` state and fan-out five independent react-query fetches per selected map. All backend endpoints already exist from Phase C. The frontend is pure TypeScript + React — no backend changes.

**Tech Stack:** React 18, @tanstack/react-query v5, echarts + echarts-for-react (already installed), Tailwind v4 CSS variables, TypeScript, Vite. Verification is `npm run build` (tsc + vite); there is no vitest setup on the frontend.

---

## File Structure

| Path | Action | Purpose |
|------|--------|---------|
| `frontend/src/types.ts` | Modify | Add `MapStatPlayer`, `MatchRound`, `EconomyRound`, `MatchHighlights` |
| `frontend/src/api/matches.ts` | Modify | Add `useMatchMaps`, `useMapStats`, `useMapRounds`, `useMapEconomy`, `useMapHighlights` |
| `frontend/src/components/match/MapPicker.tsx` | Create | Horizontal chip selector for maps |
| `frontend/src/components/match/Scoreboard.tsx` | Create | 10-row player table with MVP badge + half-time divider |
| `frontend/src/components/match/RoundTimeline.tsx` | Create | 24-cell bar with hover tooltip |
| `frontend/src/components/match/EconomyChart.tsx` | Create | ECharts dual-line + bar sub-chart |
| `frontend/src/components/match/HighlightCards.tsx` | Create | Clutches + Top Frags cards |
| `frontend/src/pages/MatchDetailPage.tsx` | Modify | Full rewrite — wire all 5 components |

---

### Task 1: Types + API hooks for Phase B

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/matches.ts`

- [ ] **Step 1: Add new types to types.ts**

Read `frontend/src/types.ts` first. Append the following after the existing `TierComparison` interface and before `SearchResults`:

```typescript
// ── Phase B: MatchDetail rich types ──────────────────────────────────────────

export interface MapStatPlayer {
  id: string
  player_id: string
  team_id: string | null
  nickname: string
  avatar_url: string | null
  steam_id: string | null
  team_name: string | null
  team_logo_url: string | null
  kills: number | null
  deaths: number | null
  assists: number | null
  headshots: number | null
  headshot_pct: number | null
  adr: number | null
  kast: number | null
  rating: number | null
  first_kills: number | null
  first_deaths: number | null
  clutches_won: number | null
  clutches_played: number | null
  is_sub: boolean
}

export interface MatchRound {
  id: string
  match_map_id: string
  round_number: number
  winner_side: number | null    // 2=T, 3=CT
  winner_team_id: string | null
  end_reason: number | null     // 1=TargetBombed 7=TerroristWin 8=CTWin 9=BombDefused 12=TargetSaved
  duration_ms: number | null
  team_a_side: number | null
  team_b_side: number | null
  team_a_score: number | null
  team_b_score: number | null
  team_a_economy_type: string | null
  team_b_economy_type: string | null
  team_a_money_spent: number | null
  team_b_money_spent: number | null
  team_a_equipment_value: number | null
  team_b_equipment_value: number | null
  start_tick: number | null
  end_tick: number | null
  kills: Array<{
    weapon_name: string | null
    is_headshot: boolean
    killer_player_id: string | null
    victim_player_id: string | null
    tick: number | null
  }> | null
}

export interface EconomyRound {
  round_number: number
  team_a_side: number | null
  team_b_side: number | null
  team_a_economy_type: string | null
  team_b_economy_type: string | null
  team_a_money_spent: number | null
  team_b_money_spent: number | null
  team_a_equipment_value: number | null
  team_b_equipment_value: number | null
  winner_side: number | null
  end_reason: number | null
}

export interface MatchHighlights {
  clutches: Array<{
    round_number: number
    opponent_count: number
    won: boolean
    kill_count: number
    has_survived: boolean
    nickname: string | null
    avatar_url: string | null
  }>
  top_players: Array<{
    nickname: string
    avatar_url: string | null
    rating: number | null
    kills: number | null
    deaths: number | null
    adr: number | null
  }>
}
```

- [ ] **Step 2: Add hooks to api/matches.ts**

Read `frontend/src/api/matches.ts` first. Append the following (note: `useQuery` and `apiFetch` are already imported; `MatchMap` is already in types):

```typescript
import type { MapStatPlayer, MatchRound, EconomyRound, MatchHighlights } from '../types'

export function useMatchMaps(matchId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps'],
    queryFn: () => apiFetch<MatchMap[]>(`/api/matches/${matchId}/maps`),
    enabled: !!matchId,
  })
}

export function useMapStats(matchId: string | undefined, mapId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps', mapId, 'stats'],
    queryFn: () => apiFetch<MapStatPlayer[]>(`/api/matches/${matchId}/maps/${mapId}/stats`),
    enabled: !!matchId && !!mapId,
  })
}

export function useMapRounds(matchId: string | undefined, mapId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps', mapId, 'rounds'],
    queryFn: () => apiFetch<MatchRound[]>(`/api/matches/${matchId}/maps/${mapId}/rounds`),
    enabled: !!matchId && !!mapId,
  })
}

export function useMapEconomy(matchId: string | undefined, mapId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps', mapId, 'economy'],
    queryFn: () => apiFetch<EconomyRound[]>(`/api/matches/${matchId}/maps/${mapId}/economy`),
    enabled: !!matchId && !!mapId,
  })
}

export function useMapHighlights(matchId: string | undefined, mapId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'maps', mapId, 'highlights'],
    queryFn: () => apiFetch<MatchHighlights>(`/api/matches/${matchId}/maps/${mapId}/highlights`),
    enabled: !!matchId && !!mapId,
  })
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: 0 TypeScript errors, Vite bundle succeeds (bundle-size warnings OK).

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/api/matches.ts
git commit -m "feat(frontend): Phase B types + API hooks (MapStatPlayer, MatchRound, EconomyRound, MatchHighlights)"
```

---

### Task 2: MapPicker component

**Files:**
- Create: `frontend/src/components/match/MapPicker.tsx`

- [ ] **Step 1: Write MapPicker.tsx**

```tsx
// frontend/src/components/match/MapPicker.tsx
import type { MatchMap } from '../../types'

interface Props {
  maps: MatchMap[]
  selectedId: string
  onSelect: (id: string) => void
}

export default function MapPicker({ maps, selectedId, onSelect }: Props) {
  if (maps.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap">
      {maps.map((m, i) => {
        const hasScore = m.score_a !== null && m.score_b !== null
        const selected = m.id === selectedId
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className="px-4 py-2 rounded-md text-sm font-black transition-all"
            style={{
              background: selected ? 'var(--color-primary)' : 'var(--color-data-chip)',
              color: selected ? '#fff' : 'var(--color-data-text-muted)',
              border: `1px solid ${selected ? 'transparent' : 'var(--color-data-divider)'}`,
            }}
          >
            <span className="uppercase tracking-wide text-xs opacity-70 mr-1.5">MAP {i + 1}</span>
            {m.map_name.replace('de_', '')}
            {hasScore && (
              <span className="ml-2 tabular-nums font-mono text-xs" style={{ color: selected ? '#fff' : 'var(--color-data-text-muted)' }}>
                {m.score_a}–{m.score_b}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/match/MapPicker.tsx
git commit -m "feat(frontend): MapPicker chip bar component"
```

---

### Task 3: Scoreboard component

**Files:**
- Create: `frontend/src/components/match/Scoreboard.tsx`

The component splits players into team A / team B by `team_id`, shows a half-time score divider between the two groups (derived from rounds data — the last round at `team_a_score + team_b_score <= 12` boundary). MVP badge = highest rating on the map overall. SUB badge = `is_sub === true`.

- [ ] **Step 1: Write Scoreboard.tsx**

```tsx
// frontend/src/components/match/Scoreboard.tsx
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { MapStatPlayer, MatchRound } from '../../types'

interface Props {
  players: MapStatPlayer[]
  teamAId: string | null
  teamBId: string | null
  teamAName: string
  teamBName: string
  rounds?: MatchRound[]
}

function fmt(v: number | null, decimals = 0): string {
  if (v == null) return '—'
  return decimals > 0 ? v.toFixed(decimals) : String(v)
}

export default function Scoreboard({ players, teamAId, teamBId, teamAName, teamBName, rounds }: Props) {
  const teamA = useMemo(() =>
    players.filter(p => p.team_id === teamAId).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [players, teamAId]
  )
  const teamB = useMemo(() =>
    players.filter(p => p.team_id === teamBId).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [players, teamBId]
  )

  // Find MVP = highest rating overall
  const mvpId = useMemo(() => {
    let best: MapStatPlayer | null = null
    for (const p of players) {
      if (best == null || (p.rating ?? 0) > (best.rating ?? 0)) best = p
    }
    return best?.player_id ?? null
  }, [players])

  // Compute half-time: find the round where score changes from 12-total to 13-total (switch sides)
  const halfScore = useMemo(() => {
    if (!rounds || rounds.length === 0) return null
    const halfRound = rounds.find(r =>
      r.team_a_score !== null && r.team_b_score !== null &&
      r.team_a_score + r.team_b_score === 12
    )
    if (!halfRound) return null
    return { a: halfRound.team_a_score!, b: halfRound.team_b_score! }
  }, [rounds])

  if (players.length === 0) {
    return (
      <div className="rounded-md border py-8 text-center text-sm text-white/40"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        详细数据待 CSDM 解析后导入
      </div>
    )
  }

  const COL_HEADERS = ['Player', 'K', 'D', 'A', '+/−', 'HS%', 'KAST', 'ADR', 'Rating'] as const

  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
            {COL_HEADERS.map(h => (
              <th key={h}
                  className={`py-2 px-2 font-black uppercase tracking-widest text-[10px] text-white/40 ${h === 'Player' ? 'text-left pl-4' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Team A rows */}
          {teamA.map(p => <PlayerRow key={p.player_id} player={p} isMvp={p.player_id === mvpId} />)}

          {/* Half-time divider */}
          <tr style={{ background: 'var(--color-data-divider)' }}>
            <td colSpan={9} className="py-1 px-4 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                {teamAName}
                {halfScore && (
                  <span className="ml-2 tabular-nums">
                    {halfScore.a} – {halfScore.b}
                  </span>
                )}
                {' '}→{' '}
                {halfScore && (
                  <span className="tabular-nums mr-2">
                    {halfScore.b} – {halfScore.a}
                  </span>
                )}
                {teamBName}
              </span>
            </td>
          </tr>

          {/* Team B rows */}
          {teamB.map(p => <PlayerRow key={p.player_id} player={p} isMvp={p.player_id === mvpId} />)}
        </tbody>
      </table>
    </div>
  )
}

function PlayerRow({ player: p, isMvp }: { player: MapStatPlayer; isMvp: boolean }) {
  const kd = (p.kills ?? 0) - (p.deaths ?? 0)
  const ratingColor = (p.rating ?? 0) >= 1.0 ? 'var(--color-primary)' : 'rgba(255,255,255,0.6)'

  return (
    <tr className="border-b transition-colors hover:bg-white/[0.02] cursor-pointer"
        style={{ borderColor: 'var(--color-data-divider)' }}>
      <td className="py-2 pl-4 pr-2">
        <Link to={`/players/${p.player_id}`} className="flex items-center gap-2 group">
          <div className="w-6 h-6 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
            {p.avatar_url
              ? <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-white/40">
                  {p.nickname[0]}
                </div>}
          </div>
          <span className="font-bold text-white/90 group-hover:text-primary transition-colors truncate max-w-[120px]">
            {p.nickname}
          </span>
          {isMvp && (
            <span className="text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded flex-shrink-0"
                  style={{ background: 'var(--color-gold)22', color: 'var(--color-gold)' }}>MVP</span>
          )}
          {p.is_sub && (
            <span className="text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded flex-shrink-0"
                  style={{ background: '#ffffff15', color: 'rgba(255,255,255,0.5)' }}>SUB</span>
          )}
        </Link>
      </td>
      <td className="py-2 px-2 text-right tabular-nums text-white/85">{fmt(p.kills)}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/50">{fmt(p.deaths)}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/60">{fmt(p.assists)}</td>
      <td className="py-2 px-2 text-right tabular-nums" style={{ color: kd >= 0 ? 'var(--color-primary)' : 'rgba(255,255,255,0.4)' }}>
        {kd > 0 ? `+${kd}` : kd}
      </td>
      <td className="py-2 px-2 text-right tabular-nums text-white/60">{fmt(p.headshot_pct, 0)}{p.headshot_pct != null ? '%' : ''}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/60">{fmt(p.kast, 1)}{p.kast != null ? '%' : ''}</td>
      <td className="py-2 px-2 text-right tabular-nums text-white/70">{fmt(p.adr, 1)}</td>
      <td className="py-2 px-2 text-right tabular-nums font-black" style={{ color: ratingColor }}>
        {fmt(p.rating, 2)}
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/match/Scoreboard.tsx
git commit -m "feat(frontend): Scoreboard component — 10-row table with MVP/SUB badges and half-time divider"
```

---

### Task 4: RoundTimeline component

**Files:**
- Create: `frontend/src/components/match/RoundTimeline.tsx`

Each cell represents one round. Color = CT (accent blue, side 3) or T (gold, side 2) winner. End-reason emoji: `💣` (TargetBombed=1), `✂️` (BombDefused=9), `💀` (T/CT kill=7/8), `⏱` (TargetSaved=12). Hover shows a mini-card with score change, econ types, and up to 5 kills.

- [ ] **Step 1: Write RoundTimeline.tsx**

```tsx
// frontend/src/components/match/RoundTimeline.tsx
import { useState } from 'react'
import type { MatchRound } from '../../types'

const END_REASON_EMOJI: Record<number, string> = {
  1: '💣',   // TargetBombed (bomb exploded)
  7: '💀',   // TerroristWin (last kill)
  8: '💀',   // CTWin (last kill)
  9: '✂️',   // BombDefused
  12: '⏱',  // TargetSaved (time ran out)
}

interface Props {
  rounds: MatchRound[]
  teamAName: string
  teamBName: string
}

export default function RoundTimeline({ rounds, teamAName, teamBName }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (rounds.length === 0) {
    return (
      <div className="rounded-md border py-6 text-center text-xs text-white/30"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        回合数据待导入
      </div>
    )
  }

  return (
    <div className="rounded-md border p-4 overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Round Timeline</p>
      <div className="relative flex gap-0.5 flex-wrap">
        {rounds.map((r, idx) => {
          const isHalf = idx === 11 // halftime gap after round 12
          const ctWon = r.winner_side === 3
          const tWon = r.winner_side === 2
          const bgColor = ctWon
            ? 'var(--color-accent)'
            : tWon
              ? '#FFD700'
              : 'rgba(255,255,255,0.1)'
          const emoji = r.end_reason != null ? (END_REASON_EMOJI[r.end_reason] ?? '•') : '•'

          return (
            <div key={r.id} className="relative">
              {isHalf && <div className="inline-block w-3" />}
              <div
                className="relative w-7 h-9 flex flex-col items-center justify-center rounded-sm cursor-default select-none transition-transform hover:scale-110"
                style={{ background: bgColor + (hoveredIdx === idx ? 'ff' : '99') }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <span className="text-[8px] font-black tabular-nums text-white/80">{r.round_number}</span>
                <span className="text-[10px] leading-none">{emoji}</span>

                {/* Hover tooltip */}
                {hoveredIdx === idx && (
                  <div
                    className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 rounded-md border p-3 shadow-xl pointer-events-none"
                    style={{ background: '#0A0F2D', borderColor: 'var(--color-data-divider)' }}
                  >
                    <div className="text-[10px] font-black text-white/50 mb-2 uppercase tracking-widest">
                      Round {r.round_number}
                    </div>
                    <div className="text-xs font-bold tabular-nums text-white/90 mb-1">
                      {r.team_a_score ?? 0} – {r.team_b_score ?? 0}
                    </div>
                    {(r.team_a_economy_type || r.team_b_economy_type) && (
                      <div className="text-[10px] text-white/40 mb-2">
                        {teamAName}: {r.team_a_economy_type ?? '—'} · {teamBName}: {r.team_b_economy_type ?? '—'}
                      </div>
                    )}
                    {r.duration_ms != null && (
                      <div className="text-[10px] text-white/35 mb-2">
                        {(r.duration_ms / 1000).toFixed(1)}s
                      </div>
                    )}
                    {r.kills && r.kills.length > 0 && (
                      <div className="space-y-0.5">
                        {r.kills.slice(0, 5).map((k, ki) => (
                          <div key={ki} className="text-[10px] text-white/55 truncate">
                            {k.weapon_name ?? '?'}{k.is_headshot ? ' HS' : ''}
                          </div>
                        ))}
                        {r.kills.length > 5 && (
                          <div className="text-[10px] text-white/30">+{r.kills.length - 5} more</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'var(--color-accent)' }} />
          CT Win
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#FFD700' }} />
          T Win
        </span>
        <span className="ml-auto">💣=Bomb &nbsp; ✂️=Defuse &nbsp; 💀=Frag &nbsp; ⏱=Time</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/match/RoundTimeline.tsx
git commit -m "feat(frontend): RoundTimeline component — 24-cell bar with hover mini-card"
```

---

### Task 5: EconomyChart component

**Files:**
- Create: `frontend/src/components/match/EconomyChart.tsx`

Dual-line ECharts: upper chart = equipment value per team per round, lower chart = money spent comparison (grouped bars). Background bands colored by round winner side.

- [ ] **Step 1: Write EconomyChart.tsx**

```tsx
// frontend/src/components/match/EconomyChart.tsx
import ReactECharts from 'echarts-for-react'
import type { EconomyRound } from '../../types'

interface Props {
  rounds: EconomyRound[]
  teamAName: string
  teamBName: string
}

export default function EconomyChart({ rounds, teamAName, teamBName }: Props) {
  if (rounds.length === 0) {
    return (
      <div className="rounded-md border py-8 text-center text-xs text-white/30"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        经济数据待导入
      </div>
    )
  }

  const labels = rounds.map(r => String(r.round_number))

  // markArea pairs: one colored band per round
  const markAreaData = rounds.map(r => [
    {
      xAxis: String(r.round_number),
      itemStyle: {
        color: r.winner_side === 3
          ? 'rgba(0,209,255,0.05)'
          : r.winner_side === 2
            ? 'rgba(255,215,0,0.05)'
            : 'rgba(255,255,255,0.02)',
      },
    },
    { xAxis: String(r.round_number) },
  ])

  const axisStyle = {
    axisLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10 },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0A0F2D',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
      formatter: (params: Array<{ seriesName: string; value: number; dataIndex: number }>) => {
        const r = rounds[params[0]?.dataIndex]
        if (!r) return ''
        return `<b>Round ${r.round_number}</b><br>${params.map(p => `${p.seriesName}: $${p.value?.toLocaleString()}`).join('<br>')}`
      }
    },
    legend: {
      data: [teamAName, teamBName],
      textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
      top: 4,
    },
    grid: [
      { left: 55, right: 12, top: 36, bottom: '40%' },
      { left: 55, right: 12, top: '65%', bottom: 28 },
    ],
    xAxis: [
      { gridIndex: 0, type: 'category', data: labels, ...axisStyle },
      { gridIndex: 1, type: 'category', data: labels, show: false },
    ],
    yAxis: [
      {
        gridIndex: 0, type: 'value', ...axisStyle,
        axisLabel: {
          ...axisStyle.axisLabel,
          formatter: (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
        },
      },
      {
        gridIndex: 1, type: 'value', ...axisStyle,
        axisLabel: {
          ...axisStyle.axisLabel,
          formatter: (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
        },
      },
    ],
    series: [
      {
        name: teamAName,
        type: 'line',
        xAxisIndex: 0, yAxisIndex: 0,
        data: rounds.map(r => r.team_a_equipment_value ?? 0),
        lineStyle: { color: '#FF8A00', width: 2 },
        itemStyle: { color: '#FF8A00' },
        smooth: true,
        symbol: 'none',
        markArea: { silent: true, data: markAreaData },
      },
      {
        name: teamBName,
        type: 'line',
        xAxisIndex: 0, yAxisIndex: 0,
        data: rounds.map(r => r.team_b_equipment_value ?? 0),
        lineStyle: { color: '#00D1FF', width: 2 },
        itemStyle: { color: '#00D1FF' },
        smooth: true,
        symbol: 'none',
      },
      {
        name: teamAName + ' 花费',
        type: 'bar',
        xAxisIndex: 1, yAxisIndex: 1,
        data: rounds.map(r => r.team_a_money_spent ?? 0),
        itemStyle: { color: 'rgba(255,138,0,0.7)' },
        barMaxWidth: 10,
        stack: 'money',
      },
      {
        name: teamBName + ' 花费',
        type: 'bar',
        xAxisIndex: 1, yAxisIndex: 1,
        data: rounds.map(r => r.team_b_money_spent ?? 0),
        itemStyle: { color: 'rgba(0,209,255,0.7)' },
        barMaxWidth: 10,
        stack: 'money',
      },
    ],
  }

  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-4 pt-4 mb-1">Economy</p>
      <ReactECharts option={option} style={{ height: '280px' }} opts={{ renderer: 'svg' }} />
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: 0 TypeScript errors. (echarts-for-react types may produce a minor warning — OK as long as no errors.)

- [ ] **Step 3: Commit**

```bash
git add src/components/match/EconomyChart.tsx
git commit -m "feat(frontend): EconomyChart — ECharts dual-line equipment value + money-spent bars"
```

---

### Task 6: HighlightCards component

**Files:**
- Create: `frontend/src/components/match/HighlightCards.tsx`

Two-column layout: Clutches (by opponent_count desc) and Top Frags (top 3 by rating from top_players array).

- [ ] **Step 1: Write HighlightCards.tsx**

```tsx
// frontend/src/components/match/HighlightCards.tsx
import type { MatchHighlights } from '../../types'

interface Props {
  highlights: MatchHighlights
}

const OPPONENT_LABEL: Record<number, string> = {
  1: '1v1', 2: '1v2', 3: '1v3', 4: '1v4', 5: '1v5',
}

export default function HighlightCards({ highlights }: Props) {
  const { clutches, top_players } = highlights
  const hasClutches = clutches.length > 0
  const hasTopPlayers = top_players.length > 0

  if (!hasClutches && !hasTopPlayers) {
    return (
      <div className="rounded-md border py-6 text-center text-xs text-white/30"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        精彩数据待导入
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Clutches */}
      <div className="rounded-md border p-4"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Clutches</p>
        {hasClutches ? (
          <div className="space-y-2">
            {clutches.map((cl, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0"
                   style={{ borderColor: 'var(--color-data-divider)' }}>
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                  {cl.avatar_url
                    ? <img src={cl.avatar_url} alt={cl.nickname ?? ''} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">
                        {cl.nickname?.[0] ?? '?'}
                      </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white/90 truncate">{cl.nickname ?? 'Unknown'}</div>
                  <div className="text-[10px] text-white/40">
                    {OPPONENT_LABEL[cl.opponent_count] ?? `1v${cl.opponent_count}`}
                    {' · R'}{cl.round_number}
                    {' · '}{cl.kill_count}K
                  </div>
                </div>
                <div className="flex-shrink-0 text-sm font-black"
                     style={{ color: cl.won ? 'var(--color-primary)' : 'rgba(255,255,255,0.3)' }}>
                  {cl.won ? 'WIN' : 'LOSE'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30 py-2">无残局数据</p>
        )}
      </div>

      {/* Top Frags */}
      <div className="rounded-md border p-4"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Top Frags</p>
        {hasTopPlayers ? (
          <div className="space-y-2">
            {top_players.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0"
                   style={{ borderColor: 'var(--color-data-divider)' }}>
                <div className="text-2xl font-black tabular-nums w-7 flex-shrink-0"
                     style={{ color: i === 0 ? 'var(--color-gold)' : 'rgba(255,255,255,0.25)' }}>
                  {i + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">
                        {p.nickname[0]}
                      </div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white/90 truncate">{p.nickname}</div>
                  <div className="text-[10px] text-white/40">
                    {p.kills ?? '—'}K / {p.deaths ?? '—'}D · ADR {p.adr != null ? p.adr.toFixed(1) : '—'}
                  </div>
                </div>
                <div className="text-sm font-black tabular-nums flex-shrink-0"
                     style={{ color: (p.rating ?? 0) >= 1.0 ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)' }}>
                  {p.rating != null ? p.rating.toFixed(2) : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30 py-2">无数据</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/match/HighlightCards.tsx
git commit -m "feat(frontend): HighlightCards — Clutches + Top Frags two-column layout"
```

---

### Task 7: Rewrite MatchDetailPage

**Files:**
- Modify: `frontend/src/pages/MatchDetailPage.tsx`

Wire all 5 components. The page holds `selectedMapId` state (defaults to first map with a non-null score_a). Fetches: `useMatch`, `useMatchMaps` always; `useMapStats`, `useMapRounds`, `useMapEconomy`, `useMapHighlights` keyed to selected map.

- [ ] **Step 1: Read the current MatchDetailPage.tsx**

Read `frontend/src/pages/MatchDetailPage.tsx` to understand the existing structure before replacing it.

- [ ] **Step 2: Write the new MatchDetailPage.tsx**

Replace the entire file:

```tsx
// frontend/src/pages/MatchDetailPage.tsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { useMatch, useMatchMaps, useMapStats, useMapRounds, useMapEconomy, useMapHighlights } from '../api/matches'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import StatusBadge from '../components/StatusBadge'
import MapPicker from '../components/match/MapPicker'
import Scoreboard from '../components/match/Scoreboard'
import RoundTimeline from '../components/match/RoundTimeline'
import EconomyChart from '../components/match/EconomyChart'
import HighlightCards from '../components/match/HighlightCards'

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: match, isLoading, error } = useMatch(id!)
  const { data: maps = [] } = useMatchMaps(id)

  const [selectedMapId, setSelectedMapId] = useState<string>('')

  // Auto-select first map with score data when maps load
  useEffect(() => {
    if (!selectedMapId && maps.length > 0) {
      const first = maps.find(m => m.score_a !== null) ?? maps[0]
      setSelectedMapId(first.id)
    }
  }, [maps, selectedMapId])

  const selectedMap = maps.find(m => m.id === selectedMapId) ?? null

  const { data: stats = [] } = useMapStats(id, selectedMapId || undefined)
  const { data: rounds = [] } = useMapRounds(id, selectedMapId || undefined)
  const { data: economy = [] } = useMapEconomy(id, selectedMapId || undefined)
  const { data: highlights } = useMapHighlights(id, selectedMapId || undefined)

  if (isLoading) return <Spinner />
  if (error) return <ErrorBox message={error.message} />
  if (!match) return null

  // Compute total match duration from all maps
  const totalDurationSec = maps.reduce((acc, m) => acc + (m.duration_seconds ?? 0), 0)

  const teamAWon = match.maps_won_a > match.maps_won_b
  const teamBWon = match.maps_won_b > match.maps_won_a

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

      {/* ── A. Match Header ─────────────────────────────────────────────── */}
      <div className="rounded-xl p-6"
           style={{ background: 'var(--color-data-surface)', border: '1px solid var(--color-data-divider)' }}>
        {/* Stage + date */}
        <div className="flex items-center justify-center gap-3 mb-4 text-[10px] font-black uppercase tracking-widest text-white/40">
          {match.stage && <span>{match.stage}</span>}
          {match.best_of != null && match.best_of > 0 && <span>· BO{match.best_of}</span>}
          {totalDurationSec > 0 && <span>· {formatDuration(totalDurationSec)}</span>}
          {match.scheduled_at && <span>· {dayjs(match.scheduled_at).format('YYYY-MM-DD HH:mm')}</span>}
        </div>

        {/* Teams + score */}
        <div className="flex items-center justify-around gap-4">
          {/* Team A */}
          <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
            <TeamLogo url={match.team_a_logo} name={match.team_a_name ?? '?'} size={72} />
            <span className={`font-black text-xl text-center leading-tight ${teamAWon ? 'text-white' : 'text-white/50'}`}>
              {match.team_a_name ?? 'TBD'}
            </span>
          </div>

          {/* Score */}
          <div className="text-center flex-shrink-0 px-4">
            {match.status === 'finished' ? (
              <div className="flex items-center gap-3">
                <span className={`text-5xl font-black tabular-nums ${teamAWon ? 'gold-gradient' : 'text-white/40'}`}>
                  {match.maps_won_a}
                </span>
                <span className="text-3xl font-black text-white/20">–</span>
                <span className={`text-5xl font-black tabular-nums ${teamBWon ? 'gold-gradient' : 'text-white/40'}`}>
                  {match.maps_won_b}
                </span>
              </div>
            ) : (
              <StatusBadge status={match.status} />
            )}
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center gap-3 flex-1 min-w-0">
            <TeamLogo url={match.team_b_logo} name={match.team_b_name ?? '?'} size={72} />
            <span className={`font-black text-xl text-center leading-tight ${teamBWon ? 'text-white' : 'text-white/50'}`}>
              {match.team_b_name ?? 'TBD'}
            </span>
          </div>
        </div>
      </div>

      {/* ── B. Map Picker ────────────────────────────────────────────────── */}
      {maps.length > 0 && (
        <MapPicker maps={maps} selectedId={selectedMapId} onSelect={setSelectedMapId} />
      )}

      {/* ── C. Per-Map Scoreboard ─────────────────────────────────────────── */}
      <section>
        <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
          {selectedMap ? `${selectedMap.map_name.replace('de_', '').toUpperCase()}  ` : ''}
          Scoreboard
        </h2>
        <Scoreboard
          players={stats}
          teamAId={match.team_a_id}
          teamBId={match.team_b_id}
          teamAName={match.team_a_name ?? 'Team A'}
          teamBName={match.team_b_name ?? 'Team B'}
          rounds={rounds}
        />
      </section>

      {/* ── D. Round Timeline ─────────────────────────────────────────────── */}
      {(rounds.length > 0 || selectedMap) && (
        <section>
          <RoundTimeline
            rounds={rounds}
            teamAName={match.team_a_name ?? 'Team A'}
            teamBName={match.team_b_name ?? 'Team B'}
          />
        </section>
      )}

      {/* ── E. Economy Chart ──────────────────────────────────────────────── */}
      {(economy.length > 0 || selectedMap) && (
        <section>
          <EconomyChart
            rounds={economy}
            teamAName={match.team_a_name ?? 'Team A'}
            teamBName={match.team_b_name ?? 'Team B'}
          />
        </section>
      )}

      {/* ── F. Highlights ─────────────────────────────────────────────────── */}
      {highlights && (
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Highlights</h2>
          <HighlightCards highlights={highlights} />
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: 0 TypeScript errors, Vite bundle succeeds.

- [ ] **Step 4: Run backend tests (confirm no regressions)**

```bash
cd /Users/brandt/alast/backend
npm test
```

Expected: 50 tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/brandt/alast/frontend
git add src/pages/MatchDetailPage.tsx
git commit -m "feat(frontend): MatchDetail L2 — Map Picker + Scoreboard + Round Timeline + Economy Chart + Highlights"
```

---

## Self-Review

**Spec coverage:**
- ✅ §4.1.A Match Header — team logos, BO score with gold-gradient, stage, duration, date
- ✅ §4.1.B Map Picker — horizontal chips with map name + score, default first map with score
- ✅ §4.1.C Per-Map Scoreboard — 10 rows, K/D/A/+−/HS%/KAST/ADR/Rating, half-time divider, MVP badge, SUB badge, row click → /players/:id
- ✅ §4.1.D Round Timeline — colored cells by winner side, end-reason emoji, hover mini-card (score, econ types, kills, duration)
- ✅ §4.1.E Economy Chart — ECharts dual-line (equipment value) + sub bar chart (money spent), background bands by winner side
- ✅ §4.1.F Highlights — Clutches (opponent_count, won status) + Top Frags (rating ranked)
- ✅ §4.2 Data sources — all 6 endpoints wired, react-query cache per map switch
- ✅ §4.3 Visual — data-layer tokens throughout, brand gold-gradient on score only, CT=accent blue, T=gold #FFD700, team A=primary orange, team B=accent blue in charts

**No placeholders:** all steps contain complete code.

**Type consistency:** `MapStatPlayer`, `MatchRound`, `EconomyRound`, `MatchHighlights` defined in Task 1 and used consistently in Tasks 3–7. `useMatchMaps`, `useMapStats`, `useMapRounds`, `useMapEconomy`, `useMapHighlights` defined in Task 1 and imported in Task 7.
