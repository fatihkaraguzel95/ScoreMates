-- ScoreMates Database Schema
-- Run this in your Supabase SQL editor

-- profiles (auth.users extends)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  display_name text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- leagues
create table leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid references profiles(id),
  season_year int not null default extract(year from now()),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- league_members
create table league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id),
  joined_at timestamptz default now(),
  unique(league_id, user_id)
);

-- matches (synced from API)
create table matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique not null,
  home_team text not null,
  away_team text not null,
  home_team_logo text,
  away_team_logo text,
  match_date timestamptz not null,
  week_number int not null,
  season_year int not null,
  status text default 'scheduled', -- scheduled | live | finished
  home_score int,
  away_score int,
  created_at timestamptz default now()
);

-- predictions
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  match_id uuid references matches(id),
  league_id uuid references leagues(id),
  predicted_home int not null,
  predicted_away int not null,
  points_earned int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, match_id, league_id)
);

-- weekly_points (weekly score summary)
create table weekly_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  league_id uuid references leagues(id),
  week_number int not null,
  season_year int not null,
  points int default 0,
  predictions_made int default 0,
  unique(user_id, league_id, week_number, season_year)
);

-- settings (admin key-value store)
create table settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz default now()
);

-- ─── RLS Policies ────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table weekly_points enable row level security;
alter table settings enable row level security;

-- profiles: everyone can read, only own profile can update
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- leagues: everyone can read, authenticated users can create
create policy "leagues_select" on leagues for select using (true);
create policy "leagues_insert" on leagues for insert with check (auth.uid() is not null);
create policy "leagues_update" on leagues for update using (auth.uid() = created_by);

-- league_members: members can see, users can add own membership
create policy "league_members_select" on league_members for select
  using (auth.uid() = user_id or exists (
    select 1 from league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid()
  ));
create policy "league_members_insert" on league_members for insert with check (auth.uid() = user_id);
create policy "league_members_delete" on league_members for delete using (auth.uid() = user_id);

-- matches: everyone can read, service role writes
create policy "matches_select" on matches for select using (true);

-- predictions: user sees own, league members see all in league
create policy "predictions_select" on predictions for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from league_members lm
      where lm.league_id = predictions.league_id and lm.user_id = auth.uid()
    )
  );
create policy "predictions_insert" on predictions for insert
  with check (auth.uid() = user_id and exists (
    select 1 from league_members lm
    where lm.league_id = predictions.league_id and lm.user_id = auth.uid()
  ));
create policy "predictions_update" on predictions for update
  using (auth.uid() = user_id);

-- weekly_points: members can see
create policy "weekly_points_select" on weekly_points for select
  using (exists (
    select 1 from league_members lm
    where lm.league_id = weekly_points.league_id and lm.user_id = auth.uid()
  ));

-- settings: no RLS (service role only or admin check in app layer)
create policy "settings_select" on settings for select using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- ─── Trigger: auto-create profile on signup ──────────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
