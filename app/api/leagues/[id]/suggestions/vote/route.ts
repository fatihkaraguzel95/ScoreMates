import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"

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

  const body = await req.json() as { suggestion_id: string }
  if (!body.suggestion_id) return NextResponse.json({ error: "Eksik veri" }, { status: 400 })

  // Verify suggestion belongs to this league and is still pending
  const { data: suggestion } = await adminSupabase
    .from("question_suggestions")
    .select("id, status, question_text")
    .eq("id", body.suggestion_id)
    .eq("league_id", params.id)
    .single()

  if (!suggestion) return NextResponse.json({ error: "Öneri bulunamadı" }, { status: 404 })
  if (suggestion.status === "active") return NextResponse.json({ error: "Bu öneri zaten aktif" }, { status: 400 })

  // Toggle vote
  const { data: existingVote } = await adminSupabase
    .from("suggestion_votes")
    .select("id")
    .eq("suggestion_id", body.suggestion_id)
    .eq("user_id", user.id)
    .single()

  if (existingVote) {
    await adminSupabase.from("suggestion_votes").delete().eq("id", existingVote.id)
    return NextResponse.json({ voted: false, promoted: false })
  }

  // Add vote
  await adminSupabase
    .from("suggestion_votes")
    .insert({ suggestion_id: body.suggestion_id, user_id: user.id })

  // Check if all members have now voted
  const { count: voteCount } = await adminSupabase
    .from("suggestion_votes")
    .select("id", { count: "exact", head: true })
    .eq("suggestion_id", body.suggestion_id)

  const { count: memberCount } = await adminSupabase
    .from("league_members")
    .select("id", { count: "exact", head: true })
    .eq("league_id", params.id)

  if (voteCount && memberCount && voteCount >= memberCount) {
    // All members approved → promote to active
    await adminSupabase
      .from("question_suggestions")
      .update({ status: "active", reviewed_at: new Date().toISOString() })
      .eq("id", body.suggestion_id)

    // Find current/upcoming week
    const { data: nextMatch } = await adminSupabase
      .from("matches")
      .select("week_number")
      .gt("match_date", new Date().toISOString())
      .order("match_date", { ascending: true })
      .limit(1)
      .single()

    const week = nextMatch?.week_number
    if (week) {
      const { count: qCount } = await adminSupabase
        .from("special_questions")
        .select("id", { count: "exact", head: true })
        .eq("league_id", params.id)
        .eq("week_number", week)

      await adminSupabase
        .from("special_questions")
        .insert({
          league_id: params.id,
          week_number: week,
          question_text: suggestion.question_text,
          sort_order: qCount ?? 0,
        })
    }

    return NextResponse.json({ voted: true, promoted: true })
  }

  return NextResponse.json({ voted: true, promoted: false })
}
