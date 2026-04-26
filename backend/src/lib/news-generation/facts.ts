import { query } from '../../db.js'
import { formatStageForNews } from './text.js'
import type { MapFacts, MatchFacts, NotableKillTag, PivotalTag, TeamSide } from './types.js'

const ECO_TYPES = new Set(['eco', 'semi_eco'])
const PIVOTAL_PRIORITY: Record<PivotalTag, number> = {
  ot_thriller: 1,
  last_round_decided: 2,
  ace_round: 3,
  eco_upset: 4,
  force_clutch: 5,
  pistol_loss_recovery: 6,
  comeback_streak: 7,
  quad_round: 8,
}

interface MatchRow {
  id: string
  tournament_name: string | null
  stage: string | null
  scheduled_at: string | null
  best_of: number
  maps_won_a: number
  maps_won_b: number
  team_a_id: string | null
  team_b_id: string | null
  team_a_name: string | null
  team_a_region: string | null
  team_b_name: string | null
  team_b_region: string | null
}

interface MapRow {
  id: string
  map_name: string
  map_order: number
  score_a: number | null
  score_b: number | null
  winner_team_id: string | null
  duration_seconds: number | null
}

interface RoundRow {
  round_number: number
  winner_side: number | null
  winner_team_id: string | null
  team_a_side: number | null
  team_b_side: number | null
  team_a_score: number | null
  team_b_score: number | null
  team_a_economy_type: string | null
  team_b_economy_type: string | null
}

interface PlayerStatRow {
  player_id: string
  nickname: string
  team_id: string | null
  kills: number | null
  deaths: number | null
  assists: number | null
  adr: number | null
  headshot_pct: number | null
  first_kills: number | null
  first_deaths: number | null
  rating: number | null
  clutches_won: number | null
}

interface ClutchRow {
  round_number: number
  opponent_count: number
  won: boolean
  kill_count: number
  has_survived: boolean
  nickname: string | null
}

interface KillRow {
  round_number: number
  tick: number | null
  weapon_name: string | null
  weapon_type: string | null
  is_through_smoke: boolean
  is_no_scope: boolean
  is_assisted_flash: boolean
  distance: number | null
  killer_player_id: string | null
  victim_player_id: string | null
  killer: string | null
  victim: string | null
}

function teamOf(teamId: string | null, match: MatchRow): TeamSide | null {
  if (teamId && teamId === match.team_a_id) return 'a'
  if (teamId && teamId === match.team_b_id) return 'b'
  return null
}

function winnerFromRound(round: RoundRow, match: MatchRow): TeamSide | null {
  const byTeam = teamOf(round.winner_team_id, match)
  if (byTeam) return byTeam
  if (round.winner_side === round.team_a_side) return 'a'
  if (round.winner_side === round.team_b_side) return 'b'
  return null
}

function mapWinner(map: MapRow, match: MatchRow): TeamSide | null {
  const byTeam = teamOf(map.winner_team_id, match)
  if (byTeam) return byTeam
  const scoreA = map.score_a ?? 0
  const scoreB = map.score_b ?? 0
  if (scoreA > scoreB) return 'a'
  if (scoreB > scoreA) return 'b'
  return null
}

function scorePair(a: number, b: number): string {
  return `${a}-${b}`
}

function normalizePercent(value: number | null): number {
  const n = Number(value ?? 0)
  return n > 100 ? n / 100 : n
}

function buildHalfScores(map: MapRow, rounds: RoundRow[]) {
  const firstHalf = rounds.filter(r => r.round_number <= 12)
  const firstA = Math.max(0, ...firstHalf.map(r => r.team_a_score ?? 0))
  const firstB = Math.max(0, ...firstHalf.map(r => r.team_b_score ?? 0))
  const finalA = map.score_a ?? Math.max(firstA, ...rounds.map(r => r.team_a_score ?? 0))
  const finalB = map.score_b ?? Math.max(firstB, ...rounds.map(r => r.team_b_score ?? 0))
  const secondA = Math.max(0, Math.min(finalA, 24) - firstA)
  const secondB = Math.max(0, Math.min(finalB, 24) - firstB)
  const halfScores: MapFacts['half_scores'] = {
    first_half: scorePair(firstA, firstB),
    second_half: scorePair(secondA, secondB),
  }
  if (finalA > 15 || finalB > 15) {
    halfScores.ot = scorePair(Math.max(0, finalA - 12), Math.max(0, finalB - 12))
  }
  return halfScores
}

