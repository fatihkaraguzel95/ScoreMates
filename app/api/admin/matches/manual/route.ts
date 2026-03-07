import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"

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
    // Update existing match
    const { error } = await adminSupabase
      .from("matches")
      .update({ home_team, away_team, match_date, week_number, season_year, status, home_score, away_score })
      .eq("id", match_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If finished, trigger point calculation
    if (status === "finished" && home_score !== null && away_score !== null) {
      await calculatePointsForMatch(adminSupabase, match_id, home_score, away_score, week_number, season_year)
    }

    return NextResponse.json({ success: true })
  } else {
    // Insert new match with a generated external_id
    const externalId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const { data: match, error } = await adminSupabase
      .from("matches")
      .insert({ external_id: externalId, home_team, away_team, match_date, week_number, season_year, status, home_score, away_score })
      .select("id")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (status === "finished" && home_score !== null && away_score !== null && match) {
      await calculatePointsForMatch(adminSupabase, match.id, home_score, away_score, week_number, season_year)
    }

    return NextResponse.json({ success: true, id: match?.id })
  }
}

async function calculatePointsForMatch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any,
  matchId: string,
  homeScore: number,
  awayScore: number,
  weekNumber: number,
  seasonYear: number
) {
  const { data: scoringRow } = await adminSupabase
    .from("settings").select("value").eq("key", "scoring").single()
  const scoring = scoringRow?.value ?? { exact_score: 4, goal_difference: 3, correct_winner: 2 }

  const { data: predictions } = await adminSupabase
    .from("predictions")
    .select("id, user_id, league_id, predicted_home, predicted_away")
    .eq("match_id", matchId)

  for (const pred of predictions ?? []) {
    const predDiff = pred.predicted_home - pred.predicted_away
    const actualDiff = homeScore - awayScore
    let points = 0
    if (pred.predicted_home === homeScore && pred.predicted_away === awayScore) {
      points = scoring.exact_score
    } else if (predDiff === actualDiff) {
      points = scoring.goal_difference
    } else if (Math.sign(predDiff) === Math.sign(actualDiff)) {
      points = scoring.correct_winner
    }

    await adminSupabase.from("predictions").update({ points_earned: points }).eq("id", pred.id)

    const { data: existing } = await adminSupabase
      .from("weekly_points")
      .select("id, points, predictions_made")
      .eq("user_id", pred.user_id)
      .eq("league_id", pred.league_id)
      .eq("week_number", weekNumber)
      .eq("season_year", seasonYear)
      .single()

    if (existing) {
      await adminSupabase.from("weekly_points")
        .update({ points: existing.points + points, predictions_made: existing.predictions_made + 1 })
        .eq("id", existing.id)
    } else {
      await adminSupabase.from("weekly_points")
        .insert({ user_id: pred.user_id, league_id: pred.league_id, week_number: weekNumber, season_year: seasonYear, points, predictions_made: 1 })
    }
  }
}
