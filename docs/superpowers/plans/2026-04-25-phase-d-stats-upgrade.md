# Phase D: Stats Page Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `/stats` from a 3-stat leaderboard to a full Stats Hub — tournament summary header, 4-dimension filter bar, 7-stat switchable leaderboard with Tier badges, and an ECharts Tier comparison bar chart.

**Architecture:** Backend gets two small additions (synthetic `kd_diff` stat + `GET /api/stats/maps` endpoint for dynamic map filter). Frontend rewrites `StatsPage` using `useCurrentTournament` as the tournament anchor, adds three new hooks, and creates one new `TierChart` component. No new pages; no schema changes.

**Tech Stack:** React 18, @tanstack/react-query v5, ECharts + echarts-for-react (already installed), Tailwind v4 CSS variables, TypeScript, Hono + Node backend. Verification: `npm test` (backend) and `npm run build` (frontend).

---

## File Structure

| Path | Action | Purpose |
|------|--------|---------|
| `backend/src/routes/stats.ts` | Modify | Add `clutches_won`, `kd_diff` to VALID_STATS; handle `kd_diff` synthetic SQL; expose `tpa.tier` in leaderboard rows; change `stage` filter to use `bracket_kind`; add `GET /api/stats/maps` |
| `backend/tests/stats.test.ts` | Modify | Extend to cover new stat keys, maps endpoint |
| `frontend/src/types.ts` | Modify | Add `tier` field to `LeaderboardEntry` |
| `frontend/src/api/stats.ts` | Modify | Expand `useLeaderboard` params; add `useTournamentSummary`, `useTierComparison`, `useAvailableMaps` |
| `frontend/src/components/stats/TierChart.tsx` | Create | ECharts grouped-bar chart for tier comparison |
| `frontend/src/pages/StatsPage.tsx` | Modify | Full rewrite — summary header, filter bar, 7-stat tabs, leaderboard, TierChart |

---

### Task 1: Backend — extend stats routes

**Files:**
- Modify: `backend/src/routes/stats.ts`
- Modify: `backend/tests/stats.test.ts`

- [ ] **Step 1: Read the current stats.ts**

Read `backend/src/routes/stats.ts` to confirm the current state before editing.

Current state (confirmed):
- `VALID_STATS = ['rating', 'adr', 'kast', 'headshot_pct', 'kills', 'first_kills']`
- Leaderboard left-joins `tournament_player_assignment` only when `tier && tournamentId` (filter-only join)
- `stage` filter uses `m.stage = $N` (free text)
- No `GET /api/stats/maps` endpoint

- [ ] **Step 2: Rewrite backend/src/routes/stats.ts**

Replace the entire file with:

