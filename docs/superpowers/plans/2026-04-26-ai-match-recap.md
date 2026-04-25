# AI Match Recap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate per-match recap articles in a CS commentator's voice from existing rich CSDM data, exposed via a backfill script + admin button, and cross-link news ↔ match in both directions.

**Architecture:** A `news-generation` library that (1) reconstructs a deterministic `MatchFacts` object from 7 DB tables, (2) sends those facts plus a cached system prompt to Claude Sonnet 4.6 for stylized prose, and (3) persists the result into `news` as a draft row. Two entry points (CLI script + admin POST) share one generator. Frontend wires four cross-link surfaces.

**Tech Stack:** Hono on Node, PostgreSQL via `pg`, vitest, `@anthropic-ai/sdk`, React + Vite + Tailwind v4, react-query, framer-motion.

**Spec:** `docs/superpowers/specs/2026-04-26-ai-match-recap-design.md`

---

## File Structure

**Created:**
- `backend/src/migrations/008_ai_generated_news.sql` — schema additions to `news`
- `backend/src/lib/anthropic.ts` — singleton Anthropic SDK client + env check
- `backend/src/lib/news-generation/types.ts` — `MatchFacts`, `PivotalTag`, `NotableKillTag`, `Storyline`, `GenerationMeta`
- `backend/src/lib/news-generation/facts.ts` — `extractMatchFacts(matchId)`
- `backend/src/lib/news-generation/prompt.ts` — `buildPrompt(facts)`, system prompt constants
- `backend/src/lib/news-generation/generate.ts` — `generateArticle(matchId, opts)` — composes facts + prompt + LLM call + persist
- `backend/src/lib/news-generation/factsHash.ts` — canonical-JSON sha256 helper
- `backend/scripts/generate-news.ts` — CLI backfill
- `backend/tests/news-generation/facts.test.ts`
- `backend/tests/news-generation/prompt.test.ts`
- `backend/tests/news-generation/generate.test.ts`
- `backend/tests/admin-news-generate.test.ts`
- `backend/tests/match-news-link.test.ts` — covers cross-link API additions

**Modified:**
- `backend/package.json` — add `@anthropic-ai/sdk`
- `backend/src/routes/admin/news.ts` — add `POST /generate`
- `backend/src/routes/match-maps.ts` — add `GET /:id/news`
- `backend/src/routes/news.ts` — extend list response with embedded `match`
- `backend/src/routes/matches.ts` — extend list response with `news_slug`
- `frontend/src/types.ts` — extend `NewsArticle`, `Match`
- `frontend/src/api/news.ts` — add `useMatchNews` hook
- `frontend/src/pages/MatchDetailPage.tsx` — bottom recap section
- `frontend/src/pages/NewsDetailPage.tsx` — top match card + bottom disclaimer + CTA
- `frontend/src/pages/NewsPage.tsx` — list card mini-match line
- `frontend/src/pages/MatchesPage.tsx` — list card 🎤 icon

---

## Phase 1 — Setup

### Task 1: Install Anthropic SDK and document env var

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/.env.example` (create if missing)

- [ ] **Step 1: Install SDK**

```bash
cd backend && npm install @anthropic-ai/sdk
```

Expected: `@anthropic-ai/sdk` added to `dependencies`.

- [ ] **Step 2: Document env var**

Append to `backend/.env.example` (create the file with the contents below if it does not yet exist):

```
ANTHROPIC_API_KEY=sk-ant-...
```

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.env.example
git commit -m "chore: add @anthropic-ai/sdk for AI recap generation"
```

---

### Task 2: Migration 008 — `ai_generated` + `generation_meta` on `news`

**Files:**
- Create: `backend/src/migrations/008_ai_generated_news.sql`

- [ ] **Step 1: Write migration**

Create `backend/src/migrations/008_ai_generated_news.sql`:

```sql
-- 008_ai_generated_news.sql
ALTER TABLE news
  ADD COLUMN IF NOT EXISTS ai_generated    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS generation_meta JSONB;

CREATE INDEX IF NOT EXISTS idx_news_ai_generated ON news(ai_generated);
CREATE INDEX IF NOT EXISTS idx_news_match_id     ON news(match_id);
```

- [ ] **Step 2: Run migration against dev + test DB**

```bash
cd backend && npm run migrate
NODE_ENV=test npm run migrate
```

Expected output (last line): `✓ 008_ai_generated_news.sql` (or whatever the migrate runner prints).

- [ ] **Step 3: Verify columns exist**

```bash
psql "$DATABASE_URL" -c "\d news"
```

Expected: rows for `ai_generated  | boolean | not null default false` and `generation_meta | jsonb`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/migrations/008_ai_generated_news.sql
git commit -m "feat(db): add ai_generated and generation_meta columns to news"
```

---

## Phase 2 — Facts Layer

### Task 3: Anthropic client wrapper + facts module skeleton

**Files:**
- Create: `backend/src/lib/anthropic.ts`
- Create: `backend/src/lib/news-generation/types.ts`
- Create: `backend/src/lib/news-generation/factsHash.ts`
- Create: `backend/src/lib/news-generation/facts.ts`

- [ ] **Step 1: Write Anthropic singleton**

`backend/src/lib/anthropic.ts`:

```ts
import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    client = new Anthropic({ apiKey })
  }
  return client
}
```

- [ ] **Step 2: Write shared types**

`backend/src/lib/news-generation/types.ts`:

```ts
export type PivotalTag =
  | 'eco_upset' | 'force_clutch' | 'pistol_loss_recovery'
  | 'comeback_streak' | 'ot_thriller' | 'last_round_decided'
  | 'ace_round' | 'quad_round'

export type NotableKillTag =
  | 'no_scope_awp' | 'through_smoke' | 'long_distance_awp'
  | 'flash_assisted_pickoff' | 'quad_in_round' | 'ace_in_round'

export type Storyline = string

export interface MatchFacts {
  match: {
    stage: string | null
    scheduled_at: string | null
    best_of: number
    final_score: string
  }
  teams: {
    a: { name: string; region: string | null }
    b: { name: string; region: string | null }
  }
  maps: MapFacts[]
  match_mvp: { player_nickname: string; team: 'a' | 'b'; why: string } | null
  storylines: Storyline[]
}

export interface MapFacts {
  name: string
  order: number
  score_a: number
  score_b: number
  winner_team: 'a' | 'b' | null
  duration_seconds: number | null
  half_scores: { first_half: string; second_half: string; ot?: string }
  economy_summary: {
    eco_wins_a: number; eco_wins_b: number
    force_wins_a: number; force_wins_b: number
    pistol_wins: { a: number; b: number }
  }
  pivotal_rounds: Array<{
    round_number: number
    narrative_tag: PivotalTag
    detail: Record<string, unknown>
  }>
  clutches: Array<{
    player_nickname: string
    situation: string
    won: boolean
    weapon: string | null
    round: number
  }>
  standout_players: Array<{
    player_nickname: string
    team: 'a' | 'b'
    kills: number; deaths: number; assists: number
    adr: number; hs_pct: number
    first_kills: number; first_deaths: number
    rating: number
  }>
  notable_kills: Array<{
    round: number
    killer: string; victim: string
    weapon: string
    tag: NotableKillTag
    detail: Record<string, unknown>
  }>
}

export interface GenerationMeta {
  model: string
  prompt_version: string
  generated_at: string
  facts_hash: string
  retry_count: number
  warnings: string[]
}
```

- [ ] **Step 3: Write canonical hash helper**

`backend/src/lib/news-generation/factsHash.ts`:

```ts
import { createHash } from 'node:crypto'
import type { MatchFacts } from './types.js'

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return Object.keys(obj).sort().reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = canonicalize(obj[k])
      return acc
    }, {})
  }
  return value
}

export function hashFacts(facts: MatchFacts): string {
  const canonical = JSON.stringify(canonicalize(facts))
  return createHash('sha256').update(canonical).digest('hex')
}
```

- [ ] **Step 4: Write `extractMatchFacts` skeleton (throws not-implemented)**

`backend/src/lib/news-generation/facts.ts`:

```ts
import { query } from '../../db.js'
import type { MatchFacts } from './types.js'

export async function extractMatchFacts(matchId: string): Promise<MatchFacts> {
  void matchId
  void query
  throw new Error('extractMatchFacts: not implemented')
}
```

- [ ] **Step 5: Build typecheck**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/lib/
git commit -m "feat(news-gen): scaffold types, facts module, anthropic client"
```

---

### Task 4: `extractMatchFacts` — match meta + teams + map basics

**Files:**
- Modify: `backend/src/lib/news-generation/facts.ts`
- Create: `backend/tests/news-generation/facts.test.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/tests/news-generation/facts.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { extractMatchFacts } from '../../src/lib/news-generation/facts.js'
import {
  resetTables, query, insertTeam, insertTournament, insertMatchMap,
} from '../setup.js'

async function insertMatch(overrides: {
  tournament_id: string
  team_a_id: string
  team_b_id: string
  status?: string
  stage?: string
  scheduled_at?: string
  maps_won_a?: number
  maps_won_b?: number
}): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status, stage,
                          scheduled_at, maps_won_a, maps_won_b)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [overrides.tournament_id, overrides.team_a_id, overrides.team_b_id,
     overrides.status ?? 'finished', overrides.stage ?? '小组赛',
     overrides.scheduled_at ?? '2026-04-10T14:00:00Z',
     overrides.maps_won_a ?? 2, overrides.maps_won_b ?? 1]
  )
  return rows[0].id
}

describe('extractMatchFacts — match + teams + map basics', () => {
  beforeEach(() => resetTables(
    'player_round_economies', 'match_clutches', 'match_kills', 'match_rounds',
    'player_match_stats', 'match_maps', 'matches', 'players', 'teams', 'tournaments'
  ))

  it('returns match meta, teams, and per-map basics for a 2-1 BO3', async () => {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'Team A', region: 'CN' })
    const teamB = await insertTeam({ name: 'Team B', region: 'EU' })
    const matchId = await insertMatch({
      tournament_id: tournId, team_a_id: teamA, team_b_id: teamB,
      stage: '上四区', maps_won_a: 2, maps_won_b: 1,
    })
    await insertMatchMap(matchId, { map_name: 'de_ancient', map_order: 1, score_a: 13, score_b: 7 })
    await insertMatchMap(matchId, { map_name: 'de_mirage',  map_order: 2, score_a: 11, score_b: 13 })
    await insertMatchMap(matchId, { map_name: 'de_inferno', map_order: 3, score_a: 13, score_b: 11 })

    const facts = await extractMatchFacts(matchId)

    expect(facts.match.final_score).toBe('2-1')
    expect(facts.match.best_of).toBe(3)
    expect(facts.match.stage).toBe('上四区')
    expect(facts.teams.a.name).toBe('Team A')
    expect(facts.teams.b.region).toBe('EU')
    expect(facts.maps).toHaveLength(3)
    expect(facts.maps[0].name).toBe('de_ancient')
    expect(facts.maps[0].score_a).toBe(13)
    expect(facts.maps[0].winner_team).toBe('a')
    expect(facts.maps[1].winner_team).toBe('b')
  })

  it('throws when the match does not exist', async () => {
    await expect(extractMatchFacts('00000000-0000-0000-0000-000000000000'))
      .rejects.toThrow(/not found/i)
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts
```

Expected: both tests fail with `Error: extractMatchFacts: not implemented`.

- [ ] **Step 3: Implement minimal version**

Replace `backend/src/lib/news-generation/facts.ts` body with:

