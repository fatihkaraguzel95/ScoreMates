import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Trophy, Target } from "lucide-react"
import { formatMatchDate } from "@/lib/utils"

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch user's leagues
  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, joined_at, leagues(id, name, invite_code, season_year, is_active)")
    .eq("user_id", user.id)

  type LeagueRow = { id: string; name: string; invite_code: string; season_year: number; is_active: boolean }
  const leagues = (memberships?.map((m) => m.leagues).filter(Boolean) ?? []) as unknown as LeagueRow[]

  // Find current week: earliest week that has at least one future match
  const now = new Date().toISOString()
  const { data: weekRows } = await supabase
    .from("matches")
    .select("week_number, match_date")
    .gt("match_date", now)
    .order("match_date", { ascending: true })
    .limit(1)

  const currentWeek = weekRows?.[0]?.week_number ?? null

  // Fetch only current week's unplayed (scheduled) matches
  const { data: upcomingMatches } = currentWeek
    ? await supabase
        .from("matches")
        .select("*")
        .eq("week_number", currentWeek)
        .eq("status", "scheduled")
        .order("match_date", { ascending: true })
    : { data: [] }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Liglerini ve bu haftaki durumu gör</p>
        </div>
        <Button asChild>
          <Link href="/leagues">
            <Plus className="h-4 w-4 mr-2" />
            Lig Oluştur / Katıl
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Trophy className="h-5 w-5" />} label="Ligim" value={leagues.length} />
        <StatCard icon={<Target className="h-5 w-5" />} label="Yaklaşan Maç" value={upcomingMatches?.length ?? 0} />
      </div>

      {/* My Leagues */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Liglerim
        </h2>
        {leagues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Henüz bir ligde değilsin.</p>
              <Button asChild>
                <Link href="/leagues">Lig Oluştur veya Katıl</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leagues.map((league) => (
              <Card key={league.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{league.name}</CardTitle>
                    <Badge variant={league.is_active ? "default" : "secondary"}>
                      {league.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Davet Kodu: <span className="font-mono font-bold">{league.invite_code}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button size="sm" asChild>
                    <Link href={`/leagues/${league.id}`}>Lige Git</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Matches */}
      {upcomingMatches && upcomingMatches.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Hafta {currentWeek} Maçları
          </h2>
          <div className="space-y-2">
            {upcomingMatches.map((match) => (
              <Card key={match.id}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">{formatMatchDate(match.match_date)}</span>
                    <span className="font-medium">{match.home_team}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-medium">{match.away_team}</span>
                  </div>
                  <Badge variant="outline">Hafta {match.week_number}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="text-primary">{icon}</div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
