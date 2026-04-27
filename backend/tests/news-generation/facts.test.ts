import { describe, it, expect, beforeEach } from 'vitest'
import { extractMatchFacts } from '../../src/lib/news-generation/facts.js'
import { formatStageForNews, normalizeGeneratedNewsText, translateNewsTerm } from '../../src/lib/news-generation/text.js'
import {
  insertMatchMap,
  insertPlayer,
  insertPlayerMatchStats,
  insertTeam,
  insertTournament,
  query,
  resetTables,
} from '../setup.js'

async function insertMatch(overrides: {
  tournament_id: string
  team_a_id: string
  team_b_id: string
  status?: string
  stage?: string
  maps_won_a?: number
  maps_won_b?: number
  best_of?: number
}) {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO matches
       (tournament_id, team_a_id, team_b_id, status, stage, maps_won_a, maps_won_b, best_of)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      overrides.tournament_id,
      overrides.team_a_id,
      overrides.team_b_id,
      overrides.status ?? 'finished',
      overrides.stage ?? '小组赛 R1',
      overrides.maps_won_a ?? 1,
      overrides.maps_won_b ?? 0,
      overrides.best_of ?? 1,
    ],
  )
  return rows[0].id
}

describe('news-generation text helpers', () => {
  it('translates round labels and data terms for public copy', () => {
    expect(formatStageForNews('小组赛 R1')).toBe('小组赛 第一轮')
    expect(formatStageForNews('小组赛 R2')).toBe('小组赛 第二轮')
    expect(formatStageForNews('小组赛 R3')).toBe('小组赛 第三轮')
    expect(translateNewsTerm('HS')).toBe('爆头率')
    expect(translateNewsTerm('first kill')).toBe('首杀')
    expect(translateNewsTerm('clutch')).toBe('残局')
    expect(translateNewsTerm('won')).toBe('胜利')
  })

  it('normalizes generated public copy terms before publishing', () => {
    expect(normalizeGeneratedNewsText(
      'Flet4 1v5 force_clutch + quad 是 highlight reel，pistol 双吃后 eco win；不是 full buy。',
    )).toBe('Flet4 1v5 强起残局四杀是高光集锦，手枪局双吃后经济局胜利；不是全甲长枪。')
    expect(normalizeGeneratedNewsText('Kaumi 双 clutch，standout 里还有 force 和 anti-eco。'))
      .toBe('Kaumi 双残局，亮眼名单里还有强起和防经济局。')
  })
})

describe('extractMatchFacts', () => {
  beforeEach(() => resetTables(
    'player_round_economies',
    'match_clutches',
    'match_kills',
    'match_rounds',
    'player_match_stats',
    'match_maps',
    'matches',
    'players',
    'teams',
    'tournaments',
  ))

  it('extracts match, map, economy, players, clutches, pivotal rounds, notable kills, and MVP facts', async () => {
    const tournamentId = await insertTournament({ name: 'ALAST Premier 2026', year: 2026 })
    const teamA = await insertTeam({ name: 'Alpha', region: 'CN' })
    const teamB = await insertTeam({ name: 'Beta', region: 'EU' })
    const matchId = await insertMatch({
      tournament_id: tournamentId,
      team_a_id: teamA,
      team_b_id: teamB,
      stage: '小组赛 R2',
      maps_won_a: 1,
      maps_won_b: 0,
    })
    const map = await insertMatchMap(matchId, {
      map_name: 'de_mirage',
      map_order: 1,
      score_a: 13,
      score_b: 11,
    })

    const carry = await insertPlayer({ nickname: 'Carry', team_id: teamA })
    const wing = await insertPlayer({ nickname: 'Wing', team_id: teamA })
    const enemy = await insertPlayer({ nickname: 'Enemy', team_id: teamB })
    await insertPlayerMatchStats(map.id, carry.id, teamA, {
      kills: 28,
      deaths: 14,
      assists: 5,
      adr: 101.2,
      rating: 1.48,
      headshot_pct: 55.5,
    })
    await insertPlayerMatchStats(map.id, wing.id, teamA, {
      kills: 18,
      deaths: 16,
      assists: 7,
      adr: 81.3,
      rating: 1.12,
      headshot_pct: 40,
    })
    await insertPlayerMatchStats(map.id, enemy.id, teamB, {
      kills: 20,
      deaths: 19,
      assists: 3,
      adr: 84,
      rating: 1.09,
      headshot_pct: 45,
    })

    await query(
      `UPDATE player_match_stats
       SET first_kills = 6, first_deaths = 2, clutches_won = 1, clutches_played = 2
       WHERE player_id = $1`,
      [carry.id],
    )

    for (const round of [
      { n: 1, winner: teamA, side: 3, aScore: 1, bScore: 0, aEco: 'pistol', bEco: 'pistol' },
      { n: 2, winner: teamA, side: 3, aScore: 2, bScore: 0, aEco: 'eco', bEco: 'full_buy' },
      { n: 13, winner: teamB, side: 3, aScore: 8, bScore: 5, aEco: 'pistol', bEco: 'pistol' },
      { n: 24, winner: teamA, side: 2, aScore: 13, bScore: 11, aEco: 'full_buy', bEco: 'full_buy' },
    ]) {
      await query(
        `INSERT INTO match_rounds
           (match_map_id, round_number, winner_side, winner_team_id,
            team_a_side, team_b_side, team_a_score, team_b_score,
            team_a_economy_type, team_b_economy_type)
         VALUES ($1,$2,$3,$4,3,2,$5,$6,$7,$8)`,
        [map.id, round.n, round.side, round.winner, round.aScore, round.bScore, round.aEco, round.bEco],
      )
    }

    await query(
      `INSERT INTO match_clutches
         (match_map_id, round_number, player_id, opponent_count, won, kill_count, has_survived)
       VALUES ($1, 24, $2, 3, true, 3, true)`,
      [map.id, carry.id],
    )

    for (let i = 0; i < 5; i += 1) {
      await query(
        `INSERT INTO match_kills
           (match_map_id, round_number, tick, weapon_name, weapon_type,
            is_no_scope, is_through_smoke, distance, killer_player_id, victim_player_id)
         VALUES ($1, 24, $2, 'awp', 'sniper', $3, $4, $5, $6, $7)`,
        [map.id, 100 + i, i === 0, i === 1, 2600 + i, carry.id, enemy.id],
      )
    }

    const facts = await extractMatchFacts(matchId)

    expect(facts.match.stage).toBe('小组赛 第二轮')
    expect(facts.match.final_score).toBe('1-0')
    expect(facts.teams.a.name).toBe('Alpha')
    expect(facts.maps[0].half_scores.first_half).toBe('2-0')
    expect(facts.maps[0].economy_summary.eco_wins_a).toBe(1)
    expect(facts.maps[0].clutches[0]).toMatchObject({
      player_nickname: 'Carry',
      situation: '1v3',
      won_label: '胜利',
    })
    expect(facts.maps[0].pivotal_rounds.map(r => r.narrative_tag)).toContain('ace_round')
    expect(facts.maps[0].notable_kills.map(k => k.tag)).toContain('ace_in_round')
    expect(facts.maps[0].standout_players[0]).toMatchObject({
      player_nickname: 'Carry',
      first_kills_label: '首杀',
      hs_pct_label: '爆头率',
    })
    expect(facts.match_mvp?.player_nickname).toBe('Carry')
    expect(facts.match_mvp?.why).toContain('爆头率')
  })
})
