-- Run once in Supabase SQL Editor.
alter table public.squad_players add column if not exists score_offset_gameweek integer;
alter table public.squad_players add column if not exists score_offset_points integer not null default 0;

create table if not exists public.squad_player_gameweeks (
  squad_id uuid not null references public.squads on delete cascade,
  fpl_id integer not null references public.fpl_players on delete restrict,
  gameweek integer not null check (gameweek between 1 and 38),
  points integer not null default 0,
  recorded_at timestamptz not null default now(),
  primary key (squad_id, fpl_id, gameweek)
);

alter table public.squad_player_gameweeks enable row level security;
drop policy if exists "league members view squad gameweek history" on public.squad_player_gameweeks;
create policy "league members view squad gameweek history" on public.squad_player_gameweeks for select using (auth.uid() is not null);
