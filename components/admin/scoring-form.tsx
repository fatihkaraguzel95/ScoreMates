"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface Props {
  initialValue: Record<string, unknown>
}

export function ScoringSettingsForm({ initialValue }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [exactScore, setExactScore] = useState(String(initialValue.exact_score ?? 4))
  const [goalDiff, setGoalDiff] = useState(String(initialValue.goal_difference ?? 3))
  const [correctWinner, setCorrectWinner] = useState(String(initialValue.correct_winner ?? 2))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const value = {
      exact_score: parseInt(exactScore) || 4,
      goal_difference: parseInt(goalDiff) || 3,
      correct_winner: parseInt(correctWinner) || 2,
    }
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "scoring", value }),
    })
    if (res.ok) {
      toast({ title: "Kaydedildi!", description: "Puanlama sistemi güncellendi." })
      router.refresh()
    } else {
      const data = await res.json()
      toast({ title: "Hata", description: data.error ?? "Kayıt başarısız.", variant: "destructive" })
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Puanlama Sistemi</CardTitle>
        <CardDescription>Her tahmin kategorisi için kazanılacak puan miktarı.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="exact">Doğru Skor</Label>
            <Input id="exact" type="number" min={0} value={exactScore} onChange={(e) => setExactScore(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="diff">Doğru Fark</Label>
            <Input id="diff" type="number" min={0} value={goalDiff} onChange={(e) => setGoalDiff(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="winner">Doğru Sonuç</Label>
            <Input id="winner" type="number" min={0} value={correctWinner} onChange={(e) => setCorrectWinner(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </CardContent>
    </Card>
  )
}
