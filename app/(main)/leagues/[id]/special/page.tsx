import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SpecialPredictionsForm } from "@/components/special-predictions-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { SpecialQuestion, SpecialPrediction } from "@/types"

interface Props {
  params: { id: string }
  searchParams: { week?: string }
}

export default async function SpecialPage({ params, searchParams }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("league_members").select("id").eq("league_id", params.id).eq("user_id", user.id).single()
  if (!membership) notFound()

  const { data: league } = await supabase
    .from("leagues").select("name").eq("id", params.id).single()
  if (!league) notFound()

  // Get available weeks (weeks that have special questions)
  const { data: weekRows } = await supabase
    .from("special_questions")
    .select("week_number")
    .eq("league_id", params.id)
    .order("week_number", { ascending: false })

  const availableWeeks = Array.from(new Set((weekRows ?? []).map(r => r.week_number))).sort((a, b) => b - a)

  if (availableWeeks.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Özel Tahminler</h1>
          <p className="text-sm text-muted-foreground">{league.name}</p>
        </div>
        <p className="text-muted-foreground text-sm">
          Henüz bu haftaya ait özel tahmin sorusu eklenmemiş. Admin tarafından eklendikten sonra burada görünecek.
        </p>
      </div>
    )
  }

  const selectedWeek = searchParams.week ? parseInt(searchParams.week) : availableWeeks[0]

  // Fetch questions for selected week
  const { data: questions } = await supabase
    .from("special_questions")
    .select("*")
    .eq("league_id", params.id)
    .eq("week_number", selectedWeek)
    .order("sort_order")

  // Fetch user's own predictions
  const questionIds = (questions ?? []).map(q => q.id)
  const { data: myPredictions } = await supabase
    .from("special_predictions")
    .select("*")
    .eq("user_id", user.id)
    .in("question_id", questionIds.length > 0 ? questionIds : ["00000000-0000-0000-0000-000000000000"])

  // Fetch all predictions for this week (show when answered)
  const isResolved = (questions ?? []).every(q => q.correct_answer !== null)
  let allPredictions: (SpecialPrediction & { profiles: { username: string; display_name: string | null } | null })[] = []

  if (isResolved && questions?.length) {
    const { data } = await supabase
      .from("special_predictions")
      .select("*, profiles(username, display_name)")
      .in("question_id", questionIds)
    allPredictions = (data ?? []) as typeof allPredictions
  }

  // Check if user won bonus this week
  const { data: bonus } = await supabase
    .from("special_bonuses")
    .select("points")
    .eq("league_id", params.id)
    .eq("week_number", selectedWeek)
    .eq("user_id", user.id)
    .single()

  const myPredByQuestion: Record<string, SpecialPrediction> = Object.fromEntries(
    (myPredictions ?? []).map(p => [p.question_id, p])
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Özel Tahminler</h1>
        <p className="text-sm text-muted-foreground">{league.name}</p>
      </div>

      {/* Week selector */}
      {availableWeeks.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {availableWeeks.map(w => (
            <Button key={w} size="sm" variant={selectedWeek === w ? "default" : "outline"} asChild className="h-7 text-xs px-2">
              <Link href={`/leagues/${params.id}/special?week=${w}`}>Hafta {w}</Link>
            </Button>
          ))}
        </div>
      )}

      {/* Status banner */}
      {isResolved ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted">
          <span className="text-sm text-muted-foreground">Bu hafta sonuçlandı.</span>
          {bonus && (
            <Badge variant="default" className="ml-auto">🏆 +{bonus.points} puan kazandın!</Badge>
          )}
        </div>
      ) : (
        <div className="px-4 py-3 rounded-lg border border-dashed text-sm text-muted-foreground">
          Tahminlerini gir — en yakın tahmin yapan <span className="font-semibold text-foreground">ekstra puan</span> kazanır!
        </div>
      )}

      {/* Questions */}
      <div className="space-y-3">
        {(questions ?? []).map((q: SpecialQuestion, idx: number) => {
          const myPred = myPredByQuestion[q.id]
          const resolved = q.correct_answer !== null

          // Build leaderboard for resolved questions
          const qPreds = allPredictions
            .filter(p => p.question_id === q.id)
            .map(p => ({
              ...p,
              dist: Math.abs(p.predicted_value - q.correct_answer!),
            }))
            .sort((a, b) => a.dist - b.dist)

          return (
            <Card key={q.id}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <CardTitle className="text-sm font-medium leading-snug">{q.question_text}</CardTitle>
                  {resolved && (
                    <Badge variant="secondary" className="ml-auto shrink-0 text-xs">
                      Cevap: {q.correct_answer}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {resolved ? (
                  /* Show all predictions ranked */
                  <div className="space-y-1">
                    {qPreds.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Tahmin girilmedi.</p>
                    ) : (
                      qPreds.map((p, i) => {
                        const name = p.profiles?.display_name || p.profiles?.username || "?"
                        const isMe = p.user_id === user.id
                        return (
                          <div key={p.user_id} className={`flex items-center justify-between text-xs py-1 ${isMe ? "font-semibold text-primary" : ""}`}>
                            <span>{isMe && "★ "}{name}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{p.predicted_value}</span>
                              <Badge variant={i === 0 ? "default" : "outline"} className="text-[10px] px-1.5 py-0">
                                {p.dist === 0 ? "Tam 🎯" : `±${p.dist}`}
                              </Badge>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                ) : (
                  /* Show input */
                  <SpecialPredictionsForm
                    questionId={q.id}
                    initialValue={myPred?.predicted_value ?? null}
                  />
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
