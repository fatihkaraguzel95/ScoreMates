import { createClient } from "@/lib/supabase/server"
import { TeamLogosManager } from "@/components/admin/team-logos-manager"
import type { TeamLogoRow } from "@/types"

export default async function TeamLogosPage() {
  const supabase = createClient()

  const [{ data: logos }, { data: matchTeams }] = await Promise.all([
    supabase.from("team_logos").select("*").order("team_name", { ascending: true }),
    supabase.from("matches").select("home_team, away_team"),
  ])

  // Collect distinct team names from all matches
  const teamSet = new Set<string>()
  for (const m of matchTeams ?? []) {
    if (m.home_team) teamSet.add(m.home_team)
    if (m.away_team) teamSet.add(m.away_team)
  }
  const allTeams = Array.from(teamSet).sort((a, b) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Takım Logoları</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Maçlardaki takımları seçerek logo ekle. Boyutu yüzde ile ayarla.
          Logo, tahmin kartlarında ve geçmiş sonuçlarda otomatik görünür.
        </p>
      </div>

      <TeamLogosManager
        initialLogos={(logos ?? []) as TeamLogoRow[]}
        allTeams={allTeams}
      />
    </div>
  )
}
