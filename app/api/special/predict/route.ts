import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json() as { question_id: string; predicted_value: number }
  const { question_id, predicted_value } = body

  if (!question_id || predicted_value === undefined) {
    return NextResponse.json({ error: "Eksik veri" }, { status: 400 })
  }

  // Check question exists and is not yet answered (correct_answer is null = still open)
  const { data: question } = await supabase
    .from("special_questions")
    .select("id, correct_answer")
    .eq("id", question_id)
    .single()

  if (!question) return NextResponse.json({ error: "Soru bulunamadı" }, { status: 404 })
  if (question.correct_answer !== null) {
    return NextResponse.json({ error: "Bu soru kapatılmış, tahmin girilemiyor." }, { status: 400 })
  }

  const { error } = await supabase
    .from("special_predictions")
    .upsert(
      { question_id, user_id: user.id, predicted_value, updated_at: new Date().toISOString() },
      { onConflict: "question_id,user_id" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
