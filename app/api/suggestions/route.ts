import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as { league_id: string; question_text: string }
  const { league_id, question_text } = body

  if (!league_id || !question_text?.trim()) {
    return NextResponse.json({ error: "Eksik veri" }, { status: 400 })
  }

  // Check membership
  const { data: member } = await supabase
    .from("league_members")
    .select("id")
    .eq("league_id", league_id)
    .eq("user_id", user.id)
    .single()
  if (!member) return NextResponse.json({ error: "Bu ligi üyesi değilsiniz" }, { status: 403 })

  // Check if existing suggestion is approved (locked)
  const { data: existing } = await supabase
    .from("question_suggestions")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("league_id", league_id)
    .single()

  if (existing?.status === "approved") {
    return NextResponse.json({ error: "Onaylanmış sorunuz değiştirilemez." }, { status: 400 })
  }

  // Upsert (insert or update, status resets to pending)
  const { error } = await supabase
    .from("question_suggestions")
    .upsert(
      {
        user_id: user.id,
        league_id,
        question_text: question_text.trim(),
        status: "pending",
        admin_note: null,
        reviewed_at: null,
      },
      { onConflict: "user_id,league_id" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
