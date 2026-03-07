import { createClient } from "@/lib/supabase/server"
import type { TeamLogosMap } from "@/types"

export async function getTeamLogos(): Promise<TeamLogosMap> {
  try {
    const supabase = createClient()
    const { data } = await supabase
      .from("team_logos")
      .select("team_name, logo_base64, size_percent")

    const map: TeamLogosMap = {}
    for (const row of data ?? []) {
      map[row.team_name] = { base64: row.logo_base64, size: row.size_percent ?? 100 }
    }
    return map
  } catch {
    return {}
  }
}
