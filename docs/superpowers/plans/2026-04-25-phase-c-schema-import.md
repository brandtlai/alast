# Phase C: Schema + Import + API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the DB schema with bracket structure, rich event tables, and Tier system; rewrite the CSDM import pipeline to ingest full demo JSON; add tournament/match/stats API endpoints; wire the frontend GroupStageTab standings and DraftPage.

**Architecture:** Six SQL migrations extend the schema incrementally. A new `tournament-detail.ts` route file handles `/api/tournaments/current|standings|bracket|draft`. A new `match-maps.ts` handles sub-resource endpoints under `/api/matches/:id/maps`. A new `admin/import-demo.ts` handles the rich preview+confirm import flow. Frontend hooks are updated/added to call the new endpoints, then wired into GroupStageTab and DraftPage.

**Tech Stack:** PostgreSQL (migrations via existing `migrate.ts`), Hono, Node ESM (`.js` extensions on `.ts` imports), vitest singleFork hitting `TEST_DATABASE_URL`, React 18, @tanstack/react-query, TypeScript.

---

### Task 1: Migrations 002–006 — schema extensions

**Files:**
- Create: `backend/src/migrations/002_bracket_structure.sql`
- Create: `backend/src/migrations/003_tournament_player_tier.sql`
- Create: `backend/src/migrations/004_player_steam_aliases.sql`
- Create: `backend/src/migrations/005_match_substitutes.sql`
- Create: `backend/src/migrations/006_match_rich_events.sql`

- [ ] **Step 1: Write 002_bracket_structure.sql**

```sql
-- 002_bracket_structure.sql
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS bracket_kind TEXT
    CHECK (bracket_kind IN ('swiss','ub','lb','gf')),
  ADD COLUMN IF NOT EXISTS bracket_round INTEGER,
  ADD COLUMN IF NOT EXISTS best_of INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tournaments_current
  ON tournaments(is_current) WHERE is_current = TRUE;

ALTER TABLE csdm_imports
  ADD COLUMN IF NOT EXISTS checksum TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_csdm_imports_match_checksum
  ON csdm_imports(match_id, checksum)
  WHERE match_id IS NOT NULL AND checksum IS NOT NULL;
```

- [ ] **Step 2: Write 003_tournament_player_tier.sql**

```sql
-- 003_tournament_player_tier.sql
CREATE TABLE IF NOT EXISTS tournament_player_assignment (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tier          TEXT NOT NULL CHECK (tier IN ('S','A','B','C+','D')),
  pick_order    INTEGER,
  is_captain    BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (tournament_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_tpa_tournament ON tournament_player_assignment(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tpa_player ON tournament_player_assignment(player_id);
```

- [ ] **Step 3: Write 004_player_steam_aliases.sql**

```sql
-- 004_player_steam_aliases.sql
CREATE TABLE IF NOT EXISTS player_steam_aliases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  steam_id   TEXT NOT NULL UNIQUE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psa_player ON player_steam_aliases(player_id);
```

- [ ] **Step 4: Write 005_match_substitutes.sql**

```sql
-- 005_match_substitutes.sql
CREATE TABLE IF NOT EXISTS match_substitutes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  lender_team_id   UUID REFERENCES teams(id) ON DELETE SET NULL,
  borrower_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  UNIQUE (match_id, player_id)
);
```

- [ ] **Step 5: Write 006_match_rich_events.sql**

```sql
-- 006_match_rich_events.sql
CREATE TABLE IF NOT EXISTS match_rounds (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_map_id          UUID NOT NULL REFERENCES match_maps(id) ON DELETE CASCADE,
  round_number          INTEGER NOT NULL,
  winner_side           INTEGER,   -- 2=T 3=CT
  winner_team_id        UUID REFERENCES teams(id) ON DELETE SET NULL,
  end_reason            INTEGER,   -- 1=TargetBombed 7=TerroristWin 8=CTWin 9=BombDefused 12=TargetSaved
  duration_ms           INTEGER,
  team_a_side           INTEGER,
  team_b_side           INTEGER,
  team_a_score          INTEGER,
  team_b_score          INTEGER,
  team_a_economy_type   TEXT,
  team_b_economy_type   TEXT,
  team_a_money_spent    INTEGER,
  team_b_money_spent    INTEGER,
  team_a_equipment_value INTEGER,
  team_b_equipment_value INTEGER,
  start_tick            INTEGER,
  end_tick              INTEGER,
  UNIQUE (match_map_id, round_number)
);
CREATE INDEX IF NOT EXISTS idx_mr_match_map ON match_rounds(match_map_id);

CREATE TABLE IF NOT EXISTS match_kills (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_map_id      UUID NOT NULL REFERENCES match_maps(id) ON DELETE CASCADE,
  round_number      INTEGER NOT NULL,
  tick              INTEGER,
  weapon_name       TEXT,
  weapon_type       TEXT,
  is_headshot       BOOLEAN NOT NULL DEFAULT FALSE,
  is_trade_kill     BOOLEAN NOT NULL DEFAULT FALSE,
  is_through_smoke  BOOLEAN NOT NULL DEFAULT FALSE,
  is_no_scope       BOOLEAN NOT NULL DEFAULT FALSE,
  is_assisted_flash BOOLEAN NOT NULL DEFAULT FALSE,
  distance          REAL,
  killer_player_id  UUID REFERENCES players(id) ON DELETE SET NULL,
  victim_player_id  UUID REFERENCES players(id) ON DELETE SET NULL,
  assister_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  killer_side       INTEGER,
  victim_side       INTEGER
);
CREATE INDEX IF NOT EXISTS idx_mk_match_map ON match_kills(match_map_id);

CREATE TABLE IF NOT EXISTS match_clutches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_map_id     UUID NOT NULL REFERENCES match_maps(id) ON DELETE CASCADE,
  round_number     INTEGER NOT NULL,
  player_id        UUID REFERENCES players(id) ON DELETE SET NULL,
  opponent_count   INTEGER NOT NULL,
  won              BOOLEAN NOT NULL DEFAULT FALSE,
  kill_count       INTEGER NOT NULL DEFAULT 0,
  has_survived     BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_mc_match_map ON match_clutches(match_map_id);

CREATE TABLE IF NOT EXISTS player_round_economies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_map_id   UUID NOT NULL REFERENCES match_maps(id) ON DELETE CASCADE,
  round_number   INTEGER NOT NULL,
  player_id      UUID REFERENCES players(id) ON DELETE SET NULL,
  side           INTEGER,
  equipment_value INTEGER,
  money_spent    INTEGER,
  start_money    INTEGER,
  type           TEXT
);
CREATE INDEX IF NOT EXISTS idx_pre_match_map ON player_round_economies(match_map_id);
```

- [ ] **Step 6: Run migrations on dev DB and verify**

```bash
cd /Users/brandt/alast/backend
npm run migrate
```

Expected: output shows 002–006 applied, no errors.

- [ ] **Step 7: Run migrations on test DB**

```bash
cd /Users/brandt/alast/backend
NODE_ENV=test npm run migrate
```

Expected: same 002–006 applied to test DB.

- [ ] **Step 8: Commit**

```bash
cd /Users/brandt/alast/backend
git add src/migrations/002_bracket_structure.sql src/migrations/003_tournament_player_tier.sql src/migrations/004_player_steam_aliases.sql src/migrations/005_match_substitutes.sql src/migrations/006_match_rich_events.sql
git commit -m "feat(db): add migrations 002-006 — bracket structure, tier, aliases, substitutes, rich events"
```

---

### Task 2: Migration 007 — Swiss standings view

**Files:**
- Create: `backend/src/migrations/007_swiss_standings_view.sql`

- [ ] **Step 1: Write 007_swiss_standings_view.sql**

```sql
-- 007_swiss_standings_view.sql
CREATE OR REPLACE VIEW tournament_swiss_standings AS
WITH team_results AS (
  SELECT
    m.tournament_id,
    m.team_a_id AS team_id,
    m.team_b_id AS opponent_id,
    CASE WHEN m.maps_won_a > m.maps_won_b THEN 1 ELSE 0 END AS won,
    COALESCE(
      (SELECT SUM(mm.score_a - mm.score_b) FROM match_maps mm WHERE mm.match_id = m.id),
      0
    ) AS round_diff
  FROM matches m
  WHERE m.bracket_kind = 'swiss' AND m.status = 'finished'
    AND m.team_a_id IS NOT NULL AND m.team_b_id IS NOT NULL
  UNION ALL
  SELECT
    m.tournament_id,
    m.team_b_id AS team_id,
    m.team_a_id AS opponent_id,
    CASE WHEN m.maps_won_b > m.maps_won_a THEN 1 ELSE 0 END AS won,
    COALESCE(
      (SELECT SUM(mm.score_b - mm.score_a) FROM match_maps mm WHERE mm.match_id = m.id),
      0
    ) AS round_diff
  FROM matches m
  WHERE m.bracket_kind = 'swiss' AND m.status = 'finished'
    AND m.team_a_id IS NOT NULL AND m.team_b_id IS NOT NULL
),
team_records AS (
  SELECT
    tournament_id,
    team_id,
    SUM(won)::INTEGER AS wins,
    (COUNT(*) - SUM(won))::INTEGER AS losses,
    SUM(round_diff)::INTEGER AS round_diff
  FROM team_results
  GROUP BY tournament_id, team_id
),
buchholz_calc AS (
  SELECT
    tr.tournament_id,
    tr.team_id,
    COALESCE(SUM(opp.wins), 0)::INTEGER AS buchholz
  FROM team_results tr
  JOIN team_records opp
    ON opp.team_id = tr.opponent_id AND opp.tournament_id = tr.tournament_id
  GROUP BY tr.tournament_id, tr.team_id
)
SELECT
  tr.tournament_id,
  tr.team_id,
  t.name        AS team_name,
  t.short_name  AS team_short_name,
  t.logo_url    AS team_logo_url,
  tr.wins,
  tr.losses,
  COALESCE(b.buchholz, 0) AS buchholz,
  tr.round_diff
FROM team_records tr
JOIN teams t ON t.id = tr.team_id
LEFT JOIN buchholz_calc b
  ON b.team_id = tr.team_id AND b.tournament_id = tr.tournament_id;
```

