"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function JoinLeagueForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [inviteCode, setInviteCode] = useState("")
  const [joining, setJoining] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setJoining(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setJoining(false)
      return
    }

    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .select("id, name")
      .eq("invite_code", inviteCode.toUpperCase().trim())
      .eq("is_active", true)
      .single()

    if (leagueError || !league) {
      toast({ title: "Hata", description: "Geçersiz davet kodu.", variant: "destructive" })
      setJoining(false)
      return
    }

    const { data: existing } = await supabase
      .from("league_members")
      .select("id")
      .eq("league_id", league.id)
      .eq("user_id", user.id)
      .single()

    if (existing) {
      router.push(`/leagues/${league.id}`)
      return
    }

    const { error } = await supabase
      .from("league_members")
      .insert({ league_id: league.id, user_id: user.id })

    if (error) {
      toast({ title: "Hata", description: "Katılım sırasında hata oluştu.", variant: "destructive" })
      setJoining(false)
      return
    }

    toast({ title: "Başarılı!", description: `${league.name} ligine katıldınız.` })
    router.push(`/leagues/${league.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleJoin} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="invite-code">Davet Kodu</Label>
        <Input
          id="invite-code"
          placeholder="ABCD1234"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          maxLength={8}
          className="font-mono tracking-widest"
        />
      </div>
      <Button type="submit" className="w-full" disabled={joining || inviteCode.length < 6}>
        {joining ? "Katılınıyor..." : "Katıl"}
      </Button>
    </form>
  )
}
