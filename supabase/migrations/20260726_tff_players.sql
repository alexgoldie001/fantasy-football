-- Telegraph Fantasy Football (TFF) 2025/26 player-stat archive.
-- Stored separately from FPL data so the two scoring systems cannot be mixed.
create table if not exists public.tff_players (
  tff_id integer primary key,
  season text not null default '2025/26',
  first_name text not null,
  last_name text not null,
  display_name text not null,
  squad_id integer,
  team_name text not null,
  team_code text,
  position text not null check (position in ('GK','DEF','MID','FWD')),
  current_price integer not null default 0,
  status text,
  raw jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tff_players_season_position_idx on public.tff_players (season, position);
create index if not exists tff_players_season_team_idx on public.tff_players (season, team_name);
alter table public.tff_players enable row level security;
revoke all on public.tff_players from anon, authenticated;
