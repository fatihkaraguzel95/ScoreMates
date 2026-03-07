-- League chat messages
-- Run this after schema.sql in your Supabase SQL editor

create table league_messages (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

alter table league_messages enable row level security;

-- Only league members can read messages
create policy "league_messages_select" on league_messages for select
  using (exists (
    select 1 from league_members lm
    where lm.league_id = league_messages.league_id and lm.user_id = auth.uid()
  ));

-- Only league members can send messages as themselves
create policy "league_messages_insert" on league_messages for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from league_members lm
      where lm.league_id = league_messages.league_id and lm.user_id = auth.uid()
    )
  );

-- Enable realtime for this table (run in Supabase dashboard or via CLI)
-- alter publication supabase_realtime add table league_messages;
