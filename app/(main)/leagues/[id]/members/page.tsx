import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Crown } from "lucide-react"

interface Props {
  params: { id: string }
}

export default async function MembersPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, created_by")
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

  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, joined_at, profiles(username, display_name)")
    .eq("league_id", params.id)
    .order("joined_at", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/leagues/${params.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Üyeler</h1>
          <p className="text-sm text-muted-foreground">{league.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{members?.length ?? 0} Üye</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members?.map((m) => {
              const profile = m.profiles as { username?: string; display_name?: string } | null
              const initials = (profile?.display_name || profile?.username || "?")
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)

              return (
                <div key={m.user_id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {profile?.display_name || profile?.username}
                      {m.user_id === league.created_by && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Crown className="h-3 w-3" />
                          Kurucu
                        </Badge>
                      )}
                      {m.user_id === user.id && (
                        <Badge variant="secondary" className="text-xs">Sen</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">@{profile?.username}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
