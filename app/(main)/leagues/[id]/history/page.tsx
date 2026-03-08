import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatMatchDate } from "@/lib/utils"
import { getTeamLogos } from "@/lib/team-logos"
import type { ScoringSettings, TeamLogosMap } from "@/types"

interface Props {
  params: { id: string }
  searchParams: { week?: string }
}

function TeamName({ name, teamLogos, leagueId }: { name: string; teamLogos: TeamLogosMap; leagueId: string }) {
  const custom = teamLogos[name]
  const px = custom ? Math.max(16, Math.min(28, Math.round(20 * (custom.size / 100)))) : 0
  return (
    <Link
      href={`/leagues/${leagueId}/team?name=${encodeURIComponent(name)}`}
      className="inline-flex items-center gap-1.5 hover:underline"
    >
      {custom && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={custom.base64}
          alt={name}
          style={{ width: px, height: px }}
          className="object-contain rounded-sm shrink-0"
        />
      )}
      <span>{name}</span>
    </Link>
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

  // Get scoring settings for badge colors
  const { data: scoringRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "scoring")
    .single()
  const scoring = (scoringRow?.value ?? { exact_score: 4, goal_difference: 3, correct_winner: 2 }) as ScoringSettings

  // All finished weeks
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

  // Default to latest week (no "Tümü" option)
  const selectedWeek = searchParams.week ? parseInt(searchParams.week) : availableWeeks[0]

  // Fetch matches for selected week
  const { data: finishedMatches } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "finished")
    .eq("week_number", selectedWeek)
    .order("match_date", { ascending: false })

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

  const teamLogos = await getTeamLogos()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Geçmiş Sonuçlar</h1>
        <p className="text-xs text-muted-foreground">{league.name}</p>
      </div>

      {/* Week selector */}
      <div className="flex gap-1.5 flex-wrap">
        {availableWeeks.map(w => (
          <Button key={w} size="sm" variant={selectedWeek === w ? "default" : "outline"} asChild className="h-7 text-xs px-2">
            <Link href={`/leagues/${params.id}/history?week=${w}`}>Hf. {w}</Link>
          </Button>
        ))}
      </div>

      {/* Week header */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
          Hafta {selectedWeek}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {finishedMatches?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bu haftaya ait tamamlanmış maç yok.</p>
      ) : (
        <div className="space-y-2">
          {(finishedMatches ?? []).map(match => {
            const preds = (predsByMatch[match.id] ?? []).sort(
              (a, b) => (b.points_earned ?? -1) - (a.points_earned ?? -1)
            )

            return (
              <Card key={match.id}>
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <div className="flex items-center gap-1.5 text-xs font-semibold flex-wrap">
                    <TeamName name={match.home_team} teamLogos={teamLogos} leagueId={params.id} />
                    <span className="text-muted-foreground font-normal">vs</span>
                    <TeamName name={match.away_team} teamLogos={teamLogos} leagueId={params.id} />
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
                        const profile = (p.profiles as unknown) as { username: string; display_name: string | null } | null
                        const name = profile?.display_name || profile?.username || "?"
                        const pts = p.points_earned
                        const isMe = p.user_id === user.id

                        let badgeVariant: "default" | "secondary" | "outline" = "outline"
                        let badgeText = "—"
                        if (pts !== null) {
                          badgeText = pts === scoring.exact_score ? `🎯 ${pts}pt` : pts > 0 ? `${pts} pt` : "0 pt"
                          if (pts === scoring.exact_score) badgeVariant = "default"
                          else if (pts > 0) badgeVariant = "secondary"
                        }

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
                                {badgeText}
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
        </div>
      )}
    </div>
  )
}
