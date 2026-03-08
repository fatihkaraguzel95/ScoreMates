"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Trophy } from "lucide-react"

interface League { id: string; name: string }
interface Question { id?: string; question_text: string; correct_answer: number | null; sort_order: number }

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

  useEffect(() => {
    fetch("/api/admin/matches").then(r => r.json()).then(() => {})
    // Load leagues
    fetch("/api/admin/leagues").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.leagues) setLeagues(d.leagues)
    })
  }, [])

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

  const hasIds = questions.some(q => q.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Özel Tahminler</h1>
        <p className="text-muted-foreground mt-1">Haftalık istatistik sorularını yönet ve kazananları belirle.</p>
      </div>

      {/* League + Week selector */}
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

      {/* Questions */}
      {loaded && (
        <Card>
          <CardHeader>
            <CardTitle>Sorular</CardTitle>
            <CardDescription>5 soruyu düzenleyin. Soru metinleri boş bırakılırsa kaydedilmez.</CardDescription>
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

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" />
            Nasıl çalışır?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>1. Hafta başında 5 soruyu oluşturun ve kaydedin.</p>
          <p>2. Kullanıcılar tahminlerini <strong>Özel Tahminler</strong> sayfasından girer.</p>
          <p>3. Hafta bittikten sonra her soruya doğru cevabı girin ve <strong>Cevapları Kaydet</strong>&apos;e basın.</p>
          <p>4. <strong>Kazananı Hesapla</strong>&apos;ya basın — toplam farkı en az olan kişi bonus puan alır.</p>
          <p>5. Bonus miktarı Admin → Settings → <strong>Özel Tahmin Bonus</strong> alanından ayarlanır.</p>
        </CardContent>
      </Card>
    </div>
  )
}
