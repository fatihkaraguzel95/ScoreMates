import type { ScoringSettings } from '@/types'

export function calculatePoints(
  predicted: { home: number; away: number },
  actual: { home: number; away: number },
  scoring: ScoringSettings,
  isFavoriteTeamMatch = false
): number {
  if (predicted.home === actual.home && predicted.away === actual.away) {
    if (isFavoriteTeamMatch && scoring.favorite_team_exact) {
      return scoring.favorite_team_exact
    }
    return scoring.exact_score
  }

  const predDiff = predicted.home - predicted.away
  const actualDiff = actual.home - actual.away

  if (predDiff === actualDiff) {
    return scoring.goal_difference
  }

  const predSign = Math.sign(predDiff)
  const actualSign = Math.sign(actualDiff)
  if (predSign === actualSign) {
    return scoring.correct_winner
  }

  return 0
}
