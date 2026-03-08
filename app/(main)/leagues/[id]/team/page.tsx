import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { formatMatchDate } from "@/lib/utils"
import { getTeamLogos } from "@/lib/team-logos"

interface Props {
  params: { id: string }
  searchParams: { name?: string }
}

export default async function TeamPage({ params, searchParams }: Props) {
  const teamName = searchParams.name
  if (!teamName) notFound()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", params.id)
    .eq("user_id", user.id)
    .single()
  if (!membership) notFound()

  // Recent finished matches for this team
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, home_score, away_score, match_date, week_number")
    .or(`home_team.eq.${teamName},away_team.eq.${teamName}`)
    .eq("status", "finished")
    .order("match_date", { ascending: false })
    .limit(10)

  const teamLogos = await getTeamLogos()
  const logo = teamLogos[teamName]

  type MatchRow = { id: string; home_team: string; away_team: string; home_score: number | null; away_score: number | null; match_date: string; week_number: number }
  type MatchResult = { match: MatchRow; result: "W" | "L" | "D"; isHome: boolean }

  const matchResults: MatchResult[] = (matches ?? []).map(m => {
    const isHome = m.home_team === teamName
    const hs = m.home_score ?? 0
    const as_ = m.away_score ?? 0
    let result: "W" | "L" | "D"
    if (isHome) result = hs > as_ ? "W" : hs < as_ ? "L" : "D"
    else result = as_ > hs ? "W" : as_ < hs ? "L" : "D"
    return { match: m, result, isHome }
  })

  const wins = matchResults.filter(r => r.result === "W").length
  const draws = matchResults.filter(r => r.result === "D").length
  const losses = matchResults.filter(r => r.result === "L").length
  const goalsFor = matchResults.reduce((s, r) => s + (r.isHome ? (r.match.home_score ?? 0) : (r.match.away_score ?? 0)), 0)
  const goalsAgainst = matchResults.reduce((s, r) => s + (r.isHome ? (r.match.away_score ?? 0) : (r.match.home_score ?? 0)), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/leagues/${params.id}/history`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Geri
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo.base64} alt={teamName} style={{ width: 32, height: 32 }} className="object-contain" />
          )}
          <h1 className="text-xl font-bold">{teamName}</h1>
        </div>
      </div>

      {matchResults.length === 0 ? (
        <p className="text-muted-foreground text-sm">Tamamlanmış maç bulunamadı.</p>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: "G", value: wins, className: "text-green-600 dark:text-green-400" },
              { label: "B", value: draws, className: "text-yellow-600 dark:text-yellow-400" },
              { label: "M", value: losses, className: "text-red-600 dark:text-red-400" },
              { label: "AG", value: goalsFor, className: "" },
              { label: "YG", value: goalsAgainst, className: "" },
            ].map(stat => (
              <div key={stat.label} className="text-center rounded-lg border bg-card py-2">
                <p className={`text-lg font-bold ${stat.className}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Form dots */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Son form:</span>
            <div className="flex gap-1">
              {matchResults.map((r, i) => (
                <span
                  key={i}
                  title={r.result === "W" ? "Galibiyet" : r.result === "L" ? "Mağlubiyet" : "Beraberlik"}
                  className={`inline-flex items-center justify-center h-6 w-6 rounded text-[10px] font-bold text-white ${
                    r.result === "W" ? "bg-green-500" : r.result === "L" ? "bg-red-500" : "bg-yellow-400"
                  }`}
                >
                  {r.result}
                </span>
              ))}
            </div>
          </div>

          {/* Match list */}
          <div className="space-y-1.5">
            {matchResults.map(({ match: m, result, isHome }) => {
              const opponent = isHome ? m.away_team : m.home_team
              const opponentLogo = teamLogos[opponent]
              const myScore = isHome ? m.home_score : m.away_score
              const oppScore = isHome ? m.away_score : m.home_score

              return (
                <Card key={m.id} className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={result === "W" ? "default" : result === "L" ? "destructive" : "secondary"}
                      className="w-8 justify-center shrink-0"
                    >
                      {result}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">Hf. {m.week_number}</span>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {opponentLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={opponentLogo.base64} alt={opponent} style={{ width: 18, height: 18 }} className="object-contain shrink-0" />
                      ) : null}
                      <span className="text-xs truncate">{isHome ? "vs" : "@"} {opponent}</span>
                    </div>
                    <span className="font-mono text-sm font-bold shrink-0">
                      {myScore}–{oppScore}
                    </span>
                    <span className="text-[10px] text-muted-foreground hidden sm:block shrink-0">
                      {formatMatchDate(m.match_date)}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