```ts
import { query } from '../../db.js'
import type { MatchFacts, MapFacts } from './types.js'

interface MatchRow {
  id: string; stage: string | null; scheduled_at: string | null
  maps_won_a: number; maps_won_b: number
  team_a_id: string | null; team_b_id: string | null
  team_a_name: string | null; team_a_region: string | null
  team_b_name: string | null; team_b_region: string | null
}

interface MapRow {
  id: string; map_name: string; map_order: number
  score_a: number | null; score_b: number | null
  duration_seconds: number | null
  winner_team_id: string | null
}

export async function extractMatchFacts(matchId: string): Promise<MatchFacts> {
  const { rows: mrows } = await query<MatchRow>(
    `SELECT m.id, m.stage, m.scheduled_at, m.maps_won_a, m.maps_won_b,
            m.team_a_id, m.team_b_id,
            ta.name AS team_a_name, ta.region AS team_a_region,
            tb.name AS team_b_name, tb.region AS team_b_region
     FROM matches m
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.id = $1`, [matchId])
  if (mrows.length === 0) throw new Error(`match not found: ${matchId}`)
  const m = mrows[0]

  const { rows: maprows } = await query<MapRow>(
    `SELECT id, map_name, map_order, score_a, score_b, duration_seconds, winner_team_id
     FROM match_maps WHERE match_id = $1 ORDER BY map_order`, [matchId])

  const maps: MapFacts[] = maprows.map(mm => ({
    name: mm.map_name,
    order: mm.map_order,
    score_a: mm.score_a ?? 0,
    score_b: mm.score_b ?? 0,
    winner_team:
      mm.winner_team_id === m.team_a_id ? 'a' :
      mm.winner_team_id === m.team_b_id ? 'b' :
      (mm.score_a ?? 0) > (mm.score_b ?? 0) ? 'a' :
      (mm.score_b ?? 0) > (mm.score_a ?? 0) ? 'b' : null,
    duration_seconds: mm.duration_seconds,
    half_scores: { first_half: '0-0', second_half: '0-0' },
    economy_summary: {
      eco_wins_a: 0, eco_wins_b: 0, force_wins_a: 0, force_wins_b: 0,
      pistol_wins: { a: 0, b: 0 },
    },
    pivotal_rounds: [], clutches: [], standout_players: [], notable_kills: [],
  }))

  return {
    match: {
      stage: m.stage,
      scheduled_at: m.scheduled_at,
      best_of: maps.length,
      final_score: `${m.maps_won_a}-${m.maps_won_b}`,
    },
    teams: {
      a: { name: m.team_a_name ?? '?', region: m.team_a_region },
      b: { name: m.team_b_name ?? '?', region: m.team_b_region },
    },
    maps,
    match_mvp: null,
    storylines: [],
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/news-generation/facts.ts backend/tests/news-generation/facts.test.ts
git commit -m "feat(news-gen): extract match meta, teams, and map basics"
```

---

### Task 5: `extractMatchFacts` — half scores + economy summary

