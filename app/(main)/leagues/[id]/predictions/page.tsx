import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { MatchCard } from "@/components/match-card"
import { Button } from "@/components/ui/button"
import { getTeamLogos } from "@/lib/team-logos"
import { Badge } from "@/components/ui/badge"
import { LeagueSuggestionPanel } from "@/components/league-suggestion-panel"
import type { FormResult, TeamFormMap } from "@/types"

interface Props {
  params: { id: string }
  searchParams: { week?: string }
}

export default async function PredictionsPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("id", params.id)
    .single()
  if (!league) notFound()

  // Check membership
  const { data: membership } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", params.id)
    .eq("user_id", user.id)
    .single()
  if (!membership) notFound()

  // Get all weeks with match dates (no season_year filter — SportAPI7 season_year != league year)
  const { data: weekRows } = await supabase
    .from("matches")
    .select("week_number, match_date")
    .order("match_date", { ascending: true })

  const availableWeeks = Array.from(
    new Set((weekRows ?? []).map((w) => w.week_number))
  ).sort((a, b) => a - b)

  // Auto-detect "current" week: earliest week with any future match
  // If all past, fall back to latest week
  const now = new Date()
  const futureRow = (weekRows ?? []).find((w) => new Date(w.match_date) > now)
  const currentWeek = futureRow?.week_number ?? (availableWeeks[availableWeeks.length - 1] ?? 1)

  const selectedWeek = searchParams.week ? parseInt(searchParams.week) : currentWeek

  // Fetch matches for selected week (no season_year filter)
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("week_number", selectedWeek)
    .order("match_date", { ascending: true })

  // Fetch user's predictions
  const matchIds = matches?.map((m) => m.id) ?? []
  const { data: predictions } = await supabase
    .from("predictions")
    .select("*")
    .eq("user_id", user.id)
    .eq("league_id", params.id)
    .in("match_id", matchIds.length > 0 ? matchIds : ["00000000-0000-0000-0000-000000000000"])

  const predByMatchId = Object.fromEntries(
    (predictions ?? []).map((p) => [p.match_id, p])
  )

  const teamLogos = await getTeamLogos()

  // Compute last-5 form for each team in this week's matches
  const teamNames = [...new Set((matches ?? []).flatMap(m => [m.home_team, m.away_team]))]
  const teamForm: TeamFormMap = {}

  if (teamNames.length > 0) {
    const { data: recentFinished } = await supabase
      .from("matches")
      .select("home_team, away_team, home_score, away_score, match_date")
      .eq("status", "finished")
      .order("match_date", { ascending: false })
      .limit(300)

    for (const team of teamNames) {
      const results: FormResult[] = []
      for (const m of recentFinished ?? []) {
        if (results.length >= 5) break
        const hs = m.home_score ?? 0
        const as_ = m.away_score ?? 0
        if (m.home_team === team) {
          results.push(hs > as_ ? "W" : hs < as_ ? "L" : "D")
        } else if (m.away_team === team) {
          results.push(as_ > hs ? "W" : as_ < hs ? "L" : "D")
        }
      }
      teamForm[team] = results
    }
  }

  // Calculate points earned from finished matches this week
  const finishedThisWeek = (matches ?? []).filter(m => m.status === "finished")
  const weekEarned = finishedThisWeek.reduce((sum, m) => {
    const pred = predByMatchId[m.id]
    return sum + (pred?.points_earned ?? 0)
  }, 0)
  const scoredPredCount = finishedThisWeek.filter(m => predByMatchId[m.id]?.points_earned !== null && predByMatchId[m.id]?.points_earned !== undefined).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tahmin Gir</h1>
        <p className="text-sm text-muted-foreground">{league.name}</p>
      </div>

      {/* Week selector */}
      {availableWeeks.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {availableWeeks.map((w) => (
            <Button
              key={w}
              size="sm"
              variant={w === selectedWeek ? "default" : "outline"}
              asChild
            >
              <Link href={`/leagues/${params.id}/predictions?week=${w}`}>
                {w === currentWeek ? `Hafta ${w} ★` : `Hafta ${w}`}
              </Link>
            </Button>
          ))}
        </div>
      )}

      {/* Week points summary */}
      {scoredPredCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card">
          <div className="text-sm text-muted-foreground">
            Hafta {selectedWeek} — {scoredPredCount} maç puanlandı
          </div>
          <Badge variant="default" className="text-sm px-3 py-1">
            {weekEarned} pt
          </Badge>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Hafta {selectedWeek} Maçları</h2>
        {!matches || matches.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Bu hafta için maç bulunamadı. Admin&apos;den maçları senkronize etmesini isteyin.
          </p>
        ) : (
          matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              leagueId={params.id}
              existingPrediction={predByMatchId[match.id]}
              teamLogos={teamLogos}
              teamForm={teamForm}
            />
          ))
        )}
      </div>

      <LeagueSuggestionPanel leagueId={params.id} userId={user.id} />
    </div>
  )
}