function buildEconomySummary(rounds: RoundRow[], match: MatchRow): MapFacts['economy_summary'] {
  const summary: MapFacts['economy_summary'] = {
    eco_wins_a: 0,
    eco_wins_b: 0,
    force_wins_a: 0,
    force_wins_b: 0,
    pistol_wins: { a: 0, b: 0 },
  }
  for (const round of rounds) {
    const winner = winnerFromRound(round, match)
    if (!winner) continue
    const winnerEco = winner === 'a' ? round.team_a_economy_type : round.team_b_economy_type
    if (winnerEco && ECO_TYPES.has(winnerEco)) summary[`eco_wins_${winner}`] += 1
    if (winnerEco === 'force') summary[`force_wins_${winner}`] += 1
    if (round.round_number === 1 || round.round_number === 13) summary.pistol_wins[winner] += 1
  }
  return summary
}

function buildStandoutPlayers(rows: PlayerStatRow[], match: MatchRow): MapFacts['standout_players'] {
  return rows
    .map(row => ({
      player_nickname: row.nickname,
      team: teamOf(row.team_id, match) ?? 'a',
      kills: row.kills ?? 0,
      deaths: row.deaths ?? 0,
      assists: row.assists ?? 0,
      adr: Number(row.adr ?? 0),
      hs_pct: normalizePercent(row.headshot_pct),
      hs_pct_label: '爆头率' as const,
      first_kills: row.first_kills ?? 0,
      first_kills_label: '首杀' as const,
      first_deaths: row.first_deaths ?? 0,
      rating: Number(row.rating ?? 0),
    }))
    .sort((a, b) => b.rating - a.rating || b.kills - a.kills)
    .slice(0, 5)
}

function buildClutches(rows: ClutchRow[]): MapFacts['clutches'] {
  return rows
    .map(row => ({
      player_nickname: row.nickname ?? 'Unknown',
      situation: `1v${row.opponent_count}`,
      won: row.won,
      won_label: row.won ? '胜利' as const : '失败' as const,
      weapon: null,
      round: row.round_number,
    }))
    .sort((a, b) => Number(b.won) - Number(a.won) || Number.parseInt(b.situation.slice(2), 10) - Number.parseInt(a.situation.slice(2), 10))
}

