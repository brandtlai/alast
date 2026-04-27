// backend/src/routes/admin/import-auto.ts
//
// One-step CSDM rich-format import. Auto-resolves the match (creating one in
// the current tournament if none exists between the two teams) and auto-creates
// any unknown players, then inserts all rich-event rows in a single transaction.
import { Hono } from 'hono'
import type { PoolClient } from 'pg'
import { pool, query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

const TEAM_NAME_ALIASES: Record<string, string> = {
  'Team 11': 'NTR',
  '牛头人': 'NTR',
  '英特尔科学家': '英特尔首席科学家',
  'country love': 'CountryLove',
}

function normalizeTeamName(name: string): string {
  return TEAM_NAME_ALIASES[name] ?? name
}

interface CsdmTeam { name: string; score: number }
interface CsdmPlayer {
  steamId: string | number
  name: string
  teamName: string
  killCount?: number
  deathCount?: number
  assistCount?: number
  headshotCount?: number
  headshotPercentage?: number
  averageDamagePerRound?: number
  kast?: number
  hltvRating2?: number
  hltvRating?: number
  firstKillCount?: number
  firstDeathCount?: number
  vsOneWonCount?: number; vsTwoWonCount?: number; vsThreeWonCount?: number; vsFourWonCount?: number; vsFiveWonCount?: number
  vsOneCount?: number; vsTwoCount?: number; vsThreeCount?: number; vsFourCount?: number; vsFiveCount?: number
}
interface CsdmRound {
  number: number
  startTick?: number; endTick?: number
  duration?: number
  winnerSide?: number
  endReason?: number | string
  teamAScore: number; teamBScore: number
  teamASide: number; teamBSide: number
  teamAEconomyType?: string; teamBEconomyType?: string
  teamAMoneySpent?: number; teamBMoneySpent?: number
  teamAEquipmentValue?: number; teamBEquipmentValue?: number
}
interface CsdmKill {
  roundNumber: number
  tick?: number
  weaponName?: string; weaponType?: string
  isHeadshot?: boolean; isTradeKill?: boolean; isThroughSmoke?: boolean; isNoScope?: boolean; isAssistedFlash?: boolean
  killerSteamId?: string | number; victimSteamId?: string | number; assisterSteamId?: string | number | null
  killerSide?: number; victimSide?: number
  distance?: number
}
interface CsdmClutch {
  roundNumber: number
  clutcherSteamId: string | number
  opponentCount?: number
  won?: boolean
  clutcherKillCount?: number
  hasClutcherSurvived?: boolean
}
interface CsdmEconomy {
  roundNumber: number
  playerSteamId: string | number
  playerSide: number
  equipmentValue?: number
  moneySpent?: number
  startMoney?: number
  type?: string
}
interface CsdmJson {
  checksum?: string
  mapName: string
  duration: number
  teamA: CsdmTeam
  teamB: CsdmTeam
  players: CsdmPlayer[]
  rounds?: CsdmRound[]
  kills?: CsdmKill[]
  clutches?: CsdmClutch[]
  playersEconomies?: CsdmEconomy[]
}

interface ResolvedTeam { id: string; name: string }

async function resolveTeamByName(name: string): Promise<ResolvedTeam | null> {
  const norm = normalizeTeamName(name)
  const { rows } = await query<{ id: string; name: string }>(
    `SELECT id, name FROM teams WHERE name = $1 OR name ILIKE $2 OR $1 ILIKE CONCAT('%', name, '%') LIMIT 1`,
    [norm, `%${norm}%`]
  )
  return rows[0] ?? null
}

async function resolvePlayer(
  client: PoolClient,
  steamId: string,
  nickname: string,
  teamId: string | null,
): Promise<string> {
  const direct = await client.query<{ id: string }>(
    `SELECT id FROM players WHERE steam_id = $1 LIMIT 1`, [steamId]
  )
  if (direct.rows[0]) return direct.rows[0].id

  const aliased = await client.query<{ player_id: string }>(
    `SELECT player_id FROM player_steam_aliases WHERE steam_id = $1 LIMIT 1`, [steamId]
  )
  if (aliased.rows[0]) return aliased.rows[0].player_id

  const byNick = await client.query<{ id: string; steam_id: string | null }>(
    `SELECT id, steam_id FROM players WHERE nickname = $1 LIMIT 1`, [nickname]
  )
  if (byNick.rows[0]) {
    if (!byNick.rows[0].steam_id) {
      await client.query(`UPDATE players SET steam_id = $1 WHERE id = $2`, [steamId, byNick.rows[0].id])
    } else {
      await client.query(
        `INSERT INTO player_steam_aliases (player_id, steam_id) VALUES ($1, $2) ON CONFLICT (steam_id) DO NOTHING`,
        [byNick.rows[0].id, steamId]
      )
    }
    return byNick.rows[0].id
  }

  const created = await client.query<{ id: string }>(
    `INSERT INTO players (nickname, steam_id, team_id) VALUES ($1, $2, $3) RETURNING id`,
    [nickname, steamId, teamId]
  )
  return created.rows[0].id
}

r.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  if (!(file instanceof File)) {
    return c.json(err('file required (multipart field "file")', 'BAD_REQUEST'), 400)
  }

  let demo: CsdmJson
  try {
    demo = JSON.parse(await file.text()) as CsdmJson
  } catch {
    return c.json(err('Invalid JSON', 'BAD_JSON'), 400)
  }

  if (!demo.teamA?.name || !demo.teamB?.name || !demo.mapName || !Array.isArray(demo.players)) {
    return c.json(err('Missing required fields (teamA, teamB, mapName, players)', 'BAD_SHAPE'), 400)
  }

  if (demo.checksum) {
    const { rows } = await query(
      `SELECT id FROM csdm_imports WHERE checksum = $1 AND status = 'confirmed' LIMIT 1`,
      [demo.checksum]
    )
    if (rows[0]) return c.json(err('Demo already imported', 'ALREADY_IMPORTED'), 409)
  }

  const teamA = await resolveTeamByName(demo.teamA.name)
  const teamB = await resolveTeamByName(demo.teamB.name)
  if (!teamA || !teamB) {
    return c.json(err(
      `Team not found: ${!teamA ? demo.teamA.name : ''} ${!teamB ? demo.teamB.name : ''}`.trim(),
      'TEAM_NOT_FOUND'
    ), 404)
  }
  if (teamA.id === teamB.id) {
    return c.json(err('teamA and teamB resolved to the same team', 'AMBIGUOUS_TEAMS'), 400)
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Find or create match (current tournament). If multiple non-finished matches
    // exist between these teams, prefer one that is not yet finished.
    const matchRows = await client.query<{ id: string; team_a_id: string; team_b_id: string; status: string }>(
      `SELECT id, team_a_id, team_b_id, status FROM matches
       WHERE (team_a_id = $1 AND team_b_id = $2) OR (team_a_id = $2 AND team_b_id = $1)
       ORDER BY (status = 'finished'), scheduled_at DESC NULLS LAST
       LIMIT 1`,
      [teamA.id, teamB.id]
    )
    let matchId: string
    let matchTeamAId: string
    let matchTeamBId: string
    if (matchRows.rows[0]) {
      matchId = matchRows.rows[0].id
      matchTeamAId = matchRows.rows[0].team_a_id
      matchTeamBId = matchRows.rows[0].team_b_id
    } else {
      const tour = await client.query<{ id: string }>(
        `SELECT id FROM tournaments WHERE is_current = TRUE LIMIT 1`
      )
      if (!tour.rows[0]) {
        await client.query('ROLLBACK')
        return c.json(err('No current tournament; create one or set is_current = TRUE', 'NO_TOURNAMENT'), 409)
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status)
         VALUES ($1, $2, $3, 'live') RETURNING id`,
        [tour.rows[0].id, teamA.id, teamB.id]
      )
      matchId = inserted.rows[0].id
      matchTeamAId = teamA.id
      matchTeamBId = teamB.id
    }

    // Orient JSON team A/B against the match's stored team_a/team_b
    const jsonAIsTeamA = matchTeamAId === teamA.id
    const dbScoreA = jsonAIsTeamA ? demo.teamA.score : demo.teamB.score
    const dbScoreB = jsonAIsTeamA ? demo.teamB.score : demo.teamA.score

    // map_order = next slot for this match
    const mapOrderRow = await client.query<{ next_order: number }>(
      `SELECT COALESCE(MAX(map_order), 0) + 1 AS next_order FROM match_maps WHERE match_id = $1`,
      [matchId]
    )
    const mapOrder = mapOrderRow.rows[0].next_order

    const winnerTeamId = dbScoreA > dbScoreB ? matchTeamAId : matchTeamBId
    const mm = await client.query<{ id: string }>(
      `INSERT INTO match_maps (match_id, map_name, map_order, score_a, score_b, winner_team_id, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [matchId, demo.mapName, mapOrder, dbScoreA, dbScoreB, winnerTeamId, Math.round((demo.duration ?? 0) / 1000)]
    )
    const mapId = mm.rows[0].id

    // ── Players: resolve and insert stats ──
    const steamToPlayerId = new Map<string, string>()
    const steamToTeamId = new Map<string, string>()
    for (const dp of demo.players) {
      const steamId = String(dp.steamId)
      const dpTeamName = normalizeTeamName(dp.teamName ?? '')
      const playerTeamMatchId =
        dpTeamName === normalizeTeamName(demo.teamA.name) ? teamA.id :
        dpTeamName === normalizeTeamName(demo.teamB.name) ? teamB.id : null
      const pid = await resolvePlayer(client, steamId, dp.name ?? 'unknown', playerTeamMatchId)
      steamToPlayerId.set(steamId, pid)
      if (playerTeamMatchId) steamToTeamId.set(steamId, playerTeamMatchId)
    }

    let statsInserted = 0
    for (const dp of demo.players) {
      const steamId = String(dp.steamId)
      const playerId = steamToPlayerId.get(steamId)
      if (!playerId) continue
      const teamId = steamToTeamId.get(steamId) ?? null
      const kast = dp.kast ?? null
      const headshotPct = dp.headshotPercentage ?? null
      const clutchesWon = dp.vsOneWonCount != null
        ? (dp.vsOneWonCount + (dp.vsTwoWonCount ?? 0) + (dp.vsThreeWonCount ?? 0) + (dp.vsFourWonCount ?? 0) + (dp.vsFiveWonCount ?? 0))
        : null
      const clutchesPlayed = dp.vsOneCount != null
        ? (dp.vsOneCount + (dp.vsTwoCount ?? 0) + (dp.vsThreeCount ?? 0) + (dp.vsFourCount ?? 0) + (dp.vsFiveCount ?? 0))
        : null
      await client.query(
        `INSERT INTO player_match_stats
           (match_map_id, player_id, team_id, kills, deaths, assists, headshots, headshot_pct,
            adr, kast, rating, first_kills, first_deaths, clutches_won, clutches_played,
            imported_from_csdm)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true)
         ON CONFLICT (match_map_id, player_id) DO NOTHING`,
        [
          mapId, playerId, teamId,
          dp.killCount ?? null, dp.deathCount ?? null, dp.assistCount ?? null,
          dp.headshotCount ?? null, headshotPct,
          dp.averageDamagePerRound ?? null, kast,
          dp.hltvRating2 ?? dp.hltvRating ?? null,
          dp.firstKillCount ?? null, dp.firstDeathCount ?? null,
          clutchesWon, clutchesPlayed,
        ]
      )
      statsInserted++
    }

    // ── Rounds ──
    let roundsInserted = 0
    for (const rnd of demo.rounds ?? []) {
      const [aSide, bSide] = jsonAIsTeamA ? [rnd.teamASide, rnd.teamBSide] : [rnd.teamBSide, rnd.teamASide]
      const [aScore, bScore] = jsonAIsTeamA ? [rnd.teamAScore, rnd.teamBScore] : [rnd.teamBScore, rnd.teamAScore]
      const [aEcon, bEcon] = jsonAIsTeamA ? [rnd.teamAEconomyType, rnd.teamBEconomyType] : [rnd.teamBEconomyType, rnd.teamAEconomyType]
      const [aSpent, bSpent] = jsonAIsTeamA ? [rnd.teamAMoneySpent, rnd.teamBMoneySpent] : [rnd.teamBMoneySpent, rnd.teamAMoneySpent]
      const [aEquip, bEquip] = jsonAIsTeamA ? [rnd.teamAEquipmentValue, rnd.teamBEquipmentValue] : [rnd.teamBEquipmentValue, rnd.teamAEquipmentValue]

      let winnerTeamRoundId: string | null = null
      if (rnd.winnerSide != null) {
        winnerTeamRoundId = rnd.winnerSide === aSide ? matchTeamAId : matchTeamBId
      }

      await client.query(
        `INSERT INTO match_rounds
           (match_map_id, round_number, winner_side, winner_team_id, end_reason, duration_ms,
            team_a_side, team_b_side, team_a_score, team_b_score,
            team_a_economy_type, team_b_economy_type,
            team_a_money_spent, team_b_money_spent,
            team_a_equipment_value, team_b_equipment_value,
            start_tick, end_tick)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (match_map_id, round_number) DO NOTHING`,
        [
          mapId, rnd.number, rnd.winnerSide ?? null, winnerTeamRoundId, rnd.endReason ?? null, rnd.duration ?? null,
          aSide, bSide, aScore, bScore,
          aEcon ?? null, bEcon ?? null, aSpent ?? null, bSpent ?? null, aEquip ?? null, bEquip ?? null,
          rnd.startTick ?? null, rnd.endTick ?? null,
        ]
      )
      roundsInserted++
    }

    // ── Kills ──
    let killsInserted = 0
    for (const k of demo.kills ?? []) {
      const ks = k.killerSteamId != null ? String(k.killerSteamId) : null
      const vs = k.victimSteamId != null ? String(k.victimSteamId) : null
      const as_ = k.assisterSteamId != null ? String(k.assisterSteamId) : null
      await client.query(
        `INSERT INTO match_kills
           (match_map_id, round_number, tick, weapon_name, weapon_type, is_headshot,
            is_trade_kill, is_through_smoke, is_no_scope, is_assisted_flash,
            killer_player_id, victim_player_id, assister_player_id,
            killer_side, victim_side)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          mapId, k.roundNumber, k.tick ?? null,
          k.weaponName ?? null, k.weaponType ?? null, k.isHeadshot ?? false,
          k.isTradeKill ?? false, k.isThroughSmoke ?? false, k.isNoScope ?? false, k.isAssistedFlash ?? false,
          ks ? steamToPlayerId.get(ks) ?? null : null,
          vs ? steamToPlayerId.get(vs) ?? null : null,
          as_ ? steamToPlayerId.get(as_) ?? null : null,
          k.killerSide ?? null, k.victimSide ?? null,
        ]
      )
      killsInserted++
    }

    // ── Clutches ──
    let clutchesInserted = 0
    for (const cl of demo.clutches ?? []) {
      const sid = String(cl.clutcherSteamId)
      await client.query(
        `INSERT INTO match_clutches (match_map_id, round_number, player_id, opponent_count, won, kill_count, has_survived)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          mapId, cl.roundNumber, steamToPlayerId.get(sid) ?? null,
          cl.opponentCount ?? null, cl.won ?? false,
          cl.clutcherKillCount ?? 0, cl.hasClutcherSurvived ?? false,
        ]
      )
      clutchesInserted++
    }

    // ── Per-round economies ──
    let econInserted = 0
    for (const eco of demo.playersEconomies ?? []) {
      const sid = String(eco.playerSteamId)
      await client.query(
        `INSERT INTO player_round_economies
           (match_map_id, round_number, player_id, side, equipment_value, money_spent, start_money, type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          mapId, eco.roundNumber, steamToPlayerId.get(sid) ?? null,
          eco.playerSide, eco.equipmentValue ?? null, eco.moneySpent ?? null,
          eco.startMoney ?? null, eco.type ?? null,
        ]
      )
      econInserted++
    }

    // ── Aggregate match scoreline ──
    const agg = await client.query<{ won_a: string; won_b: string; total: string }>(
      `SELECT
         SUM(CASE WHEN winner_team_id = $1 THEN 1 ELSE 0 END) AS won_a,
         SUM(CASE WHEN winner_team_id = $2 THEN 1 ELSE 0 END) AS won_b,
         COUNT(*) AS total
       FROM match_maps WHERE match_id = $3`,
      [matchTeamAId, matchTeamBId, matchId]
    )
    const wonA = parseInt(agg.rows[0].won_a ?? '0')
    const wonB = parseInt(agg.rows[0].won_b ?? '0')

    await client.query(
      `UPDATE matches SET maps_won_a = $1, maps_won_b = $2, status = 'finished', finished_at = COALESCE(finished_at, now())
       WHERE id = $3`,
      [wonA, wonB, matchId]
    )

    // ── csdm_imports record ──
    await client.query(
      `INSERT INTO csdm_imports (filename, raw_json, match_id, status, checksum, confirmed_at)
       VALUES ($1, $2, $3, 'confirmed', $4, now())`,
      [file.name ?? `${demo.mapName}.json`, JSON.stringify(demo), matchId, demo.checksum ?? null]
    )

    await client.query('COMMIT')

    return c.json(ok({
      matchId,
      matchMapId: mapId,
      mapOrder,
      mapName: demo.mapName,
      teamA: { id: teamA.id, name: teamA.name, score: demo.teamA.score },
      teamB: { id: teamB.id, name: teamB.name, score: demo.teamB.score },
      counts: {
        stats: statsInserted,
        rounds: roundsInserted,
        kills: killsInserted,
        clutches: clutchesInserted,
        economies: econInserted,
      },
    }))
  } catch (e) {
    await client.query('ROLLBACK')
    console.error('import-auto upload error:', e)
    return c.json(err((e as Error).message ?? 'Import failed', 'INTERNAL_ERROR'), 500)
  } finally {
    client.release()
  }
})

export default r
