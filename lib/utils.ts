import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isPast } from "date-fns"
import { tr } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMatchDate(date: string): string {
  return format(new Date(date), "dd MMM yyyy HH:mm", { locale: tr })
}

export function formatRelative(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: tr })
}

export function isMatchLocked(matchDate: string): boolean {
  return isPast(new Date(matchDate))
}

export function formatChatTime(date: string): string {
  return format(new Date(date), "HH:mm", { locale: tr })
}

export function getResultLabel(home: number | null, away: number | null): string {
  if (home === null || away === null) return "-"
  if (home > away) return "Ev Sahibi"
  if (away > home) return "Deplasman"
  return "Beraberlik"
}
