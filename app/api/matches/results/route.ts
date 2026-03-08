import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { fetchEvents, mapStatus } from "@/lib/api-football"
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

  // Fetch user favorite teams
  const { data: profilesData } = await adminSupabase.from("profiles").select("id, favorite_team")
  const favTeamByUser: Record<string, string | null> = Object.fromEntries(
    (profilesData ?? []).map((p: { id: string; favorite_team: string | null }) => [p.id, p.favorite_team ?? null])
  )

  let updated = 0
  let pointsCalculated = 0
  const processedMatchIds: string[] = []
  const processedMatchTeams: Record<string, { home: string; away: string }> = {}

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
      .select("id, home_team, away_team")
      .single()

    if (!match) continue
    updated++
    processedMatchIds.push(match.id)
    processedMatchTeams[match.id] = { home: match.home_team, away: match.away_team }

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
        { home: homeScore, away: awayScore },
        scoring,
        isFavMatch
      )
      await adminSupabase
        .from("predictions")
        .update({ points_earned: points })
        .eq("id", pred.id)
      pointsCalculated++
    }
  }

  // Recalculate weekly_points from scratch for this round (prevents double-counting on re-runs)
  if (processedMatchIds.length > 0) {
    const { data: allRoundMatches } = await adminSupabase
      .from("matches")
      .select("id")
      .eq("week_number", round)
      .eq("status", "finished")

    const allRoundMatchIds = (allRoundMatches ?? []).map(m => m.id)

    const { data: allRoundPreds } = await adminSupabase
      .from("predictions")
      .select("user_id, league_id, points_earned")
      .in("match_id", allRoundMatchIds)
      .not("points_earned", "is", null)

    const weeklyAgg: Record<string, { user_id: string; league_id: string; points: number; predictions_made: number }> = {}
    for (const p of allRoundPreds ?? []) {
      const key = `${p.user_id}:${p.league_id}`
      if (!weeklyAgg[key]) weeklyAgg[key] = { user_id: p.user_id, league_id: p.league_id, points: 0, predictions_made: 0 }
      weeklyAgg[key].points += p.points_earned ?? 0
      weeklyAgg[key].predictions_made += 1
    }

    for (const data of Object.values(weeklyAgg)) {
      await adminSupabase
        .from("weekly_points")
        .upsert({
          user_id: data.user_id,
          league_id: data.league_id,
          week_number: round,
          season_year: seasonYear,
          points: data.points,
          predictions_made: data.predictions_made,
        }, { onConflict: "user_id,league_id,week_number,season_year" })
    }
  }

  return NextResponse.json({ updated, pointsCalculated, debug })
}
