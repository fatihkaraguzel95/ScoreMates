import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatMatchDate } from "@/lib/utils"
import { getTeamLogos } from "@/lib/team-logos"
import type { TeamLogosMap } from "@/types"

interface Props {
  params: { id: string }
  searchParams: { week?: string }
}

function TeamName({ name, teamLogos }: { name: string; teamLogos: TeamLogosMap }) {
  const custom = teamLogos[name]
  const px = custom ? Math.max(16, Math.min(28, Math.round(20 * (custom.size / 100)))) : 0
  return (
    <span className="inline-flex items-center gap-1.5">
      {custom && (
        <img
          src={custom.base64}
          alt={name}
          style={{ width: px, height: px }}
          className="object-contain rounded-sm shrink-0"
        />
      )}
      <span>{name}</span>
    </span>
  )
}

export default async function HistoryPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", params.id)
    .eq("user_id", user.id)
    .single()
  if (!membership) notFound()

  const { data: league } = await supabase
    .from("leagues")
    .select("name")
    .eq("id", params.id)
    .single()
  if (!league) notFound()

  // All finished matches (to know available weeks)
  const { data: allFinished } = await supabase
    .from("matches")
    .select("week_number")
    .eq("status", "finished")
    .order("week_number", { ascending: false })

  const availableWeeks = Array.from(new Set((allFinished ?? []).map(m => m.week_number))).sort((a, b) => b - a)

  if (availableWeeks.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Geçmiş Sonuçlar</h1>
          <p className="text-sm text-muted-foreground">{league.name}</p>
        </div>
        <p className="text-muted-foreground text-sm">Henüz tamamlanmış maç yok.</p>
      </div>
    )
  }

  const selectedWeek = searchParams.week ? parseInt(searchParams.week) : null

  // Fetch matches for selected week or all weeks
  let matchQuery = supabase.from("matches").select("*").eq("status", "finished").order("match_date", { ascending: false })
  if (selectedWeek) matchQuery = matchQuery.eq("week_number", selectedWeek)
  const { data: finishedMatches } = await matchQuery

  const matchIds = (finishedMatches ?? []).map(m => m.id)

  // All predictions for displayed matches in this league
  const { data: predictions } = await supabase
    .from("predictions")
    .select("match_id, user_id, predicted_home, predicted_away, points_earned, profiles(username, display_name)")
    .eq("league_id", params.id)
    .in("match_id", matchIds.length > 0 ? matchIds : ["00000000-0000-0000-0000-000000000000"])

  const predsByMatch: Record<string, typeof predictions> = {}
  for (const p of predictions ?? []) {
    if (!predsByMatch[p.match_id]) predsByMatch[p.match_id] = []
    predsByMatch[p.match_id]!.push(p)
  }

  // Group by week, newest first
  const weeks: Record<number, typeof finishedMatches> = {}
  for (const m of finishedMatches ?? []) {
    if (!weeks[m.week_number]) weeks[m.week_number] = []
    weeks[m.week_number]!.push(m)
  }
  const sortedWeeks = Object.keys(weeks).map(Number).sort((a, b) => b - a)

  const teamLogos = await getTeamLogos()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Geçmiş Sonuçlar</h1>
        <p className="text-xs text-muted-foreground">{league.name}</p>
      </div>

      {/* Week selector */}
      <div className="flex gap-1.5 flex-wrap">
        <Button size="sm" variant={!selectedWeek ? "default" : "outline"} asChild className="h-7 text-xs px-2">
          <Link href={`/leagues/${params.id}/history`}>Tümü</Link>
        </Button>
        {availableWeeks.map(w => (
          <Button key={w} size="sm" variant={selectedWeek === w ? "default" : "outline"} asChild className="h-7 text-xs px-2">
            <Link href={`/leagues/${params.id}/history?week=${w}`}>Hf. {w}</Link>
          </Button>
        ))}
      </div>

      {sortedWeeks.map(week => (
        <section key={week} className="space-y-2">
          {/* Week header */}
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              Hafta {week}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {weeks[week]!.map(match => {
            const preds = (predsByMatch[match.id] ?? []).sort(
              (a, b) => (b.points_earned ?? 0) - (a.points_earned ?? 0)
            )

            return (
              <Card key={match.id}>
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <div className="flex items-center gap-1.5 text-xs font-semibold flex-wrap">
                    <TeamName name={match.home_team} teamLogos={teamLogos} />
                    <span className="text-muted-foreground font-normal">vs</span>
                    <TeamName name={match.away_team} teamLogos={teamLogos} />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground hidden sm:block">
                      {formatMatchDate(match.match_date)}
                    </span>
                    <Badge variant="default" className="font-mono text-xs px-2 py-0">
                      {match.home_score ?? "?"} – {match.away_score ?? "?"}
                    </Badge>
                  </div>
                </div>

                <CardContent className="px-3 py-1.5">
                  {preds.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-1">Tahmin girilmedi.</p>
                  ) : (
                    <div className="divide-y">
                      {preds.map(p => {
                        const profile = p.profiles as { username: string; display_name: string | null } | null
                        const name = profile?.display_name || profile?.username || "?"
                        const pts = p.points_earned ?? 0
                        const isMe = p.user_id === user.id

                        let badgeVariant: "default" | "secondary" | "outline" = "outline"
                        if (pts === 4) badgeVariant = "default"
                        else if (pts >= 2) badgeVariant = "secondary"

                        return (
                          <div
                            key={p.user_id}
                            className={`flex items-center justify-between py-1.5 ${isMe ? "font-semibold" : ""}`}
                          >
                            <span className="text-xs">
                              {isMe && <span className="text-primary mr-1">★</span>}
                              {name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {p.predicted_home}–{p.predicted_away}
                              </span>
                              <Badge variant={badgeVariant} className="w-16 justify-center text-xs px-1 py-0">
                                {pts === 4 ? "🎯 " + pts + "pt" : pts > 0 ? pts + " pt" : "0 pt"}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </section>
      ))}
    </div>
  )
}
