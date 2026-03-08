"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2 } from "lucide-react"

interface Props {
  questionId: string
  initialValue: number | null
}

export function SpecialPredictionsForm({ questionId, initialValue }: Props) {
  const { toast } = useToast()
  const [value, setValue] = useState(initialValue !== null ? String(initialValue) : "")
  const [saved, setSaved] = useState(initialValue !== null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const num = parseInt(value)
    if (isNaN(num) || num < 0) {
      toast({ title: "Hata", description: "Geçerli bir sayı girin.", variant: "destructive" })
      return
    }
    setSaving(true)
    const res = await fetch("/api/special/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, predicted_value: num }),
    })
    if (res.ok) {
      setSaved(true)
      toast({ title: "Tahmin kaydedildi!" })
    } else {
      const data = await res.json()
      toast({ title: "Hata", description: data.error, variant: "destructive" })
    }
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        placeholder="Tahmininiz..."
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false) }}
        className="w-32 h-8 text-sm"
      />
      <Button
        size="sm"
        className="h-8 text-xs"
        variant={saved ? "outline" : "default"}
        onClick={handleSave}
        disabled={saving || !value}
      >
        {saving ? "..." : saved ? (
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Kaydedildi</span>
        ) : "Kaydet"}
      </Button>
    </div>
  )
}
