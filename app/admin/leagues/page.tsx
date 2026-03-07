import { createAdminClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function AdminLeaguesPage() {
  const supabase = createAdminClient()

  const { data: leagues } = await supabase
    .from("leagues")
    .select("*, profiles(username), league_members(count)")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ligler</h1>
        <p className="text-muted-foreground mt-1">Sistemdeki tüm ligler</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tüm Ligler ({leagues?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lig Adı</TableHead>
                <TableHead>Davet Kodu</TableHead>
                <TableHead>Kurucu</TableHead>
                <TableHead>Sezon</TableHead>
                <TableHead>Üye</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leagues?.map((l) => {
                const memberCount = (l.league_members as { count: number }[] | null)?.[0]?.count ?? 0
                const profile = l.profiles as { username?: string } | null
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="font-mono text-sm">{l.invite_code}</TableCell>
                    <TableCell className="text-muted-foreground">{profile?.username ?? "-"}</TableCell>
                    <TableCell>{l.season_year}</TableCell>
                    <TableCell>{memberCount}</TableCell>
                    <TableCell>
                      <Badge variant={l.is_active ? "default" : "secondary"}>
                        {l.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
