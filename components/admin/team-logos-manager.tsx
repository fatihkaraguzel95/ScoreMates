"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Upload, X, Check, Search } from "lucide-react"
import type { TeamLogoRow } from "@/types"

interface Props {
  initialLogos: TeamLogoRow[]
  allTeams: string[]           // distinct team names from matches table
}

const BASE_PX = 44

export function TeamLogosManager({ initialLogos, allTeams }: Props) {
  const { toast } = useToast()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [logos, setLogos] = useState<TeamLogoRow[]>(initialLogos)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState("")
  const [teamSearch, setTeamSearch] = useState("")
  const [base64, setBase64] = useState("")
  const [sizePercent, setSizePercent] = useState(100)
  const [saving, setSaving] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  // Teams that don't have a logo yet (for the selector)
  const loggedTeams = new Set(logos.map(l => l.team_name))
  const filteredTeams = allTeams.filter(t =>
    t.toLowerCase().includes(teamSearch.toLowerCase())
  )

  function resetForm() {
    setEditingId(null)
    setSelectedTeam("")
    setTeamSearch("")
    setBase64("")
    setSizePercent(100)
    setDropdownOpen(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  function startEdit(logo: TeamLogoRow) {
    setEditingId(logo.id)
    setSelectedTeam(logo.team_name)
    setTeamSearch(logo.team_name)
    setBase64(logo.logo_base64)
    setSizePercent(logo.size_percent)
    setDropdownOpen(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  function handleTeamSelect(name: string) {
    setSelectedTeam(name)
    setTeamSearch(name)
    setDropdownOpen(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) {
      toast({ title: "Hata", description: "Dosya 500KB'dan küçük olmalı.", variant: "destructive" })
      return
    }
    const reader = new FileReader()
    reader.onload = () => setBase64(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!selectedTeam || !base64) {
      toast({ title: "Hata", description: "Takım seç ve logo yükle.", variant: "destructive" })
      return
    }
    setSaving(true)

    const { data, error } = await supabase
      .from("team_logos")
      .upsert(
        { team_name: selectedTeam, logo_base64: base64, size_percent: sizePercent },
        { onConflict: "team_name" }
      )
      .select()
      .single()

    if (error || !data) {
      toast({ title: "Hata", description: "Kaydedilemedi: " + (error?.message ?? ""), variant: "destructive" })
    } else {
      setLogos(prev => {
        const exists = prev.find(l => l.team_name === data.team_name)
        if (exists) return prev.map(l => l.team_name === data.team_name ? data : l)
        return [...prev, data]
      })
      toast({ title: "Kaydedildi!", description: `${data.team_name} logosu güncellendi.` })
      resetForm()
    }
    setSaving(false)
  }

  async function handleDelete(logo: TeamLogoRow) {
    if (!confirm(`"${logo.team_name}" logosunu silmek istediğinden emin misin?`)) return
    const { error } = await supabase.from("team_logos").delete().eq("id", logo.id)
    if (!error) {
      setLogos(prev => prev.filter(l => l.id !== logo.id))
      toast({ title: "Silindi", description: `${logo.team_name} logosu kaldırıldı.` })
    }
  }

  const previewSize = Math.max(24, Math.min(96, Math.round(BASE_PX * (sizePercent / 100))))

  return (
    <div className="space-y-8">
      {/* Add / Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? "Logo Düzenle" : "Logo Ekle"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Team selector */}
          <div className="space-y-1.5">
            <Label>Takım Seç</Label>
            <div className="relative">
              <div className="flex items-center border rounded-md bg-background px-3 gap-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  className="flex-1 py-2 text-sm bg-transparent outline-none"
                  placeholder="Takım ara veya seç…"
                  value={teamSearch}
                  onChange={e => { setTeamSearch(e.target.value); setDropdownOpen(true); setSelectedTeam("") }}
                  onFocus={() => setDropdownOpen(true)}
                  disabled={!!editingId}
                />
                {selectedTeam && (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                )}
              </div>
              {dropdownOpen && filteredTeams.length > 0 && (
                <div className="absolute z-50 w-full mt-1 border rounded-md bg-popover shadow-md max-h-60 overflow-y-auto">
                  {filteredTeams.map(team => (
                    <button
                      key={team}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between"
                      onClick={() => handleTeamSelect(team)}
                    >
                      <span>{team}</span>
                      {loggedTeams.has(team) && (
                        <span className="text-xs text-muted-foreground">logo var</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {allTeams.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Maçlar senkronize edilmeden takım listesi oluşmaz. Admin → Maçlar bölümünden senkronize et.
              </p>
            )}
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <Label>Logo Dosyası (PNG/JPG/SVG, max 500KB)</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                Dosya Seç
              </Button>
              {base64 && (
                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Yüklendi
                </span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Size slider */}
          <div className="space-y-2">
            <Label>Görüntüleme Boyutu: <strong>{sizePercent}%</strong></Label>
            <input
              type="range"
              min={40}
              max={200}
              step={5}
              value={sizePercent}
              onChange={e => setSizePercent(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex items-center gap-4 mt-1">
              <p className="text-xs text-muted-foreground">
                Maç kartındaki boyut: ~{previewSize}px
              </p>
              {base64 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Önizleme:</span>
                  <div
                    className="border rounded bg-muted/20 flex items-center justify-center"
                    style={{ width: previewSize + 8, height: previewSize + 8 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={base64}
                      alt="önizleme"
                      style={{ width: previewSize, height: previewSize }}
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving || !selectedTeam || !base64}
            >
              {saving ? "Kaydediliyor…" : editingId ? "Güncelle" : "Ekle"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                <X className="h-4 w-4 mr-1" /> İptal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logos grid */}
      <div>
        <h2 className="text-base font-semibold mb-3">
          Kayıtlı Logolar ({logos.length})
        </h2>

        {logos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Henüz logo eklenmedi.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {logos
              .slice()
              .sort((a, b) => a.team_name.localeCompare(b.team_name))
              .map(logo => {
                const px = Math.max(24, Math.min(64, Math.round(BASE_PX * (logo.size_percent / 100))))
                return (
                  <Card
                    key={logo.id}
                    className={editingId === logo.id ? "ring-2 ring-primary" : ""}
                  >
                    <CardContent className="p-3 flex flex-col items-center gap-2">
                      <div className="h-14 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={logo.logo_base64}
                          alt={logo.team_name}
                          style={{ width: px, height: px, maxWidth: 56, maxHeight: 56 }}
                          className="object-contain"
                        />
                      </div>
                      <p className="text-xs font-medium text-center truncate w-full leading-tight">
                        {logo.team_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{logo.size_percent}%</p>
                      <div className="flex gap-1.5">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => startEdit(logo)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(logo)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