- [ ] **Step 2: Apply migration**

```bash
cd /Users/brandt/alast/backend
npm run migrate
NODE_ENV=test npm run migrate
```

Expected: migration 007 applied, no errors.

- [ ] **Step 3: Smoke-test view in psql (once matches have bracket_kind='swiss')**

After Task 3 backfill is complete, run:
```sql
SELECT * FROM tournament_swiss_standings ORDER BY wins DESC LIMIT 5;
```

Expected: rows with wins/losses/buchholz/round_diff columns populated.

- [ ] **Step 4: Commit**

```bash
git add src/migrations/007_swiss_standings_view.sql
git commit -m "feat(db): add Swiss standings view (migration 007)"
```

---

### Task 3: Data backfill — bracket_kind + is_current

**Files:**
- Create: `backend/scripts/backfill-bracket-fields.ts`

- [ ] **Step 1: Write backfill script**

```typescript
// backend/scripts/backfill-bracket-fields.ts
import 'dotenv/config'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const q = (sql: string, p?: unknown[]) => pool.query(sql, p)

async function main() {
  // Map stage labels → bracket_kind + bracket_round
  const stageMap: Array<{ stage: string; bracket_kind: string; bracket_round: number }> = [
    { stage: '小组赛 R1', bracket_kind: 'swiss', bracket_round: 1 },
    { stage: '小组赛 R2', bracket_kind: 'swiss', bracket_round: 2 },
    { stage: '小组赛 R3', bracket_kind: 'swiss', bracket_round: 3 },
    { stage: '胜者组 QF', bracket_kind: 'ub',    bracket_round: 1 },
    { stage: '胜者组 SF', bracket_kind: 'ub',    bracket_round: 2 },
    { stage: '胜者组 Final', bracket_kind: 'ub', bracket_round: 3 },
    { stage: '败者组 R1',    bracket_kind: 'lb', bracket_round: 1 },
    { stage: '败者组 R2',    bracket_kind: 'lb', bracket_round: 2 },
    { stage: '败者组 R3',    bracket_kind: 'lb', bracket_round: 3 },
    { stage: '败者组 R4',    bracket_kind: 'lb', bracket_round: 4 },
    { stage: '败者组 Final', bracket_kind: 'lb', bracket_round: 5 },
    { stage: 'Grand Final',  bracket_kind: 'gf', bracket_round: 1 },
    { stage: 'GF',           bracket_kind: 'gf', bracket_round: 1 },
  ]

  for (const { stage, bracket_kind, bracket_round } of stageMap) {
    const { rowCount } = await q(
      `UPDATE matches SET bracket_kind = $1, bracket_round = $2
       WHERE stage = $3 AND bracket_kind IS NULL`,
      [bracket_kind, bracket_round, stage]
    )
    if (rowCount && rowCount > 0) console.log(`  ✓ ${stage} → ${bracket_kind} R${bracket_round} (${rowCount} rows)`)
  }

  // Mark ALAST Premier 2026 as current
  await q(`UPDATE tournaments SET is_current = FALSE`)
  const { rowCount } = await q(
    `UPDATE tournaments SET is_current = TRUE WHERE name = 'ALAST Premier 2026'`
  )
  console.log(`\n✓ is_current set on ${rowCount} tournament(s)`)

  await pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run backfill**

```bash
cd /Users/brandt/alast/backend
npx tsx scripts/backfill-bracket-fields.ts
```

Expected output (example):
```
  ✓ 小组赛 R1 → swiss R1 (7 rows)
  ✓ 小组赛 R2 → swiss R2 (7 rows)
  ✓ 小组赛 R3 → swiss R3 (7 rows)
  ✓ is_current set on 1 tournament(s)
```

- [ ] **Step 3: Verify in psql**

```sql
SELECT COUNT(*) FROM matches WHERE bracket_kind = 'swiss';
-- expect 21
SELECT name, is_current FROM tournaments;
-- expect ALAST Premier 2026 is_current=true
```

- [ ] **Step 4: Commit**

```bash
git add scripts/backfill-bracket-fields.ts
git commit -m "feat(data): backfill bracket_kind/bracket_round + is_current from stage labels"
```

---

### Task 4: Test helpers

**Files:**
- Modify: `backend/tests/setup.ts`

- [ ] **Step 1: Read current setup.ts**

Read `backend/tests/setup.ts` to see existing helpers before editing.

- [ ] **Step 2: Add insertPlayer, insertMatchMap, insertPlayerMatchStats, getAdminToken**

Add after the existing `insertTournament` helper:

```typescript
export async function insertPlayer(overrides: {
  nickname?: string
  team_id?: string
  steam_id?: string
} = {}) {
  const { rows: [p] } = await query(
    `INSERT INTO players (nickname, team_id, steam_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [overrides.nickname ?? 'TestPlayer', overrides.team_id ?? null, overrides.steam_id ?? null]
  )
  return p as { id: string; nickname: string; team_id: string | null; steam_id: string | null }
}

export async function insertMatchMap(matchId: string, overrides: {
  map_name?: string
  map_order?: number
  score_a?: number
  score_b?: number
} = {}) {
  const { rows: [mm] } = await query(
    `INSERT INTO match_maps (match_id, map_name, map_order, score_a, score_b)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [matchId, overrides.map_name ?? 'de_dust2', overrides.map_order ?? 1,
     overrides.score_a ?? null, overrides.score_b ?? null]
  )
  return mm as { id: string; match_id: string; map_name: string }
}

export async function insertPlayerMatchStats(matchMapId: string, playerId: string, teamId: string, overrides: {
  kills?: number; deaths?: number; assists?: number
  adr?: number; kast?: number; rating?: number; headshot_pct?: number
} = {}) {
  const { rows: [pms] } = await query(
    `INSERT INTO player_match_stats (match_map_id, player_id, team_id, kills, deaths, assists, adr, kast, rating, headshot_pct)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [matchMapId, playerId, teamId,
     overrides.kills ?? 15, overrides.deaths ?? 15, overrides.assists ?? 3,
     overrides.adr ?? 75.0, overrides.kast ?? 72.0, overrides.rating ?? 1.0,
     overrides.headshot_pct ?? 40.0]
  )
  return pms as { id: string }
}

export async function getAdminToken(): Promise<string> {
  // Ensure an admin exists
  const bcrypt = await import('bcrypt')
  const hash = await bcrypt.hash('testpass', 10)
  await query(
    `INSERT INTO admins (username, password_hash) VALUES ('testadmin', $1)
     ON CONFLICT (username) DO UPDATE SET password_hash = $1`,
    [hash]
  )
  const res = await app.request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'testadmin', password: 'testpass' }),
  })
  const body = await res.json() as { success: boolean; data?: { token: string } }
  if (!body.success || !body.data?.token) throw new Error('getAdminToken: login failed')
  return body.data.token
}
```

Note: `getAdminToken` imports `app` — add `import { app } from '../src/index.js'` to setup.ts if not already there.

- [ ] **Step 3: Run existing tests to confirm no regressions**

```bash
cd /Users/brandt/alast/backend
npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/setup.ts
git commit -m "test: add insertPlayer/insertMatchMap/insertPlayerMatchStats/getAdminToken helpers"
```

---

### Task 5: Tournament detail API — /current, /standings, /bracket, /draft

**Files:**
- Create: `backend/src/routes/tournament-detail.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write tournament-detail.ts**

```typescript
// backend/src/routes/tournament-detail.ts
import { Hono } from 'hono'
import { query } from '../db.js'
import { ok, err } from '../types.js'

const r = new Hono()

// GET /api/tournaments/current
r.get('/current', async (c) => {
  const { rows } = await query(
    `SELECT * FROM tournaments WHERE is_current = TRUE LIMIT 1`
  )
  if (rows.length === 0) return c.json(err('No current tournament', 'NOT_FOUND'), 404)
  return c.json(ok(rows[0]))
})

// GET /api/tournaments/:id/standings
r.get('/:id/standings', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT * FROM tournament_swiss_standings
     WHERE tournament_id = $1
     ORDER BY wins DESC, buchholz DESC, round_diff DESC`,
    [id]
  )
  return c.json(ok(rows))
})

// GET /api/tournaments/:id/bracket
r.get('/:id/bracket', async (c) => {
  const { id } = c.req.param()
  // Returns all matches grouped by bracket_kind + bracket_round
  const { rows } = await query(
    `SELECT m.id, m.team_a_id, m.team_b_id, m.maps_won_a, m.maps_won_b,
            m.status, m.stage, m.bracket_kind, m.bracket_round, m.best_of,
            m.scheduled_at, m.finished_at,
            ta.name AS team_a_name, ta.logo_url AS team_a_logo,
            tb.name AS team_b_name, tb.logo_url AS team_b_logo
     FROM matches m
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.tournament_id = $1
       AND m.bracket_kind IS NOT NULL
       AND m.bracket_kind != 'swiss'
     ORDER BY
       CASE m.bracket_kind WHEN 'ub' THEN 1 WHEN 'lb' THEN 2 WHEN 'gf' THEN 3 ELSE 4 END,
       m.bracket_round ASC,
       m.scheduled_at ASC NULLS LAST`,
    [id]
  )
  return c.json(ok(rows))
})

// GET /api/tournaments/:id/draft
r.get('/:id/draft', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT tpa.tier, tpa.pick_order, tpa.is_captain,
            p.id AS player_id, p.nickname, p.avatar_url, p.steam_id,
            t.id AS team_id, t.name AS team_name, t.logo_url AS team_logo_url
     FROM tournament_player_assignment tpa
     JOIN players p ON p.id = tpa.player_id
     LEFT JOIN teams t ON t.id = p.team_id
     WHERE tpa.tournament_id = $1
     ORDER BY
       CASE tpa.tier WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C+' THEN 4 WHEN 'D' THEN 5 ELSE 6 END,
       tpa.pick_order ASC NULLS LAST`,
    [id]
  )
  return c.json(ok(rows))
})