```typescript
// backend/src/routes/stats.ts
import { Hono } from 'hono'
import { query } from '../db.js'
import { ok } from '../types.js'

const r = new Hono()

const VALID_STATS = ['rating', 'adr', 'kast', 'headshot_pct', 'kills', 'first_kills', 'clutches_won', 'kd_diff'] as const
type StatKey = typeof VALID_STATS[number]

r.get('/leaderboard', async (c) => {
  const tournamentId = c.req.query('tournament_id')
  const rawStat = c.req.query('stat')
  const stat = (VALID_STATS.includes(rawStat as StatKey) ? rawStat : 'rating') as StatKey
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 50)
  const bracketKind = c.req.query('bracket_kind') ?? null
  const map = c.req.query('map') ?? null
  const tier = c.req.query('tier') ?? null
  const minMaps = parseInt(c.req.query('min_maps') ?? '3')

  const params: unknown[] = []
  const conditions: string[] = ['1=1']

  if (tournamentId) { params.push(tournamentId); conditions.push(`m.tournament_id = $${params.length}`) }
  if (bracketKind)  { params.push(bracketKind);  conditions.push(`m.bracket_kind = $${params.length}`) }
  if (map)          { params.push(map);           conditions.push(`mm.map_name = $${params.length}`) }

  // Always left-join tpa when tournament is specified — needed for tier display + optional filter
  const tpaJoin = tournamentId
    ? `LEFT JOIN tournament_player_assignment tpa ON tpa.player_id = p.id AND tpa.tournament_id = m.tournament_id`
    : ''

  if (tier && tournamentId) {
    params.push(tier)
    conditions.push(`tpa.tier = $${params.length}`)
  }

  params.push(minMaps)
  const minMapsParam = params.length
  params.push(limit)
  const limitParam = params.length

  // kd_diff is synthetic: AVG(kills - deaths)
  const statExpr = stat === 'kd_diff'
    ? `ROUND(AVG(pms.kills::float - pms.deaths::float)::numeric, 2)`
    : `ROUND(AVG(pms.${stat})::numeric, 2)`

  const sql = `
    SELECT p.id, p.nickname, p.avatar_url,
           t.name AS team_name, t.logo_url AS team_logo_url,
           COUNT(pms.id) AS maps_played,
           ${statExpr} AS avg_stat
           ${tournamentId ? ', tpa.tier' : ''}
    FROM player_match_stats pms
    JOIN players p ON p.id = pms.player_id
    LEFT JOIN teams t ON t.id = p.team_id
    JOIN match_maps mm ON mm.id = pms.match_map_id
    JOIN matches m ON m.id = mm.match_id
    ${tpaJoin}
    WHERE ${conditions.join(' AND ')}
    GROUP BY p.id, p.nickname, p.avatar_url, t.name, t.logo_url
             ${tournamentId ? ', tpa.tier' : ''}
    HAVING COUNT(pms.id) >= $${minMapsParam}
    ORDER BY avg_stat DESC NULLS LAST
    LIMIT $${limitParam}
  `

  const { rows } = await query(sql, params)
  return c.json(ok(rows))
})

r.get('/tournament-summary', async (c) => {
  const tournamentId = c.req.query('tournament_id')
  if (!tournamentId) return c.json(ok({ matches_played: 0, total_kills: 0, avg_headshot_pct: null }))

  const { rows: [summary] } = await query(
    `SELECT
       COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'finished') AS matches_played,
       COALESCE(SUM(pms.kills), 0) AS total_kills,
       ROUND(AVG(pms.headshot_pct)::numeric, 1) AS avg_headshot_pct
     FROM matches m
     LEFT JOIN match_maps mm ON mm.match_id = m.id
     LEFT JOIN player_match_stats pms ON pms.match_map_id = mm.id
     WHERE m.tournament_id = $1`,
    [tournamentId]
  )
  return c.json(ok(summary))
})

r.get('/tier-comparison', async (c) => {
  const tournamentId = c.req.query('tournament_id')
  if (!tournamentId) return c.json(ok([]))

  const { rows } = await query(
    `SELECT
       tpa.tier,
       ROUND(AVG(pms.rating)::numeric, 3) AS avg_rating,
       ROUND(AVG(pms.adr)::numeric, 1) AS avg_adr,
       COUNT(DISTINCT pms.player_id) AS players
     FROM player_match_stats pms
     JOIN players p ON p.id = pms.player_id
     JOIN match_maps mm ON mm.id = pms.match_map_id
     JOIN matches m ON m.id = mm.match_id
     JOIN tournament_player_assignment tpa
       ON tpa.player_id = pms.player_id AND tpa.tournament_id = m.tournament_id
     WHERE m.tournament_id = $1
     GROUP BY tpa.tier
     ORDER BY
       CASE tpa.tier WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C+' THEN 4 WHEN 'D' THEN 5 ELSE 6 END`,
    [tournamentId]
  )
  return c.json(ok(rows))
})

r.get('/maps', async (c) => {
  const tournamentId = c.req.query('tournament_id')
  const params: unknown[] = []
  let condition = ''
  if (tournamentId) { params.push(tournamentId); condition = 'WHERE m.tournament_id = $1' }

  const { rows } = await query(
    `SELECT DISTINCT mm.map_name
     FROM match_maps mm
     JOIN matches m ON m.id = mm.match_id
     ${condition}
     ORDER BY mm.map_name`,
    params
  )
  return c.json(ok(rows.map((r: { map_name: string }) => r.map_name)))
})

