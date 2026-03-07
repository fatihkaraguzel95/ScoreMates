import type { ApiFootballSettings } from '@/types'

export interface SportApiEvent {
  id: number
  homeTeam: { id: number; name: string }
  awayTeam: { id: number; name: string }
  startTimestamp: number
  status: { type: string; code: number }
  homeScore: { current?: number }
  awayScore: { current?: number }
  roundInfo: { round: number }
}

interface SportApiEventsResponse {
  events: SportApiEvent[]
}

interface SportApiRoundsResponse {
  currentRound?: { round: number }
}

const SPORT_API_BASE = 'https://sportapi7.p.rapidapi.com'

function buildHeaders(config: ApiFootballSettings): Record<string, string> {
  return {
    'x-rapidapi-key': config.api_key,
    'x-rapidapi-host': 'sportapi7.p.rapidapi.com',
  }
}

export function mapStatus(type: string): 'scheduled' | 'live' | 'finished' {
  if (type === 'finished') return 'finished'
  if (type === 'inprogress') return 'live'
  return 'scheduled'
}

export function logoUrl(teamId: number): string {
  return `https://api.sofascore.app/api/v1/team/${teamId}/image`
}

export async function fetchCurrentRound(config: ApiFootballSettings): Promise<number> {
  const url = `${SPORT_API_BASE}/api/v1/unique-tournament/${config.tournament_id}/season/${config.season_id}/rounds`
  const res = await fetch(url, { headers: buildHeaders(config), next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`SportAPI7 error: ${res.status} ${res.statusText}`)
  const data: SportApiRoundsResponse = await res.json()
  return data.currentRound?.round ?? 1
}

export async function fetchEvents(
  config: ApiFootballSettings,
  round: number
): Promise<SportApiEvent[]> {
  const url = `${SPORT_API_BASE}/api/v1/unique-tournament/${config.tournament_id}/season/${config.season_id}/events/round/${round}`
  const res = await fetch(url, { headers: buildHeaders(config), next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`SportAPI7 error: ${res.status} ${res.statusText}`)
  const data: SportApiEventsResponse = await res.json()
  return data.events ?? []
}

export async function fetchFinishedEvents(
  config: ApiFootballSettings,
  round: number
): Promise<SportApiEvent[]> {
  const events = await fetchEvents(config, round)
  return events.filter(e => mapStatus(e.status.type) === 'finished')
}
