-- Run once in Supabase SQL Editor. Stores official FPL fixture-level stats for auditable scoring.
create table if not exists public.fpl_fixture_player_stats (
  fpl_id integer not null references public.fpl_players on delete cascade,
  fixture_id integer not null,
  gameweek integer not null check (gameweek between 1 and 38),
  kickoff_at timestamptz not null,
  points_excluding_bonus integer not null default 0,
  goals integer not null default 0,
  assists integer not null default 0,
  clean_sheets integer not null default 0,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (fpl_id, fixture_id)
);
alter table public.fpl_fixture_player_stats enable row level security;
drop policy if exists "league members view fixture player stats" on public.fpl_fixture_player_stats;
create policy "league members view fixture player stats" on public.fpl_fixture_player_stats for select using (auth.uid() is not null);
