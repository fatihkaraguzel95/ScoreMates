"use client"

import { useState } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Lock, CheckCircle2 } from "lucide-react"
import { formatMatchDate, isMatchLocked } from "@/lib/utils"
import type { Match, Prediction, TeamLogosMap, TeamFormMap, FormResult } from "@/types"
import { cn } from "@/lib/utils"

interface MatchCardProps {
  match: Match
  leagueId: string
  existingPrediction?: Prediction
  teamLogos?: TeamLogosMap
  teamForm?: TeamFormMap
}

function FormDots({ form }: { form: FormResult[] }) {
  if (!form || form.length === 0) return null
  return (
    <div className="flex gap-0.5 justify-center">
      {form.map((r, i) => (
        <span
          key={i}
          title={r === "W" ? "Galibiyet" : r === "L" ? "Mağlubiyet" : "Beraberlik"}
          className={`inline-block h-2 w-2 rounded-full ${
            r === "W" ? "bg-green-500" : r === "L" ? "bg-red-500" : "bg-yellow-400"
          }`}
        />
      ))}
    </div>
  )
}

function Stepper({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled}
        className={cn(
          "h-8 w-8 rounded-full border-2 border-border",
          "flex items-center justify-center text-base font-bold select-none",
          "transition-all duration-100",
          disabled
            ? "opacity-30 cursor-not-allowed"
            : "hover:border-primary hover:text-primary active:scale-90 active:bg-muted"
        )}
      >
        −
      </button>
      <span className="w-8 text-center text-2xl font-bold tabular-nums leading-none">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(20, value + 1))}
        disabled={disabled}
        className={cn(
          "h-8 w-8 rounded-full border-2 border-border",
          "flex items-center justify-center text-base font-bold select-none",
          "transition-all duration-100",
          disabled
            ? "opacity-30 cursor-not-allowed"
            : "hover:border-primary hover:text-primary active:scale-90 active:bg-muted"
        )}
      >
        +
      </button>
    </div>
  )
}

function TeamLogo({
  src,
  name,
  custom,
}: {
  src: string | null
  name: string
  custom?: { base64: string; size: number }
}) {
  if (custom) {
    const px = Math.max(20, Math.min(56, Math.round(32 * (custom.size / 100))))
    return (
      <img
        src={custom.base64}
        alt={name}
        style={{ width: px, height: px }}
        className="object-contain rounded"
      />
    )
  }
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={32}
        height={32}
        className="rounded object-contain"
      />
    )
  }
  return (
    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function MatchCard({ match, leagueId, existingPrediction, teamLogos, teamForm }: MatchCardProps) {
  const { toast } = useToast()
  const locked = isMatchLocked(match.match_date)

  const [homeScore, setHomeScore] = useState(existingPrediction?.predicted_home ?? 0)
  const [awayScore, setAwayScore] = useState(existingPrediction?.predicted_away ?? 0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!existingPrediction)

  function handleHome(v: number) { setHomeScore(v); setSaved(false) }
  function handleAway(v: number) { setAwayScore(v); setSaved(false) }

  async function handleSave() {
    if (locked) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase
      .from("predictions")
      .upsert(
        {
          user_id: user.id,
          match_id: match.id,
          league_id: leagueId,
          predicted_home: homeScore,
          predicted_away: awayScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,match_id,league_id" }
      )

    if (error) {
      toast({ title: "Hata", description: "Tahmin kaydedilemedi.", variant: "destructive" })
    } else {
      setSaved(true)
      toast({
        title: "Tahmin kaydedildi!",
        description: `${match.home_team} ${homeScore}–${awayScore} ${match.away_team}`,
      })
    }
    setSaving(false)
  }

  const statusConfig = {
    scheduled: { label: "Planlandı", variant: "secondary" as const },
    live: { label: "Canlı", variant: "destructive" as const },
    finished: { label: "Bitti", variant: "default" as const },
  }
  const status = statusConfig[match.status]
  const isFinished = match.status === "finished"
  const hasPoints =
    existingPrediction?.points_earned !== null &&
    existingPrediction?.points_earned !== undefined

  return (
    <Card className={cn("overflow-hidden", locked && "opacity-80")}>
      {/* Header row */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5 border-b">
        <div className="flex items-center gap-2">
          <Badge variant={status.variant} className="text-xs shrink-0 px-1.5 py-0">
            {match.status === "live" && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white mr-1 animate-pulse" />
            )}
            {status.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatMatchDate(match.match_date)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {saved && !locked && !isFinished && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
              <CheckCircle2 className="h-3 w-3" />
              <span>Kaydedildi</span>
            </div>
          )}
          {locked && <Lock className="h-3 w-3 text-muted-foreground" />}
        </div>
      </div>

      <CardContent className="px-3 py-3">
        {/* Teams + Steppers — 3-column grid */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Home team */}
          <div className="flex flex-col items-center gap-1.5">
            <TeamLogo src={match.home_team_logo} name={match.home_team} custom={teamLogos?.[match.home_team]} />
            <span className="text-xs font-semibold text-center leading-tight line-clamp-2">
              {match.home_team}
            </span>
            <FormDots form={teamForm?.[match.home_team] ?? []} />
            <Stepper value={homeScore} onChange={handleHome} disabled={locked} />
          </div>

          {/* Center: VS or result */}
          <div className="flex flex-col items-center gap-1 min-w-[44px]">
            {isFinished && match.home_score !== null ? (
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Sonuç</p>
                <p className="text-lg font-bold tabular-nums">
                  {match.home_score}–{match.away_score}
                </p>
                {hasPoints && (
                  <Badge variant="outline" className="mt-1 text-xs px-1.5 py-0">
                    +{existingPrediction!.points_earned} pt
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-sm font-bold text-muted-foreground">VS</span>
            )}
          </div>

          {/* Away team */}
          <div className="flex flex-col items-center gap-1.5">
            <TeamLogo src={match.away_team_logo} name={match.away_team} custom={teamLogos?.[match.away_team]} />
            <span className="text-xs font-semibold text-center leading-tight line-clamp-2">
              {match.away_team}
            </span>
            <FormDots form={teamForm?.[match.away_team] ?? []} />
            <Stepper value={awayScore} onChange={handleAway} disabled={locked} />
          </div>
        </div>

        {/* Save / status message */}
        {!locked ? (
          <Button
            className="w-full mt-3"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            variant={saved ? "outline" : "default"}
          >
            {saving ? "Kaydediliyor..." : saved ? "Güncelle" : "Tahmin Kaydet"}
          </Button>
        ) : (
          match.status === "scheduled" && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Maç başladı, tahmin kilitledi
            </p>
          )
        )}
      </CardContent>
    </Card>
  )
}