export default r
```

- [ ] **Step 2: Mount in index.ts**

Add after the existing `tournamentsRoutes` import:

```typescript
import tournamentDetailRoutes from './routes/tournament-detail.js'
```

Add after `app.route('/api/tournaments', tournamentsRoutes)`:

```typescript
app.route('/api/tournaments', tournamentDetailRoutes)
```

(Hono resolves routes in order, so `/current` matches before `/:id`.)

- [ ] **Step 3: Commit**

```bash
git add src/routes/tournament-detail.ts src/index.ts
git commit -m "feat(api): tournament detail endpoints — current, standings, bracket, draft"
```

---

### Task 6: Tournament detail API tests

**Files:**
- Create: `backend/tests/tournament-detail.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// backend/tests/tournament-detail.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../src/index.js'
import { resetTables, insertTeam, insertTournament, insertPlayer, insertMatchMap } from './setup.js'
import { query } from '../src/db.js'

async function insertMatch(tournamentId: string, teamAId: string, teamBId: string, overrides: {
  bracket_kind?: string; bracket_round?: number; status?: string
  maps_won_a?: number; maps_won_b?: number; stage?: string
} = {}) {
  const { rows: [m] } = await query(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, bracket_kind, bracket_round,
      status, maps_won_a, maps_won_b, stage)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [tournamentId, teamAId, teamBId,
     overrides.bracket_kind ?? 'swiss', overrides.bracket_round ?? 1,
     overrides.status ?? 'finished',
     overrides.maps_won_a ?? 1, overrides.maps_won_b ?? 0,
     overrides.stage ?? '小组赛 R1']
  )
  return m as { id: string }
}

beforeEach(() =>
  resetTables('player_match_stats','match_maps','matches','tournament_player_assignment','players','teams','tournaments')
)

describe('GET /api/tournaments/current', () => {
  it('returns 404 when no current tournament', async () => {
    const res = await app.request('/api/tournaments/current')
    expect(res.status).toBe(404)
    const body = await res.json() as { success: boolean }
    expect(body.success).toBe(false)
  })

  it('returns the tournament marked is_current', async () => {
    const t = await insertTournament({ name: 'ALAST 2026' })
    await query(`UPDATE tournaments SET is_current = TRUE WHERE id = $1`, [t.id])
    const res = await app.request('/api/tournaments/current')
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: { name: string; is_current: boolean } }
    expect(body.success).toBe(true)
    expect(body.data.name).toBe('ALAST 2026')
    expect(body.data.is_current).toBe(true)
  })
})

describe('GET /api/tournaments/:id/standings', () => {
  it('returns empty array when no swiss matches', async () => {
    const t = await insertTournament()
    const res = await app.request(`/api/tournaments/${t.id}/standings`)
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toEqual([])
  })

  it('returns standings sorted by wins then buchholz', async () => {
    const t = await insertTournament()
    const teamA = await insertTeam({ name: 'Alpha' })
    const teamB = await insertTeam({ name: 'Beta' })
    const teamC = await insertTeam({ name: 'Gamma' })
    // A beats B, A beats C, B beats C → A:2W, B:1W, C:0W
    const mAB = await insertMatch(t.id, teamA.id, teamB.id, { maps_won_a: 1, maps_won_b: 0 })
    const mAC = await insertMatch(t.id, teamA.id, teamC.id, { maps_won_a: 1, maps_won_b: 0 })
    const mBC = await insertMatch(t.id, teamB.id, teamC.id, { maps_won_a: 1, maps_won_b: 0 })
    // Add match_maps with round scores for round_diff
    await insertMatchMap(mAB.id, { score_a: 13, score_b: 7 })
    await insertMatchMap(mAC.id, { score_a: 13, score_b: 5 })
    await insertMatchMap(mBC.id, { score_a: 13, score_b: 9 })

    const res = await app.request(`/api/tournaments/${t.id}/standings`)
    const body = await res.json() as { data: Array<{ team_name: string; wins: number; losses: number; buchholz: number }> }
    expect(body.data[0].team_name).toBe('Alpha')
    expect(body.data[0].wins).toBe(2)
    expect(body.data[0].losses).toBe(0)
    expect(body.data[1].team_name).toBe('Beta')
    expect(body.data[2].team_name).toBe('Gamma')
    // Alpha's buchholz = sum of opponents' wins = B.wins(1) + C.wins(0) = 1
    expect(body.data[0].buchholz).toBe(1)
  })
})

