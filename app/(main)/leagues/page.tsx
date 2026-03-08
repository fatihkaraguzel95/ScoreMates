import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Hash, Trophy } from "lucide-react"
import { CreateLeagueForm } from "@/components/create-league-form"
import { JoinLeagueForm } from "@/components/join-league-form"
import { CopyCodeButton } from "@/components/copy-code-button"

export default async function LeaguesPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: memberships } = await supabase
    .from("league_members")
    .select("joined_at, leagues(id, name, invite_code, season_year, is_active)")
    .eq("user_id", user.id)

  type LeagueRow = {
    id: string
    name: string
    invite_code: string
    season_year: number
    is_active: boolean
  }
  const leagues = (memberships?.map((m) => m.leagues).filter(Boolean) ?? []) as unknown as LeagueRow[]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Ligler</h1>
        <p className="text-muted-foreground mt-1">Liglerini gör, yeni lig oluştur veya katıl</p>
      </div>

      {/* My leagues */}
      {leagues.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Ligilerim</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {leagues.map((league) => (
              <Card key={league.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 px-4 flex items-center gap-3">
                  <Link href={`/leagues/${league.id}`} className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{league.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {league.invite_code}
                    </p>
                  </Link>
                  <Badge variant={league.is_active ? "default" : "secondary"} className="shrink-0">
                    {league.is_active ? "Aktif" : "Pasif"}
                  </Badge>
                  <CopyCodeButton code={league.invite_code} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {leagues.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Henüz bir ligde değilsin.</p>
          </CardContent>
        </Card>
      )}

      {/* Create + Join */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Lig Oluştur
            </CardTitle>
            <CardDescription>Kendi ligini oluştur ve arkadaşlarını davet et</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateLeagueForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="h-4 w-4" />
              Lige Katıl
            </CardTitle>
            <CardDescription>Davet koduyla bir ligde yer al</CardDescription>
          </CardHeader>
          <CardContent>
            <JoinLeagueForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
