"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { generateInviteCode } from "@/lib/invite-code"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function CreateLeagueForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { count } = await supabase
      .from("league_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if ((count ?? 0) >= 5) {
      toast({
        title: "Limit aşıldı",
        description: "En fazla 5 ligde yer alabilirsin.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    const inviteCode = generateInviteCode()
    const seasonYear = new Date().getFullYear()

    const { data: league, error } = await supabase
      .from("leagues")
      .insert({
        name: name.trim(),
        invite_code: inviteCode,
        created_by: user.id,
        season_year: seasonYear,
      })
      .select()
      .single()

    if (error || !league) {
      toast({ title: "Hata", description: "Lig oluşturulurken hata oluştu.", variant: "destructive" })
      setLoading(false)
      return
    }

    await supabase.from("league_members").insert({ league_id: league.id, user_id: user.id })

    toast({ title: "Lig oluşturuldu!", description: `Davet kodu: ${inviteCode}` })
    router.push(`/leagues/${league.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="league-name">Lig Adı</Label>
        <Input
          id="league-name"
          placeholder="Örnek: Arkadaş Ligi 2025"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !name.trim()}>
        {loading ? "Oluşturuluyor..." : "Lig Oluştur"}
      </Button>
    </form>
  )
}
