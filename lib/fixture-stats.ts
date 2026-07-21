import { supabaseAdmin } from '@/lib/supabase-admin';

export type FixtureStat = {
  fixture_id: number;
  fpl_id: number;
  gameweek: number;
  kickoff_at: string;
  points_excluding_bonus: number;
  goals: number;
  assists: number;
  clean_sheets: number;
};

const PAGE_SIZE = 1000;
const SEASON_START = '2025-08-01T00:00:00.000Z';
const SEASON_END = '2026-06-01T00:00:00.000Z';

/**
 * Loads one canonical set of fixture rows for the active season.  Explicit
 * ordering is essential when paging Supabase results; the de-duplication is a
 * defensive guard so a fixture can never be counted twice in a score total.
 */
export async function loadSeasonFixtureStats(playerIds: number[]) {
  if (!playerIds.length) return [] as FixtureStat[];

  const db = supabaseAdmin();
  const baseQuery = () => db
    .from('fpl_fixture_player_stats')
    .select('fixture_id,fpl_id,gameweek,kickoff_at,points_excluding_bonus,goals,assists,clean_sheets')
    .in('fpl_id', playerIds)
    .gte('kickoff_at', SEASON_START)
    .lt('kickoff_at', SEASON_END)
    .order('fpl_id', { ascending: true })
    .order('fixture_id', { ascending: true });

  const { count, error: countError } = await db
    .from('fpl_fixture_player_stats')
    .select('*', { count: 'exact', head: true })
    .in('fpl_id', playerIds)
    .gte('kickoff_at', SEASON_START)
    .lt('kickoff_at', SEASON_END);
  if (countError) throw countError;

  const pages = await Promise.all(
    Array.from({ length: Math.ceil((count || 0) / PAGE_SIZE) }, (_, page) =>
      baseQuery().range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1),
    ),
  );

  const fixtures = new Map<string, FixtureStat>();
  for (const page of pages) {
    if (page.error) throw page.error;
    for (const stat of (page.data || []) as FixtureStat[]) {
      fixtures.set(`${stat.fpl_id}:${stat.fixture_id}`, stat);
    }
  }
  return [...fixtures.values()];
}
