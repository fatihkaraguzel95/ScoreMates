import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock } from "lucide-react"
import { formatMatchDate } from "@/lib/utils"

interface Props {
  params: { id: string }
}

export default async function WeekStatusPage({ params }: Props) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Membership check
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

  // Find current week: earliest week with a future match
  const now = new Date().toISOString()
  const { data: weekRows } = await supabase
    .from("matches")
    .select("week_number, match_date")
    .gt("match_date", now)
    .order("match_date", { ascending: true })
    .limit(1)

  // Fallback: latest week overall
  const { data: allWeeks } = await supabase
    .from("matches")
    .select("week_number")
    .order("week_number", { ascending: false })
    .limit(1)

  const currentWeek = weekRows?.[0]?.week_number ?? allWeeks?.[0]?.week_number ?? null

  if (!currentWeek) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Bu Hafta Durumu</h1>
          <p className="text-sm text-muted-foreground">{league.name}</p>
        </div>
        <p className="text-muted-foreground text-sm">Henüz maç eklenmedi.</p>
      </div>
    )
  }

  // Current week matches
  const { data: matches } = await supabase
    .from("matches")
    .select("id, home_team, away_team, match_date, status")
    .eq("week_number", currentWeek)
    .order("match_date", { ascending: true })

  const matchIds = (matches ?? []).map((m) => m.id)

  // All league members with profiles
  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, profiles(username, display_name)")
    .eq("league_id", params.id)

  // Predictions for this week in this league (only match_id + user_id, no scores)
  const { data: predictions } = matchIds.length > 0
    ? await supabase
        .from("predictions")
        .select("match_id, user_id")
        .eq("league_id", params.id)
        .in("match_id", matchIds)
    : { data: [] }

  // Build set: "match_id:user_id" → submitted
  const submittedSet = new Set(
    (predictions ?? []).map((p) => `${p.match_id}:${p.user_id}`)
  )

  // Sort members: self first, then by name
  const sortedMembers = [...(members ?? [])].sort((a, b) => {
    if (a.user_id === user.id) return -1
    if (b.user_id === user.id) return 1
    const na = (a.profiles as { display_name?: string; username?: string } | null)?.display_name ||
               (a.profiles as { display_name?: string; username?: string } | null)?.username || ""
    const nb = (b.profiles as { display_name?: string; username?: string } | null)?.display_name ||
               (b.profiles as { display_name?: string; username?: string } | null)?.username || ""
    return na.localeCompare(nb)
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Bu Hafta Durumu</h1>
        <p className="text-xs text-muted-foreground">{league.name} · Hafta {currentWeek}</p>
      </div>

      {/* Summary card */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="divide-y">
            {sortedMembers.map((member) => {
              const profile = member.profiles as { username: string; display_name: string | null } | null
              const name = profile?.display_name || profile?.username || "?"
              const isMe = member.user_id === user.id
              const completedCount = (matches ?? []).filter((m) =>
                submittedSet.has(`${m.id}:${member.user_id}`)
              ).length
              const total = matches?.length ?? 0
              const allDone = completedCount === total && total > 0

              return (
                <div key={member.user_id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-1.5">
                    {allDone
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <span className={`text-sm ${isMe ? "font-semibold" : ""}`}>
                      {isMe ? "★ " : ""}{name}
                    </span>
                  </div>
                  <Badge variant={allDone ? "default" : completedCount > 0 ? "secondary" : "outline"} className="text-xs px-1.5 py-0">
                    {completedCount}/{total}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per match breakdown */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Maç Bazında</p>
        {(matches ?? []).map((match) => {
          const isLocked = new Date(match.match_date) < new Date()
          return (
            <Card key={match.id}>
              <CardContent className="py-2.5 px-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-medium">
                    {match.home_team} <span className="text-muted-foreground font-normal">vs</span> {match.away_team}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{formatMatchDate(match.match_date)}</span>
                    {isLocked && <Badge variant="outline" className="text-[10px] px-1 py-0">Kilitli</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {sortedMembers.map((member) => {
                    const profile = member.profiles as { username: string; display_name: string | null } | null
                    const name = profile?.display_name || profile?.username || "?"
                    const submitted = submittedSet.has(`${match.id}:${member.user_id}`)
                    const isMe = member.user_id === user.id
                    return (
                      <span
                        key={member.user_id}
                        className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${
                          submitted
                            ? "bg-green-500/15 text-green-700 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        } ${isMe ? "font-semibold" : ""}`}
                      >
                        {submitted ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                        {name}
                      </span>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