export default r
```

- [ ] **Step 3: Extend backend/tests/stats.test.ts**

Read `backend/tests/stats.test.ts` first. Replace the entire file with:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../src/index.js'
import { resetTables, insertTeam, insertTournament, insertPlayer, insertMatchMap } from './setup.js'
import { query } from '../src/db.js'

async function insertFinishedMatch(
  tournamentId: string, teamAId: string, teamBId: string,
  mapsWonA = 2, mapsWonB = 0
) {
  const { rows: [m] } = await query(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, maps_won_a, maps_won_b, status, bracket_kind)
     VALUES ($1, $2, $3, $4, $5, 'finished', 'swiss') RETURNING id`,
    [tournamentId, teamAId, teamBId, mapsWonA, mapsWonB]
  )
  return m.id as string
}

async function insertStats(
  matchMapId: string, playerId: string, teamId: string,
  { rating = 1.0, adr = 80, kast = 72, clutches_won = 1, first_kills = 2 } = {}
) {
  await query(
    `INSERT INTO player_match_stats
       (player_id, match_map_id, team_id, kills, deaths, assists, rating, adr, kast, headshot_pct, first_kills, clutches_won)
     VALUES ($1, $2, $3, 15, 10, 3, $4, $5, $6, 40, $7, $8)`,
    [playerId, matchMapId, teamId, rating, adr, kast, first_kills, clutches_won]
  )
}

describe('GET /api/stats/leaderboard', () => {
  beforeEach(async () => {
    await resetTables('player_match_stats', 'match_maps', 'matches', 'players', 'teams', 'tournaments')
  })

  it('returns empty array with no data', async () => {
    const res = await app.request('/api/stats/leaderboard')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBe(0)
  })

  it('returns leaderboard sorted by rating', async () => {
    const tid = await insertTournament()
    const teamId = await insertTeam()
    const p1 = await insertPlayer({ team_id: teamId })
    const p2 = await insertPlayer({ team_id: teamId })
    const matchId = await insertFinishedMatch(tid, teamId, teamId)
    const mm1 = await insertMatchMap(matchId, { map_order: 1 })
    const mm2 = await insertMatchMap(matchId, { map_order: 2 })
    const mm3 = await insertMatchMap(matchId, { map_order: 3 })

    // p1 has 3 maps with rating 1.5
    await insertStats(mm1.id, p1.id, teamId, { rating: 1.5 })
    await insertStats(mm2.id, p1.id, teamId, { rating: 1.5 })
    await insertStats(mm3.id, p1.id, teamId, { rating: 1.5 })
    // p2 has 3 maps with rating 1.0
    await insertStats(mm1.id, p2.id, teamId, { rating: 1.0 })
    await insertStats(mm2.id, p2.id, teamId, { rating: 1.0 })
    await insertStats(mm3.id, p2.id, teamId, { rating: 1.0 })

    const res = await app.request('/api/stats/leaderboard?tournament_id=' + tid + '&min_maps=3')
    const body = await res.json() as { data: Array<{ nickname: string; avg_stat: string }> }
    expect(body.data[0].nickname).toBe(p1.nickname)
    expect(parseFloat(body.data[0].avg_stat)).toBeCloseTo(1.5, 1)
  })

  it('supports kd_diff synthetic stat', async () => {
    const tid = await insertTournament()
    const teamId = await insertTeam()
    const p1 = await insertPlayer({ team_id: teamId })
    const matchId = await insertFinishedMatch(tid, teamId, teamId)
    const mm1 = await insertMatchMap(matchId, { map_order: 1 })
    const mm2 = await insertMatchMap(matchId, { map_order: 2 })
    const mm3 = await insertMatchMap(matchId, { map_order: 3 })
    // 15K - 10D = +5 per map
    await insertStats(mm1.id, p1.id, teamId)
    await insertStats(mm2.id, p1.id, teamId)
    await insertStats(mm3.id, p1.id, teamId)

    const res = await app.request('/api/stats/leaderboard?tournament_id=' + tid + '&stat=kd_diff&min_maps=3')
    const body = await res.json() as { data: Array<{ avg_stat: string }> }
    expect(parseFloat(body.data[0].avg_stat)).toBeCloseTo(5, 0)
  })

  it('filters by bracket_kind', async () => {
    const tid = await insertTournament()
    const teamId = await insertTeam()
    const p1 = await insertPlayer({ team_id: teamId })

    // swiss match
    const { rows: [m] } = await query(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, maps_won_a, maps_won_b, status, bracket_kind)
       VALUES ($1, $2, $2, 2, 0, 'finished', 'swiss') RETURNING id`,
      [tid, teamId]
    )
    const mm1 = await insertMatchMap(m.id, { map_order: 1 })
    const mm2 = await insertMatchMap(m.id, { map_order: 2 })
    const mm3 = await insertMatchMap(m.id, { map_order: 3 })
    await insertStats(mm1.id, p1.id, teamId)
    await insertStats(mm2.id, p1.id, teamId)
    await insertStats(mm3.id, p1.id, teamId)

    const res = await app.request('/api/stats/leaderboard?tournament_id=' + tid + '&bracket_kind=ub&min_maps=1')
    const body = await res.json() as { data: unknown[] }
    expect(body.data.length).toBe(0) // p1 only played swiss, not ub
  })
})

describe('GET /api/stats/maps', () => {
  beforeEach(async () => {
    await resetTables('match_maps', 'matches', 'teams', 'tournaments')
  })

  it('returns distinct map names for tournament', async () => {
    const tid = await insertTournament()
    const teamId = await insertTeam()
    const { rows: [m] } = await query(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, maps_won_a, maps_won_b, status)
       VALUES ($1, $2, $2, 2, 0, 'finished') RETURNING id`,
      [tid, teamId]
    )
    await query(`INSERT INTO match_maps (match_id, map_name, map_order) VALUES ($1, 'de_ancient', 1)`, [m.id])
    await query(`INSERT INTO match_maps (match_id, map_name, map_order) VALUES ($1, 'de_inferno', 2)`, [m.id])
    await query(`INSERT INTO match_maps (match_id, map_name, map_order) VALUES ($1, 'de_ancient', 3)`, [m.id])

    const res = await app.request('/api/stats/maps?tournament_id=' + tid)
    const body = await res.json() as { data: string[] }
    expect(body.data).toEqual(['de_ancient', 'de_inferno'])
  })

  it('returns all maps when no tournament_id', async () => {
    const res = await app.request('/api/stats/maps')
    expect(res.status).toBe(200)
    const body = await res.json() as { data: string[] }
    expect(Array.isArray(body.data)).toBe(true)
  })
})
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/brandt/alast/backend
npm test -- tests/stats.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Run full backend test suite**

