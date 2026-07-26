-- Official FPL 2026/27 player list, deliberately separate from the completed 2025/26 archive.
create table if not exists public.fpl_players_2026_27 (
  fpl_id integer primary key,
  season text not null default '2026/27',
  web_name text not null,
  first_name text,
  second_name text,
  team_id integer,
  team_name text not null,
  position text not null check (position in ('GK', 'DEF', 'MID', 'FWD')),
  current_price integer not null default 0,
  photo text,
  status text,
  raw jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fpl_players_2026_27_position_idx on public.fpl_players_2026_27 (position);
create index if not exists fpl_players_2026_27_team_idx on public.fpl_players_2026_27 (team_name);
alter table public.fpl_players_2026_27 enable row level security;
revoke all on public.fpl_players_2026_27 from anon, authenticated;
