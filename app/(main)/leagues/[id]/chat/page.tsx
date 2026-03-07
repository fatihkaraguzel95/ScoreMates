import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LeagueChat } from "@/components/league-chat"
import type { LeagueMessage } from "@/types"

interface Props {
  params: { id: string }
}

export default async function LeagueChatPage({ params }: Props) {
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

  const { count: memberCount } = await supabase
    .from("league_members")
    .select("*", { count: "exact", head: true })
    .eq("league_id", params.id)

  const { data: chatMessages } = await supabase
    .from("league_messages")
    .select("*, profiles(username, display_name)")
    .eq("league_id", params.id)
    .order("created_at", { ascending: true })
    .limit(100)

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold">Sohbet</h1>
        <p className="text-sm text-muted-foreground">
          {league.name} &middot; {memberCount ?? 0} üye
        </p>
      </div>
      <div className="flex-1 border rounded-xl bg-card overflow-hidden flex flex-col min-h-0">
        <LeagueChat
          leagueId={params.id}
          currentUserId={user.id}
          initialMessages={(chatMessages ?? []) as LeagueMessage[]}
        />
      </div>
    </div>
  )
}
