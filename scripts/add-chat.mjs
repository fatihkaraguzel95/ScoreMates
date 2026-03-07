const PAT = "sbp_24262ed4b56fabdb1c789ace84246d83cc7359d6"
const PROJECT_REF = "mvicgvqgeemodjohjtir"
const URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

async function sql(query) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(data))
  return data
}

const steps = [
  `create table if not exists league_messages (
    id uuid primary key default gen_random_uuid(),
    league_id uuid references leagues(id) on delete cascade,
    user_id uuid references profiles(id),
    content text not null,
    created_at timestamptz default now(),
    constraint content_length check (char_length(content) between 1 and 500)
  )`,
  `create index if not exists idx_league_messages_league_date on league_messages(league_id, created_at asc)`,
  `alter table league_messages enable row level security`,
  `drop policy if exists "league_messages_select" on league_messages`,
  `create policy "league_messages_select" on league_messages
    for select using (public.is_league_member(league_id))`,
  `drop policy if exists "league_messages_insert" on league_messages`,
  `create policy "league_messages_insert" on league_messages
    for insert with check (auth.uid() = user_id and public.is_league_member(league_id))`,
  `alter publication supabase_realtime add table league_messages`,
]

for (const [i, step] of steps.entries()) {
  try {
    await sql(step)
    console.log(`✓ Step ${i + 1}`)
  } catch (e) {
    console.error(`✗ Step ${i + 1}:`, e.message)
  }
}
