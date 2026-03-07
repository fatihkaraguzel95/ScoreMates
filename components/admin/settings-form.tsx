"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface SettingsFormProps {
  settingKey: string
  title: string
  description: string
  initialValue: Record<string, unknown>
}

export function SettingsForm({ settingKey, title, description, initialValue }: SettingsFormProps) {
  const { toast } = useToast()
  const [value, setValue] = useState(JSON.stringify(initialValue, null, 2))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    setError("")
    let parsed: unknown
    try {
      parsed = JSON.parse(value)
    } catch {
      setError("Geçersiz JSON formatı.")
      return
    }

    setSaving(true)
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: settingKey, value: parsed }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Kayıt sırasında hata oluştu.")
    } else {
      toast({ title: "Kaydedildi!", description: `${title} ayarları güncellendi.` })
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>JSON Değeri</Label>
          <Textarea
            value={value}
            onChange={(e) => { setValue(e.target.value); setError("") }}
            className="font-mono text-sm min-h-40"
            spellCheck={false}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </CardContent>
    </Card>
  )
}
