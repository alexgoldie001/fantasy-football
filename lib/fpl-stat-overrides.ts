type StatValue = { identifier: string; points?: number; value: number };

/**
 * Corrections where the league has deliberately chosen a result that differs
 * from FPL's published event feed. Keep these narrowly scoped to a player and
 * fixture so they remain auditable and are re-applied every time FPL data is
 * refreshed.
 */
const FIXTURE_STAT_OVERRIDES: Record<string, Record<string, number>> = {
  // João Gomes: TFF awarded both cards in GW1; FPL publishes only the red.
  '54:7': { yellow_cards: 1 },
};

export function applyFixtureStatOverrides(fplId: number, fixtureId: number, stats: Map<string, StatValue>) {
  const overrides = FIXTURE_STAT_OVERRIDES[`${fplId}:${fixtureId}`];
  if (!overrides) return;
  for (const [identifier, value] of Object.entries(overrides)) {
    const existing = stats.get(identifier);
    stats.set(identifier, { identifier, points: existing?.points || 0, value });
  }
}

export function applyFixtureStatOverridesToRow<T extends { fpl_id: number; fixture_id: number; raw?: { stats?: StatValue[] } | null }>(row: T): T {
  const stats = new Map((row.raw?.stats || []).map(stat => [stat.identifier, stat]));
  applyFixtureStatOverrides(row.fpl_id, row.fixture_id, stats);
  return { ...row, raw: { ...row.raw, stats: [...stats.values()] } };
}
