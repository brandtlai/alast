export interface Team {
  id: string
  name: string
  short_name: string | null
  logo_url: string | null
  region: string | null
  created_at: string
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
}

export interface Tournament {
  id: string
  name: string
  season: string | null
  year: number | null
  prize_pool: string | null
  venue: string | null
  start_date: string | null
  end_date: string | null
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
}

export interface PlayerMatchStats {
  id: string
  player_id: string
  match_map_id: string
  team_id: string | null
  kills: number | null
  deaths: number | null
  assists: number | null
  headshots: number | null
  headshot_pct: number | null
  adr: number | null
  kast: number | null
  rating: number | null
  first_kills: number | null
  first_deaths: number | null
  clutches_won: number | null
  clutches_played: number | null
  flash_assists: number | null
  imported_from_csdm: boolean
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

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string }

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data }
}

export function err(error: string, code = 'ERROR'): ApiResponse<never> {
  return { success: false, error, code }
}
