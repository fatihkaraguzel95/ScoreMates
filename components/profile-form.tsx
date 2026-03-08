"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { TUTORIAL_KEY } from "@/components/tutorial-modal"
import { BookOpen } from "lucide-react"
import type { Profile } from "@/types"

const SUPER_LIG_TEAMS = [
  "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor", "Başakşehir",
  "Kasımpaşa", "Sivasspor", "Konyaspor", "Alanyaspor", "Antalyaspor",
  "Gaziantep FK", "Kayserispor", "Hatayspor", "Rizespor", "Samsunspor",
  "Eyüpspor", "Bodrum FK", "Çaykur Rizespor", "Göztepe", "Adana Demirspor",
].sort()

interface Props {
  profile: Profile
}

export function ProfileForm({ profile }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState(profile.display_name ?? "")
  const [favoriteTeam, setFavoriteTeam] = useState(profile.favorite_team ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: displayName, favorite_team: favoriteTeam || null }),
    })
    if (res.ok) {
      toast({ title: "Profil güncellendi!" })
      router.refresh()
    } else {
      const data = await res.json()
      toast({ title: "Hata", description: data.error, variant: "destructive" })
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil Bilgileri</CardTitle>
        <CardDescription>Görünen adınızı ve tuttuğunuz takımı güncelleyin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Kullanıcı Adı</Label>
          <Input id="username" value={profile.username} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Kullanıcı adı değiştirilemez.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_name">Görünen Ad</Label>
          <Input
            id="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Görünen adınız"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="favorite_team">Tuttuğum Takım</Label>
          <select
            id="favorite_team"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={favoriteTeam}
            onChange={(e) => setFavoriteTeam(e.target.value)}
          >
            <option value="">— Seçiniz —</option>
            {SUPER_LIG_TEAMS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Tuttuğunuz takımın maçını tam skoru tahmin ettiğinizde özel puan kazanırsınız.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              localStorage.removeItem(TUTORIAL_KEY)
              window.dispatchEvent(new Event("show-tutorial"))
            }}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Tanıtımı Tekrar Gör
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
