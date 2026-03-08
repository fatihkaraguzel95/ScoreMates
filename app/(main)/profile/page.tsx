import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "@/components/profile-form"
import { PasswordForm } from "@/components/password-form"

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

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Profilim</h1>
        <p className="text-sm text-muted-foreground">@{profile.username}</p>
      </div>

      <ProfileForm profile={profile} />
      <PasswordForm email={user.email ?? ""} />
    </div>
  )
}
