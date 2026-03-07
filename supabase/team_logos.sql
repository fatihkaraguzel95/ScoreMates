-- Team logos (base64 stored, managed by admin)
-- Run this in your Supabase SQL editor

create table team_logos (
  id uuid primary key default gen_random_uuid(),
  team_name text unique not null,
  logo_base64 text not null,
  size_percent int not null default 100,
  created_at timestamptz default now()
);

alter table team_logos enable row level security;

-- Everyone can read logos (needed to display on match cards)
create policy "team_logos_select" on team_logos for select using (true);

-- Only admins can insert/update/delete
create policy "team_logos_insert" on team_logos for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "team_logos_update" on team_logos for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "team_logos_delete" on team_logos for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
