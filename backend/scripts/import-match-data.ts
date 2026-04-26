/**
 * Batch import script: reads all JSONs from match_data/ and imports into DB.
 * Matches JSONs to existing match_maps by score + team names.
 * Sets player steam_ids, inserts player_match_stats, match_rounds, match_kills, match_clutches.
 *
 * Run: cd backend && npx tsx scripts/import-match-data.ts
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const __dir = dirname(fileURLToPath(import.meta.url))
const MATCH_DATA_DIR = join(__dir, '../../match_data')

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const q = (sql: string, params?: unknown[]) => pool.query(sql, params)

// ── Team name normalization ────────────────────────────────────────────────────
// Map JSON team names to DB team names (for ambiguous/abbreviated cases)
const TEAM_NAME_ALIASES: Record<string, string> = {
  'Team 11': 'NTR',
  '牛头人': 'NTR',
  '英特尔科学家': '英特尔首席科学家',
  'country love': 'CountryLove',
}

function normalizeTeamName(name: string): string {
  return TEAM_NAME_ALIASES[name] ?? name
}

// ── DB lookups ─────────────────────────────────────────────────────────────────

interface DBMatchMap {
  id: string
  match_id: string
  map_order: number
  score_a: number
  score_b: number
  team_a_id: string
  team_b_id: string
  team_a_name: string
  team_b_name: string
}

interface DBPlayer {
  id: string
  nickname: string
  steam_id: string | null
  team_id: string | null
}

async function loadMatchMaps(): Promise<DBMatchMap[]> {
  const { rows } = await q(`
    SELECT mm.id, mm.match_id, mm.map_order, mm.score_a, mm.score_b,
           m.team_a_id, m.team_b_id,
           ta.name AS team_a_name, tb.name AS team_b_name
    FROM match_maps mm
    JOIN matches m ON m.id = mm.match_id
    LEFT JOIN teams ta ON ta.id = m.team_a_id
    LEFT JOIN teams tb ON tb.id = m.team_b_id
  `)
  return rows
}

async function loadPlayers(): Promise<DBPlayer[]> {
  const { rows } = await q('SELECT id, nickname, steam_id, team_id FROM players')
  return rows
}

async function loadTeams(): Promise<Record<string, string>> {
  const { rows } = await q('SELECT id, name FROM teams')
  return Object.fromEntries(rows.map((r: { id: string; name: string }) => [r.name, r.id]))
}

// ── Matching logic ─────────────────────────────────────────────────────────────

function findMatchMap(
  matchMaps: DBMatchMap[],
  jsonTeamAName: string,
  jsonTeamBName: string,
  jsonTeamAScore: number,
  jsonTeamBScore: number,
): { map: DBMatchMap; jsonAIsTeamA: boolean } | null {
  const normA = normalizeTeamName(jsonTeamAName)
  const normB = normalizeTeamName(jsonTeamBName)

  for (const mm of matchMaps) {
    const scores = new Set([mm.score_a, mm.score_b])
    if (!scores.has(jsonTeamAScore) || !scores.has(jsonTeamBScore)) continue
    // Avoid matching if both scores are the same (tie would be ambiguous)
    if (jsonTeamAScore === jsonTeamBScore && mm.score_a !== mm.score_b) continue

    // Check if JSON teamA = DB teamA (not reversed)
    if (mm.score_a === jsonTeamAScore && mm.score_b === jsonTeamBScore) {
      if (
        (mm.team_a_name === normA || mm.team_a_name.includes(normA) || normA.includes(mm.team_a_name)) &&
        (mm.team_b_name === normB || mm.team_b_name.includes(normB) || normB.includes(mm.team_b_name))
      ) {
        return { map: mm, jsonAIsTeamA: true }
      }
    }
    // Check reversed
    if (mm.score_a === jsonTeamBScore && mm.score_b === jsonTeamAScore) {
      if (
        (mm.team_a_name === normB || mm.team_a_name.includes(normB) || normB.includes(mm.team_a_name)) &&
        (mm.team_b_name === normA || mm.team_b_name.includes(normA) || normA.includes(mm.team_b_name))
      ) {
        return { map: mm, jsonAIsTeamA: false }
      }
    }
  }
  return null
}

// ── Import one JSON ────────────────────────────────────────────────────────────

async function importJson(
  jsonPath: string,
  matchMaps: DBMatchMap[],
  players: DBPlayer[],
  teamByName: Record<string, string>,
  steamIdToPlayerId: Map<string, string>,
) {
  const raw = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const filename = jsonPath.split('/').pop()!

  const jsonTeamAName: string = raw.teamA?.name ?? ''
  const jsonTeamBName: string = raw.teamB?.name ?? ''
  const jsonTeamAScore: number = raw.teamA?.score ?? 0
  const jsonTeamBScore: number = raw.teamB?.score ?? 0

  console.log(`\n📂 ${filename}`)
  console.log(`   ${jsonTeamAName} ${jsonTeamAScore} vs ${jsonTeamBName} ${jsonTeamBScore} — ${raw.mapName}`)

  // ── Find or create match_map ────────────────────────────────────────────────
  let matchMapId: string
  let dbTeamAId: string
  let dbTeamBId: string
  let jsonAIsTeamA: boolean

  const found = findMatchMap(matchMaps, jsonTeamAName, jsonTeamBName, jsonTeamAScore, jsonTeamBScore)

  if (found) {
    matchMapId = found.map.id
    dbTeamAId = found.map.team_a_id
    dbTeamBId = found.map.team_b_id
    jsonAIsTeamA = found.jsonAIsTeamA
    console.log(`   ✅ Matched to match_map ${matchMapId}`)

    // Update map_name and duration
    await q(
      `UPDATE match_maps SET map_name = $1, duration_seconds = $2 WHERE id = $3`,
      [raw.mapName, Math.round(raw.duration / 1000), matchMapId]
    )
  } else {
    // Need to create match_map — find the match by team names
    const normA = normalizeTeamName(jsonTeamAName)
    const normB = normalizeTeamName(jsonTeamBName)
    const tAId = teamByName[normA] ?? Object.entries(teamByName).find(([n]) => n.includes(normA) || normA.includes(n))?.[1]
    const tBId = teamByName[normB] ?? Object.entries(teamByName).find(([n]) => n.includes(normB) || normB.includes(n))?.[1]

    if (!tAId || !tBId) {
      console.log(`   ❌ Cannot find teams: ${normA} / ${normB} — SKIPPING`)
      return
    }

    // Find the match
    const { rows: matchRows } = await q(`
      SELECT id, team_a_id, team_b_id FROM matches
      WHERE (team_a_id = $1 AND team_b_id = $2) OR (team_a_id = $2 AND team_b_id = $1)
    `, [tAId, tBId])

    if (matchRows.length === 0) {
      console.log(`   ❌ No match found for teams — SKIPPING`)
      return
    }
    const match = matchRows[0]

    // Determine if JSON teamA = DB team_a
    jsonAIsTeamA = match.team_a_id === tAId
    dbTeamAId = match.team_a_id
    dbTeamBId = match.team_b_id

    const dbScoreA = jsonAIsTeamA ? jsonTeamAScore : jsonTeamBScore
    const dbScoreB = jsonAIsTeamA ? jsonTeamBScore : jsonTeamAScore
    const winnerTeamId = dbScoreA > dbScoreB ? dbTeamAId : dbTeamBId

    // Count existing maps for map_order
    const { rows: [{ cnt }] } = await q('SELECT COUNT(*) AS cnt FROM match_maps WHERE match_id = $1', [match.id])
    const mapOrder = parseInt(cnt) + 1

    const { rows: [mm] } = await q(
      `INSERT INTO match_maps (match_id, map_name, map_order, score_a, score_b, winner_team_id, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [match.id, raw.mapName, mapOrder, dbScoreA, dbScoreB, winnerTeamId, Math.round(raw.duration / 1000)]
    )
    matchMapId = mm.id

    // Update match status and maps_won
    const { rows: [mapsAgg] } = await q(
      `SELECT SUM(CASE WHEN winner_team_id = $1 THEN 1 ELSE 0 END) AS won_a,
              SUM(CASE WHEN winner_team_id = $2 THEN 1 ELSE 0 END) AS won_b
       FROM match_maps WHERE match_id = $3`,
      [dbTeamAId, dbTeamBId, match.id]
    )
    await q(
      `UPDATE matches SET status = 'finished', maps_won_a = $1, maps_won_b = $2 WHERE id = $3`,
      [mapsAgg.won_a ?? 0, mapsAgg.won_b ?? 0, match.id]
    )

    console.log(`   ✅ Created new match_map ${matchMapId}`)
    // Add to in-memory list for future iterations
    matchMaps.push({
      id: matchMapId, match_id: match.id, map_order: mapOrder,
      score_a: dbScoreA, score_b: dbScoreB,
      team_a_id: dbTeamAId, team_b_id: dbTeamBId,
      team_a_name: normA, team_b_name: normB,
    })
  }

  // Check if already imported
  const { rows: [{ cnt: existingStats }] } = await q(
    'SELECT COUNT(*) AS cnt FROM player_match_stats WHERE match_map_id = $1', [matchMapId]
  )
  if (parseInt(existingStats) > 0) {
    console.log(`   ⏭  Already has ${existingStats} stat rows — skipping`)
    return
  }

  // ── Player resolution ───────────────────────────────────────────────────────
  // Build steamId → playerId for this map's players
  const localSteamMap = new Map<string, string>()

  for (const jp of (raw.players ?? [])) {
    const steamId = String(jp.steamId)
    const jName: string = jp.name ?? ''
    const jTeam: string = normalizeTeamName(jp.teamName ?? '')

    // 1. Check existing steamId → player_id map
    if (steamIdToPlayerId.has(steamId)) {
      localSteamMap.set(steamId, steamIdToPlayerId.get(steamId)!)
      continue
    }

    // 2. Match by nickname in players table (within same team)
    let dbPlayer = players.find(p => p.nickname === jName)
    if (!dbPlayer) {
      // Fuzzy: partial match
      dbPlayer = players.find(p => p.nickname.includes(jName) || jName.includes(p.nickname))
    }

    if (dbPlayer) {
      // Set steam_id if not set
      if (!dbPlayer.steam_id) {
        await q('UPDATE players SET steam_id = $1 WHERE id = $2', [steamId, dbPlayer.id])
        dbPlayer.steam_id = steamId
        console.log(`   🔗 Linked steamId ${steamId} → ${dbPlayer.nickname}`)
      }
      localSteamMap.set(steamId, dbPlayer.id)
      steamIdToPlayerId.set(steamId, dbPlayer.id)
    } else {
      // Create new player
      const teamName = normalizeTeamName(jp.teamName ?? '')
      const teamId = teamByName[teamName] ?? Object.entries(teamByName).find(([n]) => n.includes(teamName) || teamName.includes(n))?.[1] ?? null
      const { rows: [np] } = await q(
        `INSERT INTO players (nickname, steam_id, team_id) VALUES ($1, $2, $3) RETURNING id`,
        [jName, steamId, teamId]
      )
      console.log(`   ➕ Created player ${jName} (${steamId})`)
      players.push({ id: np.id, nickname: jName, steam_id: steamId, team_id: teamId })
      localSteamMap.set(steamId, np.id)
      steamIdToPlayerId.set(steamId, np.id)
    }
  }

  // ── player_match_stats ──────────────────────────────────────────────────────
  let statsInserted = 0
  for (const jp of (raw.players ?? [])) {
    const steamId = String(jp.steamId)
    const playerId = localSteamMap.get(steamId)
    if (!playerId) { console.log(`   ⚠️  No player_id for ${jp.name} (${steamId})`); continue }

    // Determine team_id for this match (which team they played for, not their current team)
    const jTeam = normalizeTeamName(jp.teamName ?? '')
    let teamId: string | null = null
    if (jTeam === normalizeTeamName(jsonTeamAName)) {
      teamId = jsonAIsTeamA ? dbTeamAId : dbTeamBId
    } else {
      teamId = jsonAIsTeamA ? dbTeamBId : dbTeamAId
    }

    const kast = jp.kast != null ? jp.kast * 100 : null // JSON kast is 0-1 float

    await q(`
      INSERT INTO player_match_stats
        (player_id, match_map_id, team_id, kills, deaths, assists, headshots, headshot_pct,
         adr, kast, rating, first_kills, first_deaths, clutches_won, clutches_played, flash_assists,
         imported_from_csdm)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true)
      ON CONFLICT (match_map_id, player_id) DO NOTHING
    `, [
      playerId, matchMapId, teamId,
      jp.killCount ?? null, jp.deathCount ?? null, jp.assistCount ?? null,
      jp.headshotCount ?? null,
      jp.headshotPercentage != null ? jp.headshotPercentage * 100 : null,
      jp.averageDamagePerRound ?? null,
      kast,
      jp.hltvRating2 ?? jp.hltvRating ?? null,
      jp.firstKillCount ?? null, jp.firstDeathCount ?? null,
      jp.vsOneWonCount != null ? (jp.vsOneWonCount + jp.vsTwoWonCount + jp.vsThreeWonCount + jp.vsFourWonCount + jp.vsFiveWonCount) : null,
      jp.vsOneCount != null ? (jp.vsOneCount + jp.vsTwoCount + jp.vsThreeCount + jp.vsFourCount + jp.vsFiveCount) : null,
      null, // flash_assists not in JSON
    ])
    statsInserted++
  }
  console.log(`   📊 Inserted ${statsInserted} player_match_stats`)

  // ── match_rounds ────────────────────────────────────────────────────────────
  let roundsInserted = 0
  for (const jr of (raw.rounds ?? [])) {
    // If JSON is reversed (jsonA = DB teamB), swap teamA/B fields
    const [dbTeamASide, dbTeamBSide] = jsonAIsTeamA
      ? [jr.teamASide, jr.teamBSide]
      : [jr.teamBSide, jr.teamASide]
    const [dbTeamAScore, dbTeamBScore] = jsonAIsTeamA
      ? [jr.teamAScore, jr.teamBScore]
      : [jr.teamBScore, jr.teamAScore]
    const [dbTeamAEcon, dbTeamBEcon] = jsonAIsTeamA
      ? [jr.teamAEconomyType, jr.teamBEconomyType]
      : [jr.teamBEconomyType, jr.teamAEconomyType]
    const [dbTeamASpent, dbTeamBSpent] = jsonAIsTeamA
      ? [jr.teamAMoneySpent, jr.teamBMoneySpent]
      : [jr.teamBMoneySpent, jr.teamAMoneySpent]
    const [dbTeamAEquip, dbTeamBEquip] = jsonAIsTeamA
      ? [jr.teamAEquipmentValue, jr.teamBEquipmentValue]
      : [jr.teamBEquipmentValue, jr.teamAEquipmentValue]

    // Determine winner_team_id
    let winnerTeamId: string | null = null
    if (jr.winnerSide != null) {
      // winner side 2=T, 3=CT
      const dbTeamASideNum = dbTeamASide as number
      winnerTeamId = jr.winnerSide === dbTeamASideNum ? dbTeamAId : dbTeamBId
    }

    await q(`
      INSERT INTO match_rounds
        (match_map_id, round_number, winner_side, winner_team_id, end_reason, duration_ms,
         team_a_side, team_b_side, team_a_score, team_b_score,
         team_a_economy_type, team_b_economy_type,
         team_a_money_spent, team_b_money_spent,
         team_a_equipment_value, team_b_equipment_value,
         start_tick, end_tick)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT DO NOTHING
    `, [
      matchMapId, jr.number, jr.winnerSide, winnerTeamId, jr.endReason, jr.duration ?? null,
      dbTeamASide, dbTeamBSide, dbTeamAScore, dbTeamBScore,
      dbTeamAEcon, dbTeamBEcon, dbTeamASpent, dbTeamBSpent, dbTeamAEquip, dbTeamBEquip,
      jr.startTick ?? null, jr.endTick ?? null,
    ])
    roundsInserted++
  }
  console.log(`   🔄 Inserted ${roundsInserted} rounds`)

  // ── match_kills ─────────────────────────────────────────────────────────────
  let killsInserted = 0
  for (const jk of (raw.kills ?? [])) {
    const killerSteamId = jk.killerSteamId ? String(jk.killerSteamId) : null
    const victimSteamId = jk.victimSteamId ? String(jk.victimSteamId) : null
    const assisterSteamId = jk.assisterSteamId ? String(jk.assisterSteamId) : null

    const killerPlayerId = killerSteamId ? (steamIdToPlayerId.get(killerSteamId) ?? null) : null
    const victimPlayerId = victimSteamId ? (steamIdToPlayerId.get(victimSteamId) ?? null) : null
    const assisterPlayerId = assisterSteamId ? (steamIdToPlayerId.get(assisterSteamId) ?? null) : null

    await q(`
      INSERT INTO match_kills
        (match_map_id, round_number, tick, weapon_name, weapon_type, is_headshot,
         is_trade_kill, is_through_smoke, is_no_scope,
         killer_player_id, victim_player_id, assister_player_id, is_assisted_flash,
         killer_side, victim_side)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT DO NOTHING
    `, [
      matchMapId, jk.roundNumber, jk.tick ?? null,
      jk.weaponName ?? null, jk.weaponType ?? null, jk.isHeadshot ?? false,
      jk.isTradeKill ?? false, jk.isThroughSmoke ?? false, jk.isNoScope ?? false,
      killerPlayerId, victimPlayerId, assisterPlayerId, jk.isAssistedFlash ?? false,
      jk.killerSide ?? null, jk.victimSide ?? null,
    ])
    killsInserted++
  }
  console.log(`   💀 Inserted ${killsInserted} kills`)

  // ── match_clutches ──────────────────────────────────────────────────────────
  let clutchesInserted = 0
  for (const jc of (raw.clutches ?? [])) {
    const clutcherSteamId = jc.clutcherSteamId ? String(jc.clutcherSteamId) : null
    const playerId = clutcherSteamId ? (steamIdToPlayerId.get(clutcherSteamId) ?? null) : null

    await q(`
      INSERT INTO match_clutches (match_map_id, round_number, player_id, opponent_count, won, kill_count, has_survived)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT DO NOTHING
    `, [
      matchMapId, jc.roundNumber, playerId, jc.opponentCount ?? null,
      jc.won ?? false, jc.clutcherKillCount ?? 0, jc.hasClutcherSurvived ?? false,
    ])
    clutchesInserted++
  }
  console.log(`   🏆 Inserted ${clutchesInserted} clutches`)

  // ── Update match_map winner ─────────────────────────────────────────────────
  const scoreA = jsonAIsTeamA ? jsonTeamAScore : jsonTeamBScore
  const scoreB = jsonAIsTeamA ? jsonTeamBScore : jsonTeamAScore
  const winnerTeamId = scoreA > scoreB ? dbTeamAId : dbTeamBId
  await q(
    `UPDATE match_maps SET map_name = $1, score_a = $2, score_b = $3, winner_team_id = $4,
            duration_seconds = $5 WHERE id = $6`,
    [raw.mapName, scoreA, scoreB, winnerTeamId, Math.round(raw.duration / 1000), matchMapId]
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting batch import from', MATCH_DATA_DIR)

  const matchMaps = await loadMatchMaps()
  const players = await loadPlayers()
  const teamByName = await loadTeams()
  const steamIdToPlayerId = new Map<string, string>()

  // Pre-populate steamId map from existing players
  for (const p of players) {
    if (p.steam_id) steamIdToPlayerId.set(p.steam_id, p.id)
  }

  const files = readdirSync(MATCH_DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()

  for (const file of files) {
    try {
      await importJson(join(MATCH_DATA_DIR, file), matchMaps, players, teamByName, steamIdToPlayerId)
    } catch (err) {
      console.error(`   ❌ ERROR in ${file}:`, (err as Error).message)
    }
  }

  const { rows: [counts] } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM player_match_stats) AS stats,
      (SELECT COUNT(*) FROM match_rounds) AS rounds,
      (SELECT COUNT(*) FROM match_kills) AS kills,
      (SELECT COUNT(*) FROM match_clutches) AS clutches
  `)
  console.log('\n✅ Import complete. DB counts:', counts)

  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