**Files:**
- Modify: `backend/src/lib/news-generation/facts.ts`
- Modify: `backend/tests/news-generation/facts.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `backend/tests/news-generation/facts.test.ts` inside the existing `describe('extractMatchFacts — match + teams + map basics', …)`:

```ts
  it('aggregates half scores, eco wins, force wins, and pistol wins per map', async () => {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const matchId = await insertMatch({
      tournament_id: tournId, team_a_id: teamA, team_b_id: teamB, maps_won_a: 1, maps_won_b: 0,
    })
    const map = await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1, score_a: 13, score_b: 5 })

    // 18 rounds: A wins both pistols, A wins 1 eco round, B wins 1 force-buy round
    // First half (rounds 1-12): A side=3 (CT), B side=2 (T)
    // Second half (rounds 13+): sides flipped
    const rows: Array<{
      round: number; winner_side: number;
      ta_side: number; tb_side: number; ta_score: number; tb_score: number;
      ta_eco: string; tb_eco: string;
    }> = [
      { round: 1,  winner_side: 3, ta_side: 3, tb_side: 2, ta_score: 1, tb_score: 0, ta_eco: 'pistol', tb_eco: 'pistol' },
      { round: 2,  winner_side: 3, ta_side: 3, tb_side: 2, ta_score: 2, tb_score: 0, ta_eco: 'eco',    tb_eco: 'full_buy' },
      { round: 3,  winner_side: 2, ta_side: 3, tb_side: 2, ta_score: 2, tb_score: 1, ta_eco: 'full_buy', tb_eco: 'force' },
      { round: 13, winner_side: 2, ta_side: 2, tb_side: 3, ta_score: 8, tb_score: 4, ta_eco: 'pistol', tb_eco: 'pistol' },
    ]
    for (const r of rows) {
      await query(
        `INSERT INTO match_rounds
          (match_map_id, round_number, winner_side,
           team_a_side, team_b_side, team_a_score, team_b_score,
           team_a_economy_type, team_b_economy_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [map.id, r.round, r.winner_side, r.ta_side, r.tb_side,
         r.ta_score, r.tb_score, r.ta_eco, r.tb_eco]
      )
    }
    // Final-tally rounds carrying the half score bookkeeping
    await query(
      `INSERT INTO match_rounds
        (match_map_id, round_number, winner_side, team_a_side, team_b_side,
         team_a_score, team_b_score, team_a_economy_type, team_b_economy_type)
       VALUES ($1,12,3,3,2,8,4,'full_buy','full_buy'),
              ($1,18,2,2,3,13,5,'full_buy','full_buy')`,
      [map.id]
    )

    const facts = await extractMatchFacts(matchId)
    const m = facts.maps[0]
    expect(m.half_scores.first_half).toBe('8-4')
    expect(m.half_scores.second_half).toBe('5-1')   // 13-5 minus 8-4
    expect(m.economy_summary.pistol_wins).toEqual({ a: 1, b: 1 })
    expect(m.economy_summary.eco_wins_a).toBe(1)    // round 2 — A eco beat B full_buy
    expect(m.economy_summary.force_wins_b).toBe(1)  // round 3 — B force beat A full_buy
  })
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts -t 'aggregates half scores'
```

Expected: fails — `half_scores.first_half === '0-0'`.

- [ ] **Step 3: Implement aggregation**

Replace the `MapFacts[] = maprows.map(...)` block in `facts.ts` with:

```ts
  const maps: MapFacts[] = []
  for (const mm of maprows) {
    const { rows: rrows } = await query<{
      round_number: number; winner_side: number | null
      team_a_side: number | null; team_b_side: number | null
      team_a_score: number | null; team_b_score: number | null
      team_a_economy_type: string | null; team_b_economy_type: string | null
    }>(
      `SELECT round_number, winner_side, team_a_side, team_b_side,
              team_a_score, team_b_score, team_a_economy_type, team_b_economy_type
       FROM match_rounds WHERE match_map_id = $1 ORDER BY round_number`, [mm.id])

    const halves = computeHalfScores(rrows, mm.score_a ?? 0, mm.score_b ?? 0)
    const economy = computeEconomySummary(rrows)

    maps.push({
      name: mm.map_name,
      order: mm.map_order,
      score_a: mm.score_a ?? 0,
      score_b: mm.score_b ?? 0,
      winner_team:
        mm.winner_team_id === m.team_a_id ? 'a' :
        mm.winner_team_id === m.team_b_id ? 'b' :
        (mm.score_a ?? 0) > (mm.score_b ?? 0) ? 'a' :
        (mm.score_b ?? 0) > (mm.score_a ?? 0) ? 'b' : null,
      duration_seconds: mm.duration_seconds,
      half_scores: halves,
      economy_summary: economy,
      pivotal_rounds: [], clutches: [], standout_players: [], notable_kills: [],
    })
  }
```

Add helpers below `extractMatchFacts`:

```ts
type RoundRow = {
  round_number: number; winner_side: number | null
  team_a_side: number | null; team_b_side: number | null
  team_a_score: number | null; team_b_score: number | null
  team_a_economy_type: string | null; team_b_economy_type: string | null
}

function computeHalfScores(rounds: RoundRow[], finalA: number, finalB: number) {
  const firstHalfRounds = rounds.filter(r => r.round_number <= 12)
  const last = firstHalfRounds[firstHalfRounds.length - 1]
  const fhA = last?.team_a_score ?? 0
  const fhB = last?.team_b_score ?? 0
  const shA = finalA - fhA
  const shB = finalB - fhB
  const total = finalA + finalB
  const result: { first_half: string; second_half: string; ot?: string } = {
    first_half: `${fhA}-${fhB}`,
    second_half: `${Math.max(shA, 0)}-${Math.max(shB, 0)}`,
  }
  if (total > 24) {
    const otA = finalA - Math.min(fhA + shA, finalA)
    const otB = finalB - Math.min(fhB + shB, finalB)
    result.ot = `${otA}-${otB}`
  }
  return result
}

function computeEconomySummary(rounds: RoundRow[]) {
  const ECO = new Set(['eco', 'semi_eco'])
  const FORCE = new Set(['force'])
  const PISTOL = new Set(['pistol'])
  let eco_wins_a = 0, eco_wins_b = 0, force_wins_a = 0, force_wins_b = 0
  let pistol_a = 0, pistol_b = 0

  for (const r of rounds) {
    const aWon = r.winner_side === r.team_a_side
    const bWon = r.winner_side === r.team_b_side
    const aType = (r.team_a_economy_type ?? '').toLowerCase()
    const bType = (r.team_b_economy_type ?? '').toLowerCase()

    if (PISTOL.has(aType) && PISTOL.has(bType)) {
      if (aWon) pistol_a++
      if (bWon) pistol_b++
    }
    if (aWon && ECO.has(aType) && bType === 'full_buy') eco_wins_a++
    if (bWon && ECO.has(bType) && aType === 'full_buy') eco_wins_b++
    if (aWon && FORCE.has(aType) && bType === 'full_buy') force_wins_a++
    if (bWon && FORCE.has(bType) && aType === 'full_buy') force_wins_b++
  }
  return {
    eco_wins_a, eco_wins_b, force_wins_a, force_wins_b,
    pistol_wins: { a: pistol_a, b: pistol_b },
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts
```

Expected: all `extractMatchFacts` tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/news-generation/facts.ts backend/tests/news-generation/facts.test.ts
git commit -m "feat(news-gen): half scores + eco/force/pistol summary per map"
```

---

### Task 6: `extractMatchFacts` — standout players + match MVP

**Files:**
- Modify: `backend/src/lib/news-generation/facts.ts`
- Modify: `backend/tests/news-generation/facts.test.ts`

- [ ] **Step 1: Add the failing test**

Append a new top-level `describe` block in `facts.test.ts`:

```ts
import { insertPlayer, insertPlayerMatchStats } from '../setup.js'
// (add the imports to the existing import line at top)

describe('extractMatchFacts — players + MVP', () => {
  beforeEach(() => resetTables(
    'player_round_economies', 'match_clutches', 'match_kills', 'match_rounds',
    'player_match_stats', 'match_maps', 'matches', 'players', 'teams', 'tournaments'
  ))

  it('selects top 3 standouts per map sorted by rating', async () => {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const matchId = await insertMatch({
      tournament_id: tournId, team_a_id: teamA, team_b_id: teamB, maps_won_a: 1, maps_won_b: 0,
    })
    const map = await insertMatchMap(matchId, { map_name: 'de_nuke', map_order: 1, score_a: 13, score_b: 8 })

    const star = await insertPlayer({ nickname: 'Star',  team_id: teamA })
    const mid  = await insertPlayer({ nickname: 'Mid',   team_id: teamA })
    const low  = await insertPlayer({ nickname: 'Low',   team_id: teamA })
    const noob = await insertPlayer({ nickname: 'Noob',  team_id: teamA })
    await insertPlayerMatchStats(map.id, star.id, teamA, { kills: 28, deaths: 14, rating: 1.55, adr: 95, headshot_pct: 55 })
    await insertPlayerMatchStats(map.id, mid.id,  teamA, { kills: 20, deaths: 16, rating: 1.20, adr: 80, headshot_pct: 40 })
    await insertPlayerMatchStats(map.id, low.id,  teamA, { kills: 18, deaths: 18, rating: 1.05, adr: 70, headshot_pct: 35 })
    await insertPlayerMatchStats(map.id, noob.id, teamA, { kills: 8,  deaths: 22, rating: 0.55, adr: 35, headshot_pct: 15 })

    const facts = await extractMatchFacts(matchId)
    const standouts = facts.maps[0].standout_players
    expect(standouts.map(s => s.player_nickname)).toEqual(['Star', 'Mid', 'Low'])
    expect(standouts[0].team).toBe('a')
  })

  it('picks match MVP from highest rating across all maps when ≥1.2', async () => {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const matchId = await insertMatch({
      tournament_id: tournId, team_a_id: teamA, team_b_id: teamB, maps_won_a: 2, maps_won_b: 0,
    })
    const m1 = await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1, score_a: 13, score_b: 5 })
    const m2 = await insertMatchMap(matchId, { map_name: 'de_inferno', map_order: 2, score_a: 13, score_b: 9 })
    const ace = await insertPlayer({ nickname: 'Ace', team_id: teamA })
    await insertPlayerMatchStats(m1.id, ace.id, teamA, { rating: 1.45, kills: 25 })
    await insertPlayerMatchStats(m2.id, ace.id, teamA, { rating: 1.30, kills: 22 })
    const facts = await extractMatchFacts(matchId)
    expect(facts.match_mvp?.player_nickname).toBe('Ace')
    expect(facts.match_mvp?.why).toMatch(/rating/i)
  })

  it('returns null match_mvp when no player ≥1.2', async () => {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const matchId = await insertMatch({
      tournament_id: tournId, team_a_id: teamA, team_b_id: teamB, maps_won_a: 0, maps_won_b: 0,
    })
    const map = await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1, score_a: 7, score_b: 13 })
    const p = await insertPlayer({ nickname: 'Mid', team_id: teamA })
    await insertPlayerMatchStats(map.id, p.id, teamA, { rating: 1.10 })

    const facts = await extractMatchFacts(matchId)
    expect(facts.match_mvp).toBeNull()
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts -t 'players + MVP'
```

Expected: 3 tests fail.

- [ ] **Step 3: Implement standouts + MVP**

In `facts.ts`, after computing `economy` and before `maps.push(...)`, add:

```ts
    const standout_players = await loadStandouts(mm.id, m.team_a_id, m.team_b_id)
```

Then update the pushed object: `standout_players,` (replace the empty array). Add helpers below the existing helpers:

```ts
async function loadStandouts(
  matchMapId: string,
  teamAId: string | null,
  teamBId: string | null,
): Promise<MapFacts['standout_players']> {
  const { rows } = await query<{
    nickname: string; team_id: string | null
    kills: number | null; deaths: number | null; assists: number | null
    adr: number | null; headshot_pct: number | null
    first_kills: number | null; first_deaths: number | null; rating: number | null
  }>(
    `SELECT p.nickname, pms.team_id, pms.kills, pms.deaths, pms.assists,
            pms.adr, pms.headshot_pct, pms.first_kills, pms.first_deaths, pms.rating
     FROM player_match_stats pms
     JOIN players p ON p.id = pms.player_id
     WHERE pms.match_map_id = $1
     ORDER BY pms.rating DESC NULLS LAST
     LIMIT 3`, [matchMapId])
  return rows.map(r => ({
    player_nickname: r.nickname,
    team: r.team_id === teamAId ? 'a' : r.team_id === teamBId ? 'b' : 'a',
    kills: r.kills ?? 0,
    deaths: r.deaths ?? 0,
    assists: r.assists ?? 0,
    adr: r.adr ?? 0,
    hs_pct: r.headshot_pct ?? 0,
    first_kills: r.first_kills ?? 0,
    first_deaths: r.first_deaths ?? 0,
    rating: r.rating ?? 0,
  }))
}

async function loadMatchMvp(
  matchId: string,
  teamAId: string | null,
  teamBId: string | null,
): Promise<MatchFacts['match_mvp']> {
  const { rows } = await query<{
    nickname: string; team_id: string | null
    avg_rating: number | null; total_kills: number | null
    clutches_won: number | null
  }>(
    `SELECT p.nickname, pms.team_id,
            AVG(pms.rating)::float8 AS avg_rating,
            SUM(pms.kills)::int    AS total_kills,
            COALESCE(SUM(pms.clutches_won),0)::int AS clutches_won
     FROM player_match_stats pms
     JOIN match_maps mm ON mm.id = pms.match_map_id
     JOIN players p ON p.id = pms.player_id
     WHERE mm.match_id = $1
     GROUP BY p.nickname, pms.team_id
     ORDER BY avg_rating DESC NULLS LAST
     LIMIT 1`, [matchId])
  const top = rows[0]
  if (!top || (top.avg_rating ?? 0) < 1.2) return null
  const team = top.team_id === teamAId ? 'a' : top.team_id === teamBId ? 'b' : 'a'
  const why = `rating ${(top.avg_rating ?? 0).toFixed(2)} · ${top.total_kills ?? 0} kills` +
              ((top.clutches_won ?? 0) > 0 ? ` · ${top.clutches_won} clutches` : '')
  return { player_nickname: top.nickname, team, why }
}
```

Add `match_mvp: await loadMatchMvp(matchId, m.team_a_id, m.team_b_id),` to the returned object (replace `match_mvp: null`).

- [ ] **Step 4: Run tests, verify pass**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts
```

Expected: all facts tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/news-generation/facts.ts backend/tests/news-generation/facts.test.ts
git commit -m "feat(news-gen): top-3 standouts and match MVP selection"
```

---

### Task 7: `extractMatchFacts` — clutches

**Files:**
- Modify: `backend/src/lib/news-generation/facts.ts`
- Modify: `backend/tests/news-generation/facts.test.ts`

- [ ] **Step 1: Add the failing test**

Append a new `describe` to `facts.test.ts`:

```ts
describe('extractMatchFacts — clutches', () => {
  beforeEach(() => resetTables(
    'player_round_economies', 'match_clutches', 'match_kills', 'match_rounds',
    'player_match_stats', 'match_maps', 'matches', 'players', 'teams', 'tournaments'
  ))

  it('returns won clutches with situation, weapon, round', async () => {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const matchId = await insertMatch({ tournament_id: tournId, team_a_id: teamA, team_b_id: teamB })
    const map = await insertMatchMap(matchId, { map_name: 'de_mirage', map_order: 1, score_a: 13, score_b: 11 })
    const hero = await insertPlayer({ nickname: 'Hero', team_id: teamA })

    await query(
      `INSERT INTO match_clutches (match_map_id, round_number, player_id, opponent_count, won, kill_count, has_survived)
       VALUES ($1, 7, $2, 3, TRUE, 3, TRUE),
              ($1, 19, $2, 4, TRUE, 4, TRUE),
              ($1, 21, $2, 2, FALSE, 1, FALSE)`,
      [map.id, hero.id]
    )
    // last weapon used by clutch winner in those rounds
    await query(
      `INSERT INTO match_kills (match_map_id, round_number, killer_player_id, weapon_name, tick)
       VALUES ($1, 7,  $2, 'ak47', 100),
              ($1, 19, $2, 'awp',  200)`,
      [map.id, hero.id]
    )

    const facts = await extractMatchFacts(matchId)
    const clutches = facts.maps[0].clutches
    expect(clutches).toHaveLength(2)                     // only won
    expect(clutches.find(c => c.round === 19)?.situation).toBe('1v4')
    expect(clutches.find(c => c.round === 19)?.weapon).toBe('awp')
    expect(clutches.find(c => c.round === 7)?.weapon).toBe('ak47')
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts -t 'clutches'
```

Expected: fails — `clutches` is `[]`.

- [ ] **Step 3: Implement clutches loader**

Add a call inside the `for (const mm …)` loop right before `maps.push(...)`:

```ts
    const clutches = await loadClutches(mm.id)
```

Replace `clutches: [],` in the pushed object with `clutches,`. Add helper:

```ts
async function loadClutches(matchMapId: string): Promise<MapFacts['clutches']> {
  const { rows } = await query<{
    round_number: number; opponent_count: number
    nickname: string | null; weapon_name: string | null
  }>(
    `SELECT mc.round_number, mc.opponent_count, p.nickname,
            (SELECT mk.weapon_name FROM match_kills mk
              WHERE mk.match_map_id = mc.match_map_id
                AND mk.round_number = mc.round_number
                AND mk.killer_player_id = mc.player_id
              ORDER BY mk.tick DESC LIMIT 1) AS weapon_name
     FROM match_clutches mc
     LEFT JOIN players p ON p.id = mc.player_id
     WHERE mc.match_map_id = $1 AND mc.won = TRUE
     ORDER BY mc.opponent_count DESC, mc.round_number ASC`, [matchMapId])
  return rows.map(r => ({
    player_nickname: r.nickname ?? '?',
    situation: `1v${r.opponent_count}`,
    won: true,
    weapon: r.weapon_name,
    round: r.round_number,
  }))
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts -t 'clutches'
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/news-generation/facts.ts backend/tests/news-generation/facts.test.ts
git commit -m "feat(news-gen): clutch loader (won clutches with situation/weapon)"
```

---

### Task 8: `extractMatchFacts` — pivotal rounds

**Files:**
- Modify: `backend/src/lib/news-generation/facts.ts`
- Modify: `backend/tests/news-generation/facts.test.ts`

Implements all 8 `PivotalTag` rules from the spec, capped at 5 per map by tag priority.

- [ ] **Step 1: Add the failing test**

Append `describe` to `facts.test.ts`:

```ts
describe('extractMatchFacts — pivotal rounds', () => {
  beforeEach(() => resetTables(
    'player_round_economies', 'match_clutches', 'match_kills', 'match_rounds',
    'player_match_stats', 'match_maps', 'matches', 'players', 'teams', 'tournaments'
  ))

  async function setupBasicMap(score_a: number, score_b: number) {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const matchId = await insertMatch({
      tournament_id: tournId, team_a_id: teamA, team_b_id: teamB,
      maps_won_a: score_a > score_b ? 1 : 0, maps_won_b: score_b > score_a ? 1 : 0,
    })
    const map = await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1, score_a, score_b })
    return { matchId, mapId: map.id, teamA, teamB }
  }

  it('detects eco_upset when eco team beats full_buy team', async () => {
    const { matchId, mapId } = await setupBasicMap(13, 5)
    await query(
      `INSERT INTO match_rounds
        (match_map_id, round_number, winner_side, team_a_side, team_b_side,
         team_a_score, team_b_score, team_a_economy_type, team_b_economy_type)
       VALUES ($1, 5, 3, 3, 2, 4, 1, 'eco', 'full_buy')`, [mapId])
    const facts = await extractMatchFacts(matchId)
    expect(facts.maps[0].pivotal_rounds.find(p => p.narrative_tag === 'eco_upset')?.round_number).toBe(5)
  })

  it('detects ace_round (single player 5 kills in round)', async () => {
    const { matchId, mapId, teamA } = await setupBasicMap(13, 7)
    const ace = await insertPlayer({ nickname: 'Ace', team_id: teamA })
    for (let i = 0; i < 5; i++) {
      await query(
        `INSERT INTO match_kills (match_map_id, round_number, killer_player_id, weapon_name, tick)
         VALUES ($1, 11, $2, 'ak47', $3)`, [mapId, ace.id, 100 + i])
    }
    const facts = await extractMatchFacts(matchId)
    const ar = facts.maps[0].pivotal_rounds.find(p => p.narrative_tag === 'ace_round')
    expect(ar).toBeDefined()
    expect(ar?.round_number).toBe(11)
    expect(ar?.detail.killer).toBe('Ace')
  })

  it('detects last_round_decided when 12-12 → 13-12', async () => {
    const { matchId, mapId } = await setupBasicMap(13, 12)
    await query(
      `INSERT INTO match_rounds
        (match_map_id, round_number, winner_side, team_a_side, team_b_side,
         team_a_score, team_b_score, team_a_economy_type, team_b_economy_type)
       VALUES ($1, 25, 3, 3, 2, 13, 12, 'full_buy', 'full_buy')`, [mapId])
    const facts = await extractMatchFacts(matchId)
    expect(facts.maps[0].pivotal_rounds.find(p => p.narrative_tag === 'last_round_decided')).toBeDefined()
  })

  it('caps pivotal_rounds at 5 per map ordered by tag priority', async () => {
    const { matchId, mapId, teamA } = await setupBasicMap(13, 11)
    // 6 ace rounds — should be capped at 5
    const ace = await insertPlayer({ nickname: 'Ace', team_id: teamA })
    for (let r = 1; r <= 6; r++) {
      for (let i = 0; i < 5; i++) {
        await query(
          `INSERT INTO match_kills (match_map_id, round_number, killer_player_id, weapon_name, tick)
           VALUES ($1, $2, $3, 'ak47', $4)`, [mapId, r, ace.id, 100 + i])
      }
    }
    const facts = await extractMatchFacts(matchId)
    expect(facts.maps[0].pivotal_rounds.length).toBeLessThanOrEqual(5)
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts -t 'pivotal rounds'
```

Expected: 4 tests fail.

- [ ] **Step 3: Implement pivotal-round detection**

Add to `facts.ts`. Inside the per-map loop, replace `pivotal_rounds: [],` with `pivotal_rounds,` after computing:

```ts
    const pivotal_rounds = await detectPivotalRounds(mm.id, mm.score_a ?? 0, mm.score_b ?? 0, rrows)
```

Add helper at bottom of file:

```ts
const PIVOTAL_PRIORITY: Record<string, number> = {
  ot_thriller: 1, last_round_decided: 2, ace_round: 3,
  eco_upset: 4, force_clutch: 5, comeback_streak: 6,
  pistol_loss_recovery: 7, quad_round: 8,
}

async function detectPivotalRounds(
  matchMapId: string, finalA: number, finalB: number, rounds: RoundRow[],
): Promise<MapFacts['pivotal_rounds']> {
  const out: MapFacts['pivotal_rounds'] = []

  // multi-kill rounds via match_kills
  const { rows: mkAgg } = await query<{
    round_number: number; killer_player_id: string | null; nickname: string | null; n: number
  }>(
    `SELECT mk.round_number, mk.killer_player_id, p.nickname, COUNT(*)::int AS n
     FROM match_kills mk
     LEFT JOIN players p ON p.id = mk.killer_player_id
     WHERE mk.match_map_id = $1 AND mk.killer_player_id IS NOT NULL
     GROUP BY mk.round_number, mk.killer_player_id, p.nickname
     HAVING COUNT(*) >= 4`, [matchMapId])

  for (const k of mkAgg) {
    if (k.n >= 5) {
      out.push({ round_number: k.round_number, narrative_tag: 'ace_round',
                 detail: { killer: k.nickname ?? '?', kills: k.n } })
    } else {
      out.push({ round_number: k.round_number, narrative_tag: 'quad_round',
                 detail: { killer: k.nickname ?? '?', kills: k.n } })
    }
  }

  // eco_upset / force_clutch
  for (const r of rounds) {
    const aWon = r.winner_side === r.team_a_side
    const bWon = r.winner_side === r.team_b_side
    const aType = (r.team_a_economy_type ?? '').toLowerCase()
    const bType = (r.team_b_economy_type ?? '').toLowerCase()
    if (aWon && (aType === 'eco' || aType === 'semi_eco') && bType === 'full_buy') {
      out.push({ round_number: r.round_number, narrative_tag: 'eco_upset',
                 detail: { winner: 'a', winner_economy: aType } })
    }
    if (bWon && (bType === 'eco' || bType === 'semi_eco') && aType === 'full_buy') {
      out.push({ round_number: r.round_number, narrative_tag: 'eco_upset',
                 detail: { winner: 'b', winner_economy: bType } })
    }
    if ((aWon && aType === 'force') || (bWon && bType === 'force')) {
      out.push({ round_number: r.round_number, narrative_tag: 'force_clutch',
                 detail: { winner: aWon ? 'a' : 'b' } })
    }
  }

  // ot_thriller
  if (finalA + finalB > 24 && Math.abs(finalA - finalB) <= 2) {
    const otStart = rounds.find(r => r.round_number > 24)
    out.push({ round_number: otStart?.round_number ?? 25, narrative_tag: 'ot_thriller',
               detail: { final: `${finalA}-${finalB}` } })
  }

  // last_round_decided (only when no OT and final score 13-12)
  if (finalA + finalB <= 25 && Math.abs(finalA - finalB) === 1 && Math.max(finalA, finalB) === 13) {
    const finalRound = rounds.reduce<RoundRow | null>(
      (best, r) => !best || r.round_number > best.round_number ? r : best, null)
    if (finalRound) {
      out.push({ round_number: finalRound.round_number, narrative_tag: 'last_round_decided',
                 detail: { final: `${finalA}-${finalB}` } })
    }
  }

  // pistol_loss_recovery
  const fhPistol = rounds.find(r => r.round_number === 1)
  const shPistol = rounds.find(r => r.round_number === 13)
  const finalWinner = finalA > finalB ? 'a' : finalB > finalA ? 'b' : null
  if (finalWinner && fhPistol && shPistol) {
    const fhLoser = fhPistol.winner_side === fhPistol.team_a_side ? 'b' : 'a'
    const shLoser = shPistol.winner_side === shPistol.team_a_side ? 'b' : 'a'
    if (fhLoser === finalWinner || shLoser === finalWinner) {
      out.push({ round_number: 13, narrative_tag: 'pistol_loss_recovery',
                 detail: { winner: finalWinner } })
    }
  }

  // comeback_streak (≥3 consecutive losses then ≥4 consecutive wins, same team)
  for (const team of ['a', 'b'] as const) {
    let losses = 0
    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i]
      const won = r.winner_side === (team === 'a' ? r.team_a_side : r.team_b_side)
      if (!won) { losses++; continue }
      if (losses >= 3) {
        // count consecutive wins from i
        let wins = 0
        for (let j = i; j < rounds.length; j++) {
          const rj = rounds[j]
          const wj = rj.winner_side === (team === 'a' ? rj.team_a_side : rj.team_b_side)
          if (!wj) break
          wins++
        }
        if (wins >= 4) {
          out.push({ round_number: r.round_number, narrative_tag: 'comeback_streak',
                     detail: { team, after_losses: losses, win_streak: wins } })
          break
        }
      }
      losses = 0
    }
  }

  // dedupe by (round, tag) and cap by priority
  const seen = new Set<string>()
  const unique = out.filter(p => {
    const key = `${p.round_number}-${p.narrative_tag}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  unique.sort((a, b) =>
    (PIVOTAL_PRIORITY[a.narrative_tag] ?? 99) - (PIVOTAL_PRIORITY[b.narrative_tag] ?? 99))
  return unique.slice(0, 5)
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts
```

Expected: all facts tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/news-generation/facts.ts backend/tests/news-generation/facts.test.ts
git commit -m "feat(news-gen): pivotal-round detection (8 tags, priority-capped)"
```

---

### Task 9: `extractMatchFacts` — notable kills

**Files:**
- Modify: `backend/src/lib/news-generation/facts.ts`
- Modify: `backend/tests/news-generation/facts.test.ts`

- [ ] **Step 1: Add the failing test**

```ts
describe('extractMatchFacts — notable kills', () => {
  beforeEach(() => resetTables(
    'player_round_economies', 'match_clutches', 'match_kills', 'match_rounds',
    'player_match_stats', 'match_maps', 'matches', 'players', 'teams', 'tournaments'
  ))

  it('detects no_scope_awp, through_smoke, long_distance_awp, flash_assisted_pickoff', async () => {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const matchId = await insertMatch({ tournament_id: tournId, team_a_id: teamA, team_b_id: teamB })
    const map = await insertMatchMap(matchId, { map_name: 'de_inferno', map_order: 1, score_a: 13, score_b: 9 })
    const k = await insertPlayer({ nickname: 'Killer', team_id: teamA })
    const v = await insertPlayer({ nickname: 'Victim', team_id: teamB })

    await query(
      `INSERT INTO match_kills
        (match_map_id, round_number, tick, weapon_name, weapon_type,
         is_headshot, is_no_scope, is_through_smoke, is_assisted_flash, distance,
         killer_player_id, victim_player_id)
       VALUES
        ($1, 3, 100, 'awp', 'sniper', false, true,  false, false, 800,  $2, $3),
        ($1, 4, 100, 'm4a4','rifle',  false, false, true,  false, 1200, $2, $3),
        ($1, 5, 100, 'awp', 'sniper', false, false, false, false, 2800, $2, $3),
        ($1, 6, 50,  'ak47','rifle',  true,  false, false, true,  900,  $2, $3),
        ($1, 6, 80,  'ak47','rifle',  true,  false, false, false, 600,  $2, $3)`,
      [map.id, k.id, v.id]
    )

    const facts = await extractMatchFacts(matchId)
    const tags = facts.maps[0].notable_kills.map(n => n.tag)
    expect(tags).toContain('no_scope_awp')
    expect(tags).toContain('through_smoke')
    expect(tags).toContain('long_distance_awp')
    expect(tags).toContain('flash_assisted_pickoff')   // round 6 first kill
    expect(facts.maps[0].notable_kills.length).toBeLessThanOrEqual(8)
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts -t 'notable kills'
```

Expected: fails — array empty.

- [ ] **Step 3: Implement notable-kill detection**

In facts.ts loop, before `maps.push`:

```ts
    const notable_kills = await detectNotableKills(mm.id)
```

Replace `notable_kills: [],` with `notable_kills,`. Add helper:

```ts
async function detectNotableKills(matchMapId: string): Promise<MapFacts['notable_kills']> {
  const { rows } = await query<{
    round_number: number; tick: number | null
    weapon_name: string | null; is_no_scope: boolean
    is_through_smoke: boolean; is_assisted_flash: boolean
    distance: number | null
    killer_nick: string | null; victim_nick: string | null
  }>(
    `SELECT mk.round_number, mk.tick, mk.weapon_name,
            mk.is_no_scope, mk.is_through_smoke, mk.is_assisted_flash, mk.distance,
            pk.nickname AS killer_nick, pv.nickname AS victim_nick
     FROM match_kills mk
     LEFT JOIN players pk ON pk.id = mk.killer_player_id
     LEFT JOIN players pv ON pv.id = mk.victim_player_id
     WHERE mk.match_map_id = $1
     ORDER BY mk.round_number, mk.tick`, [matchMapId])

  // first-kill ticks per round
  const firstTickByRound = new Map<number, number>()
  for (const r of rows) {
    if (r.tick == null) continue
    if (!firstTickByRound.has(r.round_number) || r.tick < firstTickByRound.get(r.round_number)!) {
      firstTickByRound.set(r.round_number, r.tick)
    }
  }

  const out: MapFacts['notable_kills'] = []
  for (const r of rows) {
    const base = {
      round: r.round_number,
      killer: r.killer_nick ?? '?',
      victim: r.victim_nick ?? '?',
      weapon: r.weapon_name ?? '?',
    }
    const isAwp = (r.weapon_name ?? '').toLowerCase() === 'awp'
    if (isAwp && r.is_no_scope) {
      out.push({ ...base, tag: 'no_scope_awp', detail: { distance: r.distance } })
      continue
    }
    if (r.is_through_smoke) {
      out.push({ ...base, tag: 'through_smoke', detail: { distance: r.distance } })
      continue
    }
    if (isAwp && (r.distance ?? 0) > 2500) {
      out.push({ ...base, tag: 'long_distance_awp', detail: { distance: r.distance } })
      continue
    }
    if (r.is_assisted_flash && r.tick === firstTickByRound.get(r.round_number)) {
      out.push({ ...base, tag: 'flash_assisted_pickoff', detail: {} })
      continue
    }
  }

  // multi-kill round tags from the same source for completeness (dedupe by round + tag)
  const { rows: mr } = await query<{
    round_number: number; n: number; nickname: string | null
  }>(
    `SELECT mk.round_number, COUNT(*)::int AS n, p.nickname
     FROM match_kills mk
     LEFT JOIN players p ON p.id = mk.killer_player_id
     WHERE mk.match_map_id = $1 AND mk.killer_player_id IS NOT NULL
     GROUP BY mk.round_number, mk.killer_player_id, p.nickname
     HAVING COUNT(*) >= 4`, [matchMapId])
  for (const k of mr) {
    out.push({
      round: k.round_number,
      killer: k.nickname ?? '?', victim: '—', weapon: '—',
      tag: k.n >= 5 ? 'ace_in_round' : 'quad_in_round',
      detail: { kills: k.n },
    })
  }

  // dedupe and cap at 8
  const seen = new Set<string>()
  return out.filter(n => {
    const key = `${n.round}-${n.tag}-${n.killer}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 8)
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/news-generation/facts.ts backend/tests/news-generation/facts.test.ts
git commit -m "feat(news-gen): notable-kill detection (5 tags, deduped, capped at 8)"
```

---

### Task 10: `extractMatchFacts` — storylines

**Files:**
- Modify: `backend/src/lib/news-generation/facts.ts`
- Modify: `backend/tests/news-generation/facts.test.ts`

- [ ] **Step 1: Add the failing test**

```ts
describe('extractMatchFacts — storylines', () => {
  beforeEach(() => resetTables(
    'player_round_economies', 'match_clutches', 'match_kills', 'match_rounds',
    'player_match_stats', 'match_maps', 'matches', 'players', 'teams', 'tournaments'
  ))

  it('flags player_X_carried_with_N_clutches when ≥2 wins by one player', async () => {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const matchId = await insertMatch({ tournament_id: tournId, team_a_id: teamA, team_b_id: teamB })
    const map = await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1, score_a: 13, score_b: 7 })
    const hero = await insertPlayer({ nickname: 'Hero', team_id: teamA })
    await query(
      `INSERT INTO match_clutches (match_map_id, round_number, player_id, opponent_count, won, kill_count, has_survived)
       VALUES ($1, 4, $2, 2, TRUE, 2, TRUE), ($1, 19, $2, 3, TRUE, 3, TRUE)`,
      [map.id, hero.id]
    )
    const facts = await extractMatchFacts(matchId)
    expect(facts.storylines.some(s => s.includes('Hero') && s.includes('clutch'))).toBe(true)
  })

  it('flags pistol_double_loss for the team that lost both pistols', async () => {
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const matchId = await insertMatch({ tournament_id: tournId, team_a_id: teamA, team_b_id: teamB })
    const map = await insertMatchMap(matchId, { map_name: 'de_mirage', map_order: 1, score_a: 13, score_b: 5 })
    await query(
      `INSERT INTO match_rounds
        (match_map_id, round_number, winner_side, team_a_side, team_b_side,
         team_a_score, team_b_score, team_a_economy_type, team_b_economy_type)
       VALUES ($1, 1, 3, 3, 2, 1, 0, 'pistol', 'pistol'),
              ($1, 13, 2, 2, 3, 8, 4, 'pistol', 'pistol')`,
      [map.id]
    )
    const facts = await extractMatchFacts(matchId)
    expect(facts.storylines.some(s => s.includes('pistol') && s.includes('B'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts -t 'storylines'
```

Expected: fails — `storylines` is `[]`.

- [ ] **Step 3: Implement storyline detection**

In `extractMatchFacts`, after computing `maps`, replace `storylines: [],` with:

```ts
    storylines: detectStorylines(maps, m.team_a_name ?? 'A', m.team_b_name ?? 'B', m.maps_won_a, m.maps_won_b),
```

Add helper:

```ts
function detectStorylines(
  maps: MapFacts[], teamAName: string, teamBName: string,
  finalMapsA: number, finalMapsB: number,
): Storyline[] {
  const out: Storyline[] = []

  for (let i = 0; i < maps.length; i++) {
    const m = maps[i]
    const idx = i + 1

    // dropped_first_half_then_collapsed
    const fhA = parseInt(m.half_scores.first_half.split('-')[0]!, 10)
    const fhB = parseInt(m.half_scores.first_half.split('-')[1]!, 10)
    if (fhA - fhB >= 4 && m.winner_team === 'b') {
      out.push(`${teamAName}_dropped_first_half_then_collapsed_map_${idx}`)
    } else if (fhB - fhA >= 4 && m.winner_team === 'a') {
      out.push(`${teamBName}_dropped_first_half_then_collapsed_map_${idx}`)
    }

    // ot
    if (m.half_scores.ot) out.push(`map_${idx}_ot_thriller`)

    // pistol_double_loss
    if (m.economy_summary.pistol_wins.a === 2 && m.economy_summary.pistol_wins.b === 0) {
      out.push(`pistol_double_loss_team_${teamBName}_map_${idx}`)
    }
    if (m.economy_summary.pistol_wins.b === 2 && m.economy_summary.pistol_wins.a === 0) {
      out.push(`pistol_double_loss_team_${teamAName}_map_${idx}`)
    }

    // carried_with_N_clutches
    const byPlayer = new Map<string, number>()
    for (const c of m.clutches) byPlayer.set(c.player_nickname, (byPlayer.get(c.player_nickname) ?? 0) + 1)
    for (const [nick, n] of byPlayer) {
      if (n >= 2) out.push(`player_${nick}_carried_with_${n}_clutches_map_${idx}`)
    }

    // awp_dominance: standout with ≥10 awp kills (we approximate via standouts kills + hs_pct heuristic)
    // skipped — needs per-weapon stat we don't store; YAGNI for v1
  }

  // comeback_from_X_Y_deficit
  if (maps.length >= 3) {
    if (finalMapsA > finalMapsB) {
      const lostFirst = maps[0].winner_team === 'b'
      if (lostFirst) out.push(`${teamAName}_comeback_after_dropping_map_1`)
    }
    if (finalMapsB > finalMapsA) {
      const lostFirst = maps[0].winner_team === 'a'
      if (lostFirst) out.push(`${teamBName}_comeback_after_dropping_map_1`)
    }
  }

  return out
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd backend && npm test -- tests/news-generation/facts.test.ts
```

Expected: all facts tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/news-generation/facts.ts backend/tests/news-generation/facts.test.ts
git commit -m "feat(news-gen): storyline detection (carried/pistol/comeback/dropped/ot)"
```

---

## Phase 3 — LLM Layer

### Task 11: Prompt builder

**Files:**
- Create: `backend/src/lib/news-generation/prompt.ts`
- Create: `backend/tests/news-generation/prompt.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/news-generation/prompt.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildPrompt, SYSTEM_PROMPT, PROMPT_VERSION } from '../../src/lib/news-generation/prompt.js'
import type { MatchFacts } from '../../src/lib/news-generation/types.js'

const sampleFacts: MatchFacts = {
  match: { stage: '小组赛', scheduled_at: '2026-04-10T14:00:00Z', best_of: 3, final_score: '2-1' },
  teams: { a: { name: 'A', region: 'CN' }, b: { name: 'B', region: 'EU' } },
  maps: [],
  match_mvp: null,
  storylines: [],
}

describe('buildPrompt', () => {
  it('exposes a versioned PROMPT_VERSION string', () => {
    expect(PROMPT_VERSION).toMatch(/^v\d+/)
  })

  it('SYSTEM_PROMPT bans subheadings, four-section templates, bullets, and impersonation', () => {
    const sp = SYSTEM_PROMPT.toLowerCase()
    expect(SYSTEM_PROMPT).toMatch(/禁止小标题/)
    expect(SYSTEM_PROMPT).toMatch(/禁止.*四段|四段.*禁止/)
    expect(SYSTEM_PROMPT).toMatch(/禁止.*bullet|罗列|列表/)
    expect(SYSTEM_PROMPT).toMatch(/800.*1200|1200.*800/)
    expect(SYSTEM_PROMPT).toMatch(/不要冒称/)
    expect(sp).toContain('json')
  })

  it('user message embeds the facts JSON', () => {
    const { user } = buildPrompt(sampleFacts)
    expect(user).toContain('"final_score": "2-1"')
    expect(user).toContain('"name": "A"')
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/news-generation/prompt.test.ts
```

Expected: fails — module not found.

- [ ] **Step 3: Implement prompt module**

`backend/src/lib/news-generation/prompt.ts`:

```ts
import type { MatchFacts } from './types.js'

export const PROMPT_VERSION = 'v1'

export const SYSTEM_PROMPT = `你是一名资深 CS 解说，正在为「ALAST Premier 2026」赛后社区写一篇赛报。

【风格定位】
- 海归口吻，中英文混杂自如，但 CS 术语必须准确：eco / force / retake / clutch / ninja / anti-eco / save / trade / opening duel
- 擅成语，不带脏字。煽情时刻可引诗，但每篇最多一处，不要滥用
- 抽象、段子、煽情三种语气可切换，不要每句都抖梗，节奏松紧有度
- 偶尔自嘲、偶尔预判读者反应（"我知道你们要说……"）
- 用「神」不用「形」 —— 不要直接引用任何特定主播的具名口头禅或弹幕梗
- 第一人称口吻

【写作约束】
- 全文 800-1200 字
- 散文式，禁止小标题，禁止「开场/赛况/MVP/展望」之类四段式模板，禁止 bullet 列表 / 罗列式段落
- 必须落地到具体数据：比分、选手昵称、回合号、武器名都要出现
- 每篇要有自己的角度 —— 读者可能一次读多篇，不要每篇都从「BO3 比分」开篇；从事实包里挑你最想讲的故事入手
- 不要冒称真人，不要署名为某位真实存在的解说

【输出格式】
直接返回一个 JSON 对象，无任何前后缀文本：
{
  "title": string,    // ≤30 字，中文
  "summary": string,  // ≤120 字，独立成段，不要重复正文开头
  "content": string   // markdown 字符串
}`

export function buildPrompt(facts: MatchFacts): { system: string; user: string } {
  const user = `这是一场 ALAST Premier 2026 比赛的事实包，请按 system 的要求写一篇赛报：\n\n` +
    JSON.stringify(facts, null, 2)
  return { system: SYSTEM_PROMPT, user }
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd backend && npm test -- tests/news-generation/prompt.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/news-generation/prompt.ts backend/tests/news-generation/prompt.test.ts
git commit -m "feat(news-gen): system prompt with style + format constraints"
```

---

### Task 12: `generateArticle` — call LLM, parse, retry, persist

**Files:**
- Create: `backend/src/lib/news-generation/generate.ts`
- Create: `backend/tests/news-generation/generate.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/news-generation/generate.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetTables, query, insertTeam, insertTournament, insertMatchMap,
} from '../setup.js'

vi.mock('../../src/lib/anthropic.js', () => {
  const create = vi.fn()
  return {
    getAnthropic: () => ({ messages: { create } }),
    __esMockCreate: create,
  }
})

const { __esMockCreate: mockCreate } = await import('../../src/lib/anthropic.js') as unknown as {
  __esMockCreate: ReturnType<typeof vi.fn>
}
const { generateArticle } = await import('../../src/lib/news-generation/generate.js')

async function setupMatch() {
  const tournId = await insertTournament()
  const teamA = await insertTeam({ name: 'A' })
  const teamB = await insertTeam({ name: 'B' })
  const { rows } = await query<{ id: string }>(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status, maps_won_a, maps_won_b)
     VALUES ($1,$2,$3,'finished',2,1) RETURNING id`,
    [tournId, teamA, teamB])
  const matchId = rows[0].id
  await insertMatchMap(matchId, { map_name: 'de_dust2', map_order: 1, score_a: 13, score_b: 7 })
  return matchId
}

function mockReply(json: object) {
  return {
    content: [{ type: 'text', text: JSON.stringify(json) }],
    usage: { input_tokens: 100, output_tokens: 200 },
  }
}

describe('generateArticle', () => {
  beforeEach(async () => {
    await resetTables(
      'news', 'player_round_economies', 'match_clutches', 'match_kills',
      'match_rounds', 'player_match_stats', 'match_maps', 'matches',
      'players', 'teams', 'tournaments'
    )
    mockCreate.mockReset()
  })

  it('persists a draft news row with ai_generated=true and correct author', async () => {
    const matchId = await setupMatch()
    mockCreate.mockResolvedValueOnce(mockReply({
      title: '一场酣畅淋漓的开场之战',
      summary: 'A 用一手稳如老狗的下半场把 B 按在地上摩擦……',
      content: '## 正文\n这是一场……',
    }))

    const news = await generateArticle(matchId)
    expect(news.ai_generated).toBe(true)
    expect(news.author).toBe('ALAST 解说团')
    expect(news.category).toBe('战报')
    expect(news.published_at).toBeNull()
    expect(news.match_id).toBe(matchId)
    expect(news.generation_meta).toMatchObject({
      model: expect.stringContaining('claude'),
      prompt_version: expect.stringMatching(/^v\d+/),
      facts_hash: expect.any(String),
      retry_count: 0,
    })
  })

  it('retries once on JSON parse failure then succeeds', async () => {
    const matchId = await setupMatch()
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'Sure! Here is the article: {' }],
    })
    mockCreate.mockResolvedValueOnce(mockReply({
      title: 'T', summary: 'S', content: 'C',
    }))

    const news = await generateArticle(matchId)
    expect(news.title).toBe('T')
    expect(news.generation_meta?.retry_count).toBe(1)
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('truncates over-length title/summary and records a warning', async () => {
    const matchId = await setupMatch()
    const longTitle = '一'.repeat(40)
    const longSummary = '一'.repeat(150)
    mockCreate.mockResolvedValueOnce(mockReply({
      title: longTitle, summary: longSummary, content: 'X',
    }))

    const news = await generateArticle(matchId)
    expect(news.title.length).toBeLessThanOrEqual(30)
    expect(news.summary!.length).toBeLessThanOrEqual(120)
    expect(news.generation_meta?.warnings).toContain('title truncated')
    expect(news.generation_meta?.warnings).toContain('summary truncated')
  })

  it('idempotent: returns existing AI news for same match when force=false', async () => {
    const matchId = await setupMatch()
    mockCreate.mockResolvedValueOnce(mockReply({ title: 'A', summary: 'S', content: 'C' }))
    const first = await generateArticle(matchId)
    mockCreate.mockResolvedValueOnce(mockReply({ title: 'B', summary: 'S2', content: 'C2' }))
    const second = await generateArticle(matchId)
    expect(second.id).toBe(first.id)
    expect(second.title).toBe('A')
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('force=true updates in place, preserving id/slug/published_at', async () => {
    const matchId = await setupMatch()
    mockCreate.mockResolvedValueOnce(mockReply({ title: 'first', summary: 'S', content: 'C' }))
    const first = await generateArticle(matchId)
    await query(`UPDATE news SET published_at = NOW() WHERE id = $1`, [first.id])
    mockCreate.mockResolvedValueOnce(mockReply({ title: 'second', summary: 'S2', content: 'C2' }))
    const second = await generateArticle(matchId, { force: true })
    expect(second.id).toBe(first.id)
    expect(second.slug).toBe(first.slug)
    expect(second.title).toBe('second')
    expect(second.published_at).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/news-generation/generate.test.ts
```

Expected: fails — module not found.

- [ ] **Step 3: Implement `generateArticle`**

`backend/src/lib/news-generation/generate.ts`:

```ts
import { query } from '../../db.js'
import { getAnthropic } from '../anthropic.js'
import { extractMatchFacts } from './facts.js'
import { buildPrompt, PROMPT_VERSION } from './prompt.js'
import { hashFacts } from './factsHash.js'
import type { GenerationMeta } from './types.js'

const MODEL = 'claude-sonnet-4-6'
const TITLE_MAX = 30
const SUMMARY_MAX = 120

interface GenOpts { force?: boolean }

export interface GeneratedNewsRow {
  id: string; title: string; slug: string; summary: string | null
  content: string | null; category: string | null; match_id: string | null
  author: string | null; published_at: string | null
  ai_generated: boolean; generation_meta: GenerationMeta | null
}

export class LLMError extends Error {}
export class LLMParseError extends Error {}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^\w\s\u4e00-\u9fff-]/g, '')
    .replace(/\s+/g, '-').slice(0, 80) + '-' + Date.now().toString(36)
}

function extractText(resp: unknown): string {
  const r = resp as { content?: Array<{ type: string; text?: string }> }
  const textBlock = r.content?.find(b => b.type === 'text')
  return textBlock?.text ?? ''
}

function parseArticleJson(text: string): { title: string; summary: string; content: string } {
  // strip code fences if present
  const cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
  let parsed: unknown
  try { parsed = JSON.parse(cleaned) }
  catch { throw new LLMParseError('LLM returned non-JSON content') }
  const o = parsed as Record<string, unknown>
  if (typeof o.title !== 'string' || typeof o.content !== 'string') {
    throw new LLMParseError('LLM JSON missing required fields')
  }
  return {
    title: o.title,
    summary: typeof o.summary === 'string' ? o.summary : '',
    content: o.content,
  }
}

async function callLLM(system: string, user: string): Promise<string> {
  const client = getAnthropic()
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 2500,
        temperature: 0.8,
        system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: user }],
      })
      return extractText(resp)
    } catch (e) {
      lastErr = e
      if (attempt < 2) await new Promise(r => setTimeout(r, attempt === 0 ? 1000 : 4000))
    }
  }
  throw new LLMError(`Anthropic API failed: ${(lastErr as Error)?.message ?? lastErr}`)
}

export async function generateArticle(matchId: string, opts: GenOpts = {}): Promise<GeneratedNewsRow> {
  const { rows: existingRows } = await query<GeneratedNewsRow>(
    `SELECT * FROM news WHERE match_id = $1 AND ai_generated = TRUE LIMIT 1`, [matchId])
  const existing = existingRows[0]
  if (existing && !opts.force) return existing

  const facts = await extractMatchFacts(matchId)
  const { system, user } = buildPrompt(facts)

  let raw = await callLLM(system, user)
  let retry_count = 0
  let parsed: { title: string; summary: string; content: string }
  try {
    parsed = parseArticleJson(raw)
  } catch (e) {
    if (!(e instanceof LLMParseError)) throw e
    retry_count = 1
    raw = await callLLM(system, user + '\n\n请只返回 JSON 对象，无任何前后缀文本。')
    parsed = parseArticleJson(raw)
  }

  const warnings: string[] = []
  let title = parsed.title
  if (title.length > TITLE_MAX) { title = title.slice(0, TITLE_MAX); warnings.push('title truncated') }
  let summary = parsed.summary
  if (summary.length > SUMMARY_MAX) { summary = summary.slice(0, SUMMARY_MAX); warnings.push('summary truncated') }

  const meta: GenerationMeta = {
    model: MODEL, prompt_version: PROMPT_VERSION,
    generated_at: new Date().toISOString(),
    facts_hash: hashFacts(facts), retry_count, warnings,
  }

  if (existing) {
    const { rows } = await query<GeneratedNewsRow>(
      `UPDATE news SET title = $1, summary = $2, content = $3, generation_meta = $4
       WHERE id = $5 RETURNING *`,
      [title, summary, parsed.content, meta, existing.id])
    return rows[0]
  }
  const slug = slugify(title)
  const { rows } = await query<GeneratedNewsRow>(
    `INSERT INTO news (title, slug, summary, content, category, match_id, author,
                       ai_generated, generation_meta, published_at)
     VALUES ($1,$2,$3,$4,'战报',$5,'ALAST 解说团',TRUE,$6,NULL)
     RETURNING *`,
    [title, slug, summary, parsed.content, matchId, meta])
  return rows[0]
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd backend && npm test -- tests/news-generation/generate.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/lib/news-generation/generate.ts backend/tests/news-generation/generate.test.ts
git commit -m "feat(news-gen): generateArticle — LLM call + parse + retry + persist"
```

---

## Phase 4 — Entry Points

### Task 13: Backfill CLI script

**Files:**
- Create: `backend/scripts/generate-news.ts`

This task has no automated test (CLI script). The validation step is a real backfill run review.

- [ ] **Step 1: Write the script**

`backend/scripts/generate-news.ts`:

```ts
/**
 * Backfill AI recap articles for finished matches.
 *
 * Usage:
 *   npx tsx scripts/generate-news.ts
 *   npx tsx scripts/generate-news.ts --force
 *   npx tsx scripts/generate-news.ts <match-id>            (single match)
 *   npx tsx scripts/generate-news.ts <match-id> --force
 *
 * Exit codes:
 *   0 — all targeted matches succeeded
 *   1 — some succeeded, some failed
 *   2 — all failed or invalid configuration
 */

import 'dotenv/config'
import { pool, query } from '../src/db.js'
import { generateArticle } from '../src/lib/news-generation/generate.js'

interface CliArgs { matchId: string | null; force: boolean }

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2)
  const force = args.includes('--force')
  const positional = args.find(a => !a.startsWith('--'))
  return { matchId: positional ?? null, force }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY not set')
    process.exit(2)
  }
  const { matchId, force } = parseArgs(process.argv)

  let targets: string[]
  if (matchId) {
    targets = [matchId]
  } else {
    const { rows } = await query<{ id: string }>(
      `SELECT m.id FROM matches m
       WHERE m.status = 'finished'
         AND EXISTS (SELECT 1 FROM match_maps mm WHERE mm.match_id = m.id)
       ORDER BY m.scheduled_at NULLS LAST`)
    targets = rows.map(r => r.id)
  }

  console.log(`Targets: ${targets.length} match(es)${force ? ' (force)' : ''}`)
  const failed: Array<{ id: string; reason: string }> = []
  let succeeded = 0
  let skipped = 0

  for (const id of targets) {
    try {
      const before = await query<{ id: string }>(
        `SELECT id FROM news WHERE match_id = $1 AND ai_generated = TRUE`, [id])
      if (before.rows.length > 0 && !force) {
        skipped++
        console.log(`  ⊘ ${id} (existing AI news, use --force to regenerate)`)
        continue
      }
      const news = await generateArticle(id, { force })
      succeeded++
      console.log(`  ✓ ${id} → ${news.title}`)
    } catch (e) {
      failed.push({ id, reason: (e as Error).message })
      console.log(`  ✗ ${id}: ${(e as Error).message}`)
    }
  }

  console.log(`\nDone. succeeded=${succeeded} skipped=${skipped} failed=${failed.length}`)
  if (failed.length > 0) console.log('Failures:', failed)

  await pool.end()
  if (failed.length === 0) process.exit(0)
  if (succeeded === 0) process.exit(2)
  process.exit(1)
}

main().catch(e => { console.error(e); process.exit(2) })
```

- [ ] **Step 2: Smoke-test the script (no API key needed for arg parsing)**

```bash
cd backend && unset ANTHROPIC_API_KEY && npx tsx scripts/generate-news.ts; echo "exit=$?"
```

Expected output: `ERROR: ANTHROPIC_API_KEY not set` and `exit=2`.

- [ ] **Step 3: Commit**

```bash
git add backend/scripts/generate-news.ts
git commit -m "feat(news-gen): CLI backfill script for finished matches"
```

- [ ] **Step 4: Run a real backfill against dev DB, review output**

```bash
cd backend && export ANTHROPIC_API_KEY=<your key> && npx tsx scripts/generate-news.ts
```

Expected: each finished match prints `✓ <id> → <title>`. Spot-check the generated rows in `psql`:

```bash
psql "$DATABASE_URL" -c "SELECT title, summary, length(content) FROM news WHERE ai_generated = TRUE LIMIT 3;"
```

Read the content of 1-2 articles. If style is off (too templated, repeats梗, wrong facts), iterate on `SYSTEM_PROMPT` in `prompt.ts` and bump `PROMPT_VERSION` to `v2` before re-running with `--force`.

- [ ] **Step 5: Commit any prompt iteration**

```bash
git add backend/src/lib/news-generation/prompt.ts
git commit -m "tune(news-gen): prompt iteration v2 after backfill review"
```

(Skip if prompt v1 was good.)

---

### Task 14: Admin endpoint `POST /api/admin/news/generate`

**Files:**
- Modify: `backend/src/routes/admin/news.ts`
- Create: `backend/tests/admin-news-generate.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/admin-news-generate.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetTables, query, insertTeam, insertTournament, insertMatchMap, getAdminToken,
} from './setup.js'

vi.mock('../src/lib/anthropic.js', () => {
  const create = vi.fn()
  return { getAnthropic: () => ({ messages: { create } }), __esMockCreate: create }
})

const { __esMockCreate: mockCreate } = await import('../src/lib/anthropic.js') as unknown as {
  __esMockCreate: ReturnType<typeof vi.fn>
}
const { default: app } = await import('../src/index.js')

function mockReply(json: object) {
  return {
    content: [{ type: 'text', text: JSON.stringify(json) }],
    usage: { input_tokens: 1, output_tokens: 1 },
  }
}

async function setupFinishedMatch(): Promise<string> {
  const tournId = await insertTournament()
  const teamA = await insertTeam({ name: 'A' })
  const teamB = await insertTeam({ name: 'B' })
  const { rows } = await query<{ id: string }>(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status, maps_won_a, maps_won_b)
     VALUES ($1,$2,$3,'finished',2,1) RETURNING id`,
    [tournId, teamA, teamB])
  await insertMatchMap(rows[0].id, { map_name: 'de_dust2', map_order: 1, score_a: 13, score_b: 7 })
  return rows[0].id
}

describe('POST /api/admin/news/generate', () => {
  beforeEach(async () => {
    await resetTables(
      'news', 'player_round_economies', 'match_clutches', 'match_kills',
      'match_rounds', 'player_match_stats', 'match_maps', 'matches',
      'players', 'teams', 'tournaments', 'admins'
    )
    mockCreate.mockReset()
  })

  it('rejects unauthenticated requests', async () => {
    const res = await app.request('/api/admin/news/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_id: '00000000-0000-0000-0000-000000000000' }),
    })
    expect(res.status).toBe(401)
  })

  it('400 when match_id missing', async () => {
    const token = await getAdminToken()
    const res = await app.request('/api/admin/news/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('400 NO_MATCH_DATA when match has no maps', async () => {
    const token = await getAdminToken()
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'A' })
    const teamB = await insertTeam({ name: 'B' })
    const { rows } = await query<{ id: string }>(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
       VALUES ($1,$2,$3,'upcoming') RETURNING id`,
      [tournId, teamA, teamB])
    const res = await app.request('/api/admin/news/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ match_id: rows[0].id }),
    })
    expect(res.status).toBe(400)
    const body = await res.json() as { code: string }
    expect(body.code).toBe('NO_MATCH_DATA')
  })

  it('201 generates a new article (idempotent on second call)', async () => {
    const token = await getAdminToken()
    const matchId = await setupFinishedMatch()
    mockCreate.mockResolvedValueOnce(mockReply({ title: 'T', summary: 'S', content: 'C' }))

    const r1 = await app.request('/api/admin/news/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ match_id: matchId }),
    })
    expect(r1.status).toBe(201)

    const r2 = await app.request('/api/admin/news/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ match_id: matchId }),
    })
    expect(r2.status).toBe(200)
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/admin-news-generate.test.ts
```

Expected: tests fail — endpoint not registered.

- [ ] **Step 3: Implement endpoint**

Append to `backend/src/routes/admin/news.ts`:

```ts
import { generateArticle, LLMError, LLMParseError } from '../../lib/news-generation/generate.js'

r.post('/generate', async (c) => {
  const body = await c.req.json<{ match_id?: string; force?: boolean }>()
  if (!body.match_id) return c.json(err('match_id is required', 'VALIDATION_ERROR'), 400)

  const { rows: m } = await query(
    `SELECT m.id, m.status,
            (SELECT COUNT(*)::int FROM match_maps mm WHERE mm.match_id = m.id) AS map_count
     FROM matches m WHERE m.id = $1`, [body.match_id])
  if (m.length === 0) return c.json(err('match not found', 'NO_MATCH_DATA'), 400)
  if (m[0].status !== 'finished' || m[0].map_count === 0) {
    return c.json(err('match not finished or has no maps', 'NO_MATCH_DATA'), 400)
  }

  const { rows: existing } = await query(
    `SELECT id FROM news WHERE match_id = $1 AND ai_generated = TRUE LIMIT 1`, [body.match_id])
  const isCreate = existing.length === 0 || body.force === true
  // (note: when force=true and existing row exists, generateArticle UPDATEs in place)

  try {
    const news = await generateArticle(body.match_id, { force: body.force === true })
    return c.json(ok({ news }), isCreate && existing.length === 0 ? 201 : 200)
  } catch (e) {
    if (e instanceof LLMParseError) return c.json(err(e.message, 'LLM_PARSE_ERROR'), 502)
    if (e instanceof LLMError)      return c.json(err(e.message, 'LLM_ERROR'), 502)
    throw e
  }
})
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd backend && npm test -- tests/admin-news-generate.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/admin/news.ts backend/tests/admin-news-generate.test.ts
git commit -m "feat(admin): POST /api/admin/news/generate endpoint"
```

---

## Phase 5 — Cross-Link APIs

### Task 15: `GET /api/matches/:id/news`

**Files:**
- Modify: `backend/src/routes/match-maps.ts`
- Create: `backend/tests/match-news-link.test.ts`

- [ ] **Step 1: Write the failing test**

`backend/tests/match-news-link.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import app from '../src/index.js'
import {
  resetTables, query, insertTeam, insertTournament, insertMatchMap,
} from './setup.js'

async function setupMatch(): Promise<string> {
  const tournId = await insertTournament()
  const teamA = await insertTeam({ name: 'A' })
  const teamB = await insertTeam({ name: 'B' })
  const { rows } = await query<{ id: string }>(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status, maps_won_a, maps_won_b)
     VALUES ($1,$2,$3,'finished',2,1) RETURNING id`,
    [tournId, teamA, teamB])
  await insertMatchMap(rows[0].id, { map_name: 'de_dust2', map_order: 1, score_a: 13, score_b: 7 })
  return rows[0].id
}

async function insertPublishedNews(matchId: string, title: string) {
  const slug = `${title.toLowerCase()}-${Date.now()}-${Math.random()}`
  const { rows } = await query<{ id: string; slug: string }>(
    `INSERT INTO news (title, slug, summary, content, category, match_id, author, ai_generated, published_at)
     VALUES ($1, $2, 'sum', 'cont', '战报', $3, 'ALAST 解说团', TRUE, NOW())
     RETURNING id, slug`, [title, slug, matchId])
  return rows[0]
}

describe('GET /api/matches/:id/news', () => {
  beforeEach(() => resetTables(
    'news', 'match_maps', 'matches', 'teams', 'tournaments'
  ))

  it('returns published AI news for the match', async () => {
    const matchId = await setupMatch()
    await insertPublishedNews(matchId, 'Recap')
    const res = await app.request(`/api/matches/${matchId}/news`)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ title: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].title).toBe('Recap')
  })

  it('does NOT return draft (published_at IS NULL) news', async () => {
    const matchId = await setupMatch()
    const slug = `draft-${Date.now()}`
    await query(
      `INSERT INTO news (title, slug, content, category, match_id, ai_generated)
       VALUES ('Draft', $1, 'c', '战报', $2, TRUE)`, [slug, matchId])
    const res = await app.request(`/api/matches/${matchId}/news`)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/match-news-link.test.ts -t 'GET /api/matches/:id/news'
```

Expected: 404 from Hono — route not registered.

- [ ] **Step 3: Implement route**

Append to `backend/src/routes/match-maps.ts`:

```ts
// GET /api/matches/:id/news
r.get('/:id/news', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT id, title, slug, summary, cover_image_url, category,
            author, published_at, ai_generated
     FROM news
     WHERE match_id = $1 AND published_at IS NOT NULL
     ORDER BY published_at DESC`, [id])
  return c.json(ok(rows))
})
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd backend && npm test -- tests/match-news-link.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/match-maps.ts backend/tests/match-news-link.test.ts
git commit -m "feat(api): GET /api/matches/:id/news"
```

---

### Task 16: Extend `GET /api/news` with embedded `match`

**Files:**
- Modify: `backend/src/routes/news.ts`
- Modify: `backend/tests/match-news-link.test.ts`

- [ ] **Step 1: Append failing test**

Add a new `describe` to `backend/tests/match-news-link.test.ts`:

```ts
describe('GET /api/news embeds match info', () => {
  beforeEach(() => resetTables(
    'news', 'match_maps', 'matches', 'teams', 'tournaments'
  ))

  it('includes match.{score,team_a_name,team_b_name,team_a_logo,team_b_logo} when match_id is set', async () => {
    const matchId = await setupMatch()
    await insertPublishedNews(matchId, 'WithMatch')
    const res = await app.request('/api/news')
    const body = await res.json() as {
      data: Array<{ title: string; match: { score: string; team_a_name: string } | null }>
    }
    const found = body.data.find(n => n.title === 'WithMatch')
    expect(found?.match).not.toBeNull()
    expect(found?.match?.score).toBe('2-1')
    expect(found?.match?.team_a_name).toBe('A')
  })

  it('match field is null when news has no match_id', async () => {
    const slug = `no-match-${Date.now()}`
    await query(
      `INSERT INTO news (title, slug, content, category, published_at)
       VALUES ('NoMatch', $1, 'c', '资讯', NOW())`, [slug])
    const res = await app.request('/api/news')
    const body = await res.json() as { data: Array<{ title: string; match: unknown }> }
    expect(body.data.find(n => n.title === 'NoMatch')?.match).toBeNull()
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/match-news-link.test.ts -t 'embeds match info'
```

Expected: fails — `match` field undefined.

- [ ] **Step 3: Modify `GET /api/news` to LEFT JOIN match data**

Replace the `r.get('/', …)` handler in `backend/src/routes/news.ts`:

```ts
r.get('/', async (c) => {
  const category = c.req.query('category')
  const q        = c.req.query('q')
  const limit    = Math.min(parseInt(c.req.query('limit') ?? '20'), 100)
  const offset   = parseInt(c.req.query('offset') ?? '0')

  let sql = `
    SELECT n.*,
           CASE WHEN m.id IS NULL THEN NULL ELSE
             json_build_object(
               'id', m.id,
               'score', m.maps_won_a || '-' || m.maps_won_b,
               'team_a_name', ta.name,
               'team_b_name', tb.name,
               'team_a_logo', ta.logo_url,
               'team_b_logo', tb.logo_url
             )
           END AS match
    FROM news n
    LEFT JOIN matches m ON m.id = n.match_id
    LEFT JOIN teams ta ON ta.id = m.team_a_id
    LEFT JOIN teams tb ON tb.id = m.team_b_id
    WHERE n.published_at IS NOT NULL
  `
  const params: unknown[] = []
  if (category) { params.push(category); sql += ` AND n.category = $${params.length}` }
  if (q)        { params.push(`%${q}%`); sql += ` AND (n.title ILIKE $${params.length} OR n.summary ILIKE $${params.length})` }
  params.push(limit, offset)
  sql += ` ORDER BY n.published_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`

  const { rows } = await query(sql, params)
  return c.json(ok(rows))
})
```

- [ ] **Step 4: Run tests, verify pass + no regression**

```bash
cd backend && npm test -- tests/match-news-link.test.ts tests/news.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/news.ts backend/tests/match-news-link.test.ts
git commit -m "feat(api): embed match info in GET /api/news rows"
```

---

### Task 17: Extend `GET /api/matches` with `news_slug`

**Files:**
- Modify: `backend/src/routes/matches.ts`
- Modify: `backend/tests/match-news-link.test.ts`

- [ ] **Step 1: Append failing test**

```ts
describe('GET /api/matches exposes news_slug', () => {
  beforeEach(() => resetTables(
    'news', 'match_maps', 'matches', 'teams', 'tournaments'
  ))

  it('returns news_slug for matches with a published article, null otherwise', async () => {
    const withMatchId = await setupMatch()
    const { slug } = await insertPublishedNews(withMatchId, 'Linked')
    const tournId = await insertTournament()
    const teamA = await insertTeam({ name: 'C' })
    const teamB = await insertTeam({ name: 'D' })
    const { rows: bare } = await query<{ id: string }>(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status, maps_won_a, maps_won_b)
       VALUES ($1,$2,$3,'finished',2,0) RETURNING id`, [tournId, teamA, teamB])

    const res = await app.request('/api/matches')
    const body = await res.json() as { data: Array<{ id: string; news_slug: string | null }> }
    const linked = body.data.find(m => m.id === withMatchId)
    const bareMatch = body.data.find(m => m.id === bare[0].id)
    expect(linked?.news_slug).toBe(slug)
    expect(bareMatch?.news_slug).toBeNull()
  })
})
```

- [ ] **Step 2: Run test, verify failure**

```bash
cd backend && npm test -- tests/match-news-link.test.ts -t 'news_slug'
```

Expected: fails — field undefined.

- [ ] **Step 3: Modify list query**

In `backend/src/routes/matches.ts`, modify the `r.get('/', …)` SQL — replace the `SELECT m.*, …` and joins:

```ts
  let sql = `
    SELECT m.*,
           ta.name as team_a_name, ta.logo_url as team_a_logo,
           tb.name as team_b_name, tb.logo_url as team_b_logo,
           t.name as tournament_name,
           (SELECT n.slug FROM news n
             WHERE n.match_id = m.id AND n.published_at IS NOT NULL
             ORDER BY n.published_at DESC LIMIT 1) AS news_slug
    FROM matches m
    LEFT JOIN teams ta ON ta.id = m.team_a_id
    LEFT JOIN teams tb ON tb.id = m.team_b_id
    LEFT JOIN tournaments t ON t.id = m.tournament_id
    WHERE 1=1
  `
```

- [ ] **Step 4: Run tests, verify pass + no regression**

```bash
cd backend && npm test -- tests/match-news-link.test.ts tests/matches.test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/matches.ts backend/tests/match-news-link.test.ts
git commit -m "feat(api): expose news_slug on GET /api/matches rows"
```

---

## Phase 6 — Frontend

### Task 18: Extend `frontend/src/types.ts` and add `useMatchNews`

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/news.ts`

- [ ] **Step 1: Extend types**

In `frontend/src/types.ts`, edit the `NewsArticle` interface — add the bottom three fields:

```ts
export interface NewsArticle {
  id: string
  title: string
  slug: string
  summary: string | null
  content: string | null
  cover_image_url: string | null
  category: string | null
  match_id: string | null
  author: string | null
  published_at: string | null
  created_at: string
  ai_generated?: boolean
  match?: {
    id: string
    score: string
    team_a_name: string | null
    team_b_name: string | null
    team_a_logo: string | null
    team_b_logo: string | null
  } | null
  generation_meta?: Record<string, unknown> | null
}
```

In the `Match` interface, add the bottom field:

```ts
export interface Match {
  // ...existing fields...
  news_slug?: string | null
}
```

- [ ] **Step 2: Add `useMatchNews` hook**

Append to `frontend/src/api/news.ts`:

```ts
export function useMatchNews(matchId: string | undefined) {
  return useQuery({
    queryKey: ['matches', matchId, 'news'],
    queryFn: () => apiFetch<NewsArticle[]>(`/api/matches/${matchId}/news`),
    enabled: !!matchId,
  })
}
```

- [ ] **Step 3: Type-check frontend**

```bash
cd frontend && npx tsc -b
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/news.ts
git commit -m "feat(frontend): types + useMatchNews hook for cross-link"
```

---

### Task 19: MatchDetailPage bottom recap section

**Files:**
- Modify: `frontend/src/pages/MatchDetailPage.tsx`

- [ ] **Step 1: Wire the new section**

Add the import (top of file, with other api hook imports):

```ts
import { useMatchNews } from '../api/news'
import { Link } from 'react-router-dom'
```

Inside the component (right after `useMapHighlights(...)` line):

```ts
  const { data: matchNews = [] } = useMatchNews(id)
  const recap = matchNews[0]
```

At the bottom of the JSX, **after** the Highlights section closing tag (before the outermost `</motion.div>`):

```tsx
      {/* G. Post-Match Recap */}
      {recap && (
        <motion.section
          variants={panelReveal}
          className="rounded-xl p-6 surface-sheen"
          style={{ background: 'var(--color-data-surface)', border: '1px solid var(--color-data-divider)' }}
        >
          <h2 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
            🎤 赛后解读
          </h2>
          <Link to={`/news/${recap.slug}`} className="block group">
            <h3 className="text-2xl font-black text-white/90 group-hover:text-white mb-2">
              {recap.title}
            </h3>
            {recap.summary && (
              <p className="text-sm text-white/60 leading-relaxed mb-3">{recap.summary}</p>
            )}
            <span className="inline-flex items-center gap-1 text-sm font-semibold"
                  style={{ color: 'var(--color-accent)' }}>
              阅读全文 →
            </span>
          </Link>
        </motion.section>
      )}
```

- [ ] **Step 2: Type-check + manual smoke**

```bash
cd frontend && npx tsc -b
```

Then start dev server and visit a match that has a published AI news row in dev DB:

```bash
cd frontend && npm run dev
```

Expected: section appears below Highlights; clicking navigates to `/news/<slug>`. Match without news → no section.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/MatchDetailPage.tsx
git commit -m "feat(frontend): recap section on MatchDetailPage"
```

---

### Task 20: NewsDetailPage — top match card + bottom disclaimer + CTA

**Files:**
- Modify: `frontend/src/pages/NewsDetailPage.tsx`

- [ ] **Step 1: Add imports**

Top of file, add:

```ts
import { useMatch } from '../api/matches'
import TeamLogo from '../components/TeamLogo'
```

- [ ] **Step 2: Fetch the linked match**

After `const { data: article, isLoading, error } = useNewsArticle(slug!)`:

```ts
  const { data: match } = useMatch(article?.match_id ?? '')
```

- [ ] **Step 3: Insert top match card after the back link**

Replace this block:

```tsx
      <motion.div className="mb-6" variants={fadeUp}>
        <Link to="/news" className="text-sm opacity-50 hover:opacity-80" style={{ color: 'var(--color-accent)' }}>← 返回新闻</Link>
      </motion.div>
```

with:

```tsx
      <motion.div className="mb-6" variants={fadeUp}>
        <Link to="/news" className="text-sm opacity-50 hover:opacity-80" style={{ color: 'var(--color-accent)' }}>← 返回新闻</Link>
      </motion.div>

      {article.match_id && match && (
        <motion.div variants={panelReveal} className="mb-6">
          <Link to={`/matches/${match.id}`} className="block">
            <div className="flex items-center gap-4 px-4 py-3 rounded-lg surface-sheen hover:opacity-90 transition-opacity"
                 style={{ background: 'var(--color-data-surface)', border: '1px solid var(--color-data-divider)' }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <TeamLogo url={match.team_a_logo ?? null} name={match.team_a_name ?? '?'} size={32} />
                <span className="font-black text-sm truncate text-white/90">{match.team_a_name ?? 'TBD'}</span>
              </div>
              <span className="text-xl font-black tabular-nums text-white/80">
                {match.maps_won_a} : {match.maps_won_b}
              </span>
              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                <span className="font-black text-sm truncate text-right text-white/90">{match.team_b_name ?? 'TBD'}</span>
                <TeamLogo url={match.team_b_logo ?? null} name={match.team_b_name ?? '?'} size={32} />
              </div>
              {match.stage && (
                <span className="hidden sm:inline text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">
                  {match.stage}
                </span>
              )}
            </div>
          </Link>
        </motion.div>
      )}
```

- [ ] **Step 4: Append bottom disclaimer + CTA**

Replace the trailing `{article.content && (...)}` block's closing `)}` with the same block followed by:

```tsx
      {article.ai_generated && (
        <motion.p variants={fadeUp} className="mt-10 text-xs italic opacity-40">
          本文由 AI 模仿「玩机器」解说风格生成，仅为致敬，与本人无关。
        </motion.p>
      )}

      {article.match_id && (
        <motion.div variants={fadeUp} className="mt-8 mb-12 text-center">
          <Link to={`/matches/${article.match_id}`}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg font-black text-sm transition-opacity hover:opacity-80"
                style={{ background: 'var(--color-accent)', color: '#fff' }}>
            📊 查看完整比赛数据 →
          </Link>
        </motion.div>
      )}
```

- [ ] **Step 5: Type-check + manual smoke**

```bash
cd frontend && npx tsc -b
```

Visit a published AI news article in the browser. Verify:
- Match card appears at top, click goes to `/matches/...`
- Disclaimer appears under content for `ai_generated` articles
- CTA button appears for articles with a `match_id`

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/NewsDetailPage.tsx
git commit -m "feat(frontend): match card + disclaimer + data CTA on news detail"
```

---

### Task 21: NewsPage list card mini-match line

**Files:**
- Modify: `frontend/src/pages/NewsPage.tsx`

- [ ] **Step 1: Render the line when `match` is present**

In `frontend/src/pages/NewsPage.tsx`, find this block:

```tsx
                      <h3 className="font-black text-sm leading-snug line-clamp-2 flex-1 text-white/90">{a.title}</h3>
                      {a.summary && (
                        <p className="text-xs text-white/50 mt-1.5 line-clamp-2">{a.summary}</p>
                      )}
```

Insert the mini-match line right after the `<h3>`:

```tsx
                      <h3 className="font-black text-sm leading-snug line-clamp-2 flex-1 text-white/90">{a.title}</h3>
                      {a.match && (
                        <p className="text-[10px] mt-1 text-white/45 font-bold tabular-nums">
                          {a.match.team_a_name} <span className="text-white/30">vs</span> {a.match.team_b_name}
                          <span className="ml-1.5 text-white/55">· {a.match.score}</span>
                        </p>
                      )}
                      {a.summary && (
                        <p className="text-xs text-white/50 mt-1.5 line-clamp-2">{a.summary}</p>
                      )}
```

- [ ] **Step 2: Type-check + manual smoke**

```bash
cd frontend && npx tsc -b && npm run dev
```

Visit `/news`. Cards for AI recaps should show the team-vs-team line with score.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/NewsPage.tsx
git commit -m "feat(frontend): show linked match info on news list card"
```

---

### Task 22: MatchesPage list card 🎤 indicator

**Files:**
- Modify: `frontend/src/pages/MatchesPage.tsx`

- [ ] **Step 1: Show icon, link to news when present**

In `frontend/src/pages/MatchesPage.tsx`, find the import line and add `Link`:

```ts
import { Link } from 'react-router-dom'
```

Find the meta row inside each card:

```tsx
                    <div className="flex items-center gap-2 mb-2.5">
                      {m.stage && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{m.stage}</span>
                      )}
                      {m.scheduled_at && (
                        <span className="text-[9px] text-white/25 ml-auto tabular-nums">
                          {dayjs(m.scheduled_at).format('MM-DD HH:mm')}
                        </span>
                      )}
                    </div>
```

Insert the icon between stage and scheduled_at:

```tsx
                    <div className="flex items-center gap-2 mb-2.5">
                      {m.stage && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">{m.stage}</span>
                      )}
                      {m.news_slug && (
                        <Link
                          to={`/news/${m.news_slug}`}
                          onClick={(e) => e.stopPropagation()}
                          title="查看赛报"
                          className="text-[10px] opacity-60 hover:opacity-100 transition-opacity"
                        >
                          🎤
                        </Link>
                      )}
                      {m.scheduled_at && (
                        <span className="text-[9px] text-white/25 ml-auto tabular-nums">
                          {dayjs(m.scheduled_at).format('MM-DD HH:mm')}
                        </span>
                      )}
                    </div>
```

- [ ] **Step 2: Type-check + manual smoke**

```bash
cd frontend && npx tsc -b && npm run dev
```

Visit `/matches`. Matches with published recaps should show 🎤. Click 🎤 → navigates to news article (NOT match detail).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/MatchesPage.tsx
git commit -m "feat(frontend): 🎤 recap indicator on matches list"
```

---

## Final verification

- [ ] **Run the full backend test suite**

```bash
cd backend && npm test
```

Expected: every test passes — no regressions in `news.test.ts`, `matches.test.ts`, `match-maps.test.ts`, etc.

- [ ] **Run the frontend type-check + build**

```bash
cd frontend && npm run build
```

Expected: type-check clean, bundle succeeds.

- [ ] **End-to-end smoke**

1. Backfill recaps locally: `cd backend && npx tsx scripts/generate-news.ts`
2. Bulk-publish via psql or admin UI: `psql "$DATABASE_URL" -c "UPDATE news SET published_at = NOW() WHERE ai_generated = TRUE AND published_at IS NULL;"`
3. Browse: `/news` shows AI recaps with team-vs-team lines; `/matches` shows 🎤 indicators; `/news/:slug` shows match card + disclaimer + CTA; `/matches/:id` shows recap section at the bottom.

---

## Self-review notes (resolved during plan-write)

- Spec §1 fact extraction → Tasks 4-10. All `PivotalTag` rules implemented in Task 8 except `pistol_loss_recovery` (also in Task 8) and `comeback_streak` (also in Task 8). `awp_dominance_player_X` storyline marked YAGNI in Task 10 (no per-weapon stat in `player_match_stats` schema).
- Spec §2 LLM layer → Tasks 11-12. Cache control via `system: [{ type: 'text', text, cache_control: 'ephemeral' }]` SDK shape.
- Spec §3 schema → Task 2.
- Spec §4 entry points → Tasks 13 (script), 14 (admin endpoint).
- Spec §5 frontend → Tasks 18-22 mapping 1:1 with sub-sections 5.1-5.4 plus types/hook prep in 18.
- Spec §6 error handling → covered in Task 12 (LLM retry) and Task 14 (NO_MATCH_DATA / LLM_ERROR / LLM_PARSE_ERROR HTTP shape).
- Spec §7 testing → woven into Tasks 4-10, 11, 12, 14, 15-17.
- Type names cross-checked: `MatchFacts`, `MapFacts`, `PivotalTag`, `NotableKillTag`, `Storyline`, `GenerationMeta`, `GeneratedNewsRow` consistent throughout.
- Import paths use `.js` suffix on `.ts` sources per repo NodeNext convention.
