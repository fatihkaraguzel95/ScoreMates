import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { calculatePoints } from "@/lib/scoring"
import type { ScoringSettings } from "@/types"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { home_team, away_team, match_date, week_number, season_year, status, home_score, away_score, match_id } = body

  if (!home_team || !away_team || !match_date || !week_number) {
    return NextResponse.json({ error: "Zorunlu alanlar eksik." }, { status: 400 })
  }

  const adminSupabase = createAdminClient()

  if (match_id) {
    const { error } = await adminSupabase
      .from("matches")
      .update({ home_team, away_team, match_date, week_number, season_year, status, home_score, away_score })
      .eq("id", match_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (status === "finished" && home_score !== null && away_score !== null) {
      await calculatePointsForMatch(adminSupabase, match_id, home_team, away_team, home_score, away_score, week_number, season_year)
    }

    return NextResponse.json({ success: true })
  } else {
    const externalId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const { data: match, error } = await adminSupabase
      .from("matches")
      .insert({ external_id: externalId, home_team, away_team, match_date, week_number, season_year, status, home_score, away_score })
      .select("id")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (status === "finished" && home_score !== null && away_score !== null && match) {
      await calculatePointsForMatch(adminSupabase, match.id, home_team, away_team, home_score, away_score, week_number, season_year)
    }

    return NextResponse.json({ success: true, id: match?.id })
  }
}

async function calculatePointsForMatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any,
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  weekNumber: number,
  seasonYear: number
) {
  const { data: scoringRow } = await adminSupabase
    .from("settings").select("value").eq("key", "scoring").single()
  const scoring = (scoringRow?.value ?? { exact_score: 4, goal_difference: 3, correct_winner: 2, favorite_team_exact: 5 }) as ScoringSettings

  // Get user favorite teams
  const { data: profilesData } = await adminSupabase.from("profiles").select("id, favorite_team")
  const favTeamByUser: Record<string, string | null> = Object.fromEntries(
    (profilesData ?? []).map((p: { id: string; favorite_team: string | null }) => [p.id, p.favorite_team ?? null])
  )

  const { data: predictions } = await adminSupabase
    .from("predictions")
    .select("id, user_id, league_id, predicted_home, predicted_away")
    .eq("match_id", matchId)

  for (const pred of predictions ?? []) {
    const favTeam = favTeamByUser[pred.user_id]
    const isFavMatch = favTeam ? homeTeam === favTeam || awayTeam === favTeam : false

    const points = calculatePoints(
      { home: pred.predicted_home, away: pred.predicted_away },
      { home: homeScore, away: awayScore },
      scoring,
      isFavMatch
    )

    await adminSupabase.from("predictions").update({ points_earned: points }).eq("id", pred.id)
  }

  // Recalculate weekly_points for this match's week
  const { data: allWeekMatches } = await adminSupabase
    .from("matches").select("id").eq("week_number", weekNumber).eq("status", "finished")
  const allWeekMatchIds = (allWeekMatches ?? []).map((m: { id: string }) => m.id)

  const { data: allWeekPreds } = await adminSupabase
    .from("predictions")
    .select("user_id, league_id, points_earned")
    .in("match_id", allWeekMatchIds)
    .not("points_earned", "is", null)

  const weeklyAgg: Record<string, { user_id: string; league_id: string; points: number; predictions_made: number }> = {}
  for (const p of allWeekPreds ?? []) {
    const key = `${p.user_id}:${p.league_id}`
    if (!weeklyAgg[key]) weeklyAgg[key] = { user_id: p.user_id, league_id: p.league_id, points: 0, predictions_made: 0 }
    weeklyAgg[key].points += p.points_earned ?? 0
    weeklyAgg[key].predictions_made += 1
  }

  for (const data of Object.values(weeklyAgg)) {
    await adminSupabase.from("weekly_points").upsert({
      user_id: data.user_id,
      league_id: data.league_id,
      week_number: weekNumber,
      season_year: seasonYear,
      points: data.points,
      predictions_made: data.predictions_made,
    }, { onConflict: "user_id,league_id,week_number,season_year" })
  }
}
