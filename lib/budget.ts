export type BudgetMembership = { id:string; purchase_price:number; acquired_at:string; released_at:string | null };

export const saleReturn = (price:number) => Math.floor((price / 2) / 5) * 5;

export function remainingBudget(memberships:BudgetMembership[], at?:string) {
  const cutoff = at ? new Date(at).getTime() : Number.POSITIVE_INFINITY;
  let balance = 1000;
  // Treat the squad history as a financial ledger. This does not rely on a
  // sale and purchase sharing the same timestamp, so monthly balances remain
  // correct even when transfer records were created at slightly different times.
  for (const player of memberships) {
    if (new Date(player.acquired_at).getTime() < cutoff) balance -= player.purchase_price;
    if (player.released_at && new Date(player.released_at).getTime() < cutoff) balance += saleReturn(player.purchase_price);
  }
  return balance;
}

export function currentSeasonBudgetDate(now = new Date()) {
  const seasonEnd = new Date(Date.parse('2025-08-12T05:00:00.000Z') + 42 * 7 * 24 * 60 * 60 * 1000).toISOString();
  const current = now.toISOString();
  return current < seasonEnd ? current : seasonEnd;
}
