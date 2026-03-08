"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Lightbulb, Check, Plus, Sparkles, Pencil } from "lucide-react"

interface SuggestionItem {
  id: string
  user_id: string
  question_text: string
  status: "pending" | "active"
  profiles: { username: string; display_name: string | null } | null
  vote_count: number
  my_vote: boolean
}

interface Props {
  leagueId: string
  userId: string
}

export function LeagueSuggestionPanel({ leagueId, userId }: Props) {
  const { toast } = useToast()
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formText, setFormText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)

  const mySuggestion = suggestions.find(s => s.user_id === userId)

  const fetchSuggestions = useCallback(async () => {
    const res = await fetch(`/api/leagues/${leagueId}/suggestions`)
    if (res.ok) {
      const data = await res.json()
      setSuggestions(data.suggestions ?? [])
      setMemberCount(data.memberCount ?? 0)
    }
    setLoading(false)
  }, [leagueId])

  useEffect(() => { fetchSuggestions() }, [fetchSuggestions])

  async function handleSubmit() {
    if (!formText.trim()) return
    setSubmitting(true)
    const res = await fetch(`/api/leagues/${leagueId}/suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_text: formText }),
    })
    const data = await res.json()
    if (res.ok) {
      toast({ title: "Önerin gönderildi!", description: "Tüm üyeler onaylarsa soru özel tahminlere eklenecek." })
      setFormText("")
      setShowForm(false)
      fetchSuggestions()
    } else {
      toast({ title: "Hata", description: data.error, variant: "destructive" })
    }
    setSubmitting(false)
  }

  async function handleVote(suggestionId: string) {
    setVotingId(suggestionId)
    const res = await fetch(`/api/leagues/${leagueId}/suggestions/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestion_id: suggestionId }),
    })
    const data = await res.json()
    if (res.ok) {
      if (data.promoted) {
        toast({ title: "🎉 Soru aktifleşti!", description: "Herkes onayladı! Özel tahminlere eklendi." })
      }
      fetchSuggestions()
    } else {
      toast({ title: "Hata", description: data.error, variant: "destructive" })
    }
    setVotingId(null)
  }

  if (loading) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Soru Önerileri
            {suggestions.length > 0 && (
              <Badge variant="secondary" className="text-xs">{suggestions.length}</Badge>
            )}
          </CardTitle>
          {!mySuggestion && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={() => setShowForm(v => !v)}
            >
              <Plus className="h-3 w-3" />
              Soru Öner
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Tüm üyeler onaylarsa soru özel tahminlere otomatik eklenir.
        </p>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* New suggestion form */}
        {showForm && !mySuggestion && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
            <Textarea
              placeholder="Örnek: Bu hafta toplam kaç gol atılacak?"
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              maxLength={200}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={submitting || !formText.trim()}>
                {submitting ? "Gönderiliyor..." : "Öner"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowForm(false)}>
                İptal
              </Button>
            </div>
          </div>
        )}

        {/* Edit my existing pending suggestion */}
        {mySuggestion && mySuggestion.status === "pending" && showForm && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
            <Textarea
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              rows={2}
              className="text-sm resize-none"
              maxLength={200}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleSubmit} disabled={submitting || !formText.trim()}>
                {submitting ? "Kaydediliyor..." : "Güncelle"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowForm(false)}>
                İptal
              </Button>
            </div>
          </div>
        )}

        {/* Suggestions list */}
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-1">
            Henüz öneri yok. İlk soruyu sen öner!
          </p>
        ) : (
          <div className="space-y-2">
            {suggestions.map(s => {
              const isMe = s.user_id === userId
              const progressPct = memberCount > 0 ? (s.vote_count / memberCount) * 100 : 0

              return (
                <div
                  key={s.id}
                  className={`rounded-lg border p-3 space-y-2 ${isMe ? "border-primary/40 bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium">@{s.profiles?.username ?? "?"}</span>
                      {isMe && <Badge variant="outline" className="text-[10px] h-4 px-1.5">Senin önerin</Badge>}
                    </div>
                    {s.status === "active" ? (
                      <Badge className="text-xs shrink-0 bg-green-600 hover:bg-green-600 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Aktif
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {s.vote_count}/{memberCount}
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-snug">{s.question_text}</p>

                  {s.status !== "active" && (
                    <div className="flex items-center gap-3">
                      <Progress value={progressPct} className="h-1.5 flex-1" />
                      {isMe ? (
                        <div className="flex items-center gap-2 shrink-0">
                          {!showForm && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs px-2 gap-1"
                              onClick={() => { setFormText(s.question_text); setShowForm(true) }}
                            >
                              <Pencil className="h-3 w-3" />
                              Düzenle
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Check className="h-3 w-3 text-green-500" />
                            Onayladın
                          </span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant={s.my_vote ? "default" : "outline"}
                          className="h-7 text-xs shrink-0 gap-1"
                          disabled={votingId === s.id}
                          onClick={() => handleVote(s.id)}
                        >
                          {s.my_vote ? (
                            <>
                              <Check className="h-3 w-3" />
                              Onayladın
                            </>
                          ) : "Onayla"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
