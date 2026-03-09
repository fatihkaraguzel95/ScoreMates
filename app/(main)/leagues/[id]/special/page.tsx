import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"
import { LeagueSuggestionPanel } from "@/components/league-suggestion-panel"
import { SpecialPredictionsForm } from "@/components/special-predictions-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { SpecialQuestion, SpecialPrediction } from "@/types"

interface Props {
  params: { id: string }
}

export default async function SpecialPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from("league_members").select("id").eq("league_id", params.id).eq("user_id", user.id).single()
  if (!membership) notFound()

  const { data: league } = await supabase
    .from("leagues").select("name").eq("id", params.id).single()
  if (!league) notFound()

  const adminSupabase = createAdminClient()

  // Active questions (no correct_answer yet = open for prediction)
  const { data: activeQuestions } = await adminSupabase
    .from("special_questions")
    .select("*")
    .eq("league_id", params.id)
    .is("correct_answer", null)
    .order("created_at", { ascending: true })

  // Resolved questions (has correct_answer)
  const { data: resolvedQuestions } = await adminSupabase
    .from("special_questions")
    .select("*")
    .eq("league_id", params.id)
    .not("correct_answer", "is", null)
    .order("created_at", { ascending: false })
    .limit(10)

  const allQuestions = [...(activeQuestions ?? []), ...(resolvedQuestions ?? [])]
  const allIds = allQuestions.map(q => q.id)

  // User's predictions
  const { data: myPredictions } = await adminSupabase
    .from("special_predictions")
    .select("*")
    .eq("user_id", user.id)
    .in("question_id", allIds.length > 0 ? allIds : ["00000000-0000-0000-0000-000000000000"])

  const myPredByQuestion: Record<string, SpecialPrediction> = Object.fromEntries(
    (myPredictions ?? []).map(p => [p.question_id, p])
  )

  // All predictions for resolved questions (leaderboard)
  let allPredictions: (SpecialPrediction & { profiles: { username: string; display_name: string | null } | null })[] = []
  const resolvedIds = (resolvedQuestions ?? []).map(q => q.id)
  if (resolvedIds.length > 0) {
    const { data } = await adminSupabase
      .from("special_predictions")
      .select("*, profiles(username, display_name)")
      .in("question_id", resolvedIds)
    allPredictions = (data ?? []) as typeof allPredictions
  }

  // User bonuses
  const { data: bonuses } = await adminSupabase
    .from("special_bonuses")
    .select("week_number, points")
    .eq("league_id", params.id)
    .eq("user_id", user.id)

  const bonusByWeek: Record<number, number> = Object.fromEntries(
    (bonuses ?? []).map(b => [b.week_number, b.points])
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Özel Tahminler</h1>
        <p className="text-sm text-muted-foreground">{league.name}</p>
      </div>

      {/* Suggestion & voting panel */}
      <LeagueSuggestionPanel leagueId={params.id} userId={user.id} />

      {/* Active questions — open for prediction */}
      {(activeQuestions ?? []).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-base">Tahmin Gir</h2>
          <p className="text-xs text-muted-foreground -mt-1">
            Aşağıdaki sorular tüm üyeler tarafından onaylandı. En yakın tahmini yapan ekstra puan kazanır!
          </p>
          {(activeQuestions as SpecialQuestion[]).map((q, idx) => (
            <Card key={q.id}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <CardTitle className="text-sm font-medium leading-snug">{q.question_text}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <SpecialPredictionsForm
                  questionId={q.id}
                  initialValue={myPredByQuestion[q.id]?.predicted_value ?? null}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved questions — leaderboard */}
      {(resolvedQuestions ?? []).length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-base">Sonuçlananlar</h2>
          {(resolvedQuestions as SpecialQuestion[]).map((q, idx) => {
            const qPreds = allPredictions
              .filter(p => p.question_id === q.id)
              .map(p => ({ ...p, dist: Math.abs(p.predicted_value - q.correct_answer!) }))
              .sort((a, b) => a.dist - b.dist)

            const weekBonus = bonusByWeek[q.week_number]

            return (
              <Card key={q.id}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <CardTitle className="text-sm font-medium leading-snug">{q.question_text}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-xs">Cevap: {q.correct_answer}</Badge>
                      {weekBonus && <Badge className="text-xs">🏆 +{weekBonus} pt</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {qPreds.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Tahmin girilmedi.</p>
                  ) : (
                    <div className="space-y-1">
                      {qPreds.map((p, i) => {
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
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {(activeQuestions ?? []).length === 0 && (resolvedQuestions ?? []).length === 0 && (
        <div className="px-4 py-6 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
          Henüz aktif soru yok. Yukarıdan bir soru öner — tüm üyeler onaylarsa tahminler açılır!
        </div>
      )}
    </div>
  )
}
