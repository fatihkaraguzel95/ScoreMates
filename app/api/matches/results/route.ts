import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { fetchEvents, fetchFinishedEvents, mapStatus } from "@/lib/api-football"
import { calculatePoints } from "@/lib/scoring"
import type { ApiFootballSettings, ScoringSettings } from "@/types"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { week?: number }

  const adminSupabase = createAdminClient()

  const { data: settingsRows } = await adminSupabase
    .from("settings")
    .select("key, value")
    .in("key", ["api_football", "scoring"])

  const settingsMap = Object.fromEntries((settingsRows ?? []).map((s) => [s.key, s.value]))
  const config = settingsMap["api_football"] as ApiFootballSettings
  const scoring = settingsMap["scoring"] as ScoringSettings

  if (!config?.api_key) {
    return NextResponse.json({ error: "API anahtarı eksik." }, { status: 400 })
  }

  const round = body.week ?? 1
  const seasonYear = parseInt(config.season_year) || new Date().getFullYear()

  let allEvents
  try {
    allEvents = await fetchEvents(config, round)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: `API isteği başarısız: ${message}` }, { status: 502 })
  }

  const finishedEvents = allEvents.filter(e => mapStatus(e.status.type) === 'finished')
  const debug = {
    total_from_api: allEvents.length,
    finished_from_api: finishedEvents.length,
    status_types: [...new Set(allEvents.map(e => e.status.type))],
    external_ids_from_api: finishedEvents.map(e => String(e.id)),
  }

  let updated = 0
  let pointsCalculated = 0

  for (const event of finishedEvents) {
    const externalId = String(event.id)
    const homeScore = event.homeScore?.current ?? null
    const awayScore = event.awayScore?.current ?? null

    if (homeScore === null || awayScore === null) continue

    const { data: match } = await adminSupabase
      .from("matches")
      .update({
        status: mapStatus(event.status.type),
        home_score: homeScore,
        away_score: awayScore,
      })
      .eq("external_id", externalId)
      .select("id")
      .single()

    if (!match) continue
    updated++

    const { data: predictions } = await adminSupabase
      .from("predictions")
      .select("id, user_id, league_id, predicted_home, predicted_away")
      .eq("match_id", match.id)

    for (const pred of predictions ?? []) {
      const points = calculatePoints(
        { home: pred.predicted_home, away: pred.predicted_away },
        { home: homeScore, away: awayScore },
        scoring
      )

      await adminSupabase
        .from("predictions")
        .update({ points_earned: points })
        .eq("id", pred.id)

      const { data: existing } = await adminSupabase
        .from("weekly_points")
        .select("id, points, predictions_made")
        .eq("user_id", pred.user_id)
        .eq("league_id", pred.league_id)
        .eq("week_number", round)
        .eq("season_year", seasonYear)
        .single()

      if (existing) {
        await adminSupabase
          .from("weekly_points")
          .update({
            points: (existing.points ?? 0) + points,
            predictions_made: (existing.predictions_made ?? 0) + 1,
          })
          .eq("id", existing.id)
      } else {
        await adminSupabase
          .from("weekly_points")
          .insert({
            user_id: pred.user_id,
            league_id: pred.league_id,
            week_number: round,
            season_year: seasonYear,
            points,
            predictions_made: 1,
          })
      }

      pointsCalculated++
    }
  }

  return NextResponse.json({ updated, pointsCalculated, debug })
}
