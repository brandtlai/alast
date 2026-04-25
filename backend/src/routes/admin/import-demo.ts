// backend/src/routes/admin/import-demo.ts
import { Hono } from 'hono'
import { query } from '../../db.js'
import { ok, err } from '../../types.js'

const r = new Hono()

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
  teamAEconomyType: string; teamBEconomyType: string
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

r.post('/preview', async (c) => {
  const body = await c.req.json<{ matchId: string; demoJson: CsdmJson }>()
  const { matchId, demoJson } = body

  if (!matchId || !demoJson) return c.json(err('matchId and demoJson required', 'BAD_REQUEST'), 400)

  if (demoJson.checksum) {
    const { rows: existing } = await query(
      `SELECT id FROM csdm_imports WHERE match_id = $1 AND checksum = $2 AND status = 'confirmed'`,
      [matchId, demoJson.checksum]
    )
    if (existing.length > 0) return c.json(err('Demo already imported', 'ALREADY_IMPORTED'), 409)
  }

  // Get match team info once
  const { rows: matchRows } = await query(
    `SELECT ta.id AS team_a_id, ta.name AS team_a_name,
            tb.id AS team_b_id, tb.name AS team_b_name
     FROM matches m
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.id = $1`,
    [matchId]
  )
  const matchRow = matchRows[0] ?? null

  const playerMatches = await Promise.all(
    demoJson.players.map(async (dp) => {
      const { rows: direct } = await query(
        `SELECT id, nickname, team_id FROM players WHERE steam_id = $1`, [dp.steamId]
      )
      if (direct.length > 0) {
        const pl = direct[0]
        let subWarning = false
        if (matchRow && pl.team_id) {
          const { rows: plTeam } = await query(`SELECT name FROM teams WHERE id = $1`, [pl.team_id])
          const plTeamName = plTeam[0]?.name ?? ''
          const demoTeamName = dp.teamName
          const inTeamA = matchRow.team_a_name === demoTeamName
          const inTeamB = matchRow.team_b_name === demoTeamName
          if ((inTeamA || inTeamB) && plTeamName !== demoTeamName) subWarning = true
        }
        return { steamId: dp.steamId, name: dp.name, teamName: dp.teamName,
                 identity: 'matched' as const, playerId: pl.id as string,
                 playerName: pl.nickname as string, subWarning }
      }

      const { rows: alias } = await query(
        `SELECT psa.player_id, p.nickname FROM player_steam_aliases psa
         JOIN players p ON p.id = psa.player_id WHERE psa.steam_id = $1`,
        [dp.steamId]
      )
      if (alias.length > 0) {
        return { steamId: dp.steamId, name: dp.name, teamName: dp.teamName,
                 identity: 'aliased' as const, playerId: alias[0].player_id as string,
                 playerName: alias[0].nickname as string, subWarning: false }
      }

      return { steamId: dp.steamId, name: dp.name, teamName: dp.teamName,
               identity: 'new' as const, playerId: null, playerName: null, subWarning: false }
    })
  )

  const { rows: [imp] } = await query(
    `INSERT INTO csdm_imports (filename, raw_json, match_id, status, checksum)
     VALUES ($1,$2,$3,'pending',$4) RETURNING id`,
    [demoJson.mapName + '.json', JSON.stringify(demoJson), matchId, demoJson.checksum ?? null]
  )

  return c.json(ok({ importId: imp.id, mapInfo: {
    mapName: demoJson.mapName, duration: demoJson.duration,
    teamAName: demoJson.teamA.name, teamBName: demoJson.teamB.name,
    teamAScore: demoJson.teamA.score, teamBScore: demoJson.teamB.score,
    teamAScoreFirstHalf: demoJson.teamA.scoreFirstHalf, teamBScoreFirstHalf: demoJson.teamB.scoreFirstHalf,
  }, playerMatches }))
})

interface PlayerMapping {
  steamId: string; action: 'use' | 'alias' | 'skip'
  playerId?: string; newPlayer?: { nickname: string; role?: string; teamId?: string }
}

