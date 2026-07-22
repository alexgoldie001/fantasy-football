-- The app only accesses league data through authenticated server routes.
-- Keep the browser's Supabase key unable to read or change application tables.
alter table public.leagues enable row level security;
alter table public.scoring_rules enable row level security;
alter table public.fpl_fixture_player_stats enable row level security;
alter table public.season_final_standings enable row level security;

drop policy if exists "league members view profiles" on public.profiles;
drop policy if exists "league members view squads" on public.squads;
drop policy if exists "league members view squad players" on public.squad_players;
drop policy if exists "league members view squad gameweek history" on public.squad_player_gameweeks;
drop policy if exists "league members view scores" on public.gameweek_scores;
drop policy if exists "league members view players" on public.fpl_players;
drop policy if exists "league members view windows" on public.transfer_windows;
drop policy if exists "league members view fixture player stats" on public.fpl_fixture_player_stats;
drop policy if exists "league members view final standings" on public.season_final_standings;
drop policy if exists "manager submits own bid" on public.transfer_bids;
drop policy if exists "manager views own bids" on public.transfer_bids;

-- No replacement policies are intentional: the public browser key receives no
-- table access. The server uses the service-role key, which bypasses RLS.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
