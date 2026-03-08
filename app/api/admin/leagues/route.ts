import { NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const adminSupabase = createAdminClient()
  const { data: leagues } = await adminSupabase
    .from("leagues")
    .select("id, name, season_year, is_active")
    .order("created_at", { ascending: false })

  return NextResponse.json({ leagues: leagues ?? [] })
}