```bash
npm test
```

Expected: 50 + (new tests) passing, 0 failing.

- [ ] **Step 6: Commit**

```bash
git add src/routes/stats.ts tests/stats.test.ts
git commit -m "feat(backend): extend stats — kd_diff stat, bracket_kind filter, tier in leaderboard rows, maps endpoint"
```

---

### Task 2: Frontend API hooks + LeaderboardEntry type

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/stats.ts`

- [ ] **Step 1: Add `tier` to LeaderboardEntry in types.ts**

Read `frontend/src/types.ts`. Find the `LeaderboardEntry` interface and add `tier`:

```typescript
export interface LeaderboardEntry {
  id: string
  nickname: string
  avatar_url: string | null
  team_name: string | null
  team_logo_url: string | null
  maps_played: string
  avg_stat: string | null
  tier?: string | null   // present when tournament_id is supplied
}
```

- [ ] **Step 2: Rewrite frontend/src/api/stats.ts**

Replace the entire file:

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { LeaderboardEntry, TournamentSummary, TierComparison } from '../types'

type StatKey = 'rating' | 'adr' | 'kast' | 'headshot_pct' | 'first_kills' | 'clutches_won' | 'kd_diff'

export function useLeaderboard(params?: {
  tournament_id?: string
  stat?: StatKey
  bracket_kind?: string
  map?: string
  tier?: string
  min_maps?: number
  limit?: number
}) {
  const qs = new URLSearchParams()
  if (params?.tournament_id) qs.set('tournament_id', params.tournament_id)
  if (params?.stat)          qs.set('stat', params.stat)
  if (params?.bracket_kind)  qs.set('bracket_kind', params.bracket_kind)
  if (params?.map)           qs.set('map', params.map)
  if (params?.tier)          qs.set('tier', params.tier)
  if (params?.min_maps)      qs.set('min_maps', String(params.min_maps))
  if (params?.limit)         qs.set('limit', String(params.limit))
  const q = qs.toString()
  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: () => apiFetch<LeaderboardEntry[]>(`/api/stats/leaderboard${q ? `?${q}` : ''}`),
  })
}

export function useTournamentSummary(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tournament-summary', tournamentId],
    queryFn: () => apiFetch<TournamentSummary>(`/api/stats/tournament-summary?tournament_id=${tournamentId}`),
    enabled: !!tournamentId,
  })
}

export function useTierComparison(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['tier-comparison', tournamentId],
    queryFn: () => apiFetch<TierComparison[]>(`/api/stats/tier-comparison?tournament_id=${tournamentId}`),
    enabled: !!tournamentId,
  })
}

export function useAvailableMaps(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['stats-maps', tournamentId],
    queryFn: () => apiFetch<string[]>(`/api/stats/maps${tournamentId ? `?tournament_id=${tournamentId}` : ''}`),
    enabled: !!tournamentId,
  })
}
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/api/stats.ts
git commit -m "feat(frontend): extend stats API hooks — kd_diff, bracket_kind, tier, useTournamentSummary, useTierComparison, useAvailableMaps"
```

