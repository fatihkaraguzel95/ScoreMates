import { createAdminClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Trophy, Calendar, Target } from "lucide-react"

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()

  const [
    { count: userCount },
    { count: leagueCount },
    { count: matchCount },
    { count: predictionCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("leagues").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("*", { count: "exact", head: true }),
    supabase.from("predictions").select("*", { count: "exact", head: true }),
  ])

  const stats = [
    { label: "Kullanıcılar", value: userCount ?? 0, icon: <Users className="h-6 w-6" /> },
    { label: "Ligler", value: leagueCount ?? 0, icon: <Trophy className="h-6 w-6" /> },
    { label: "Maçlar", value: matchCount ?? 0, icon: <Calendar className="h-6 w-6" /> },
    { label: "Tahminler", value: predictionCount ?? 0, icon: <Target className="h-6 w-6" /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Sistem genel durumu</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className="text-primary">{s.icon}</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