function buildPivotalRounds(
  map: MapRow,
  rounds: RoundRow[],
  kills: KillRow[],
  clutches: ClutchRow[],
  match: MatchRow,
): MapFacts['pivotal_rounds'] {
  const result: MapFacts['pivotal_rounds'] = []
  const killsByRoundPlayer = new Map<string, { round: number; player: string; count: number }>()
  for (const kill of kills) {
    if (!kill.killer_player_id) continue
    const key = `${kill.round_number}:${kill.killer_player_id}`
    const current = killsByRoundPlayer.get(key) ?? { round: kill.round_number, player: kill.killer ?? 'Unknown', count: 0 }
    current.count += 1
    killsByRoundPlayer.set(key, current)
  }
  for (const entry of killsByRoundPlayer.values()) {
    if (entry.count >= 5) {
      result.push({ round_number: entry.round, narrative_tag: 'ace_round', detail: { player: entry.player, kills: entry.count } })
    } else if (entry.count === 4) {
      result.push({ round_number: entry.round, narrative_tag: 'quad_round', detail: { player: entry.player, kills: entry.count } })
    }
  }
  for (const round of rounds) {
    const winner = winnerFromRound(round, match)
    if (!winner) continue
    const winnerEco = winner === 'a' ? round.team_a_economy_type : round.team_b_economy_type
    const loserEco = winner === 'a' ? round.team_b_economy_type : round.team_a_economy_type
    if (winnerEco && ECO_TYPES.has(winnerEco) && loserEco === 'full_buy') {
      result.push({ round_number: round.round_number, narrative_tag: 'eco_upset', detail: { winner, winner_economy: winnerEco, loser_economy: loserEco } })
    }
  }
  for (const clutch of clutches) {
    if (clutch.won && clutch.has_survived && clutch.opponent_count >= 2) {
      result.push({ round_number: clutch.round_number, narrative_tag: 'force_clutch', detail: { player: clutch.nickname, situation: `1v${clutch.opponent_count}`, result: '胜利' } })
    }
  }
  const finalA = map.score_a ?? 0
  const finalB = map.score_b ?? 0
  const lastRound = Math.max(0, ...rounds.map(r => r.round_number))
  if (Math.abs(finalA - finalB) === 1 && lastRound > 0) {
    result.push({ round_number: lastRound, narrative_tag: 'last_round_decided', detail: { final_score: scorePair(finalA, finalB) } })
  }
  if (finalA > 15 || finalB > 15) {
    result.push({ round_number: lastRound, narrative_tag: 'ot_thriller', detail: { final_score: scorePair(finalA, finalB) } })
  }
  const seen = new Set<string>()
  return result
    .filter(item => {
      const key = `${item.round_number}:${item.narrative_tag}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => PIVOTAL_PRIORITY[a.narrative_tag] - PIVOTAL_PRIORITY[b.narrative_tag] || a.round_number - b.round_number)
    .slice(0, 5)
}

function notableTagForKill(kill: KillRow, roundKillCount: number): NotableKillTag | null {
  if (roundKillCount >= 5) return 'ace_in_round'
  if (roundKillCount === 4) return 'quad_in_round'
  if (kill.is_no_scope && kill.weapon_name?.toLowerCase().includes('awp')) return 'no_scope_awp'
  if (kill.is_through_smoke) return 'through_smoke'
  if (kill.weapon_name?.toLowerCase().includes('awp') && (kill.distance ?? 0) > 2500) return 'long_distance_awp'
  if (kill.is_assisted_flash) return 'flash_assisted_pickoff'
  return null
}

function buildNotableKills(kills: KillRow[]): MapFacts['notable_kills'] {
  const byRoundPlayer = new Map<string, number>()
  for (const kill of kills) {
    if (!kill.killer_player_id) continue
    const key = `${kill.round_number}:${kill.killer_player_id}`
    byRoundPlayer.set(key, (byRoundPlayer.get(key) ?? 0) + 1)
  }
  const seenAceRounds = new Set<string>()
  const result: MapFacts['notable_kills'] = []
  for (const kill of kills.sort((a, b) => a.round_number - b.round_number || (a.tick ?? 0) - (b.tick ?? 0))) {
    const count = kill.killer_player_id ? byRoundPlayer.get(`${kill.round_number}:${kill.killer_player_id}`) ?? 0 : 0
    const tag = notableTagForKill(kill, count)
    if (!tag) continue
    if ((tag === 'ace_in_round' || tag === 'quad_in_round') && kill.killer_player_id) {
      const dedupeKey = `${tag}:${kill.round_number}:${kill.killer_player_id}`
      if (seenAceRounds.has(dedupeKey)) continue
      seenAceRounds.add(dedupeKey)
    }
    result.push({
      round: kill.round_number,
      killer: kill.killer ?? 'Unknown',
      victim: kill.victim ?? 'Unknown',
      weapon: kill.weapon_name ?? 'unknown',
      tag,
      detail: { distance: kill.distance, through_smoke: kill.is_through_smoke, no_scope: kill.is_no_scope },
    })
    if (result.length >= 8) break
  }
  return result
}

function buildStorylines(maps: MapFacts[], playerRows: PlayerStatRow[]): string[] {
  const storylines: string[] = []
  for (const map of maps) {
    if (map.half_scores.ot) storylines.push(`map_${map.order}_ot_thriller`)
  }
  const clutchCarry = playerRows.find(row => (row.clutches_won ?? 0) >= 2)
  if (clutchCarry) storylines.push(`player_${clutchCarry.nickname}_carried_with_${clutchCarry.clutches_won}_clutches`)
  return storylines
}

function buildMvp(playerRows: PlayerStatRow[], match: MatchRow): MatchFacts['match_mvp'] {
  const sorted = [...playerRows].sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0) || Number(b.kills ?? 0) - Number(a.kills ?? 0))
  const top = sorted[0]
  if (!top || Number(top.rating ?? 0) < 1.2) return null
  const team = teamOf(top.team_id, match) ?? 'a'
  return {
    player_nickname: top.nickname,
    team,
    why: `rating ${Number(top.rating ?? 0).toFixed(2)} + ${top.kills ?? 0} 击杀 + ${top.clutches_won ?? 0} 残局胜利 + 爆头率 ${normalizePercent(top.headshot_pct).toFixed(1)}%`,
  }
}

export async function extractMatchFacts(matchId: string): Promise<MatchFacts> {
  const { rows: matches } = await query<MatchRow>(
    `SELECT m.id, t.name AS tournament_name, m.stage, m.scheduled_at, m.best_of,
            m.maps_won_a, m.maps_won_b, m.team_a_id, m.team_b_id,
            ta.name AS team_a_name, ta.region AS team_a_region,
            tb.name AS team_b_name, tb.region AS team_b_region
     FROM matches m
     LEFT JOIN tournaments t ON t.id = m.tournament_id
     LEFT JOIN teams ta ON ta.id = m.team_a_id
     LEFT JOIN teams tb ON tb.id = m.team_b_id
     WHERE m.id = $1`,
    [matchId],
  )
  const match = matches[0]
  if (!match) throw new Error(`match not found: ${matchId}`)

  const { rows: mapRows } = await query<MapRow>(
    `SELECT id, map_name, map_order, score_a, score_b, winner_team_id, duration_seconds
     FROM match_maps
     WHERE match_id = $1
     ORDER BY map_order ASC`,
    [matchId],
  )

  const allPlayerRows: PlayerStatRow[] = []
  const maps: MapFacts[] = []
  for (const map of mapRows) {
    const { rows: rounds } = await query<RoundRow>(
      `SELECT round_number, winner_side, winner_team_id, team_a_side, team_b_side,
              team_a_score, team_b_score, team_a_economy_type, team_b_economy_type
       FROM match_rounds
       WHERE match_map_id = $1
       ORDER BY round_number ASC`,
      [map.id],
    )
    const { rows: playerRows } = await query<PlayerStatRow>(
      `SELECT pms.player_id, p.nickname, pms.team_id, pms.kills, pms.deaths, pms.assists,
              pms.adr, pms.headshot_pct, pms.first_kills, pms.first_deaths,
              pms.rating, pms.clutches_won
       FROM player_match_stats pms
       JOIN players p ON p.id = pms.player_id
       WHERE pms.match_map_id = $1
       ORDER BY pms.rating DESC NULLS LAST, pms.kills DESC NULLS LAST`,
      [map.id],
    )
    const { rows: clutches } = await query<ClutchRow>(
      `SELECT mc.round_number, mc.opponent_count, mc.won, mc.kill_count,
              mc.has_survived, p.nickname
       FROM match_clutches mc
       LEFT JOIN players p ON p.id = mc.player_id
       WHERE mc.match_map_id = $1
       ORDER BY mc.round_number ASC`,
      [map.id],
    )
    const { rows: kills } = await query<KillRow>(
      `SELECT mk.round_number, mk.tick, mk.weapon_name, mk.weapon_type,
              mk.is_through_smoke, mk.is_no_scope, mk.is_assisted_flash,
              mk.distance, mk.killer_player_id, mk.victim_player_id,
              kp.nickname AS killer, vp.nickname AS victim
       FROM match_kills mk
       LEFT JOIN players kp ON kp.id = mk.killer_player_id
       LEFT JOIN players vp ON vp.id = mk.victim_player_id
       WHERE mk.match_map_id = $1
       ORDER BY mk.round_number ASC, mk.tick ASC NULLS LAST`,
      [map.id],
    )
    allPlayerRows.push(...playerRows)
    maps.push({
      id: map.id,
      name: map.map_name,
      order: map.map_order,
      score_a: map.score_a ?? 0,
      score_b: map.score_b ?? 0,
      winner_team: mapWinner(map, match),
      duration_seconds: map.duration_seconds,
      half_scores: buildHalfScores(map, rounds),
      economy_summary: buildEconomySummary(rounds, match),
      pivotal_rounds: buildPivotalRounds(map, rounds, kills, clutches, match),
      clutches: buildClutches(clutches),
      standout_players: buildStandoutPlayers(playerRows, match),
      notable_kills: buildNotableKills(kills),
    })
  }

  return {
    match: {
      id: match.id,
      tournament_name: match.tournament_name,
      stage: formatStageForNews(match.stage),
      scheduled_at: match.scheduled_at,
      best_of: match.best_of,
      final_score: `${match.maps_won_a}-${match.maps_won_b}`,
    },
    teams: {
      a: { id: match.team_a_id, name: match.team_a_name ?? 'TBD', region: match.team_a_region },
      b: { id: match.team_b_id, name: match.team_b_name ?? 'TBD', region: match.team_b_region },
    },
    maps,
    match_mvp: buildMvp(allPlayerRows, match),
    storylines: buildStorylines(maps, allPlayerRows),
  }
}
