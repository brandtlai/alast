export interface Team {
  id: string
  name: string
  short_name: string | null
  logo_url: string | null
  region: string | null
  created_at: string
  // detail view extras
  players?: Player[]
  recent_matches?: Match[]
}

export interface Player {
  id: string
  nickname: string
  real_name: string | null
  avatar_url: string | null
  team_id: string | null
  steam_id: string | null
  country: string | null
  role: string | null
  // joined fields
  team_name?: string | null
  team_logo_url?: string | null
  // detail view extras
  career_stats?: CareerStats
  match_history?: MatchHistoryEntry[]
}

export interface CareerStats {
  maps_played: string
  avg_rating: string | null
  avg_adr: string | null
  avg_kast: string | null
  avg_hs_pct: string | null
  total_kills: string | null
  total_deaths: string | null
}

export interface MatchHistoryEntry {
  map_name: string
  score_a: number | null
  score_b: number | null
  stage: string | null
  scheduled_at: string | null
  opponent_name: string | null
  rating: number | null
  kills: number | null
  deaths: number | null
  adr: number | null
}

export interface Tournament {
  id: string
  name: string
  season: string | null
  year: number | null
  stage: string | null
  prize_pool: string | null
  venue: string | null
  start_date: string | null
  end_date: string | null
  is_current?: boolean
}

export interface Match {
  id: string
  tournament_id: string
  team_a_id: string | null
  team_b_id: string | null
  maps_won_a: number
  maps_won_b: number
  status: 'upcoming' | 'live' | 'finished'
  stage: string | null
  scheduled_at: string | null
  finished_at: string | null
  bracket_kind?: string | null
  bracket_round?: number | null
  best_of?: number
  // joined fields
  team_a_name?: string | null
  team_a_logo?: string | null
  team_b_name?: string | null
  team_b_logo?: string | null
  tournament_name?: string | null
  // detail view
  maps?: MatchMap[]
}

export interface MatchMap {
  id: string
  match_id: string
  map_name: string
  map_order: number
  score_a: number | null
  score_b: number | null
  winner_team_id: string | null
  duration_seconds: number | null
  players: MapPlayer[] | null
}

export interface MapPlayer {
  player_id: string
  nickname: string
  team_id: string | null
  kills: number | null
  deaths: number | null
  assists: number | null
  adr: number | null
  kast: number | null
  rating: number | null
  headshot_pct: number | null
}

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
}

export interface LeaderboardEntry {
  id: string
  nickname: string
  avatar_url: string | null
  team_name: string | null
  team_logo_url: string | null
  maps_played: string
  avg_stat: string | null
}

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

export interface SearchResults {
  teams: Pick<Team, 'id' | 'name' | 'logo_url' | 'region'>[]
  players: Pick<Player, 'id' | 'nickname' | 'avatar_url' | 'team_name'>[]
  news: Pick<NewsArticle, 'id' | 'title' | 'slug' | 'summary' | 'published_at'>[]
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string }
