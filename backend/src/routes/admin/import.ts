import { Hono } from 'hono'
import { query, pool } from '../../db.js'
import { ok, err } from '../../types.js'

interface CsdmPlayer {
  steamId: string
  name: string
  kills: number
  deaths: number
  assists: number
  headshotsCount: number
  headshotPercentage: number
  averageDamagePerRound: number
  kast: number
  hltv2Rating: number
  firstKillCount: number
  firstDeathCount: number
}

interface CsdmTeam {
  name: string
  score: number
  players: CsdmPlayer[]
}

interface CsdmJson {
  name: string
  date: string
  mapName: string
  duration: number
  teamA: CsdmTeam
  teamB: CsdmTeam
}

async function matchTeam(name: string): Promise<string | undefined> {
  const { rows } = await query<{ id: string }>(
    'SELECT id FROM teams WHERE LOWER(name) = LOWER($1)', [name]
  )
  return rows[0]?.id
}

async function matchPlayer(steamId: string): Promise<string | undefined> {
  const { rows } = await query<{ id: string }>(
    'SELECT id FROM players WHERE steam_id = $1', [steamId]
  )
  return rows[0]?.id
}

async function buildPlayerPreview(
  player: CsdmPlayer,
  teamMatchedId: string | undefined
): Promise<object> {
  const playerId = await matchPlayer(player.steamId)
  const matchStatus = !teamMatchedId
    ? 'team_missing'
    : playerId ? 'matched' : 'new'

  return {
    steam_id: player.steamId,
    name: player.name,
    player_id: playerId,
    match_status: matchStatus,
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
    adr: player.averageDamagePerRound,
    kast: player.kast,
    rating: player.hltv2Rating,
    headshot_pct: player.headshotPercentage,
    first_kills: player.firstKillCount,
    first_deaths: player.firstDeathCount,
  }
}

const r = new Hono()

r.post('/preview', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file'] as File | undefined
  if (!file) return c.json(err('No file provided', 'VALIDATION_ERROR'), 400)
  if (file.size > 20 * 1024 * 1024) {
    return c.json(err('File too large. Max 20MB', 'VALIDATION_ERROR'), 400)
  }

  let csdm: CsdmJson
  try {
    const text = await file.text()
    csdm = JSON.parse(text)
  } catch {
    return c.json(err('Invalid JSON file', 'PARSE_ERROR'), 400)
  }

  if (!csdm.mapName || !csdm.teamA || !csdm.teamB) {
    return c.json(err('Invalid CSDM format: missing mapName, teamA, or teamB', 'PARSE_ERROR'), 400)
  }

  const teamAId = await matchTeam(csdm.teamA.name)
  const teamBId = await matchTeam(csdm.teamB.name)

  const teamAPlayers = await Promise.all(
    csdm.teamA.players.map(p => buildPlayerPreview(p, teamAId))
  )
  const teamBPlayers = await Promise.all(
    csdm.teamB.players.map(p => buildPlayerPreview(p, teamBId))
  )

  const { rows } = await query<{ id: string }>(
    `INSERT INTO csdm_imports (filename, raw_json, status)
     VALUES ($1, $2, 'pending') RETURNING id`,
    [file.name, JSON.stringify(csdm)]
  )
  const importId = rows[0].id

  return c.json(ok({
    import_id: importId,
    map_name: csdm.mapName,
    duration_seconds: csdm.duration,
    score_a: csdm.teamA.score,
    score_b: csdm.teamB.score,
    team_a: { name: csdm.teamA.name, matched_id: teamAId },
    team_b: { name: csdm.teamB.name, matched_id: teamBId },
    players: [...teamAPlayers, ...teamBPlayers],
  }))
})

interface ConfirmBody {
  import_id: string
  match_id?: string
  tournament_id?: string
  stage?: string
  team_mappings: Record<string, string>
}

