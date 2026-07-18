-- Run once in the Supabase SQL editor. Stores immutable final standings for completed seasons.
create table if not exists public.season_final_standings (
  season text primary key,
  rows jsonb not null default '[]'::jsonb,
  archived_at timestamptz not null default now(),
  archived_by uuid references public.profiles(id) on delete set null
);

alter table public.season_final_standings enable row level security;
drop policy if exists "league members view final standings" on public.season_final_standings;
create policy "league members view final standings" on public.season_final_standings for select using (auth.uid() is not null);