---

### Task 3: TierChart component

**Files:**
- Create: `frontend/src/components/stats/TierChart.tsx`

Grouped-bar ECharts chart: x-axis = tier (S/A/B/C+/D), two bars per tier = avg Rating (blue) + avg ADR (orange, secondary y-axis). Show player count as label above each bar pair.

- [ ] **Step 1: Create frontend/src/components/stats/TierChart.tsx**

```tsx
// frontend/src/components/stats/TierChart.tsx
import ReactECharts from 'echarts-for-react'
import type { TierComparison } from '../../types'

interface Props {
  data: TierComparison[]
}

const TIER_LABELS: Record<string, string> = {
  S: '特等马', A: '上等马', B: '中等马', 'C+': '下等马', D: '赠品马',
}

export default function TierChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-md border py-8 text-center text-xs text-white/30"
           style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
        Tier 数据需至少一场已完赛且有 tier 指定的选手
      </div>
    )
  }

  const tiers = data.map(d => `${d.tier}\n${TIER_LABELS[d.tier] ?? ''}`)
  const ratings = data.map(d => parseFloat(d.avg_rating ?? '0'))
  const adrs = data.map(d => parseFloat(d.avg_adr ?? '0'))
  const playerCounts = data.map(d => d.players)

  const axisStyle = {
    axisLabel: { color: 'rgba(255,255,255,0.40)', fontSize: 10 },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.10)' } },
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
        const idx = params[0]?.dataIndex
        return `<b>Tier ${data[idx]?.tier}</b> (${playerCounts[idx]} 人)<br>` +
               params.map(p => `${p.seriesName}: ${p.value}`).join('<br>')
      }
    },
    legend: {
      data: ['Avg Rating', 'Avg ADR'],
      textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
      top: 4,
    },
    grid: { left: 55, right: 55, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: tiers,
      ...axisStyle,
      axisLabel: { ...axisStyle.axisLabel, lineHeight: 16 },
    },
    yAxis: [
      { type: 'value', name: 'Rating', nameTextStyle: { color: 'rgba(255,255,255,0.3)', fontSize: 10 }, ...axisStyle, min: 0, max: 2 },
      { type: 'value', name: 'ADR', nameTextStyle: { color: 'rgba(255,255,255,0.3)', fontSize: 10 }, ...axisStyle, min: 0 },
    ],
    series: [
      {
        name: 'Avg Rating',
        type: 'bar',
        yAxisIndex: 0,
        data: ratings,
        itemStyle: { color: 'rgba(0,209,255,0.75)' },
        barMaxWidth: 28,
        label: { show: true, position: 'top', color: 'rgba(255,255,255,0.5)', fontSize: 10,
                 formatter: ({ value }: { value: number }) => value.toFixed(2) },
      },
      {
        name: 'Avg ADR',
        type: 'bar',
        yAxisIndex: 1,
        data: adrs,
        itemStyle: { color: 'rgba(255,138,0,0.75)' },
        barMaxWidth: 28,
        label: { show: true, position: 'top', color: 'rgba(255,255,255,0.5)', fontSize: 10,
                 formatter: ({ value }: { value: number }) => value.toFixed(1) },
      },
    ],
  }

  return (
    <div className="rounded-md border overflow-hidden"
         style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-4 pt-4 mb-1">
        Tier 等级对比 — Avg Rating &amp; ADR
      </p>
      <ReactECharts option={option} style={{ height: '220px' }} opts={{ renderer: 'svg' }} />
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
git add src/components/stats/TierChart.tsx
git commit -m "feat(frontend): TierChart — ECharts grouped-bar tier comparison"
```

