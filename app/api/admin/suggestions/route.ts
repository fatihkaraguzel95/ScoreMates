import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  return profile?.is_admin ? user : null
}

// GET: fetch all suggestions (optionally filter by status / league)
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") // pending | approved | rejected | all
  const leagueId = searchParams.get("league_id")

  const adminSupabase = createAdminClient()
  let query = adminSupabase
    .from("question_suggestions")
    .select("*, profiles(username, display_name), leagues(name)")
    .order("created_at", { ascending: false })

  if (status && status !== "all") query = query.eq("status", status)
  if (leagueId) query = query.eq("league_id", leagueId)

  const { data } = await query
  return NextResponse.json({ suggestions: data ?? [] })
}

// PATCH: approve or reject a suggestion (with optional edit)
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json() as {
    id: string
    action: "approve" | "reject"
    question_text?: string
    admin_note?: string
  }

  const { id, action, question_text, admin_note } = body
  if (!id || !action) return NextResponse.json({ error: "Eksik veri" }, { status: 400 })

  const adminSupabase = createAdminClient()

  const updates: Record<string, unknown> = {
    status: action === "approve" ? "approved" : "rejected",
    reviewed_at: new Date().toISOString(),
    admin_note: admin_note?.trim() || null,
  }
  if (question_text?.trim()) updates.question_text = question_text.trim()

  const { error } = await adminSupabase
    .from("question_suggestions")
    .update(updates)
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
