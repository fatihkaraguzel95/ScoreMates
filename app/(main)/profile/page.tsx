import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "@/components/profile-form"
import { PasswordForm } from "@/components/password-form"
import { SuggestionsSection } from "@/components/suggestions-section"

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/login")

  // Fetch leagues the user is a member of
  const { data: memberRows } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name)")
    .eq("user_id", user.id)

  const leagues = (memberRows ?? [])
    .map(r => (r.leagues as unknown) as { id: string; name: string } | null)
    .filter(Boolean) as { id: string; name: string }[]

  // Fetch user's existing suggestions
  const { data: suggestions } = await supabase
    .from("question_suggestions")
    .select("id, league_id, question_text, status, admin_note")
    .eq("user_id", user.id)

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Profilim</h1>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
      </div>

      <ProfileForm profile={profile} />
      <SuggestionsSection leagues={leagues} suggestions={suggestions ?? []} />
      <PasswordForm email={user.email ?? ""} />
    </div>
  )
}
