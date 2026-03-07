import { Badge } from "@/components/ui/badge"
import type { PredictionWithMatch } from "@/types"
import { formatMatchDate } from "@/lib/utils"

interface PredictionRowProps {
  prediction: PredictionWithMatch
  username?: string
}

export function PredictionRow({ prediction, username }: PredictionRowProps) {
  const match = prediction.match
  const isFinished = match.status === "finished"
  const hasPoints = prediction.points_earned !== null

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {username && (
          <span className="text-sm text-muted-foreground w-28 shrink-0">@{username}</span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {match.home_team} vs {match.away_team}
          </div>
          <div className="text-xs text-muted-foreground">{formatMatchDate(match.match_date)}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono font-medium">
          {prediction.predicted_home} - {prediction.predicted_away}
        </span>
        {isFinished && match.home_score !== null && (
          <span className="text-xs text-muted-foreground font-mono">
            ({match.home_score}-{match.away_score})
          </span>
        )}
        {hasPoints && (
          <Badge variant={prediction.points_earned! > 0 ? "default" : "secondary"}>
            {prediction.points_earned! > 0 ? `+${prediction.points_earned}` : "0"} puan
          </Badge>
        )}
      </div>
    </div>
  )
}
