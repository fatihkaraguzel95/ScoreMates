"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, Clock, XCircle, Lightbulb, ChevronDown, ChevronUp } from "lucide-react"

interface Suggestion {
  id: string
  user_id: string
  league_id: string
  question_text: string
  status: "pending" | "approved" | "rejected"
  admin_note: string | null
}

interface SuggestionWithUser extends Suggestion {
  profiles: { username: string; display_name: string | null } | null
}

interface Props {
  leagueId: string
  isCreator: boolean
  mySuggestion: Suggestion | null
  allSuggestions: SuggestionWithUser[] // only populated for creator
}

const STATUS_CONFIG = {
  pending: { label: "İnceleniyor", icon: Clock, variant: "secondary" as const },
  approved: { label: "Onaylandı", icon: CheckCircle2, variant: "default" as const },
  rejected: { label: "Reddedildi", icon: XCircle, variant: "destructive" as const },
}

function MySuggestionForm({
  leagueId,
  initial,
}: {
  leagueId: string
  initial: Suggestion | null
}) {
  const { toast } = useToast()
  const [text, setText] = useState(initial?.question_text ?? "")
  const [current, setCurrent] = useState<Suggestion | null>(initial)
  const [saving, setSaving] = useState(false)

  const isApproved = current?.status === "approved"
  const isRejected = current?.status === "rejected"
  const canEdit = !isApproved
  const cfg = current ? STATUS_CONFIG[current.status] : null

  async function handleSubmit() {
    if (!text.trim()) return
    setSaving(true)
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ league_id: leagueId, question_text: text }),
    })
    const data = await res.json()
    if (res.ok) {
      toast({ title: "Soru önerildi!", description: "Lig kurucusu onayladıktan sonra aktif olacak." })
      setCurrent({
        ...(current ?? { id: "", user_id: "", league_id: leagueId, admin_note: null }),
        question_text: text,
        status: "pending",
      })
    } else {
      toast({ title: "Hata", description: data.error, variant: "destructive" })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Senin önerin</span>
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

      {isRejected && current?.admin_note && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-2.5 py-1.5">
          <span className="font-semibold">Kurucu notu:</span> {current.admin_note}
        </p>
      )}

      {isApproved && (
        <p className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded px-2.5 py-1.5">
          Sorunuz onaylandı! Kurucu haftalık soruları düzenlerken kullanabilir.
        </p>
      )}

      {canEdit && (
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={saving || !text.trim()}
          className="h-7 text-xs"
        >
          {saving ? "Gönderiliyor..." : isRejected ? "Tekrar Gönder" : current ? "Güncelle" : "Öner"}
        </Button>
      )}
    </div>
  )
}

function SuggestionReviewList({
  leagueId,
  initialSuggestions,
}: {
  leagueId: string
  initialSuggestions: SuggestionWithUser[]
}) {
  const { toast } = useToast()
  const [suggestions, setSuggestions] = useState(initialSuggestions)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})

  const pending = suggestions.filter(s => s.status === "pending")
  const reviewed = suggestions.filter(s => s.status !== "pending")

  async function handleAction(id: string, action: "approve" | "reject") {
    setLoadingId(id)
    const res = await fetch(`/api/leagues/${leagueId}/suggestions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, admin_note: noteInputs[id] }),
    })
    const data = await res.json()
    if (res.ok) {
      setSuggestions(prev =>
        prev.map(s =>
          s.id === id
            ? { ...s, status: action === "approve" ? "approved" : "rejected", admin_note: noteInputs[id] || null }
            : s
        )
      )
      toast({ title: action === "approve" ? "Onaylandı!" : "Reddedildi." })
    } else {
      toast({ title: "Hata", description: data.error, variant: "destructive" })
    }
    setLoadingId(null)
  }

  if (suggestions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-2">Henüz soru önerisi yok.</p>
    )
  }

  return (
    <div className="space-y-3 mt-1">
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Bekleyen ({pending.length})
          </p>
          {pending.map(s => {
            const name = s.profiles?.display_name || s.profiles?.username || "?"
            return (
              <div key={s.id} className="rounded-md border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">@{s.profiles?.username ?? "?"} — {name}</span>
                </div>
                <p className="text-sm">{s.question_text}</p>
                <Textarea
                  placeholder="Red notu (isteğe bağlı)..."
                  value={noteInputs[s.id] ?? ""}
                  onChange={e => setNoteInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                  rows={1}
                  className="text-xs resize-none"
                  maxLength={200}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-green-600 hover:bg-green-700"
                    disabled={loadingId === s.id}
                    onClick={() => handleAction(s.id, "approve")}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Onayla
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    disabled={loadingId === s.id}
                    onClick={() => handleAction(s.id, "reject")}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reddet
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            İncelenenler ({reviewed.length})
          </p>
          {reviewed.map(s => {
            const cfg = STATUS_CONFIG[s.status as "approved" | "rejected"]
            return (
              <div key={s.id} className="flex items-center gap-2 py-1 border-b last:border-b-0">
                <Badge variant={cfg.variant} className="text-xs shrink-0 flex items-center gap-1">
                  <cfg.icon className="h-3 w-3" />
                  {cfg.label}
                </Badge>
                <span className="text-xs text-muted-foreground flex-1 truncate">{s.question_text}</span>
                <span className="text-xs text-muted-foreground shrink-0">@{s.profiles?.username}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function LeagueSuggestionPanel({ leagueId, isCreator, mySuggestion, allSuggestions }: Props) {
  const [open, setOpen] = useState(false)

  const pendingCount = isCreator ? allSuggestions.filter(s => s.status === "pending").length : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Soru Öner
            {isCreator && pendingCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingCount} bekliyor
              </Badge>
            )}
          </CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5 pt-0">
          <MySuggestionForm leagueId={leagueId} initial={mySuggestion} />

          {isCreator && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3">Üye Önerileri</p>
              <SuggestionReviewList leagueId={leagueId} initialSuggestions={allSuggestions} />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