r.post('/confirm', async (c) => {
  const body = await c.req.json<{
    importId: string; matchId: string; mapOrder: number; playerMappings: PlayerMapping[]
  }>()
  const { importId, matchId, mapOrder, playerMappings } = body
  if (!importId || !matchId || playerMappings == null)
    return c.json(err('importId, matchId, playerMappings required', 'BAD_REQUEST'), 400)

  const { rows: [imp] } = await query(
    `SELECT raw_json FROM csdm_imports WHERE id = $1 AND status = 'pending'`, [importId]
  )
  if (!imp) return c.json(err('Import not found or already confirmed', 'NOT_FOUND'), 404)
  const demo = imp.raw_json as CsdmJson

  const steamToPlayerId = new Map<string, string>()
  for (const pm of playerMappings) {
    if (pm.action === 'skip') continue
    if (pm.action === 'use' && pm.playerId) {
      steamToPlayerId.set(pm.steamId, pm.playerId)
    } else if (pm.action === 'alias' && pm.playerId) {
      await query(
        `INSERT INTO player_steam_aliases (player_id, steam_id) VALUES ($1,$2) ON CONFLICT (steam_id) DO NOTHING`,
        [pm.playerId, pm.steamId]
      )
      steamToPlayerId.set(pm.steamId, pm.playerId)
    }
    if (pm.action === 'use' && !pm.playerId && pm.newPlayer) {
      const { rows: [newP] } = await query(
        `INSERT INTO players (nickname, role, team_id, steam_id) VALUES ($1,$2,$3,$4) RETURNING id`,
        [pm.newPlayer.nickname, pm.newPlayer.role ?? null, pm.newPlayer.teamId ?? null, pm.steamId]
      )
      steamToPlayerId.set(pm.steamId, newP.id)
    }
  }

  const { rows: [matchRow] } = await query(
    `SELECT team_a_id, team_b_id FROM matches WHERE id = $1`, [matchId]
  )
  if (!matchRow) return c.json(err('Match not found', 'NOT_FOUND'), 404)

  const steamToTeamId = new Map<string, string>()
  for (const dp of demo.players) {
    if (dp.teamName === demo.teamA.name) steamToTeamId.set(dp.steamId, matchRow.team_a_id)
    else if (dp.teamName === demo.teamB.name) steamToTeamId.set(dp.steamId, matchRow.team_b_id)
  }

  await query('BEGIN')
  try {
    const { rows: [mm] } = await query(
      `INSERT INTO match_maps (match_id, map_name, map_order, score_a, score_b, winner_team_id, duration_seconds)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [matchId, demo.mapName, mapOrder ?? 1,
       demo.teamA.score, demo.teamB.score,
       demo.teamA.score > demo.teamB.score ? matchRow.team_a_id : matchRow.team_b_id,
       Math.round(demo.duration)]
    )
    const mapId = mm.id

    for (const dp of demo.players) {
      const playerId = steamToPlayerId.get(dp.steamId)
      if (!playerId) continue
      const teamId = steamToTeamId.get(dp.steamId) ?? null
      await query(
        `INSERT INTO player_match_stats
           (match_map_id, player_id, team_id, kills, deaths, assists,
            headshot_pct, adr, kast, rating, first_kills, first_deaths, imported_from_csdm)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
         ON CONFLICT (match_map_id, player_id) DO NOTHING`,
        [mapId, playerId, teamId,
         dp.killCount, dp.deathCount, dp.assistCount,
         dp.headshotPercentage, dp.averageDamagePerRound, dp.kast, dp.hltvRating2,
         dp.firstKillCount, dp.firstDeathCount]
      )
    }

    for (const rnd of demo.rounds ?? []) {
      await query(
        `INSERT INTO match_rounds
           (match_map_id, round_number, end_reason, team_a_score, team_b_score,
            team_a_side, team_b_side, team_a_economy_type, team_b_economy_type,
            team_a_money_spent, team_b_money_spent, team_a_equipment_value, team_b_equipment_value,
            start_tick, end_tick)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (match_map_id, round_number) DO NOTHING`,
        [mapId, rnd.number, rnd.endReason,
         rnd.teamAScore, rnd.teamBScore, rnd.teamASide, rnd.teamBSide,
         rnd.teamAEconomyType, rnd.teamBEconomyType,
         rnd.teamAMoneySpent, rnd.teamBMoneySpent,
         rnd.teamAEquipmentValue, rnd.teamBEquipmentValue,
         rnd.startTick, rnd.endTick]
      )
    }

    for (const kill of demo.kills ?? []) {
      const killerId = steamToPlayerId.get(kill.killerSteamId) ?? null
      const victimId = steamToPlayerId.get(kill.victimSteamId) ?? null
      const assisterId = kill.assisterSteamId ? (steamToPlayerId.get(kill.assisterSteamId) ?? null) : null
      await query(
        `INSERT INTO match_kills
           (match_map_id, round_number, tick, weapon_name, weapon_type,
            is_headshot, is_trade_kill, is_through_smoke, is_no_scope, is_assisted_flash,
            distance, killer_player_id, victim_player_id, assister_player_id, killer_side, victim_side)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [mapId, kill.roundNumber, kill.tick, kill.weaponName, kill.weaponType,
         kill.isHeadshot, kill.isTradeKill, kill.isThroughSmoke, kill.isNoScope, kill.isAssistedFlash,
         kill.distance, killerId, victimId, assisterId, kill.killerSide, kill.victimSide]
      )
    }

    for (const cl of demo.clutches ?? []) {
      const clutcherId = steamToPlayerId.get(cl.clutcherSteamId) ?? null
      await query(
        `INSERT INTO match_clutches (match_map_id, round_number, player_id, opponent_count, won, kill_count, has_survived)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [mapId, cl.roundNumber, clutcherId, cl.opponentCount, cl.won, cl.clutcherKillCount, cl.hasClutcherSurvived]
      )
    }

    for (const eco of demo.playersEconomies ?? []) {
      const playerId = steamToPlayerId.get(eco.playerSteamId) ?? null
      await query(
        `INSERT INTO player_round_economies (match_map_id, round_number, player_id, side, equipment_value, money_spent, start_money, type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [mapId, eco.roundNumber, playerId, eco.playerSide, eco.equipmentValue, eco.moneySpent, eco.startMoney, eco.type]
      )
    }

    await query(
      `UPDATE csdm_imports SET status = 'confirmed', confirmed_at = now() WHERE id = $1`, [importId]
    )
    await query(
      `UPDATE matches SET status = 'finished', finished_at = now() WHERE id = $1 AND status != 'finished'`,
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
