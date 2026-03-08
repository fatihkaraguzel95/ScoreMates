import { NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { calculatePoints } from "@/lib/scoring"
import type { ScoringSettings } from "@/types"

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const adminSupabase = createAdminClient()

  // Get scoring settings
  const { data: settingsRow } = await adminSupabase
    .from("settings")
    .select("value")
    .eq("key", "scoring")
    .single()
  const scoring = (settingsRow?.value ?? { exact_score: 4, goal_difference: 3, correct_winner: 2, favorite_team_exact: 5 }) as ScoringSettings

  // Get all finished matches with scores
  const { data: finishedMatches } = await adminSupabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, week_number, season_year")
    .eq("status", "finished")
    .not("home_score", "is", null)
    .not("away_score", "is", null)

  if (!finishedMatches?.length) {
    return NextResponse.json({ recalculated: 0, message: "Biten maç yok." })
  }

  // Get all user favorite teams
  const { data: profilesData } = await adminSupabase
    .from("profiles")
    .select("id, favorite_team")
  const favTeamByUser: Record<string, string | null> = Object.fromEntries(
    (profilesData ?? []).map(p => [p.id, p.favorite_team ?? null])
  )

  let recalculated = 0
  const matchWeekMap: Record<string, { week_number: number; season_year: number; home_team: string; away_team: string }> = {}

  // Phase 1: Update predictions.points_earned
  for (const match of finishedMatches) {
    matchWeekMap[match.id] = {
      week_number: match.week_number,
      season_year: match.season_year,
      home_team: match.home_team,
      away_team: match.away_team,
    }

    const { data: predictions } = await adminSupabase
      .from("predictions")
      .select("id, user_id, predicted_home, predicted_away")
      .eq("match_id", match.id)

    for (const pred of predictions ?? []) {
      const favTeam = favTeamByUser[pred.user_id]
      const isFavMatch = favTeam
        ? match.home_team === favTeam || match.away_team === favTeam
        : false

      const points = calculatePoints(
        { home: pred.predicted_home, away: pred.predicted_away },
        { home: match.home_score!, away: match.away_score! },
        scoring,
        isFavMatch
      )
      await adminSupabase
        .from("predictions")
        .update({ points_earned: points })
        .eq("id", pred.id)
      recalculated++
    }
  }

  // Phase 2: Recalculate weekly_points from scratch
  const finishedMatchIds = finishedMatches.map(m => m.id)
  const { data: allPreds } = await adminSupabase
    .from("predictions")
    .select("user_id, league_id, match_id, points_earned")
    .in("match_id", finishedMatchIds)
    .not("points_earned", "is", null)

  const weeklyAgg: Record<string, {
    user_id: string; league_id: string; week_number: number; season_year: number; points: number; predictions_made: number
  }> = {}

  for (const p of allPreds ?? []) {
    const info = matchWeekMap[p.match_id]
    if (!info) continue
    const key = `${p.user_id}:${p.league_id}:${info.week_number}:${info.season_year}`
    if (!weeklyAgg[key]) {
      weeklyAgg[key] = {
        user_id: p.user_id,
        league_id: p.league_id,
        week_number: info.week_number,
        season_year: info.season_year,
        points: 0,
        predictions_made: 0,
      }
    }
    weeklyAgg[key].points += p.points_earned ?? 0
    weeklyAgg[key].predictions_made += 1
  }

  const upserts = Object.values(weeklyAgg)
  if (upserts.length > 0) {
    await adminSupabase
      .from("weekly_points")
      .upsert(upserts, { onConflict: "user_id,league_id,week_number,season_year" })
  }

  return NextResponse.json({ recalculated, weeklyUpdated: upserts.length })
}
