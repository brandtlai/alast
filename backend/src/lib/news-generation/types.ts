export type TeamSide = 'a' | 'b'

export type PivotalTag =
  | 'eco_upset'
  | 'force_clutch'
  | 'pistol_loss_recovery'
  | 'comeback_streak'
  | 'ot_thriller'
  | 'last_round_decided'
  | 'ace_round'
  | 'quad_round'

export type NotableKillTag =
  | 'no_scope_awp'
  | 'through_smoke'
  | 'long_distance_awp'
  | 'flash_assisted_pickoff'
  | 'quad_in_round'
  | 'ace_in_round'

export interface MatchFacts {
  match: {
    id: string
    tournament_name: string | null
    stage: string | null
    scheduled_at: string | null
    best_of: number
    final_score: string
  }
  teams: {
    a: { id: string | null; name: string; region: string | null }
    b: { id: string | null; name: string; region: string | null }
  }
  maps: MapFacts[]
  match_mvp: {
    player_nickname: string
    team: TeamSide
    why: string
  } | null
  storylines: string[]
}

export interface MapFacts {
  id: string
  name: string
  order: number
  score_a: number
  score_b: number
  winner_team: TeamSide | null
  duration_seconds: number | null
  half_scores: {
    first_half: string
    second_half: string
    ot?: string
  }
  economy_summary: {
    eco_wins_a: number
    eco_wins_b: number
    force_wins_a: number
    force_wins_b: number
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
    won_label: '胜利' | '失败'
    weapon: string | null
    round: number
  }>
  standout_players: Array<{
    player_nickname: string
    team: TeamSide
    kills: number
    deaths: number
    assists: number
    adr: number
    hs_pct: number
    hs_pct_label: '爆头率'
    first_kills: number
    first_kills_label: '首杀'
    first_deaths: number
    rating: number
  }>
  notable_kills: Array<{
    round: number
    killer: string
    victim: string
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
