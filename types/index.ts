export type Profile = {
  id: string
  username: string
  display_name: string | null
  is_admin: boolean
  created_at: string
}

export type League = {
  id: string
  name: string
  invite_code: string
  created_by: string | null
  season_year: number
  is_active: boolean
  created_at: string
}

export type LeagueMember = {
  id: string
  league_id: string
  user_id: string
  joined_at: string
}

export type Match = {
  id: string
  external_id: string
  home_team: string
  away_team: string
  home_team_logo: string | null
  away_team_logo: string | null
  match_date: string
  week_number: number
  season_year: number
  status: 'scheduled' | 'live' | 'finished'
  home_score: number | null
  away_score: number | null
  created_at: string
}

export type Prediction = {
  id: string
  user_id: string
  match_id: string
  league_id: string
  predicted_home: number
  predicted_away: number
  points_earned: number | null
  created_at: string
  updated_at: string
}

export type WeeklyPoints = {
  id: string
  user_id: string
  league_id: string
  week_number: number
  season_year: number
  points: number
  predictions_made: number
}

export type Settings = {
  key: string
  value: Record<string, unknown>
  description: string | null
  updated_at: string
}

export type ScoringSettings = {
  exact_score: number
  goal_difference: number
  correct_winner: number
}

export type ApiFootballSettings = {
  api_key: string
  tournament_id: string  // SportAPI7 unique tournament ID (e.g. 52 for Süper Lig)
  season_id: string      // SportAPI7 season ID (e.g. 77805 for 2025/26)
  season_year: string    // Display year for DB grouping (e.g. 2025)
  base_url: string
  season_active?: boolean // When false, sync is disabled
}

export type AppSettings = {
  site_name: string
  max_leagues_per_user: number
}

// Enriched types for UI
export type LeagueWithMemberCount = League & {
  member_count: number
  is_member: boolean
}

export type StandingRow = {
  user_id: string
  username: string
  display_name: string | null
  total_points: number
  predictions_made: number
  rank: number
}

export type PredictionWithMatch = Prediction & {
  match: Match
}

export type MemberWithProfile = LeagueMember & {
  profile: Profile
}

export type TeamLogoRow = {
  id: string
  team_name: string
  logo_base64: string
  size_percent: number
  created_at: string
}

export type TeamLogosMap = Record<string, { base64: string; size: number }>

export type FormResult = 'W' | 'L' | 'D'
export type TeamFormMap = Record<string, FormResult[]>

export type LeagueMessage = {
  id: string
  league_id: string
  user_id: string
  content: string
  created_at: string
  profiles: {
    username: string
    display_name: string | null
  } | null
}
