-- One-time 2025/26 backfill. The league had no transfers during this season,
-- so each currently active squad player is treated as owned from the season start.
-- This makes all completed official FPL fixtures score against the existing squads.
update public.squad_players
set acquired_at = '2025-08-01T00:00:00Z'
where released_at is null
  and acquired_at > '2025-08-01T00:00:00Z';
