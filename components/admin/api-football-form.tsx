"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface Props {
  initialValue: Record<string, unknown>
}

export function ApiFootballSettingsForm({ initialValue }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [apiKey, setApiKey] = useState((initialValue.api_key as string) ?? "")
  const [tournamentId, setTournamentId] = useState((initialValue.tournament_id as string) ?? "52")
  const [seasonId, setSeasonId] = useState((initialValue.season_id as string) ?? "77805")
  const [seasonYear, setSeasonYear] = useState((initialValue.season_year as string) ?? "2025")
  const baseUrl = (initialValue.base_url as string) ?? "https://sportapi7.p.rapidapi.com"
  const [seasonActive, setSeasonActive] = useState((initialValue.season_active as boolean) ?? true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null)

  async function handleSave() {
    if (!apiKey.trim()) {
      toast({ title: "Hata", description: "API key boş olamaz.", variant: "destructive" })
      return
    }
    setSaving(true)
    const value = {
      api_key: apiKey.trim(),
      tournament_id: tournamentId,
      season_id: seasonId,
      season_year: seasonYear,
      base_url: baseUrl,
      season_active: seasonActive,
    }
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "api_football", value }),
    })
    if (res.ok) {
      toast({ title: "Kaydedildi!", description: "SportAPI7 ayarları güncellendi." })
      router.refresh()
    } else {
      const data = await res.json()
      toast({ title: "Hata", description: data.error ?? "Kayıt başarısız.", variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleTest() {
    if (!apiKey.trim()) return
    setTesting(true)
    setTestResult(null)
    const res = await fetch("/api/admin/settings/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey.trim(), base_url: baseUrl }),
    })
    setTestResult(res.ok ? "ok" : "fail")
    setTesting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SportAPI7 (RapidAPI)</CardTitle>
        <CardDescription>
          RapidAPI üzerinden SportAPI7 bağlantı ayarları (SofaScore tabanlı).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="api-key">RapidAPI Key</Label>
          {!!initialValue.api_key && (
            <div className="rounded-md bg-muted px-3 py-2 flex items-center justify-between gap-2">
              <span className="font-mono text-xs break-all select-all">{String(initialValue.api_key)}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">kayıtlı</span>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              id="api-key"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
              placeholder="Yeni key gir..."
              className="font-mono text-sm"
            />
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing || !apiKey}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Test Et"}
            </Button>
          </div>
          {testResult === "ok" && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> API bağlantısı başarılı!
            </p>
          )}
          {testResult === "fail" && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <XCircle className="h-4 w-4" /> Bağlantı başarısız. Key&apos;i ve aboneliği kontrol edin.
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tournament-id">
              Turnuva ID{" "}
              <span className="text-xs text-muted-foreground">(52 = Süper Lig)</span>
            </Label>
            <Input
              id="tournament-id"
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              placeholder="52"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="season-id">
              Sezon ID{" "}
              <span className="text-xs text-muted-foreground">(25/26 = 77805)</span>
            </Label>
            <Input
              id="season-id"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              placeholder="77805"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="season-year">
              Sezon Yılı{" "}
              <span className="text-xs text-muted-foreground">(başlangıç)</span>
            </Label>
            <Input
              id="season-year"
              value={seasonYear}
              onChange={(e) => setSeasonYear(e.target.value)}
              placeholder="2025"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">Sezon Aktif</p>
            <p className="text-xs text-muted-foreground">Kapalıysa senkronizasyon devre dışı kalır.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={seasonActive}
            onClick={() => setSeasonActive(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              seasonActive ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              seasonActive ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Bağlantı: <span className="font-mono">sportapi7.p.rapidapi.com</span> (sabit)
        </p>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </CardContent>
    </Card>
  )
}
