import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import { fetchEvents, fetchCurrentRound, mapStatus, logoUrl } from "@/lib/api-football"
import type { ApiFootballSettings } from "@/types"

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
  const { data: settingRow } = await adminSupabase
    .from("settings")
    .select("value")
    .eq("key", "api_football")
    .single()

  if (!settingRow) {
    return NextResponse.json({ error: "API ayarları bulunamadı." }, { status: 500 })
  }

  const config = settingRow.value as ApiFootballSettings

  if (!config.api_key) {
    return NextResponse.json({ error: "API anahtarı ayarlanmamış. Lütfen Admin > Ayarlar'dan api_key girin." }, { status: 400 })
  }

  if (config.season_active === false) {
    return NextResponse.json({ error: "Sezon kapalı. Ayarlar'dan 'Sezon Aktif' seçeneğini açın." }, { status: 400 })
  }

  let round: number
  if (body.week) {
    round = body.week
  } else {
    try {
      round = await fetchCurrentRound(config)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bilinmeyen hata"
      return NextResponse.json({ error: `Mevcut hafta alınamadı: ${message}` }, { status: 502 })
    }
  }

  let events
  try {
    events = await fetchEvents(config, round)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bilinmeyen hata"
    return NextResponse.json({ error: `API isteği başarısız: ${message}` }, { status: 502 })
  }

  if (events.length === 0) {
    return NextResponse.json({ upserted: 0, round, message: "Bu hafta için maç bulunamadı." })
  }

  const seasonYear = parseInt(config.season_year) || new Date().getFullYear()

  const rows = events.map((e) => ({
    external_id: String(e.id),
    home_team: e.homeTeam.name,
    away_team: e.awayTeam.name,
    home_team_logo: logoUrl(e.homeTeam.id),
    away_team_logo: logoUrl(e.awayTeam.id),
    match_date: new Date(e.startTimestamp * 1000).toISOString(),
    week_number: e.roundInfo.round,
    season_year: seasonYear,
    status: mapStatus(e.status.type),
    home_score: e.homeScore?.current ?? null,
    away_score: e.awayScore?.current ?? null,
  }))

  const { error } = await adminSupabase
    .from("matches")
    .upsert(rows, { onConflict: "external_id" })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ upserted: rows.length, round })
}
