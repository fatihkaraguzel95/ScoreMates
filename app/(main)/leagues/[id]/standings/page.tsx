import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { StandingsTable } from "@/components/standings-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { StandingRow } from "@/types"

interface Props {
  params: { id: string }
  searchParams: { week?: string }
}

export default async function StandingsPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, season_year")
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

  // Fetch all weekly_points for this league
  const { data: weeklyPoints } = await supabase
    .from("weekly_points")
    .select("user_id, week_number, points, predictions_made, profiles(username, display_name)")
    .eq("league_id", params.id)
    .eq("season_year", league.season_year)

  // Build overall standings
  const totalsMap: Record<string, { points: number; predictions_made: number; username: string; display_name: string | null }> = {}
  for (const row of weeklyPoints ?? []) {
    const profile = row.profiles as { username?: string; display_name?: string } | null
    if (!totalsMap[row.user_id]) {
      totalsMap[row.user_id] = {
        points: 0,
        predictions_made: 0,
        username: profile?.username ?? "?",
        display_name: profile?.display_name ?? null,
      }
    }
    totalsMap[row.user_id].points += row.points ?? 0
    totalsMap[row.user_id].predictions_made += row.predictions_made ?? 0
  }

  const overallRows: StandingRow[] = Object.entries(totalsMap)
    .map(([userId, data]) => ({
      user_id: userId,
      username: data.username,
      display_name: data.display_name,
      total_points: data.points,
      predictions_made: data.predictions_made,
      rank: 0,
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  // Available weeks
  const availableWeeks = Array.from(new Set((weeklyPoints ?? []).map((r) => r.week_number))).sort((a, b) => b - a)
  const selectedWeek = searchParams.week ? parseInt(searchParams.week) : availableWeeks[0]

  // Weekly standings
  const weeklyRows: StandingRow[] = (weeklyPoints ?? [])
    .filter((r) => r.week_number === selectedWeek)
    .map((r) => {
      const profile = r.profiles as { username?: string; display_name?: string } | null
      return {
        user_id: r.user_id,
        username: profile?.username ?? "?",
        display_name: profile?.display_name ?? null,
        total_points: r.points ?? 0,
        predictions_made: r.predictions_made ?? 0,
        rank: 0,
      }
    })
    .sort((a, b) => b.total_points - a.total_points)
    .map((row, i) => ({ ...row, rank: i + 1 }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Puan Durumu</h1>
        <p className="text-sm text-muted-foreground">{league.name}</p>
      </div>

      <Tabs defaultValue="overall">
        <TabsList>
          <TabsTrigger value="overall">Genel</TabsTrigger>
          <TabsTrigger value="weekly">Haftalık</TabsTrigger>
        </TabsList>

        <TabsContent value="overall">
          <Card>
            <CardHeader>
              <CardTitle>Genel Sıralama</CardTitle>
            </CardHeader>
            <CardContent>
              <StandingsTable rows={overallRows} currentUserId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <div className="space-y-4">
            {availableWeeks.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {availableWeeks.map((w) => (
                  <Button
                    key={w}
                    size="sm"
                    variant={w === selectedWeek ? "default" : "outline"}
                    asChild
                  >
                    <Link href={`/leagues/${params.id}/standings?week=${w}`}>Hafta {w}</Link>
                  </Button>
                ))}
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Hafta {selectedWeek} Sıralaması</CardTitle>
              </CardHeader>
              <CardContent>
                <StandingsTable rows={weeklyRows} currentUserId={user.id} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