r.post('/confirm', async (c) => {
  const body = await c.req.json<ConfirmBody>()
  if (!body.import_id) return c.json(err('import_id is required', 'VALIDATION_ERROR'), 400)

  const { rows: importRows } = await query<{
    id: string; raw_json: CsdmJson; status: string
  }>(
    'SELECT id, raw_json, status FROM csdm_imports WHERE id = $1',
    [body.import_id]
  )
  if (importRows.length === 0) return c.json(err('Import not found', 'NOT_FOUND'), 404)
  if (importRows[0].status !== 'pending') {
    return c.json(err('Import already processed', 'CONFLICT'), 409)
  }

  const csdm: CsdmJson = importRows[0].raw_json

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let matchId = body.match_id
    if (!matchId) {
      if (!body.tournament_id) {
        await client.query('ROLLBACK')
        return c.json(err('tournament_id required when creating new match', 'VALIDATION_ERROR'), 400)
      }
      const teamAId = body.team_mappings[csdm.teamA.name]
      const teamBId = body.team_mappings[csdm.teamB.name]
      const { rows: matchRows } = await client.query<{ id: string }>(
        `INSERT INTO matches (tournament_id, team_a_id, team_b_id, status, stage, maps_won_a, maps_won_b)
         VALUES ($1,$2,$3,'finished',$4,$5,$6) RETURNING id`,
        [body.tournament_id, teamAId ?? null, teamBId ?? null, body.stage ?? null,
         csdm.teamA.score > csdm.teamB.score ? 1 : 0,
         csdm.teamB.score > csdm.teamA.score ? 1 : 0]
      )
      matchId = matchRows[0].id
    }

    const { rows: existingMaps } = await client.query<{ max: number }>(
      'SELECT COALESCE(MAX(map_order), 0) as max FROM match_maps WHERE match_id = $1',
      [matchId]
    )
    const mapOrder = existingMaps[0].max + 1

    const winnerId = csdm.teamA.score > csdm.teamB.score
      ? body.team_mappings[csdm.teamA.name]
      : body.team_mappings[csdm.teamB.name]

    const { rows: mapRows } = await client.query<{ id: string }>(
      `INSERT INTO match_maps (match_id, map_name, map_order, score_a, score_b, winner_team_id, duration_seconds)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [matchId, csdm.mapName, mapOrder, csdm.teamA.score, csdm.teamB.score,
       winnerId ?? null, csdm.duration]
    )
    const matchMapId = mapRows[0].id

    const allPlayers: Array<{ player: CsdmPlayer; teamName: string }> = [
      ...csdm.teamA.players.map(p => ({ player: p, teamName: csdm.teamA.name })),
      ...csdm.teamB.players.map(p => ({ player: p, teamName: csdm.teamB.name })),
    ]

    for (const { player, teamName } of allPlayers) {
      let playerId: string
      const { rows: existingPlayer } = await client.query<{ id: string }>(
        'SELECT id FROM players WHERE steam_id = $1', [player.steamId]
      )
      if (existingPlayer.length > 0) {
        playerId = existingPlayer[0].id
      } else {
        const { rows: newPlayer } = await client.query<{ id: string }>(
          `INSERT INTO players (nickname, steam_id, team_id)
           VALUES ($1,$2,$3) RETURNING id`,
          [player.name, player.steamId, body.team_mappings[teamName] ?? null]
        )
        playerId = newPlayer[0].id
      }

      await client.query(
        `INSERT INTO player_match_stats
           (player_id, match_map_id, team_id, kills, deaths, assists,
            headshots, headshot_pct, adr, kast, rating, first_kills, first_deaths,
            imported_from_csdm)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true)
         ON CONFLICT (match_map_id, player_id) DO NOTHING`,
        [playerId, matchMapId, body.team_mappings[teamName] ?? null,
         player.kills, player.deaths, player.assists,
         player.headshotsCount, player.headshotPercentage,
         player.averageDamagePerRound, player.kast, player.hltv2Rating,
         player.firstKillCount, player.firstDeathCount]
      )
    }

    await client.query(
      `UPDATE csdm_imports SET status = 'confirmed', match_id = $1, confirmed_at = now()
       WHERE id = $2`,
      [matchId, body.import_id]
    )

    await client.query('COMMIT')
    return c.json(ok({ match_id: matchId, match_map_id: matchMapId }))
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

r.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const { rows } = await query<{ id: string; match_id: string; status: string }>(
    'SELECT id, match_id, status FROM csdm_imports WHERE id = $1', [id]
  )
  if (rows.length === 0) return c.json(err('Import not found', 'NOT_FOUND'), 404)
  if (rows[0].status === 'failed') return c.json(err('Already rolled back', 'CONFLICT'), 409)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (rows[0].match_id) {
      await client.query('DELETE FROM match_maps WHERE match_id = $1', [rows[0].match_id])
    }
    await client.query(
      `UPDATE csdm_imports SET status = 'failed' WHERE id = $1`, [id]
    )
    await client.query('COMMIT')
    return c.json(ok({ rolled_back: true }))
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

export default r
