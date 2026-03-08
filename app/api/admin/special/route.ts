import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/supabase/server"
import type { ScoringSettings } from "@/types"

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
  if (!profile?.is_admin) return null
  return user
}

// GET: fetch questions for a league+week
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get("league_id")
  const week = searchParams.get("week")

  if (!leagueId || !week) return NextResponse.json({ error: "league_id ve week gerekli" }, { status: 400 })

  const adminSupabase = createAdminClient()
  const { data: questions } = await adminSupabase
    .from("special_questions")
    .select("*")
    .eq("league_id", leagueId)
    .eq("week_number", parseInt(week))
    .order("sort_order")

  return NextResponse.json({ questions: questions ?? [] })
}

// POST: save questions, save answers, or calculate bonus
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json() as {
    action: "save_questions" | "save_answers" | "calculate_bonus"
    league_id: string
    week_number: number
    questions?: { id?: string; question_text: string; sort_order: number }[]
    answers?: { id: string; correct_answer: number | null }[]
  }

  const { action, league_id, week_number } = body
  if (!league_id || !week_number) return NextResponse.json({ error: "league_id ve week_number gerekli" }, { status: 400 })

  const adminSupabase = createAdminClient()

  if (action === "save_questions") {
    const questions = body.questions ?? []

    // Delete existing questions for this week (and recreate)
    await adminSupabase
      .from("special_questions")
      .delete()
      .eq("league_id", league_id)
      .eq("week_number", week_number)

    if (questions.length > 0) {
      const rows = questions
        .filter(q => q.question_text.trim())
        .map((q, i) => ({
          league_id,
          week_number,
          question_text: q.question_text.trim(),
          sort_order: i,
          correct_answer: null,
        }))

      const { error } = await adminSupabase.from("special_questions").insert(rows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === "save_answers") {
    const answers = body.answers ?? []
    for (const a of answers) {
      await adminSupabase
        .from("special_questions")
        .update({ correct_answer: a.correct_answer })
        .eq("id", a.id)
    }
    return NextResponse.json({ success: true })
  }

  if (action === "calculate_bonus") {
    // Get scoring settings
    const { data: settingsRow } = await adminSupabase
      .from("settings").select("value").eq("key", "scoring").single()
    const scoring = (settingsRow?.value ?? { special_bonus: 5 }) as ScoringSettings
    const bonusPoints = scoring.special_bonus ?? 5

    // Get all questions for this week with correct answers
    const { data: questions } = await adminSupabase
      .from("special_questions")
      .select("id, correct_answer")
      .eq("league_id", league_id)
      .eq("week_number", week_number)
      .not("correct_answer", "is", null)

    if (!questions?.length) {
      return NextResponse.json({ error: "Önce doğru cevapları girin." }, { status: 400 })
    }

    const questionIds = questions.map(q => q.id)
    const correctByQ: Record<string, number> = Object.fromEntries(
      questions.map(q => [q.id, q.correct_answer!])
    )

    // Get all predictions for these questions
    const { data: predictions } = await adminSupabase
      .from("special_predictions")
      .select("user_id, question_id, predicted_value")
      .in("question_id", questionIds)

    // Group by user and calculate total distance
    const distanceByUser: Record<string, { totalDist: number; count: number }> = {}
    for (const p of predictions ?? []) {
      const correct = correctByQ[p.question_id]
      if (correct === undefined) continue
      const dist = Math.abs(p.predicted_value - correct)
      if (!distanceByUser[p.user_id]) distanceByUser[p.user_id] = { totalDist: 0, count: 0 }
      distanceByUser[p.user_id].totalDist += dist
      distanceByUser[p.user_id].count += 1
    }

    // Only consider users who answered all questions
    const totalQuestions = questions.length
    const eligible = Object.entries(distanceByUser)
      .filter(([, v]) => v.count === totalQuestions)
      .sort((a, b) => a[1].totalDist - b[1].totalDist)

    if (!eligible.length) {
      return NextResponse.json({ error: "Tüm soruları cevaplayan kullanıcı yok." }, { status: 400 })
    }

    const minDist = eligible[0][1].totalDist
    const winners = eligible.filter(([, v]) => v.totalDist === minDist).map(([uid]) => uid)

    // Upsert special_bonuses for winners
    const upserts = winners.map(userId => ({
      user_id: userId,
      league_id,
      week_number,
      points: bonusPoints,
    }))

    const { error } = await adminSupabase
      .from("special_bonuses")
      .upsert(upserts, { onConflict: "user_id,league_id,week_number" })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, winners, bonusPoints, minDist })
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 })
}
