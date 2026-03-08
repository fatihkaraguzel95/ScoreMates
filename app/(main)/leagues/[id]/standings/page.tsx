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

  const { data: membership } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", params.id)
    .eq("user_id", user.id)
    .single()
  if (!membership) notFound()

  // Fetch all finished matches (global, not per league)
  const { data: finishedMatches } = await supabase
    .from("matches")
    .select("id, week_number")
    .eq("status", "finished")

  const finishedMatchIds = (finishedMatches ?? []).map(m => m.id)
  const weekByMatchId: Record<string, number> = Object.fromEntries(
    (finishedMatches ?? []).map(m => [m.id, m.week_number])
  )
  const availableWeeks = Array.from(new Set((finishedMatches ?? []).map(m => m.week_number))).sort((a, b) => b - a)

  // Fetch all predictions for this league's finished matches
  const { data: preds } = await supabase
    .from("predictions")
    .select("user_id, match_id, points_earned, profiles(username, display_name)")
    .eq("league_id", params.id)
    .in("match_id", finishedMatchIds.length > 0 ? finishedMatchIds : ["00000000-0000-0000-0000-000000000000"])
    .not("points_earned", "is", null)

  // Fetch special bonuses for this league
  const { data: specialBonuses } = await supabase
    .from("special_bonuses")
    .select("user_id, week_number, points, profiles(username, display_name)")
    .eq("league_id", params.id)

  // Build overall standings
  const totalsMap: Record<string, { points: number; predictions_made: number; username: string; display_name: string | null }> = {}
  for (const p of preds ?? []) {
    const profile = (p.profiles as unknown) as { username?: string; display_name?: string } | null
    if (!totalsMap[p.user_id]) {
      totalsMap[p.user_id] = {
        points: 0,
        predictions_made: 0,
        username: profile?.username ?? "?",
        display_name: profile?.display_name ?? null,
      }
    }
    totalsMap[p.user_id].points += p.points_earned ?? 0
    totalsMap[p.user_id].predictions_made += 1
  }
  // Add special bonuses to overall
  for (const b of specialBonuses ?? []) {
    const profile = (b.profiles as unknown) as { username?: string; display_name?: string } | null
    if (!totalsMap[b.user_id]) {
      totalsMap[b.user_id] = { points: 0, predictions_made: 0, username: profile?.username ?? "?", display_name: profile?.display_name ?? null }
    }
    totalsMap[b.user_id].points += b.points ?? 0
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

  const selectedWeek = searchParams.week ? parseInt(searchParams.week) : availableWeeks[0]

  // Weekly standings from predictions
  const weeklyMap: Record<string, { points: number; predictions_made: number; username: string; display_name: string | null }> = {}
  for (const p of preds ?? []) {
    const matchWeek = weekByMatchId[p.match_id]
    if (matchWeek !== selectedWeek) continue
    const profile = (p.profiles as unknown) as { username?: string; display_name?: string } | null
    if (!weeklyMap[p.user_id]) {
      weeklyMap[p.user_id] = {
        points: 0,
        predictions_made: 0,
        username: profile?.username ?? "?",
        display_name: profile?.display_name ?? null,
      }
    }
    weeklyMap[p.user_id].points += p.points_earned ?? 0
    weeklyMap[p.user_id].predictions_made += 1
  }
  // Add special bonuses for selected week
  for (const b of specialBonuses ?? []) {
    if (b.week_number !== selectedWeek) continue
    const profile = (b.profiles as unknown) as { username?: string; display_name?: string } | null
    if (!weeklyMap[b.user_id]) {
      weeklyMap[b.user_id] = { points: 0, predictions_made: 0, username: profile?.username ?? "?", display_name: profile?.display_name ?? null }
    }
    weeklyMap[b.user_id].points += b.points ?? 0
  }

  const weeklyRows: StandingRow[] = Object.entries(weeklyMap)
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
              {overallRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz puanlı tahmin yok. Biten maç sonuçları hesaplandıktan sonra puan durumu burada görünür.</p>
              ) : (
                <StandingsTable rows={overallRows} currentUserId={user.id} />
              )}
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
                <CardTitle>Hafta {selectedWeek ?? "—"} Sıralaması</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Bu haftaya ait puanlı tahmin yok.</p>
                ) : (
                  <StandingsTable rows={weeklyRows} currentUserId={user.id} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
