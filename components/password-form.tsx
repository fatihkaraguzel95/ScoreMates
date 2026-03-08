"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface Props {
  email: string
}

export function PasswordForm({ email }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState({ current: "", next: "", confirm: "" })
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (form.next !== form.confirm) {
      toast({ title: "Hata", description: "Yeni şifreler eşleşmiyor.", variant: "destructive" })
      return
    }
    if (form.next.length < 6) {
      toast({ title: "Hata", description: "Yeni şifre en az 6 karakter olmalı.", variant: "destructive" })
      return
    }
    setSaving(true)
    const supabase = createClient()

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: form.current,
    })
    if (signInError) {
      toast({ title: "Hata", description: "Mevcut şifre yanlış.", variant: "destructive" })
      setSaving(false)
      return
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({ password: form.next })
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Şifre güncellendi!" })
      setForm({ current: "", next: "", confirm: "" })
    }
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Şifre Değiştir</CardTitle>
        <CardDescription>Mevcut şifrenizi doğrulayarak yeni şifre belirleyin.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current">Mevcut Şifre</Label>
            <Input
              id="current"
              type="password"
              placeholder="••••••••"
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="next">Yeni Şifre</Label>
            <Input
              id="next"
              type="password"
              placeholder="En az 6 karakter"
              value={form.next}
              onChange={(e) => setForm({ ...form, next: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Yeni Şifre Tekrar</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="Şifreyi tekrar girin"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Güncelleniyor..." : "Şifreyi Güncelle"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