describe('GET /api/tournaments/:id/bracket', () => {
  it('returns UB/LB/GF matches, excluding swiss', async () => {
    const t = await insertTournament()
    const teamA = await insertTeam()
    const teamB = await insertTeam()
    // Swiss match — should NOT appear
    await insertMatch(t.id, teamA.id, teamB.id, { bracket_kind: 'swiss', stage: '小组赛 R1' })
    // UB match — should appear
    await query(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, bracket_kind, bracket_round, status, stage)
       VALUES ($1,$2,$3,'ub',1,'upcoming','胜者组 QF')`,
      [t.id, teamA.id, teamB.id]
    )
    const res = await app.request(`/api/tournaments/${t.id}/bracket`)
    const body = await res.json() as { data: Array<{ bracket_kind: string }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].bracket_kind).toBe('ub')
  })
})

describe('GET /api/tournaments/:id/draft', () => {
  it('returns empty array when no assignments', async () => {
    const t = await insertTournament()
    const res = await app.request(`/api/tournaments/${t.id}/draft`)
    const body = await res.json() as { data: unknown[] }
    expect(body.data).toEqual([])
  })

  it('returns players with tier and team info', async () => {
    const t = await insertTournament()
    const team = await insertTeam()
    const player = await insertPlayer({ nickname: 'NJU', team_id: team.id })
    await query(
      `INSERT INTO tournament_player_assignment (tournament_id, player_id, tier, pick_order)
       VALUES ($1,$2,'S',1)`,
      [t.id, player.id]
    )
    const res = await app.request(`/api/tournaments/${t.id}/draft`)
    const body = await res.json() as { data: Array<{ tier: string; nickname: string }> }
    expect(body.data[0].tier).toBe('S')
    expect(body.data[0].nickname).toBe('NJU')
  })
})
```

- [ ] **Step 2: Run tests — expect failures (routes not wired yet is OK; verify they exist)**

```bash
cd /Users/brandt/alast/backend
npm test -- tests/tournament-detail.test.ts
```

Expected: tests pass (routes were added in Task 5). If any fail, debug before moving on.

- [ ] **Step 3: Commit**

```bash
git add tests/tournament-detail.test.ts
git commit -m "test: tournament detail endpoint tests (current, standings, bracket, draft)"
```

---

### Task 7: Match maps sub-resource API

**Files:**
- Create: `backend/src/routes/match-maps.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write match-maps.ts**

```typescript
// backend/src/routes/match-maps.ts
import { Hono } from 'hono'
import { query } from '../db.js'
import { ok, err } from '../types.js'

const r = new Hono()

// GET /api/matches/:id/maps
r.get('/:id/maps', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT id, match_id, map_name, map_order, score_a, score_b,
            winner_team_id, duration_seconds
     FROM match_maps WHERE match_id = $1 ORDER BY map_order ASC`,
    [id]
  )
  return c.json(ok(rows))
})

// GET /api/matches/:id/maps/:mapId/stats
r.get('/:id/maps/:mapId/stats', async (c) => {
  const { mapId } = c.req.param()
  const { rows } = await query(
    `SELECT pms.id, pms.player_id, pms.team_id,
            pms.kills, pms.deaths, pms.assists, pms.headshots, pms.headshot_pct,
            pms.adr, pms.kast, pms.rating, pms.first_kills, pms.first_deaths,
            pms.clutches_won, pms.clutches_played,
            p.nickname, p.avatar_url, p.steam_id,
            t.name AS team_name, t.logo_url AS team_logo_url,
            EXISTS(
              SELECT 1 FROM match_substitutes ms2
              WHERE ms2.player_id = pms.player_id
                AND ms2.match_id = (SELECT match_id FROM match_maps WHERE id = $1)
            ) AS is_sub
     FROM player_match_stats pms
     JOIN players p ON p.id = pms.player_id
     LEFT JOIN teams t ON t.id = pms.team_id
     WHERE pms.match_map_id = $1
     ORDER BY pms.rating DESC NULLS LAST`,
    [mapId]
  )
  return c.json(ok(rows))
})

// GET /api/matches/:id/maps/:mapId/rounds
r.get('/:id/maps/:mapId/rounds', async (c) => {
  const { mapId } = c.req.param()
  const { rows } = await query(
    `SELECT mr.*,
       (SELECT json_agg(
         json_build_object(
           'weapon_name', mk.weapon_name,
           'is_headshot', mk.is_headshot,
           'killer_player_id', mk.killer_player_id,
           'victim_player_id', mk.victim_player_id,
           'tick', mk.tick
         ) ORDER BY mk.tick ASC
       )
       FROM match_kills mk WHERE mk.match_map_id = mr.match_map_id AND mk.round_number = mr.round_number
       ) AS kills
     FROM match_rounds mr
     WHERE mr.match_map_id = $1
     ORDER BY mr.round_number ASC`,
    [mapId]
  )
  return c.json(ok(rows))
})

// GET /api/matches/:id/maps/:mapId/economy
r.get('/:id/maps/:mapId/economy', async (c) => {
  const { mapId } = c.req.param()
  const { rows } = await query(
    `SELECT round_number, team_a_side, team_b_side,
            team_a_economy_type, team_b_economy_type,
            team_a_money_spent, team_b_money_spent,
            team_a_equipment_value, team_b_equipment_value,
            winner_side, end_reason
     FROM match_rounds
     WHERE match_map_id = $1
     ORDER BY round_number ASC`,
    [mapId]
  )
  return c.json(ok(rows))
})

// GET /api/matches/:id/maps/:mapId/highlights
r.get('/:id/maps/:mapId/highlights', async (c) => {
  const { mapId } = c.req.param()

  // Clutches
  const { rows: clutches } = await query(
    `SELECT mc.round_number, mc.opponent_count, mc.won, mc.kill_count, mc.has_survived,
            p.nickname, p.avatar_url
     FROM match_clutches mc
     LEFT JOIN players p ON p.id = mc.player_id
     WHERE mc.match_map_id = $1
     ORDER BY mc.opponent_count DESC, mc.won DESC`,
    [mapId]
  )

  // Multikills (4K, 5K from player_match_stats)
  const { rows: multikills } = await query(
    `SELECT p.nickname, p.avatar_url, pms.rating,
            pms.kills, pms.deaths, pms.adr,
            (SELECT COUNT(*) FROM match_kills mk
             WHERE mk.match_map_id = $1 AND mk.killer_player_id = pms.player_id) AS kill_count
     FROM player_match_stats pms
     JOIN players p ON p.id = pms.player_id
     WHERE pms.match_map_id = $1
     ORDER BY pms.rating DESC NULLS LAST
     LIMIT 3`,
    [mapId]
  )

  return c.json(ok({ clutches, top_players: multikills }))
})

export default r
```

- [ ] **Step 2: Mount in index.ts**

Add import:
```typescript
import matchMapsRoutes from './routes/match-maps.js'
```

Add route (after existing `matchesRoutes`):
```typescript
app.route('/api/matches', matchMapsRoutes)
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/match-maps.ts src/index.ts
git commit -m "feat(api): match maps sub-resource endpoints (maps, stats, rounds, economy, highlights)"
```

---

### Task 8: Match maps API tests

**Files:**
- Create: `backend/tests/match-maps.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// backend/tests/match-maps.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../src/index.js'
import { query } from '../src/db.js'
import { resetTables, insertTeam, insertTournament, insertPlayer, insertMatchMap, insertPlayerMatchStats } from './setup.js'

async function insertMatch(tournamentId: string, teamAId: string, teamBId: string) {
  const { rows: [m] } = await query(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
     VALUES ($1,$2,$3,'finished') RETURNING *`,
    [tournamentId, teamAId, teamBId]
  )
  return m as { id: string }
}

beforeEach(() =>
  resetTables('match_rounds','match_kills','match_clutches','player_round_economies',
    'player_match_stats','match_maps','match_substitutes','matches','players','teams','tournaments')
)

describe('GET /api/matches/:id/maps', () => {
  it('returns maps in order', async () => {
    const t = await insertTournament()
    const ta = await insertTeam(); const tb = await insertTeam()
    const m = await insertMatch(t.id, ta.id, tb.id)
    await insertMatchMap(m.id, { map_name: 'de_ancient', map_order: 1, score_a: 13, score_b: 7 })
    await insertMatchMap(m.id, { map_name: 'de_inferno', map_order: 2, score_a: 13, score_b: 9 })

    const res = await app.request(`/api/matches/${m.id}/maps`)
    const body = await res.json() as { data: Array<{ map_name: string; map_order: number }> }
    expect(body.data).toHaveLength(2)
    expect(body.data[0].map_name).toBe('de_ancient')
    expect(body.data[1].map_order).toBe(2)
  })
})

describe('GET /api/matches/:id/maps/:mapId/stats', () => {
  it('returns player stats with nickname and team', async () => {
    const t = await insertTournament()
    const ta = await insertTeam({ name: 'Alpha' }); const tb = await insertTeam()
    const m = await insertMatch(t.id, ta.id, tb.id)
    const mm = await insertMatchMap(m.id)
    const p = await insertPlayer({ nickname: 'Fragger', team_id: ta.id })
    await insertPlayerMatchStats(mm.id, p.id, ta.id, { rating: 1.45, kills: 25 })

    const res = await app.request(`/api/matches/${m.id}/maps/${mm.id}/stats`)
    const body = await res.json() as { data: Array<{ nickname: string; rating: number; team_name: string }> }
    expect(body.data[0].nickname).toBe('Fragger')
    expect(body.data[0].rating).toBeCloseTo(1.45)
    expect(body.data[0].team_name).toBe('Alpha')
  })
})

describe('GET /api/matches/:id/maps/:mapId/economy', () => {
  it('returns round economy data', async () => {
    const t = await insertTournament()
    const ta = await insertTeam(); const tb = await insertTeam()
    const m = await insertMatch(t.id, ta.id, tb.id)
    const mm = await insertMatchMap(m.id)
    await query(
      `INSERT INTO match_rounds (match_map_id, round_number, team_a_equipment_value, team_b_equipment_value, winner_side, end_reason)
       VALUES ($1,1,3500,4200,2,7)`,
      [mm.id]
    )

    const res = await app.request(`/api/matches/${m.id}/maps/${mm.id}/economy`)
    const body = await res.json() as { data: Array<{ round_number: number; team_a_equipment_value: number }> }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].round_number).toBe(1)
    expect(body.data[0].team_a_equipment_value).toBe(3500)
  })
})

describe('GET /api/matches/:id/maps/:mapId/highlights', () => {
  it('returns clutches and top players', async () => {
    const t = await insertTournament()
    const ta = await insertTeam(); const tb = await insertTeam()
    const m = await insertMatch(t.id, ta.id, tb.id)
    const mm = await insertMatchMap(m.id)
    const p = await insertPlayer({ team_id: ta.id })
    await query(
      `INSERT INTO match_clutches (match_map_id, round_number, player_id, opponent_count, won, kill_count)
       VALUES ($1,15,$2,2,true,2)`,
      [mm.id, p.id]
    )
    await insertPlayerMatchStats(mm.id, p.id, ta.id)

    const res = await app.request(`/api/matches/${m.id}/maps/${mm.id}/highlights`)
    const body = await res.json() as { data: { clutches: unknown[]; top_players: unknown[] } }
    expect(body.data.clutches).toHaveLength(1)
    expect(body.data.top_players).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/brandt/alast/backend
npm test -- tests/match-maps.test.ts
```

Expected: all 4 tests pass.

- [ ] **Step 3: Run full suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/match-maps.test.ts
git commit -m "test: match maps sub-resource endpoint tests"
```

---

### Task 9: Admin import-demo API — preview + confirm

**Files:**
- Create: `backend/src/routes/admin/import-demo.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write import-demo.ts**

```typescript
// backend/src/routes/admin/import-demo.ts
import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsdmTeamData { name: string; score: number; scoreFirstHalf: number; scoreSecondHalf: number }
interface CsdmPlayerData {
  steamId: string; name: string; teamName: string
  hltvRating2: number; kast: number; averageDamagePerRound: number; headshotPercentage: number
  killCount: number; deathCount: number; assistCount: number
  firstKillCount: number; firstDeathCount: number
  mvpCount: number; vsOneWonCount: number; vsTwoWonCount: number
}
interface CsdmRoundData {
  number: number; startTick: number; endTick: number; endReason: number
  teamAScore: number; teamBScore: number; teamASide: number; teamBSide: number
  teamAStartMoney: number; teamBStartMoney: number
  teamAMoneySpent: number; teamBMoneySpent: number
  teamAEquipmentValue: number; teamBEquipmentValue: number
  teamAEconomyType: string; teamBEconomyType: string; winnerId?: number
}
interface CsdmKillData {
  roundNumber: number; tick: number; weaponName: string; weaponType: string
  isHeadshot: boolean; killerSteamId: string; victimSteamId: string
  assisterSteamId?: string | null; killerSide: number; victimSide: number
  isTradeKill: boolean; isThroughSmoke: boolean; isNoScope: boolean; isAssistedFlash: boolean
  distance: number
}
interface CsdmClutchData {
  roundNumber: number; clutcherSteamId: string; won: boolean
  opponentCount: number; hasClutcherSurvived: boolean; clutcherKillCount: number
}
interface CsdmEconomyData {
  roundNumber: number; playerSteamId: string; playerSide: number
  equipmentValue: number; moneySpent: number; startMoney: number; type: string
}
interface CsdmJson {
  mapName: string; date: string; duration: number
  winnerName?: string; checksum?: string
  teamA: CsdmTeamData; teamB: CsdmTeamData
  players: CsdmPlayerData[]
  rounds: CsdmRoundData[]
  kills: CsdmKillData[]
  clutches: CsdmClutchData[]
  playersEconomies: CsdmEconomyData[]
}

// ─── Preview ──────────────────────────────────────────────────────────────────

r.post('/preview', async (c) => {
  const body = await c.req.json<{ matchId: string; demoJson: CsdmJson }>()
  const { matchId, demoJson } = body

  if (!matchId || !demoJson) return c.json(err('matchId and demoJson required', 'BAD_REQUEST'), 400)

  // Check idempotency
  if (demoJson.checksum) {
    const { rows: existing } = await query(
      `SELECT id FROM csdm_imports WHERE match_id = $1 AND checksum = $2 AND status = 'confirmed'`,
      [matchId, demoJson.checksum]
    )
    if (existing.length > 0) return c.json(err('Demo already imported', 'ALREADY_IMPORTED'), 409)
  }

  // Resolve each player's identity by steam_id
  const playerMatches = await Promise.all(
    demoJson.players.map(async (dp) => {
      // 1. Direct steam_id on players table
      const { rows: direct } = await query(
        `SELECT id, nickname, team_id FROM players WHERE steam_id = $1`, [dp.steamId]
      )
      if (direct.length > 0) {
        const pl = direct[0]
        // Sub warning: player's registered team ≠ team they're playing for in this demo
        const demoTeamName = dp.teamName
        const { rows: matchTeam } = await query(
          `SELECT ta.name AS team_a_name, tb.name AS team_b_name
           FROM matches m
           LEFT JOIN teams ta ON ta.id = m.team_a_id
           LEFT JOIN teams tb ON tb.id = m.team_b_id
           WHERE m.id = $1`,
          [matchId]
        )
        let subWarning = false
        if (matchTeam.length > 0 && pl.team_id) {
          const { rows: plTeam } = await query(`SELECT name FROM teams WHERE id = $1`, [pl.team_id])
          const plTeamName = plTeam[0]?.name ?? ''
          const inTeamA = matchTeam[0].team_a_name === demoTeamName
          const inTeamB = matchTeam[0].team_b_name === demoTeamName
          if ((inTeamA || inTeamB) && plTeamName !== demoTeamName) subWarning = true
        }
        return {
          steamId: dp.steamId, name: dp.name, teamName: dp.teamName,
          identity: 'matched' as const, playerId: pl.id as string, playerName: pl.nickname as string,
          subWarning
        }
      }

      // 2. Alias lookup
      const { rows: alias } = await query(
        `SELECT psa.player_id, p.nickname, p.team_id
         FROM player_steam_aliases psa JOIN players p ON p.id = psa.player_id
         WHERE psa.steam_id = $1`,
        [dp.steamId]
      )
      if (alias.length > 0) {
        return {
          steamId: dp.steamId, name: dp.name, teamName: dp.teamName,
          identity: 'aliased' as const, playerId: alias[0].player_id as string,
          playerName: alias[0].nickname as string, subWarning: false
        }
      }

      // 3. New
      return {
        steamId: dp.steamId, name: dp.name, teamName: dp.teamName,
        identity: 'new' as const, playerId: null, playerName: null, subWarning: false
      }
    })
  )

  // Store raw JSON as pending import
  const { rows: [imp] } = await query(
    `INSERT INTO csdm_imports (filename, raw_json, match_id, status, checksum)
     VALUES ($1,$2,$3,'pending',$4) RETURNING id`,
    [demoJson.mapName + '.json', JSON.stringify(demoJson), matchId, demoJson.checksum ?? null]
  )

  return c.json(ok({
    importId: imp.id,
    mapInfo: {
      mapName: demoJson.mapName,
      duration: demoJson.duration,
      teamAName: demoJson.teamA.name,
      teamBName: demoJson.teamB.name,
      teamAScore: demoJson.teamA.score,
      teamBScore: demoJson.teamB.score,
      teamAScoreFirstHalf: demoJson.teamA.scoreFirstHalf,
      teamBScoreFirstHalf: demoJson.teamB.scoreFirstHalf,
    },
    playerMatches,
  }))
})

// ─── Confirm ──────────────────────────────────────────────────────────────────

interface PlayerMapping {
  steamId: string
  action: 'use' | 'alias' | 'skip'
  playerId?: string  // for 'use' or 'alias'
  newPlayer?: { nickname: string; role?: string; teamId?: string }
}

r.post('/confirm', async (c) => {
  const body = await c.req.json<{
    importId: string
    matchId: string
    mapOrder: number
    playerMappings: PlayerMapping[]
  }>()
  const { importId, matchId, mapOrder, playerMappings } = body
  if (!importId || !matchId || playerMappings == null)
    return c.json(err('importId, matchId, playerMappings required', 'BAD_REQUEST'), 400)

  // Load raw JSON
  const { rows: [imp] } = await query(
    `SELECT raw_json FROM csdm_imports WHERE id = $1 AND status = 'pending'`, [importId]
  )
  if (!imp) return c.json(err('Import not found or already confirmed', 'NOT_FOUND'), 404)
  const demo = imp.raw_json as CsdmJson

  // Resolve final player_id for each steam_id
  const steamToPlayerId = new Map<string, string>()
  for (const pm of playerMappings) {
    if (pm.action === 'skip') continue
    if (pm.action === 'use' && pm.playerId) {
      steamToPlayerId.set(pm.steamId, pm.playerId)
    } else if (pm.action === 'alias' && pm.playerId) {
      // Record alias
      await query(
        `INSERT INTO player_steam_aliases (player_id, steam_id) VALUES ($1,$2) ON CONFLICT (steam_id) DO NOTHING`,
        [pm.playerId, pm.steamId]
      )
      steamToPlayerId.set(pm.steamId, pm.playerId)
    }
    // 'use' with newPlayer = create new player
    if (pm.action === 'use' && !pm.playerId && pm.newPlayer) {
      const { rows: [newP] } = await query(
        `INSERT INTO players (nickname, role, team_id, steam_id) VALUES ($1,$2,$3,$4) RETURNING id`,
        [pm.newPlayer.nickname, pm.newPlayer.role ?? null, pm.newPlayer.teamId ?? null, pm.steamId]
      )
      steamToPlayerId.set(pm.steamId, newP.id)
    }
  }

  // Get team IDs for this match
  const { rows: [matchRow] } = await query(
    `SELECT team_a_id, team_b_id FROM matches WHERE id = $1`, [matchId]
  )
  if (!matchRow) return c.json(err('Match not found', 'NOT_FOUND'), 404)

  // Determine which team each demo player belongs to (by teamName)
  const teamAName = demo.teamA.name; const teamBName = demo.teamB.name
  const steamToTeamId = new Map<string, string>()
  for (const dp of demo.players) {
    if (dp.teamName === teamAName) steamToTeamId.set(dp.steamId, matchRow.team_a_id)
    else if (dp.teamName === teamBName) steamToTeamId.set(dp.steamId, matchRow.team_b_id)
  }

  // Begin transaction
  await query('BEGIN')
  try {
    // 1. Insert match_map
    const { rows: [mm] } = await query(
      `INSERT INTO match_maps (match_id, map_name, map_order, score_a, score_b, winner_team_id, duration_seconds)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [matchId, demo.mapName, mapOrder ?? 1,
       demo.teamA.score, demo.teamB.score,
       demo.teamA.score > demo.teamB.score ? matchRow.team_a_id : matchRow.team_b_id,
       Math.round(demo.duration)]
    )
    const mapId = mm.id

    // 2. Insert player_match_stats
    for (const dp of demo.players) {
      const playerId = steamToPlayerId.get(dp.steamId)
      if (!playerId) continue  // skipped
      const teamId = steamToTeamId.get(dp.steamId) ?? null
      await query(
        `INSERT INTO player_match_stats
           (match_map_id, player_id, team_id, kills, deaths, assists,
            headshot_pct, adr, kast, rating, first_kills, first_deaths,
            imported_from_csdm)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
         ON CONFLICT (match_map_id, player_id) DO NOTHING`,
        [mapId, playerId, teamId,
         dp.killCount, dp.deathCount, dp.assistCount,
         dp.headshotPercentage, dp.averageDamagePerRound, dp.kast, dp.hltvRating2,
         dp.firstKillCount, dp.firstDeathCount]
      )
    }

    // 3. Insert match_rounds
    for (const rnd of demo.rounds ?? []) {
      await query(
        `INSERT INTO match_rounds
           (match_map_id, round_number, end_reason, team_a_score, team_b_score,
            team_a_side, team_b_side,
            team_a_economy_type, team_b_economy_type,
            team_a_money_spent, team_b_money_spent,
            team_a_equipment_value, team_b_equipment_value,
            start_tick, end_tick)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (match_map_id, round_number) DO NOTHING`,
        [mapId, rnd.number, rnd.endReason,
         rnd.teamAScore, rnd.teamBScore,
         rnd.teamASide, rnd.teamBSide,
         rnd.teamAEconomyType, rnd.teamBEconomyType,
         rnd.teamAMoneySpent, rnd.teamBMoneySpent,
         rnd.teamAEquipmentValue, rnd.teamBEquipmentValue,
         rnd.startTick, rnd.endTick]
      )
    }

    // 4. Insert match_kills
    for (const kill of demo.kills ?? []) {
      const killerId = steamToPlayerId.get(kill.killerSteamId) ?? null
      const victimId = steamToPlayerId.get(kill.victimSteamId) ?? null
      const assisterId = kill.assisterSteamId ? (steamToPlayerId.get(kill.assisterSteamId) ?? null) : null
      await query(
        `INSERT INTO match_kills
           (match_map_id, round_number, tick, weapon_name, weapon_type,
            is_headshot, is_trade_kill, is_through_smoke, is_no_scope, is_assisted_flash,
            distance, killer_player_id, victim_player_id, assister_player_id,
            killer_side, victim_side)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [mapId, kill.roundNumber, kill.tick, kill.weaponName, kill.weaponType,
         kill.isHeadshot, kill.isTradeKill, kill.isThroughSmoke, kill.isNoScope, kill.isAssistedFlash,
         kill.distance, killerId, victimId, assisterId,
         kill.killerSide, kill.victimSide]
      )
    }

    // 5. Insert match_clutches
    for (const cl of demo.clutches ?? []) {
      const clutcherId = steamToPlayerId.get(cl.clutcherSteamId) ?? null
      await query(
        `INSERT INTO match_clutches
           (match_map_id, round_number, player_id, opponent_count, won, kill_count, has_survived)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [mapId, cl.roundNumber, clutcherId, cl.opponentCount, cl.won, cl.clutcherKillCount, cl.hasClutcherSurvived]
      )
    }

    // 6. Insert player_round_economies
    for (const eco of demo.playersEconomies ?? []) {
      const playerId = steamToPlayerId.get(eco.playerSteamId) ?? null
      await query(
        `INSERT INTO player_round_economies
           (match_map_id, round_number, player_id, side, equipment_value, money_spent, start_money, type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [mapId, eco.roundNumber, playerId, eco.playerSide,
         eco.equipmentValue, eco.moneySpent, eco.startMoney, eco.type]
      )
    }

    // 7. Mark import confirmed
    await query(
      `UPDATE csdm_imports SET status = 'confirmed', confirmed_at = now() WHERE id = $1`,
      [importId]
    )

    // 8. Update match status to finished if all maps are done
    await query(
      `UPDATE matches SET status = 'finished', finished_at = now()
       WHERE id = $1 AND status != 'finished'`,
      [matchId]
    )

    await query('COMMIT')
    return c.json(ok({ matchMapId: mapId }))
  } catch (e) {
    await query('ROLLBACK')
    console.error('import-demo confirm error:', e)
    return c.json(err('Import failed', 'INTERNAL_ERROR'), 500)
  }
})

export default r
```

- [ ] **Step 2: Mount in index.ts**

Add import:
```typescript
import adminImportDemoRoutes from './routes/admin/import-demo.js'
```

Add auth middleware (already covered by `/api/admin/import/*` wildcard in index.ts — no change needed).

Add route after existing `adminImportRoutes`:
```typescript
app.route('/api/admin/import/demo', adminImportDemoRoutes)
```

**Important:** this route must be mounted BEFORE `app.route('/api/admin/import', adminImportRoutes)` to avoid the wildcard catching `/demo/*`. Move it above.

- [ ] **Step 3: Commit**

```bash
git add src/routes/admin/import-demo.ts src/index.ts
git commit -m "feat(admin): rich demo import — preview + confirm with full event tables"
```

---

### Task 10: Admin import-demo tests

**Files:**
- Create: `backend/tests/import-demo.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// backend/tests/import-demo.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { app } from '../src/index.js'
import { query } from '../src/db.js'
import { resetTables, insertTeam, insertTournament, insertPlayer, getAdminToken } from './setup.js'

const DEMO_JSON_MINIMAL = {
  mapName: 'de_ancient',
  date: '2026-04-10T14:00:00Z',
  duration: 2400,
  checksum: 'abc123',
  teamA: { name: 'Alpha', score: 13, scoreFirstHalf: 9, scoreSecondHalf: 4 },
  teamB: { name: 'Beta',  score: 7,  scoreFirstHalf: 3, scoreSecondHalf: 4 },
  players: [] as unknown[],
  rounds: [],
  kills: [],
  clutches: [],
  playersEconomies: [],
}

async function insertMatch(tournamentId: string, teamAId: string, teamBId: string) {
  const { rows: [m] } = await query(
    `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
     VALUES ($1,$2,$3,'upcoming') RETURNING id`,
    [tournamentId, teamAId, teamBId]
  )
  return m as { id: string }
}

beforeEach(() =>
  resetTables('match_rounds','match_kills','match_clutches','player_round_economies',
    'player_match_stats','match_maps','match_substitutes','csdm_imports',
    'player_steam_aliases','players','matches','teams','tournaments','admins')
)

describe('POST /api/admin/import/demo/preview', () => {
  it('requires auth', async () => {
    const res = await app.request('/api/admin/import/demo/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: 'x', demoJson: DEMO_JSON_MINIMAL }),
    })
    expect(res.status).toBe(401)
  })

  it('returns player matches and importId', async () => {
    const token = await getAdminToken()
    const t = await insertTournament()
    const ta = await insertTeam({ name: 'Alpha' })
    const tb = await insertTeam({ name: 'Beta' })
    const m = await insertMatch(t.id, ta.id, tb.id)
    const p = await insertPlayer({ nickname: 'NJU', steam_id: 'steam:111', team_id: ta.id })

    const demo = {
      ...DEMO_JSON_MINIMAL,
      teamA: { ...DEMO_JSON_MINIMAL.teamA, name: 'Alpha' },
      players: [{ steamId: 'steam:111', name: 'NJU', teamName: 'Alpha',
                  hltvRating2: 1.2, kast: 70, averageDamagePerRound: 80,
                  headshotPercentage: 45, killCount: 20, deathCount: 15,
                  assistCount: 3, firstKillCount: 3, firstDeathCount: 2, mvpCount: 2,
                  vsOneWonCount: 1, vsTwoWonCount: 0 }]
    }

    const res = await app.request('/api/admin/import/demo/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matchId: m.id, demoJson: demo }),
    })
    expect(res.status).toBe(200)
    const body = await res.json() as {
      data: { importId: string; playerMatches: Array<{ identity: string; playerName: string }> }
    }
    expect(body.data.importId).toBeTruthy()
    expect(body.data.playerMatches[0].identity).toBe('matched')
    expect(body.data.playerMatches[0].playerName).toBe('NJU')
  })

  it('marks unrecognized player as new', async () => {
    const token = await getAdminToken()
    const t = await insertTournament()
    const ta = await insertTeam({ name: 'Alpha' })
    const tb = await insertTeam()
    const m = await insertMatch(t.id, ta.id, tb.id)

    const demo = {
      ...DEMO_JSON_MINIMAL,
      players: [{ steamId: 'steam:unknown', name: 'Stranger', teamName: 'Alpha',
                  hltvRating2: 1.0, kast: 65, averageDamagePerRound: 70,
                  headshotPercentage: 35, killCount: 15, deathCount: 18,
                  assistCount: 2, firstKillCount: 1, firstDeathCount: 2, mvpCount: 0,
                  vsOneWonCount: 0, vsTwoWonCount: 0 }]
    }

    const res = await app.request('/api/admin/import/demo/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matchId: m.id, demoJson: demo }),
    })
    const body = await res.json() as { data: { playerMatches: Array<{ identity: string }> } }
    expect(body.data.playerMatches[0].identity).toBe('new')
  })
})

describe('POST /api/admin/import/demo/confirm', () => {
  it('writes match_map, player_match_stats, and marks import confirmed', async () => {
    const token = await getAdminToken()
    const t = await insertTournament()
    const ta = await insertTeam({ name: 'Alpha' })
    const tb = await insertTeam({ name: 'Beta' })
    const m = await insertMatch(t.id, ta.id, tb.id)
    const p = await insertPlayer({ nickname: 'NJU', steam_id: 'steam:111', team_id: ta.id })

    const demo = {
      ...DEMO_JSON_MINIMAL,
      checksum: 'unique-checksum-1',
      teamA: { ...DEMO_JSON_MINIMAL.teamA, name: 'Alpha' },
      teamB: { ...DEMO_JSON_MINIMAL.teamB, name: 'Beta' },
      players: [{ steamId: 'steam:111', name: 'NJU', teamName: 'Alpha',
                  hltvRating2: 1.2, kast: 70, averageDamagePerRound: 80,
                  headshotPercentage: 45, killCount: 20, deathCount: 15,
                  assistCount: 3, firstKillCount: 3, firstDeathCount: 2, mvpCount: 2,
                  vsOneWonCount: 1, vsTwoWonCount: 0 }]
    }

    // Preview first to create pending import
    const previewRes = await app.request('/api/admin/import/demo/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matchId: m.id, demoJson: demo }),
    })
    const { data: { importId } } = await previewRes.json() as { data: { importId: string } }

    // Confirm
    const res = await app.request('/api/admin/import/demo/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        importId, matchId: m.id, mapOrder: 1,
        playerMappings: [{ steamId: 'steam:111', action: 'use', playerId: p.id }]
      }),
    })
    expect(res.status).toBe(200)

    // Verify DB writes
    const { rows: maps } = await query(`SELECT * FROM match_maps WHERE match_id = $1`, [m.id])
    expect(maps).toHaveLength(1)
    expect(maps[0].map_name).toBe('de_ancient')

    const { rows: stats } = await query(`SELECT * FROM player_match_stats WHERE player_id = $1`, [p.id])
    expect(stats).toHaveLength(1)
    expect(stats[0].kills).toBe(20)

    const { rows: [imp] } = await query(`SELECT status FROM csdm_imports WHERE id = $1`, [importId])
    expect(imp.status).toBe('confirmed')
  })
})
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/brandt/alast/backend
npm test -- tests/import-demo.test.ts
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/import-demo.test.ts
git commit -m "test: admin import-demo preview + confirm tests"
```

---

### Task 11: Admin player-aliases + match-substitutes endpoints

**Files:**
- Create: `backend/src/routes/admin/player-aliases.ts`
- Create: `backend/src/routes/admin/match-substitutes.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Write player-aliases.ts**

```typescript
// backend/src/routes/admin/player-aliases.ts
import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

// POST /api/admin/players/:id/aliases
r.post('/:id/aliases', async (c) => {
  const { id } = c.req.param()
  const { steam_id, note } = await c.req.json<{ steam_id: string; note?: string }>()
  if (!steam_id) return c.json(err('steam_id required', 'BAD_REQUEST'), 400)

  const { rows: [alias] } = await query(
    `INSERT INTO player_steam_aliases (player_id, steam_id, note)
     VALUES ($1,$2,$3)
     ON CONFLICT (steam_id) DO UPDATE SET player_id = $1, note = $3
     RETURNING *`,
    [id, steam_id, note ?? null]
  )
  return c.json(ok(alias), 201)
})

// GET /api/admin/players/:id/aliases
r.get('/:id/aliases', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT * FROM player_steam_aliases WHERE player_id = $1 ORDER BY created_at DESC`,
    [id]
  )
  return c.json(ok(rows))
})

export default r
```

- [ ] **Step 2: Write match-substitutes.ts**

```typescript
// backend/src/routes/admin/match-substitutes.ts
import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

// POST /api/admin/matches/:id/substitutes
r.post('/:id/substitutes', async (c) => {
  const { id } = c.req.param()
  const { player_id, lender_team_id, borrower_team_id } =
    await c.req.json<{ player_id: string; lender_team_id?: string; borrower_team_id?: string }>()
  if (!player_id) return c.json(err('player_id required', 'BAD_REQUEST'), 400)

  const { rows: [sub] } = await query(
    `INSERT INTO match_substitutes (match_id, player_id, lender_team_id, borrower_team_id)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (match_id, player_id) DO UPDATE SET lender_team_id=$3, borrower_team_id=$4
     RETURNING *`,
    [id, player_id, lender_team_id ?? null, borrower_team_id ?? null]
  )
  return c.json(ok(sub), 201)
})

// GET /api/admin/matches/:id/substitutes
r.get('/:id/substitutes', async (c) => {
  const { id } = c.req.param()
  const { rows } = await query(
    `SELECT ms.*, p.nickname, tl.name AS lender_team_name, tb.name AS borrower_team_name
     FROM match_substitutes ms
     JOIN players p ON p.id = ms.player_id
     LEFT JOIN teams tl ON tl.id = ms.lender_team_id
     LEFT JOIN teams tb ON tb.id = ms.borrower_team_id
     WHERE ms.match_id = $1`,
    [id]
  )
  return c.json(ok(rows))
})

export default r
```

- [ ] **Step 3: Mount both in index.ts**

Add imports:
```typescript
import adminPlayerAliasesRoutes from './routes/admin/player-aliases.js'
import adminMatchSubstitutesRoutes from './routes/admin/match-substitutes.js'
```

Add auth middleware (already covered by `/api/admin/players/*` and `/api/admin/matches/*`).

Add routes after existing admin routes:
```typescript
app.route('/api/admin/players', adminPlayerAliasesRoutes)
app.route('/api/admin/matches', adminMatchSubstitutesRoutes)
```

Note: these mount on the same prefix as existing `adminPlayersRoutes` / `adminMatchesRoutes`. Hono will match the more-specific paths first since `/:id/aliases` and `/:id/substitutes` won't conflict with existing routes.

- [ ] **Step 4: Run full test suite to verify no conflicts**

```bash
cd /Users/brandt/alast/backend
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/player-aliases.ts src/routes/admin/match-substitutes.ts src/index.ts
git commit -m "feat(admin): player steam aliases and match substitutes endpoints"
```

---

### Task 12: Stats API enhancements

**Files:**
- Modify: `backend/src/routes/stats.ts`

- [ ] **Step 1: Read current stats.ts** (already read — see context above)

- [ ] **Step 2: Rewrite stats.ts with enhanced leaderboard + new endpoints**

Replace the entire file:

```typescript
// backend/src/routes/stats.ts
import { Hono } from 'hono'
import { query } from '../db.js'
import { ok } from '../types.js'

const r = new Hono()

const VALID_STATS = ['rating', 'adr', 'kast', 'headshot_pct', 'kills', 'first_kills'] as const
type StatKey = typeof VALID_STATS[number]

r.get('/leaderboard', async (c) => {
  const tournamentId = c.req.query('tournament_id')
  const stat = (VALID_STATS.includes(c.req.query('stat') as StatKey)
    ? c.req.query('stat')!
    : 'rating') as string
  const limit = Math.min(parseInt(c.req.query('limit') ?? '20'), 50)
  const stage = c.req.query('stage') ?? null
  const map = c.req.query('map') ?? null
  const tier = c.req.query('tier') ?? null
  const minMaps = parseInt(c.req.query('min_maps') ?? '3')

  const params: unknown[] = []
  const conditions: string[] = ['1=1']

  if (tournamentId) { params.push(tournamentId); conditions.push(`m.tournament_id = $${params.length}`) }
  if (stage) { params.push(stage); conditions.push(`m.stage = $${params.length}`) }
  if (map)   { params.push(map);   conditions.push(`mm.map_name = $${params.length}`) }

  let tierJoin = ''
  if (tier) {
    params.push(tier)
    tierJoin = `JOIN tournament_player_assignment tpa ON tpa.player_id = p.id AND tpa.tournament_id = m.tournament_id AND tpa.tier = $${params.length}`
  }

  params.push(minMaps)
  const minMapsParam = params.length

  params.push(limit)
  const limitParam = params.length

  const sql = `
    SELECT p.id, p.nickname, p.avatar_url, t.name as team_name, t.logo_url as team_logo_url,
           COUNT(pms.id) as maps_played,
           ROUND(AVG(pms.${stat})::numeric, 2) as avg_stat
    FROM player_match_stats pms
    JOIN players p ON p.id = pms.player_id
    LEFT JOIN teams t ON t.id = p.team_id
    JOIN match_maps mm ON mm.id = pms.match_map_id
    JOIN matches m ON m.id = mm.match_id
    ${tierJoin}
    WHERE ${conditions.join(' AND ')}
    GROUP BY p.id, p.nickname, p.avatar_url, t.name, t.logo_url
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

export default r
```

- [ ] **Step 3: Run existing stats tests + full suite**

```bash
cd /Users/brandt/alast/backend
npm test
```

Expected: all tests pass (leaderboard still works, new endpoints return empty data gracefully).

- [ ] **Step 4: Commit**

```bash
git add src/routes/stats.ts
git commit -m "feat(api): stats leaderboard — add stage/map/tier/min_maps filters + tournament-summary + tier-comparison"
```

---

### Task 13: Frontend — API hooks (useCurrentTournament, useStandings, useBracket, useDraft)

**Files:**
- Modify: `frontend/src/api/currentTournament.ts`
- Modify: `frontend/src/api/tournaments.ts`
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: Update currentTournament.ts to call /api/tournaments/current**

Replace the entire file:

```typescript
// frontend/src/api/currentTournament.ts
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { Tournament } from '../types'

export function useCurrentTournament() {
  return useQuery({
    queryKey: ['tournaments', 'current'],
    queryFn: () => apiFetch<Tournament>('/api/tournaments/current'),
  })
}
```

- [ ] **Step 2: Add new types to types.ts**

Add after the existing `Tournament` interface:

```typescript
export interface StandingRow {
  tournament_id: string
  team_id: string
  team_name: string
  team_short_name: string | null
  team_logo_url: string | null
  wins: number
  losses: number
  buchholz: number
  round_diff: number
}

export interface BracketMatch {
  id: string
  bracket_kind: 'ub' | 'lb' | 'gf'
  bracket_round: number
  stage: string | null
  status: 'upcoming' | 'live' | 'finished'
  maps_won_a: number
  maps_won_b: number
  best_of: number
  scheduled_at: string | null
  finished_at: string | null
  team_a_id: string | null
  team_b_id: string | null
  team_a_name: string | null
  team_a_logo: string | null
  team_b_name: string | null
  team_b_logo: string | null
}

export interface DraftPlayer {
  tier: 'S' | 'A' | 'B' | 'C+' | 'D'
  pick_order: number | null
  is_captain: boolean
  player_id: string
  nickname: string
  avatar_url: string | null
  steam_id: string | null
  team_id: string | null
  team_name: string | null
  team_logo_url: string | null
}

export interface TournamentSummary {
  matches_played: string
  total_kills: string
  avg_headshot_pct: string | null
}

export interface TierComparison {
  tier: 'S' | 'A' | 'B' | 'C+' | 'D'
  avg_rating: string | null
  avg_adr: string | null
  players: string
}
```

Also add `is_current?: boolean` and `bracket_kind?: string | null`, `bracket_round?: number | null`, `best_of?: number` to the `Tournament` and `Match` interfaces respectively:

In `Tournament`, add: `  is_current?: boolean`

In `Match`, add:
```typescript
  bracket_kind?: string | null
  bracket_round?: number | null
  best_of?: number
```

- [ ] **Step 3: Add hooks to tournaments.ts**

Append to `frontend/src/api/tournaments.ts`:

```typescript
import type { StandingRow, BracketMatch, DraftPlayer } from '../types'

export function useStandings(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['standings', tournamentId],
    queryFn: () => apiFetch<StandingRow[]>(`/api/tournaments/${tournamentId}/standings`),
    enabled: !!tournamentId,
  })
}

export function useBracket(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['bracket', tournamentId],
    queryFn: () => apiFetch<BracketMatch[]>(`/api/tournaments/${tournamentId}/bracket`),
    enabled: !!tournamentId,
  })
}

export function useDraft(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ['draft', tournamentId],
    queryFn: () => apiFetch<DraftPlayer[]>(`/api/tournaments/${tournamentId}/draft`),
    enabled: !!tournamentId,
  })
}
```

- [ ] **Step 4: Verify frontend TypeScript compiles**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/brandt/alast/frontend
git add src/api/currentTournament.ts src/api/tournaments.ts src/types.ts
git commit -m "feat(frontend): update useCurrentTournament + add useStandings/useBracket/useDraft hooks"
```

---

### Task 14: Frontend — wire GroupStageTab standings + BracketTab + DraftPage

**Files:**
- Modify: `frontend/src/components/tournament/tabs/GroupStageTab.tsx`
- Modify: `frontend/src/components/tournament/StandingsTable.tsx`
- Modify: `frontend/src/pages/DraftPage.tsx`

- [ ] **Step 1: Update GroupStageTab to use useStandings**

Replace the entire file:

```tsx
// frontend/src/components/tournament/tabs/GroupStageTab.tsx
import { useMemo } from 'react'
import { useMatches } from '../../../api/matches'
import { useCurrentTournament } from '../../../api/currentTournament'
import { useStandings } from '../../../api/tournaments'
import StandingsTable from '../StandingsTable'
import RoundPanel from '../RoundPanel'
import MatchRow from '../MatchRow'
import type { StandingRow } from '../../../types'

const SWISS_ROUNDS = ['小组赛 R1', '小组赛 R2', '小组赛 R3'] as const

function computeStatus(wins: number, losses: number): StandingRow['status'] {
  if (wins >= 3) return '晋级胜者组'
  if (losses >= 3) return '进入败者组'
  return '待赛'
}

export default function GroupStageTab() {
  const { data: tournament } = useCurrentTournament()
  const { data: matches } = useMatches({ tournament_id: tournament?.id })
  const { data: standingsRaw } = useStandings(tournament?.id)

  const standings = useMemo<StandingRow[] | null>(() => {
    if (!standingsRaw || standingsRaw.length === 0) return null
    return standingsRaw.map(s => ({
      team: { id: s.team_id, name: s.team_name, short_name: s.team_short_name, logo_url: s.team_logo_url },
      wins: s.wins,
      losses: s.losses,
      buchholz: s.buchholz,
      roundDiff: s.round_diff,
      status: computeStatus(s.wins, s.losses),
    }))
  }, [standingsRaw])

  const matchesByRound = useMemo(() => {
    const byRound = new Map<string, NonNullable<typeof matches>>()
    for (const r of SWISS_ROUNDS) byRound.set(r, [])
    for (const m of matches ?? []) {
      if ((SWISS_ROUNDS as readonly string[]).includes(m.stage ?? '')) {
        byRound.get(m.stage!)!.push(m)
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

- [ ] **Step 2: Update StandingsTable.tsx to accept the existing StandingRow interface**

The existing `StandingsTable` component already accepts `StandingRow[]` with `team`, `wins`, `losses`, `buchholz`, `roundDiff`, `status`. GroupStageTab now maps API data into that shape. No changes needed to StandingsTable itself — verify it still compiles.

- [ ] **Step 3: Update DraftPage to load real data**

Replace the contents of `frontend/src/pages/DraftPage.tsx`:

```tsx
// frontend/src/pages/DraftPage.tsx
import { motion } from 'framer-motion'
import { useCurrentTournament } from '../api/currentTournament'
import { useDraft } from '../api/tournaments'
import Spinner from '../components/Spinner'
import TeamLogo from '../components/TeamLogo'
import type { DraftPlayer } from '../types'

const TIER_META: Record<string, { label: string; accent: string; desc: string }> = {
  S:  { label: '特等马', accent: '#FFD700', desc: '前 20% 战力 / 队长' },
  A:  { label: '上等马', accent: '#FF8A00', desc: '高战力' },
  B:  { label: '中等马', accent: '#00D1FF', desc: '中坚' },
  'C+': { label: '下等马', accent: '#A0AEC0', desc: '潜力' },
  D:  { label: '赠品马', accent: '#718096', desc: '友情参与' },
}
const TIER_ORDER = ['S', 'A', 'B', 'C+', 'D'] as const

const N_TEAMS = 16

export default function DraftPage() {
  const { data: tournament } = useCurrentTournament()
  const { data: players, isLoading } = useDraft(tournament?.id)

  const byTier = TIER_ORDER.reduce<Record<string, DraftPlayer[]>>((acc, t) => {
    acc[t] = (players ?? []).filter(p => p.tier === t).sort((a, b) => (a.pick_order ?? 999) - (b.pick_order ?? 999))
    return acc
  }, {} as Record<string, DraftPlayer[]>)

  const hasData = (players?.length ?? 0) > 0

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">DRAFT BOARD</p>
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-white/95">选马公示 / Draft</h1>
        <p className="text-sm text-white/50 mt-2">每队 5 人 = 5 等级各 1 人。前 20% 战力为队长，第 1 轮 S 型逆向选马，第 2-4 轮按公布顺序。</p>
      </header>

      {isLoading && <Spinner />}

      {/* Tier grid */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-4">5 Tiers</h2>
        <div className="space-y-4">
          {TIER_ORDER.map(tierKey => {
            const meta = TIER_META[tierKey]
            const tierPlayers = byTier[tierKey]
            return (
              <div key={tierKey}
                   className="rounded-md border"
                   style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
                {/* Tier header */}
                <div className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: 'var(--color-data-divider)' }}>
                  <div className="w-10 h-10 rounded flex items-center justify-center font-black text-lg flex-shrink-0"
                       style={{ background: meta.accent + '22', color: meta.accent, border: `1px solid ${meta.accent}66` }}>
                    {tierKey}
                  </div>
                  <div>
                    <div className="text-sm font-black text-white/90">{meta.label}</div>
                    <div className="text-[11px] text-white/45">{meta.desc}</div>
                  </div>
                  <div className="ml-auto text-xs text-white/40">{tierPlayers.length} 人</div>
                </div>
                {/* Players */}
                {hasData ? (
                  tierPlayers.length === 0
                    ? <p className="text-xs text-white/30 px-4 py-3">暂无该等级选手</p>
                    : <div className="divide-y" style={{ borderColor: 'var(--color-data-divider)' }}>
                        {tierPlayers.map((p, i) => (
                          <motion.div key={p.player_id}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 px-4 py-2.5">
                            <span className="text-xs text-white/30 tabular-nums w-5 text-right">{p.pick_order ?? '—'}</span>
                            <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0 overflow-hidden">
                              {p.avatar_url
                                ? <img src={p.avatar_url} alt={p.nickname} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/40">
                                    {p.nickname[0]}
                                  </div>}
                            </div>
                            <span className="text-sm font-bold text-white/90 flex-1 min-w-0 truncate">{p.nickname}</span>
                            {p.is_captain && (
                              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded"
                                    style={{ background: meta.accent + '22', color: meta.accent }}>C</span>
                            )}
                            {p.team_name && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <TeamLogo url={p.team_logo_url} name={p.team_name} size={18} />
                                <span className="text-xs text-white/50 hidden sm:block">{p.team_name}</span>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                ) : (
                  <p className="text-xs text-white/30 px-4 py-3">选手分配数据待 admin 录入</p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* S-shape pick order viz */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.25em] text-primary mb-4">Pick Order</h2>
        <div className="rounded-md border p-6"
             style={{ background: 'var(--color-data-surface)', borderColor: 'var(--color-data-divider)' }}>
          <SnakeOrderViz rounds={4} teams={N_TEAMS} players={players ?? []} />
          {!hasData && (
            <p className="text-xs text-white/40 mt-4 text-center">
              选手分配数据待 admin 录入 — 此处显示 S 型逆向选马顺序示意
            </p>
          )}
        </div>
      </section>
    </div>
  )
}

function SnakeOrderViz({ rounds, teams, players }: { rounds: number; teams: number; players: DraftPlayer[] }) {
  const pickToPlayer = new Map(players.map(p => [p.pick_order, p]))

  return (
    <div className="space-y-2">
      {Array.from({ length: rounds }, (_, r) => {
        const reverse = r % 2 === 1
        const order = Array.from({ length: teams }, (_, i) => reverse ? teams - i : i + 1)
        return (
          <motion.div key={r} className="flex items-center gap-2"
            initial={{ opacity: 0, x: reverse ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: r * 0.06 }}>
            <div className="text-[10px] font-black uppercase tracking-widest text-white/35 w-12 flex-shrink-0">
              R{r + 1} {reverse ? '←' : '→'}
            </div>
            <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${teams}, minmax(0, 1fr))` }}>
              {order.map(n => {
                const globalPick = r * teams + n
                const p = pickToPlayer.get(globalPick)
                return (
                  <div key={n}
                       title={p ? p.nickname : `Pick ${globalPick}`}
                       className="aspect-square rounded text-[9px] font-black flex items-center justify-center text-white/55 tabular-nums"
                       style={{ background: 'var(--color-data-chip)' }}>
                    {p ? p.nickname[0] : n}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
cd /Users/brandt/alast/frontend
npm run build
```

Expected: builds clean.

- [ ] **Step 5: Run backend tests one final time**

```bash
cd /Users/brandt/alast/backend
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Final commit**

```bash
cd /Users/brandt/alast/frontend
git add src/components/tournament/tabs/GroupStageTab.tsx src/pages/DraftPage.tsx
git commit -m "feat(frontend): wire GroupStageTab standings + DraftPage with real API data"
```

---

## File Structure Summary

| Path | Action | Purpose |
|------|--------|---------|
| `backend/src/migrations/002_bracket_structure.sql` | Create | bracket_kind/round, is_current, csdm checksum |
| `backend/src/migrations/003_tournament_player_tier.sql` | Create | tournament_player_assignment table |
| `backend/src/migrations/004_player_steam_aliases.sql` | Create | player_steam_aliases table |
| `backend/src/migrations/005_match_substitutes.sql` | Create | match_substitutes table |
| `backend/src/migrations/006_match_rich_events.sql` | Create | match_rounds, match_kills, match_clutches, player_round_economies |
| `backend/src/migrations/007_swiss_standings_view.sql` | Create | tournament_swiss_standings VIEW |
| `backend/scripts/backfill-bracket-fields.ts` | Create | One-time backfill of bracket_kind + is_current |
| `backend/src/routes/tournament-detail.ts` | Create | /current, /standings, /bracket, /draft |
| `backend/src/routes/match-maps.ts` | Create | /maps, /maps/:id/stats|rounds|economy|highlights |
| `backend/src/routes/admin/import-demo.ts` | Create | Demo preview + confirm |
| `backend/src/routes/admin/player-aliases.ts` | Create | Steam alias CRUD |
| `backend/src/routes/admin/match-substitutes.ts` | Create | Substitute CRUD |
| `backend/src/routes/stats.ts` | Modify | Add stage/map/tier/min_maps filters + 2 new endpoints |
| `backend/src/index.ts` | Modify | Mount 5 new route files |
| `backend/tests/setup.ts` | Modify | Add insertPlayer/insertMatchMap/insertPlayerMatchStats/getAdminToken |
| `backend/tests/tournament-detail.test.ts` | Create | Tests for /current/standings/bracket/draft |
| `backend/tests/match-maps.test.ts` | Create | Tests for map sub-resource endpoints |
| `backend/tests/import-demo.test.ts` | Create | Tests for preview + confirm |
| `frontend/src/api/currentTournament.ts` | Modify | Call /api/tournaments/current |
| `frontend/src/api/tournaments.ts` | Modify | Add useStandings/useBracket/useDraft |
| `frontend/src/types.ts` | Modify | Add StandingRow, BracketMatch, DraftPlayer, TournamentSummary, TierComparison |
| `frontend/src/components/tournament/tabs/GroupStageTab.tsx` | Modify | Wire useStandings |
| `frontend/src/pages/DraftPage.tsx` | Modify | Wire useDraft with real player data |

---

## Self-Review

**Spec coverage check:**
- ✅ §3.1 bracket_kind/bracket_round/best_of + is_current + csdm checksum → Migration 002
- ✅ §3.2 All 4 new tables → Migrations 003-006
- ✅ §3.3 Swiss standings view → Migration 007 + Task 6
- ✅ §3.4 Import reconstruct (preview+confirm, rich events) → Task 9+10
- ✅ §3.5 Player matching (matched/aliased/new + sub_warning) → Task 9 preview logic
- ✅ §3.6 All 10 API endpoints → Tasks 5, 7, 11, 12
- ✅ §3.7 Migration sequence 002-007 → Tasks 1-2
- ✅ Frontend hooks for all new endpoints → Task 13
- ✅ GroupStageTab standings wired → Task 14
- ✅ DraftPage wired with real data → Task 14
- ⚠️ BracketTab: already uses `useMatches` and groups by stage regex — bracket_kind data is available after backfill but the tab doesn't call `/api/tournaments/:id/bracket`. Acceptable for Phase C since the tab already renders correctly from stage labels. Phase B can refine.

**No placeholders:** all steps have exact code.

**Type consistency:** `StandingRow` in types.ts matches the shape returned by the view; GroupStageTab maps `team_id/team_name/team_short_name/team_logo_url` into the `{ team: { id, name, short_name, logo_url } }` shape that `StandingsTable` expects.