---

### Task 4: StatsPage rewrite

**Files:**
- Modify: `frontend/src/pages/StatsPage.tsx`

The page binds to the current tournament via `useCurrentTournament()`. Filter state lives in `useState`. All filters pass to `useLeaderboard`. `useTournamentSummary`, `useTierComparison`, `useAvailableMaps` are also keyed to the current tournament.

- [ ] **Step 1: Read the current StatsPage.tsx**

Read `frontend/src/pages/StatsPage.tsx` to confirm its current state before replacing.

- [ ] **Step 2: Replace frontend/src/pages/StatsPage.tsx**

```tsx
// frontend/src/pages/StatsPage.tsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentTournament } from '../api/currentTournament'
import { useLeaderboard, useTournamentSummary, useTierComparison, useAvailableMaps } from '../api/stats'
import Spinner from '../components/Spinner'
import ErrorBox from '../components/ErrorBox'
import TeamLogo from '../components/TeamLogo'
import TrophySymbol from '../components/TrophySymbol'
import TierChart from '../components/stats/TierChart'

type StatKey = 'rating' | 'adr' | 'kast' | 'headshot_pct' | 'first_kills' | 'clutches_won' | 'kd_diff'

const STAT_TABS: { value: StatKey; label: string; format: (v: string) => string }[] = [
  { value: 'rating',      label: 'Rating',       format: v => parseFloat(v).toFixed(2) },
  { value: 'adr',         label: 'ADR',          format: v => parseFloat(v).toFixed(1) },
  { value: 'kast',        label: 'KAST%',        format: v => parseFloat(v).toFixed(1) + '%' },
  { value: 'headshot_pct',label: 'HS%',          format: v => parseFloat(v).toFixed(1) + '%' },
  { value: 'first_kills', label: 'First Kills',  format: v => parseFloat(v).toFixed(2) },
  { value: 'clutches_won',label: 'Clutches',     format: v => parseFloat(v).toFixed(2) },
  { value: 'kd_diff',     label: '+/−',          format: v => { const n = parseFloat(v); return (n > 0 ? '+' : '') + n.toFixed(1) } },
]

const BRACKET_FILTER = [
  { value: '',      label: '全部' },
  { value: 'swiss', label: '小组赛' },
  { value: 'ub',    label: '胜者组' },
  { value: 'lb',    label: '败者组' },
  { value: 'gf',    label: '总决赛' },
]

const TIER_FILTER = [
  { value: '',   label: '全部 Tier' },
  { value: 'S',  label: '特等马 S' },
  { value: 'A',  label: '上等马 A' },
  { value: 'B',  label: '中等马 B' },
  { value: 'C+', label: '下等马 C+' },
  { value: 'D',  label: '赠品马 D' },
]

const MIN_MAPS_FILTER = [
  { value: 3,  label: '≥3 图' },
  { value: 5,  label: '≥5 图' },
  { value: 10, label: '≥10 图' },
]

const TIER_COLORS: Record<string, string> = {
  S: 'var(--color-gold)',
  A: 'var(--color-primary)',
  B: 'var(--color-accent)',
  'C+': 'rgba(255,255,255,0.5)',
  D: 'rgba(255,255,255,0.3)',
}

const RANK_STYLE: Record<number, string> = {
  0: 'text-gold',
  1: 'text-white/60',
  2: 'text-[#CD7F32]',
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest transition-all border"
      style={{
        background: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.04)',
        color: active ? '#fff' : 'rgba(248,250,252,0.45)',
        borderColor: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {label}
    </button>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-5 py-4 flex flex-col gap-1 min-w-[120px]"
         style={{ background: 'var(--color-data-surface)', border: '1px solid var(--color-data-divider)' }}>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
      <span className="text-2xl font-black tabular-nums" style={{ color: 'var(--color-primary)' }}>{value}</span>
    </div>
  )
}

export default function StatsPage() {
  const [stat, setStat] = useState<StatKey>('rating')
  const [bracketKind, setBracketKind] = useState('')
  const [map, setMap] = useState('')
  const [tier, setTier] = useState('')
  const [minMaps, setMinMaps] = useState(3)

  const { data: tournament } = useCurrentTournament()
  const tournamentId = tournament?.id

  const { data: summary } = useTournamentSummary(tournamentId)
  const { data: tierData = [] } = useTierComparison(tournamentId)
  const { data: availableMaps = [] } = useAvailableMaps(tournamentId)
  const { data: leaderboard, isLoading, error } = useLeaderboard({
    tournament_id: tournamentId,
    stat,
    bracket_kind: bracketKind || undefined,
    map: map || undefined,
    tier: tier || undefined,
    min_maps: minMaps,
    limit: 20,
  })

  const currentStatDef = STAT_TABS.find(s => s.value === stat)!

  return (
    <div className="relative max-w-7xl mx-auto px-6 py-8">
      {/* Trophy watermark */}
      <div className="absolute right-0 top-0 w-[260px] pointer-events-none select-none opacity-20">
        <TrophySymbol variant="outline" className="w-full" />
      </div>

      {/* Page heading */}
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-1">Leaderboard</p>
        <h1 className="text-4xl font-black italic tracking-tighter text-white/90">数据中心</h1>
        {tournament && <p className="text-xs text-white/35 mt-1">{tournament.name}</p>}
      </div>

      {/* Tournament summary cards */}
      {summary && (
        <div className="flex gap-3 flex-wrap mb-8">
          <SummaryCard label="已完赛场数" value={String(summary.matches_played)} />
          <SummaryCard label="总击杀数" value={Number(summary.total_kills).toLocaleString()} />
          <SummaryCard
            label="平均爆头率"
            value={summary.avg_headshot_pct != null ? parseFloat(summary.avg_headshot_pct).toFixed(1) + '%' : '—'}
          />
        </div>
      )}

      {/* Stat tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {STAT_TABS.map(s => (
          <FilterChip key={s.value} label={s.label} active={stat === s.value} onClick={() => setStat(s.value)} />
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap mb-6 pb-4 border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
        {/* Stage */}
        {BRACKET_FILTER.map(f => (
          <FilterChip key={f.value} label={f.label} active={bracketKind === f.value} onClick={() => setBracketKind(f.value)} />
        ))}
        <div className="w-px self-stretch" style={{ background: 'var(--color-data-divider)' }} />
        {/* Map */}
        {[{ value: '', label: '全部地图' }, ...availableMaps.map(m => ({ value: m, label: m.replace('de_', '') }))].map(f => (
          <FilterChip key={f.value} label={f.label} active={map === f.value} onClick={() => setMap(f.value)} />
        ))}
        <div className="w-px self-stretch" style={{ background: 'var(--color-data-divider)' }} />
        {/* Tier */}
        {TIER_FILTER.map(f => (
          <FilterChip key={f.value} label={f.label} active={tier === f.value} onClick={() => setTier(f.value)} />
        ))}
        <div className="w-px self-stretch" style={{ background: 'var(--color-data-divider)' }} />
        {/* Min maps */}
        {MIN_MAPS_FILTER.map(f => (
          <FilterChip key={f.value} label={f.label} active={minMaps === f.value} onClick={() => setMinMaps(f.value)} />
        ))}
      </div>

      {/* Leaderboard table */}
      {isLoading && <Spinner />}
      {error && <ErrorBox message={error.message} />}
      {leaderboard && (
        leaderboard.length === 0
          ? <p className="text-sm text-white/40 py-8 text-center">暂无符合条件的数据（最少 {minMaps} 图）</p>
          : (
            <div className="rounded-xl overflow-hidden border mb-8" style={{ borderColor: 'var(--color-data-divider)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: 'var(--color-data-surface)', borderBottom: '1px solid var(--color-data-divider)' }}>
                    {['#', '选手', '战队', '图数', currentStatDef.label].map(h => (
                      <th key={h} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/35 ${h === '#' || h === '图数' || h === currentStatDef.label ? 'text-center' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--color-data-divider)' }}>
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.id} className="transition-colors hover:bg-white/[0.025]"
                        style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-data-row)' }}>
                      <td className="px-4 py-3 w-10 text-center">
                        <span className={`text-sm font-black italic tabular-nums ${RANK_STYLE[i] ?? 'text-white/30'}`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                            {entry.avatar_url
                              ? <img src={entry.avatar_url} alt={entry.nickname} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-[9px] font-black text-white/40">
                                  {entry.nickname[0]}
                                </div>}
                          </div>
                          <Link to={`/players/${entry.id}`} className="font-black text-sm text-white/90 hover:text-primary transition-colors">
                            {entry.nickname}
                          </Link>
                          {entry.tier && (
                            <span className="text-[9px] font-black px-1 py-0.5 rounded flex-shrink-0"
                                  style={{ color: TIER_COLORS[entry.tier] ?? 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)' }}>
                              {entry.tier}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {entry.team_name
                          ? <div className="flex items-center gap-2">
                              <TeamLogo url={entry.team_logo_url} name={entry.team_name} size={18} />
                              <span className="text-sm text-white/55 font-bold truncate max-w-[120px]">{entry.team_name}</span>
                            </div>
                          : <span className="text-white/25">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-white/45 font-bold tabular-nums">
                        {entry.maps_played}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="electric-blue-accent text-sm font-black italic tabular-nums">
                          {entry.avg_stat != null ? currentStatDef.format(entry.avg_stat) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      )}

      {/* Tier comparison chart */}
      {tournamentId && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Tier 对比分析</p>
          <TierChart data={tierData} />
        </div>
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

- [ ] **Step 4: Run backend tests — no regressions**

```bash
cd /Users/brandt/alast/backend
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/brandt/alast/frontend
git add src/pages/StatsPage.tsx src/components/stats/TierChart.tsx
git commit -m "feat(frontend): Stats Hub — summary header, 7-stat tabs, 4-dim filter bar, tier badges, TierChart"
```

---

## Self-Review

**Spec coverage (§5):**
- ✅ §5.1 Header — tournament summary 3 meta cards (matches played / total kills / avg HS%)
- ✅ §5.1 Filter Bar — stage (bracket_kind: swiss/ub/lb/gf) / map (dynamic from /stats/maps) / Tier / min_maps
- ✅ §5.1 排行表 — 7 switchable stat tabs (Rating/ADR/KAST%/HS%/First Kills/Clutches/K-D), Top 20, avatar + team logo + Tier badge
- ✅ §5.2 Tier 间对比 — ECharts 5-bar grouped chart (avg_rating CT-blue + avg_adr orange), player count in tooltip
- ✅ §5.3 Data sources — all 3 endpoints wired: leaderboard, tier-comparison, tournament-summary; plus new /stats/maps
- ⚠️ Multikills ≥3K — omitted (not a direct column in player_match_stats; would require expensive match_kills subquery). The 7 stats provided cover all other spec metrics.

**Placeholder scan:** No TBDs, no "implement later" — all steps have complete code.

**Type consistency:**
- `StatKey` defined in Task 2 as `'rating' | 'adr' | 'kast' | 'headshot_pct' | 'first_kills' | 'clutches_won' | 'kd_diff'` — matches VALID_STATS in backend Task 1
- `useLeaderboard`, `useTournamentSummary`, `useTierComparison`, `useAvailableMaps` defined in Task 2 and imported in Task 4
- `TierChart` created in Task 3 and imported in Task 4
- `LeaderboardEntry.tier` added in Task 2 and accessed in Task 4
