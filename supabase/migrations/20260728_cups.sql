create table if not exists public.cup_competitions (
  id uuid primary key default gen_random_uuid(), league_id uuid not null references public.leagues(id) on delete cascade,
  seeded_at timestamptz not null default now(), season text not null default '2025/26', unique (league_id, season)
);
create table if not exists public.cup_divisions (
  id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.cup_competitions(id) on delete cascade,
  name text not null, sort_order integer not null
);
create table if not exists public.cup_entries (
  id uuid primary key default gen_random_uuid(), division_id uuid not null references public.cup_divisions(id) on delete cascade,
  squad_id uuid not null references public.squads(id) on delete cascade, seed integer not null, unique (division_id, squad_id)
);
create table if not exists public.cup_fixtures (
  id uuid primary key default gen_random_uuid(), division_id uuid not null references public.cup_divisions(id) on delete cascade,
  round_number integer not null, home_squad_id uuid not null references public.squads(id), away_squad_id uuid not null references public.squads(id),
  starts_at timestamptz not null, ends_at timestamptz not null, unique (division_id, round_number, home_squad_id, away_squad_id)
);
alter table public.cup_competitions enable row level security;
alter table public.cup_divisions enable row level security;
alter table public.cup_entries enable row level security;
alter table public.cup_fixtures enable row level security;
create policy "league members read cups" on public.cup_competitions for select using (auth.uid() is not null);
create policy "league members read cup divisions" on public.cup_divisions for select using (auth.uid() is not null);
create policy "league members read cup entries" on public.cup_entries for select using (auth.uid() is not null);
create policy "league members read cup fixtures" on public.cup_fixtures for select using (auth.uid() is not null);
