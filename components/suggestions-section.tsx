"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, Clock, XCircle, Lightbulb } from "lucide-react"

interface League {
  id: string
  name: string
}

interface Suggestion {
  id: string
  league_id: string
  question_text: string
  status: "pending" | "approved" | "rejected"
  admin_note: string | null
}

interface Props {
  leagues: League[]
  suggestions: Suggestion[]
}

const STATUS_CONFIG = {
  pending: {
    label: "İnceleniyor",
    icon: Clock,
    variant: "secondary" as const,
    className: "text-yellow-600 dark:text-yellow-400",
  },
  approved: {
    label: "Onaylandı",
    icon: CheckCircle2,
    variant: "default" as const,
    className: "text-green-600 dark:text-green-400",
  },
  rejected: {
    label: "Reddedildi",
    icon: XCircle,
    variant: "destructive" as const,
    className: "text-red-600 dark:text-red-400",
  },
}

function LeagueSuggestion({
  league,
  initial,
}: {
  league: League
  initial: Suggestion | null
}) {
  const { toast } = useToast()
  const [text, setText] = useState(initial?.question_text ?? "")
  const [status, setStatus] = useState<Suggestion | null>(initial)
  const [saving, setSaving] = useState(false)

  const isApproved = status?.status === "approved"
  const isRejected = status?.status === "rejected"
  const canEdit = !isApproved

  async function handleSubmit() {
    if (!text.trim()) return
    setSaving(true)
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league_id: league.id, question_text: text }),
    })
    const data = await res.json()
    if (res.ok) {
      toast({ title: "Soru önerildi!", description: "Admin onayladıktan sonra aktif olacak." })
      setStatus({ ...(status ?? { id: "", league_id: league.id, admin_note: null }), question_text: text, status: "pending" })
    } else {
      toast({ title: "Hata", description: data.error, variant: "destructive" })
    }
    setSaving(false)
  }

  const cfg = status ? STATUS_CONFIG[status.status] : null

  return (
    <div className="space-y-2.5 py-3 border-b last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{league.name}</span>
        {cfg && (
          <Badge variant={cfg.variant} className="text-xs shrink-0 flex items-center gap-1">
            <cfg.icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        )}
      </div>

      <Textarea
        placeholder="Örnek: Bu hafta toplam kaç gol atılacak?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!canEdit}
        rows={2}
        className="text-sm resize-none"
        maxLength={200}
      />

      {/* Admin note if rejected */}
      {isRejected && status?.admin_note && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-2.5 py-1.5">
          <span className="font-semibold">Admin notu:</span> {status.admin_note}
        </p>
      )}

      {/* Approved info */}
      {isApproved && (
        <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded px-2.5 py-1.5">
          Sorunuz onaylandı. Admin haftalık soruları belirlerken sorunuzu kullanabilir.
        </p>
      )}

      {canEdit && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || !text.trim()}
            className="h-7 text-xs"
          >
            {saving ? "Gönderiliyor..." : status?.status === "rejected" ? "Tekrar Gönder" : status ? "Güncelle" : "Öner"}
          </Button>
          {!status && (
            <span className="text-xs text-muted-foreground">Lig başına 1 soru önerisi</span>
          )}
        </div>
      )}
    </div>
  )
}

export function SuggestionsSection({ leagues, suggestions }: Props) {
  const byLeague = Object.fromEntries(suggestions.map(s => [s.league_id, s]))

  if (leagues.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Özel Soru Öner
        </CardTitle>
        <CardDescription>
          Her lig için birer adet haftalık özel tahmin sorusu önerebilirsin. Admin onayladıktan sonra haftalık sorularda kullanılabilir.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border px-6 py-0 pb-4">
        {leagues.map(league => (
          <LeagueSuggestion
            key={league.id}
            league={league}
            initial={byLeague[league.id] ?? null}
          />
        ))}
      </CardContent>
    </Card>
  )
}
