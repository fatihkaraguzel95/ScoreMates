import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"

// GET: all suggestions for this league with vote counts
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const adminSupabase = createAdminClient()

  // Check membership
  const { data: member } = await adminSupabase
    .from("league_members")
    .select("id")
    .eq("league_id", params.id)
    .eq("user_id", user.id)
    .single()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Member count
  const { count: memberCount } = await adminSupabase
    .from("league_members")
    .select("id", { count: "exact", head: true })
    .eq("league_id", params.id)

  // All suggestions with profile
  const { data: suggestions } = await adminSupabase
    .from("question_suggestions")
    .select("id, user_id, question_text, status, created_at, profiles(username, display_name)")
    .eq("league_id", params.id)
    .order("created_at", { ascending: true })

  if (!suggestions || suggestions.length === 0) {
    return NextResponse.json({ suggestions: [], memberCount: memberCount ?? 0 })
  }

  // Votes for these suggestions
  const { data: votes } = await adminSupabase
    .from("suggestion_votes")
    .select("suggestion_id, user_id")
    .in("suggestion_id", suggestions.map(s => s.id))

  const voteMap: Record<string, string[]> = {}
  for (const v of votes ?? []) {
    if (!voteMap[v.suggestion_id]) voteMap[v.suggestion_id] = []
    voteMap[v.suggestion_id].push(v.user_id)
  }

  const result = suggestions.map(s => ({
    id: s.id,
    user_id: s.user_id,
    question_text: s.question_text,
    status: s.status,
    created_at: s.created_at,
    profiles: s.profiles,
    vote_count: voteMap[s.id]?.length ?? 0,
    my_vote: voteMap[s.id]?.includes(user.id) ?? false,
  }))

  return NextResponse.json({ suggestions: result, memberCount: memberCount ?? 0 })
}

// POST: create or update own suggestion
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const adminSupabase = createAdminClient()

  // Check membership
  const { data: member } = await adminSupabase
    .from("league_members")
    .select("id")
    .eq("league_id", params.id)
    .eq("user_id", user.id)
    .single()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json() as { question_text: string }
  if (!body.question_text?.trim()) {
    return NextResponse.json({ error: "Soru metni boş olamaz" }, { status: 400 })
  }

  // Block if already active
  const { data: existing } = await adminSupabase
    .from("question_suggestions")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("league_id", params.id)
    .single()

  if (existing?.status === "active") {
    return NextResponse.json({ error: "Onaylanmış öneriniz değiştirilemez" }, { status: 400 })
  }

  // Upsert suggestion
  const { data: suggestion, error } = await adminSupabase
    .from("question_suggestions")
    .upsert(
      {
        user_id: user.id,
        league_id: params.id,
        question_text: body.question_text.trim(),
        status: "pending",
        admin_note: null,
        reviewed_at: null,
      },
      { onConflict: "user_id,league_id" }
    )
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-vote for yourself (upsert in case it already exists)
  if (suggestion) {
    await adminSupabase
      .from("suggestion_votes")
      .upsert({ suggestion_id: suggestion.id, user_id: user.id }, { onConflict: "suggestion_id,user_id" })
  }

  return NextResponse.json({ success: true })
}
