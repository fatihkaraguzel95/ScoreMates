"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, Download, Plus, Pencil, Calculator } from "lucide-react"
import { formatMatchDate } from "@/lib/utils"
import type { Match } from "@/types"

const SUPER_LIG_TEAMS = [
  "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Başakşehir",
  "Kasımpaşa", "Sivasspor", "Konyaspor", "Alanyaspor", "Antalyaspor",
  "Gaziantep FK", "Kayserispor", "Hatayspor", "Rizespor", "Samsunspor",
  "Eyüpspor", "Bodrum FK", "Çaykur Rizespor", "Göztepe", "Adana Demirspor",
]

const EMPTY_FORM = {
  home_team: "",
  away_team: "",
  match_date: "",
  week_number: 1,
  season_year: new Date().getFullYear(),
  home_score: "",
  away_score: "",
  status: "scheduled" as "scheduled" | "live" | "finished",
}

export default function AdminMatchesPage() {
  const { toast } = useToast()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [updatingResults, setUpdatingResults] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [weekNumber, setWeekNumber] = useState<number | "">("")
  const [manualOpen, setManualOpen] = useState(false)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function fetchMatches() {
    setLoading(true)
    const res = await fetch("/api/admin/matches")
    if (res.ok) {
      const data = await res.json()
      setMatches(data.matches ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchMatches() }, [])

  async function handleSync() {
    setSyncing(true)
    const body = weekNumber !== "" ? { week: weekNumber } : {}
    const res = await fetch("/api/matches/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (res.ok) {
      const round = data.round ?? weekNumber
      if (round) setWeekNumber(round)
      toast({ title: "Senkronizasyon tamamlandı!", description: `Hafta ${round}: ${data.upserted ?? 0} maç güncellendi.` })
      fetchMatches()
    } else {
      toast({ title: "Hata", description: data.error ?? "Senkronizasyon başarısız.", variant: "destructive" })
    }
    setSyncing(false)
  }

  async function handleRecalculate() {
    setRecalculating(true)
    const res = await fetch("/api/admin/matches/recalculate", { method: "POST" })
    const data = await res.json()
    if (res.ok) {
      toast({ title: "Puanlar yeniden hesaplandı!", description: `${data.recalculated} tahmin güncellendi, ${data.weeklyUpdated} haftalık puan tablosu yenilendi.` })
    } else {
      toast({ title: "Hata", description: data.error ?? "Hesaplama başarısız.", variant: "destructive" })
    }
    setRecalculating(false)
  }

  async function handleUpdateResults() {
    setUpdatingResults(true)
    const effectiveWeek = weekNumber !== "" ? weekNumber : 1
    const res = await fetch("/api/matches/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week: effectiveWeek }),
    })
    const data = await res.json()
    if (res.ok) {
      const d = data.debug
      const detail = d
        ? `API: ${d.total_from_api} maç, ${d.finished_from_api} bitti | DB: ${data.updated} güncellendi, ${data.pointsCalculated} tahmin puanlandı${d.status_types?.length ? ` | Durumlar: ${d.status_types.join(",")}` : ""}`
        : `${data.updated ?? 0} maç, ${data.pointsCalculated ?? 0} tahmin puanlandı.`
      toast({ title: "Sonuçlar güncellendi!", description: detail })
      fetchMatches()
    } else {
      toast({ title: "Hata", description: data.error ?? "Güncelleme başarısız.", variant: "destructive" })
    }
    setUpdatingResults(false)
  }

  function openAddDialog() {
    setEditMatch(null)
    setForm({ ...EMPTY_FORM, week_number: typeof weekNumber === "number" ? weekNumber : 1 })
    setManualOpen(true)
  }

  function openEditDialog(m: Match) {
    setEditMatch(m)
    // Format date for datetime-local input
    const d = new Date(m.match_date)
    const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
    setForm({
      home_team: m.home_team,
      away_team: m.away_team,
      match_date: localISO,
      week_number: m.week_number,
      season_year: m.season_year,
      home_score: m.home_score?.toString() ?? "",
      away_score: m.away_score?.toString() ?? "",
      status: m.status,
    })
    setManualOpen(true)
  }

  async function handleSaveManual() {
    if (!form.home_team || !form.away_team || !form.match_date) {
      toast({ title: "Hata", description: "Takım adları ve tarih zorunludur.", variant: "destructive" })
      return
    }
    setSaving(true)

    const payload = {
      home_team: form.home_team,
      away_team: form.away_team,
      match_date: new Date(form.match_date).toISOString(),
      week_number: Number(form.week_number),
      season_year: Number(form.season_year),
      status: form.status,
      home_score: form.home_score !== "" ? Number(form.home_score) : null,
      away_score: form.away_score !== "" ? Number(form.away_score) : null,
      match_id: editMatch?.id,
    }

    const res = await fetch("/api/admin/matches/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (res.ok) {
      toast({ title: editMatch ? "Maç güncellendi!" : "Maç eklendi!" })
      setManualOpen(false)
      fetchMatches()
    } else {
      toast({ title: "Hata", description: data.error, variant: "destructive" })
    }
    setSaving(false)
  }

  const statusColors: Record<string, "secondary" | "destructive" | "default"> = {
    scheduled: "secondary",
    live: "destructive",
    finished: "default",
  }
  const statusLabels: Record<string, string> = {
    scheduled: "Planlandı",
    live: "Canlı",
    finished: "Bitti",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Maçlar</h1>
        <p className="text-muted-foreground mt-1">API senkronizasyonu ve manuel maç yönetimi</p>
      </div>

      {/* API Sync */}
      <Card>
        <CardHeader>
          <CardTitle>API Senkronizasyonu</CardTitle>
          <CardDescription>SportAPI7&apos;den maç verilerini çek ve sonuçları güncelle.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label htmlFor="week">
                Hafta Numarası{" "}
                <span className="text-xs text-muted-foreground">(boş = otomatik)</span>
              </Label>
              <Input
                id="week"
                type="number"
                min={1}
                max={38}
                value={weekNumber}
                onChange={(e) => setWeekNumber(e.target.value === "" ? "" : parseInt(e.target.value) || 1)}
                placeholder="Otomatik"
                className="w-32"
              />
            </div>
            <Button onClick={handleSync} disabled={syncing}>
              <Download className="h-4 w-4 mr-2" />
              {syncing ? "Senkronize ediliyor..." : weekNumber === "" ? "Mevcut Haftayı Senkronize Et" : `Hafta ${weekNumber}'i Senkronize Et`}
            </Button>
            <Button variant="outline" onClick={handleUpdateResults} disabled={updatingResults}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {updatingResults ? "Güncelleniyor..." : "Sonuçları Güncelle & Puanla"}
            </Button>
            <Button variant="secondary" onClick={handleRecalculate} disabled={recalculating}>
              <Calculator className="h-4 w-4 mr-2" />
              {recalculating ? "Hesaplanıyor..." : "Tüm Puanları Yeniden Hesapla"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Match */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tüm Maçlar ({matches.length})</CardTitle>
            <CardDescription>Manuel maç ekle veya mevcut maçları düzenle.</CardDescription>
          </div>
          <Dialog open={manualOpen} onOpenChange={setManualOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Manuel Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editMatch ? "Maçı Düzenle" : "Manuel Maç Ekle"}</DialogTitle>
                <DialogDescription>
                  Süper Lig maçını elle girin veya sonucu güncelleyin.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ev Sahibi</Label>
                    <Input
                      list="teams-list"
                      value={form.home_team}
                      onChange={(e) => setForm({ ...form, home_team: e.target.value })}
                      placeholder="Galatasaray"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Deplasman</Label>
                    <Input
                      list="teams-list"
                      value={form.away_team}
                      onChange={(e) => setForm({ ...form, away_team: e.target.value })}
                      placeholder="Fenerbahçe"
                    />
                  </div>
                </div>
                <datalist id="teams-list">
                  {SUPER_LIG_TEAMS.map(t => <option key={t} value={t} />)}
                </datalist>
                <div className="space-y-1.5">
                  <Label>Tarih & Saat</Label>
                  <Input
                    type="datetime-local"
                    value={form.match_date}
                    onChange={(e) => setForm({ ...form, match_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Hafta</Label>
                    <Input
                      type="number" min={1} max={38}
                      value={form.week_number}
                      onChange={(e) => setForm({ ...form, week_number: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sezon</Label>
                    <Input
                      type="number"
                      value={form.season_year}
                      onChange={(e) => setForm({ ...form, season_year: parseInt(e.target.value) || 2024 })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Durum</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                  >
                    <option value="scheduled">Planlandı</option>
                    <option value="live">Canlı</option>
                    <option value="finished">Bitti</option>
                  </select>
                </div>
                {(form.status === "finished" || form.status === "live") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Ev Skoru</Label>
                      <Input
                        type="number" min={0}
                        value={form.home_score}
                        onChange={(e) => setForm({ ...form, home_score: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Deplasman Skoru</Label>
                      <Input
                        type="number" min={0}
                        value={form.away_score}
                        onChange={(e) => setForm({ ...form, away_score: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={handleSaveManual} disabled={saving}>
                    {saving ? "Kaydediliyor..." : editMatch ? "Güncelle" : "Ekle"}
                  </Button>
                  <Button variant="outline" onClick={() => setManualOpen(false)}>İptal</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Yükleniyor...</p>
          ) : matches.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Henüz maç yok. Manuel ekleyin veya API ile senkronize edin.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hf.</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Ev Sahibi</TableHead>
                  <TableHead>Deplasman</TableHead>
                  <TableHead>Skor</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.week_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatMatchDate(m.match_date)}</TableCell>
                    <TableCell>{m.home_team}</TableCell>
                    <TableCell>{m.away_team}</TableCell>
                    <TableCell className="font-mono">
                      {m.home_score !== null ? `${m.home_score} - ${m.away_score}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[m.status] ?? "secondary"}>
                        {statusLabels[m.status] ?? m.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
