"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Trophy, CheckCircle2, XCircle, Pencil } from "lucide-react"

interface League { id: string; name: string }
interface Question { id?: string; question_text: string; correct_answer: number | null; sort_order: number }
interface Suggestion {
  id: string
  user_id: string
  league_id: string
  question_text: string
  status: "pending" | "approved" | "rejected"
  admin_note: string | null
  created_at: string
  profiles: { username: string; display_name: string | null } | null
  leagues: { name: string } | null
}

const DEFAULT_QUESTIONS = [
  "Bu hafta toplam kaç gol atılacak?",
  "Kaç maç ev sahibi galibiyetiyle bitecek?",
  "Kaç maç deplasman galibiyetiyle bitecek?",
  "Kaç maç berabere bitecek?",
  "En yüksek gol farkı kaç olacak?",
]

export default function AdminSpecialPage() {
  const { toast } = useToast()
  const [leagues, setLeagues] = useState<League[]>([])
  const [selectedLeague, setSelectedLeague] = useState("")
  const [weekNumber, setWeekNumber] = useState<number | "">("")
  const [questions, setQuestions] = useState<Question[]>(
    DEFAULT_QUESTIONS.map((q, i) => ({ question_text: q, correct_answer: null, sort_order: i }))
  )
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [calcResult, setCalcResult] = useState<{ winners: string[]; bonusPoints: number; minDist: number } | null>(null)

  // Suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [reviewDialog, setReviewDialog] = useState<Suggestion | null>(null)
  const [reviewText, setReviewText] = useState("")
  const [reviewNote, setReviewNote] = useState("")
  const [reviewSaving, setReviewSaving] = useState(false)
  const [suggestionFilter, setSuggestionFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending")

  useEffect(() => {
    fetch("/api/admin/leagues").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.leagues) setLeagues(d.leagues)
    })
    loadSuggestions("pending")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadSuggestions(status: typeof suggestionFilter) {
    setSuggestionFilter(status)
    const res = await fetch(`/api/admin/suggestions?status=${status}`)
    if (res.ok) {
      const d = await res.json()
      setSuggestions(d.suggestions ?? [])
    }
  }

  const loadQuestions = useCallback(async () => {
    if (!selectedLeague || !weekNumber) return
    const res = await fetch(`/api/admin/special?league_id=${selectedLeague}&week=${weekNumber}`)
    if (!res.ok) return
    const data = await res.json()
    if (data.questions?.length > 0) {
      setQuestions(data.questions)
    } else {
      setQuestions(DEFAULT_QUESTIONS.map((q, i) => ({ question_text: q, correct_answer: null, sort_order: i })))
    }
    setLoaded(true)
    setCalcResult(null)
  }, [selectedLeague, weekNumber])

  async function handleSaveQuestions() {
    setSaving(true)
    const res = await fetch("/api/admin/special", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_questions", league_id: selectedLeague, week_number: weekNumber, questions }),
    })
    if (res.ok) {
      toast({ title: "Sorular kaydedildi!" })
      loadQuestions()
    } else {
      const d = await res.json()
      toast({ title: "Hata", description: d.error, variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleSaveAnswers() {
    setSaving(true)
    const answers = questions.filter(q => q.id).map(q => ({ id: q.id!, correct_answer: q.correct_answer }))
    const res = await fetch("/api/admin/special", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_answers", league_id: selectedLeague, week_number: weekNumber, answers }),
    })
    if (res.ok) {
      toast({ title: "Cevaplar kaydedildi!" })
    } else {
      const d = await res.json()
      toast({ title: "Hata", description: d.error, variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleCalculate() {
    setCalculating(true)
    setCalcResult(null)
    const res = await fetch("/api/admin/special", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "calculate_bonus", league_id: selectedLeague, week_number: weekNumber }),
    })
    const d = await res.json()
    if (res.ok) {
      setCalcResult(d)
      toast({ title: `Kazanan${d.winners.length > 1 ? "lar" : ""} belirlendi!`, description: `${d.winners.length} kişi ${d.bonusPoints} puan kazandı.` })
    } else {
      toast({ title: "Hata", description: d.error, variant: "destructive" })
    }
    setCalculating(false)
  }

  function openReview(s: Suggestion) {
    setReviewDialog(s)
    setReviewText(s.question_text)
    setReviewNote("")
  }

  async function handleReview(action: "approve" | "reject") {
    if (!reviewDialog) return
    setReviewSaving(true)
    const res = await fetch("/api/admin/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: reviewDialog.id,
        action,
        question_text: reviewText,
        admin_note: reviewNote,
      }),
    })
    const d = await res.json()
    if (res.ok) {
      toast({ title: action === "approve" ? "Onaylandı!" : "Reddedildi." })
      setReviewDialog(null)
      loadSuggestions(suggestionFilter)
    } else {
      toast({ title: "Hata", description: d.error, variant: "destructive" })
    }
    setReviewSaving(false)
  }

  function useAsQuestion(text: string) {
    // Fill the first empty question slot with this text
    const idx = questions.findIndex(q => !q.question_text.trim())
    const updated = [...questions]
    if (idx >= 0) {
      updated[idx] = { ...updated[idx], question_text: text }
    } else {
      // Replace last one if all are filled
      updated[4] = { ...updated[4], question_text: text }
    }
    setQuestions(updated)
    toast({ title: "Soru slotuна eklendi", description: "Soruları kaydetmeyi unutma." })
  }

  const hasIds = questions.some(q => q.id)
  const pendingCount = suggestions.filter(s => s.status === "pending").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Özel Tahminler</h1>
        <p className="text-muted-foreground mt-1">Haftalık istatistik sorularını yönet ve kullanıcı önerilerini incele.</p>
      </div>

      {/* ── Suggestion Review ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                Soru Önerileri
                {pendingCount > 0 && suggestionFilter === "pending" && (
                  <Badge variant="destructive" className="text-xs">{pendingCount} bekliyor</Badge>
                )}
              </CardTitle>
              <CardDescription>Kullanıcıların önerdiği sorular. Düzenleyip onaylayabilir veya reddedebilirsin.</CardDescription>
            </div>
            <div className="flex gap-1.5">
              {(["pending", "approved", "rejected", "all"] as const).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={suggestionFilter === f ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => loadSuggestions(f)}
                >
                  {f === "pending" ? "Bekleyen" : f === "approved" ? "Onaylı" : f === "rejected" ? "Reddedilen" : "Tümü"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              {suggestionFilter === "pending" ? "Bekleyen öneri yok." : "Öneri bulunamadı."}
            </p>
          ) : (
            <div className="divide-y">
              {suggestions.map(s => {
                const name = s.profiles?.display_name || s.profiles?.username || "?"
                const leagueName = s.leagues?.name || "?"
                return (
                  <div key={s.id} className="py-3 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold">{name}</span>
                        <span className="text-xs text-muted-foreground">→ {leagueName}</span>
                        <Badge
                          variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"}
                          className="text-[10px] h-4"
                        >
                          {s.status === "pending" ? "Bekliyor" : s.status === "approved" ? "Onaylı" : "Reddedildi"}
                        </Badge>
                      </div>
                      <p className="text-sm leading-snug">{s.question_text}</p>
                      {s.admin_note && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Not: {s.admin_note}</p>
                      )}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {s.status === "approved" && loaded && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => useAsQuestion(s.question_text)}>
                          Soruya Ekle
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openReview(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Weekly Questions ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Lig & Hafta Seç</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label>Lig</Label>
              <select
                className="flex h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={selectedLeague}
                onChange={(e) => { setSelectedLeague(e.target.value); setLoaded(false) }}
              >
                <option value="">— Lig Seç —</option>
                {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Hafta</Label>
              <Input
                type="number" min={1} max={38}
                value={weekNumber}
                onChange={(e) => { setWeekNumber(e.target.value ? parseInt(e.target.value) : ""); setLoaded(false) }}
                placeholder="Hafta no"
                className="w-28"
              />
            </div>
            <Button onClick={loadQuestions} disabled={!selectedLeague || !weekNumber}>
              Yükle / Yeni Oluştur
            </Button>
          </div>
        </CardContent>
      </Card>

      {loaded && (
        <Card>
          <CardHeader>
            <CardTitle>Sorular — Hafta {weekNumber}</CardTitle>
            <CardDescription>
              Soru metinlerini düzenleyin. Onaylı öneriler için &quot;Soruya Ekle&quot; butonunu kullanabilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground shrink-0 w-5 text-right">{i + 1}.</span>
                <Input
                  value={q.question_text}
                  onChange={(e) => {
                    const updated = [...questions]
                    updated[i] = { ...updated[i], question_text: e.target.value }
                    setQuestions(updated)
                  }}
                  placeholder={`${i + 1}. soru...`}
                  className="flex-1"
                />
                {q.id && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Label className="text-xs shrink-0">Cevap:</Label>
                    <Input
                      type="number"
                      min={0}
                      value={q.correct_answer ?? ""}
                      onChange={(e) => {
                        const updated = [...questions]
                        updated[i] = { ...updated[i], correct_answer: e.target.value ? parseInt(e.target.value) : null }
                        setQuestions(updated)
                      }}
                      className="w-20 text-sm"
                      placeholder="—"
                    />
                  </div>
                )}
              </div>
            ))}

            <div className="flex gap-2 pt-2 flex-wrap">
              <Button onClick={handleSaveQuestions} disabled={saving}>
                {saving ? "Kaydediliyor..." : "Soruları Kaydet"}
              </Button>
              {hasIds && (
                <Button variant="outline" onClick={handleSaveAnswers} disabled={saving}>
                  Cevapları Kaydet
                </Button>
              )}
              {hasIds && (
                <Button variant="secondary" onClick={handleCalculate} disabled={calculating}>
                  {calculating ? "Hesaplanıyor..." : "🏆 Kazananı Hesapla & Puanla"}
                </Button>
              )}
            </div>

            {calcResult && (
              <div className="mt-3 p-3 rounded-lg bg-muted space-y-1">
                <p className="text-sm font-semibold">Sonuç</p>
                <p className="text-xs text-muted-foreground">Minimum toplam fark: <strong>{calcResult.minDist}</strong></p>
                <p className="text-xs text-muted-foreground">Kazanan{calcResult.winners.length > 1 ? "lar" : ""}: {calcResult.winners.length} kişi → <Badge>{calcResult.bonusPoints} puan</Badge></p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Nasıl çalışır?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1. Kullanıcılar <strong>Profil</strong> sayfasından lig başına 1 soru önerir.</p>
          <p>2. Öneriler burada listelenir — düzenleyip <strong>Onayla</strong> veya <strong>Reddet</strong>.</p>
          <p>3. Onaylı önerileri haftalık soru slotuna <strong>Soruya Ekle</strong> ile ekle.</p>
          <p>4. Hafta sonunda cevapları gir ve <strong>Kazananı Hesapla</strong>&apos;ya bas.</p>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={(o) => !o && setReviewDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Öneriyi İncele</DialogTitle>
            <DialogDescription>
              {reviewDialog?.profiles?.display_name || reviewDialog?.profiles?.username} tarafından önerildi
              {reviewDialog?.leagues?.name ? ` — ${reviewDialog.leagues.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Soru Metni</Label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={3}
                placeholder="Soru metnini düzenleyebilirsin..."
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Onaylamadan önce düzenleyebilirsin.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Admin Notu <span className="text-muted-foreground font-normal">(isteğe bağlı)</span></Label>
              <Input
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Reddetme sebebi veya not..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => handleReview("approve")}
                disabled={reviewSaving || !reviewText.trim()}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {reviewSaving ? "..." : "Onayla"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleReview("reject")}
                disabled={reviewSaving}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {reviewSaving ? "..." : "Reddet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
