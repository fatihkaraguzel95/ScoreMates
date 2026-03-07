export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/server";
import { ApiFootballSettingsForm } from "@/components/admin/api-football-form";
import { ScoringSettingsForm } from "@/components/admin/scoring-form";
import { SettingsForm } from "@/components/admin/settings-form";

export default async function AdminSettingsPage() {
  const supabase = createAdminClient();
  const { data: settings } = await supabase.from("settings").select("*");

  const settingMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s]));

  const scoring = (settingMap["scoring"]?.value ?? {
    exact_score: 4,
    goal_difference: 3,
    correct_winner: 2,
  }) as Record<string, unknown>;
  const apiFootball = (settingMap["api_football"]?.value ?? {
    api_key: "",
    tournament_id: "52",
    season_id: "77805",
    season_year: "2025",
    base_url: "https://sportapi7.p.rapidapi.com",
  }) as Record<string, unknown>;
  const app = (settingMap["app"]?.value ?? {
    site_name: "ScoreMates",
    max_leagues_per_user: 5,
  }) as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground mt-1">Sistem ayarlarını yönet</p>
      </div>

      <ApiFootballSettingsForm initialValue={apiFootball} />
      <ScoringSettingsForm initialValue={scoring} />
      <SettingsForm
        settingKey="app"
        title="Uygulama Ayarları"
        description="Site adı ve kullanıcı başına maksimum lig sayısı."
        initialValue={app}
      />
    </div>
  );
}
