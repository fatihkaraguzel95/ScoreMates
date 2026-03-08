import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"

async function requireCreator(leagueId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const adminSupabase = createAdminClient()
  const { data: league } = await adminSupabase
    .from("leagues")
    .select("created_by")
    .eq("id", leagueId)
    .single()

  if (!league || league.created_by !== user.id) return null
  return user
}

// PATCH: league creator approves or rejects a suggestion
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireCreator(params.id)
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json() as {
    id: string
    action: "approve" | "reject"
    admin_note?: string
  }
  const { id, action, admin_note } = body
  if (!id || !action) return NextResponse.json({ error: "Eksik veri" }, { status: 400 })

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from("question_suggestions")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      admin_note: admin_note?.trim() || null,
    })
    .eq("id", id)
    .eq("league_id", params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
