"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { generateInviteCode } from "@/lib/invite-code"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CreateLeaguePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Check max leagues limit
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

    // Auto-join creator
    await supabase
      .from("league_members")
      .insert({ league_id: league.id, user_id: user.id })

    toast({ title: "Lig oluşturuldu!", description: `Davet kodu: ${inviteCode}` })
    router.push(`/leagues/${league.id}`)
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/leagues">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Yeni Lig Oluştur</CardTitle>
          <CardDescription>
            Lig oluşturulduğunda benzersiz bir davet kodu otomatik atanır.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Lig Adı</Label>
              <Input
                id="name"
                placeholder="Örnek: Arkadaş Ligi 2024"
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
        </CardContent>
      </Card>
    </div>
  )
}
