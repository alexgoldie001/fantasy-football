export type BudgetMembership = { id:string; purchase_price:number; acquired_at:string; released_at:string | null };

export const saleReturn = (price:number) => Math.floor((price / 2) / 5) * 5;

// Older squad-history rows were saved as a date (rather than a full timestamp).
// The ownership table includes a boundary date in the period it displays, so the
// financial ledger must do the same.
function occursBeforeCutoff(value:string, cutoff:number) {
  const time = new Date(value).getTime();
  return time < cutoff || (/^\d{4}-\d{2}-\d{2}$/.test(value) && time === cutoff);
}

export function remainingBudget(memberships:BudgetMembership[], at?:string) {
  const cutoff = at ? new Date(at).getTime() : Number.POSITIVE_INFINITY;
  let balance = 1000;
  // Treat the squad history as a financial ledger. This does not rely on a
  // sale and purchase sharing the same timestamp, so monthly balances remain
  // correct even when transfer records were created at slightly different times.
  for (const player of memberships) {
    if (occursBeforeCutoff(player.acquired_at, cutoff)) balance -= player.purchase_price;
    if (player.released_at && occursBeforeCutoff(player.released_at, cutoff)) balance += saleReturn(player.purchase_price);
  }
  return balance;
}

export function currentSeasonBudgetDate(now = new Date()) {
  const seasonStart = '2026-08-01T00:00:00.000Z';
  const seasonEnd = new Date(Date.parse('2026-08-18T00:01:00.000Z') + 42 * 7 * 24 * 60 * 60 * 1000).toISOString();
  const current = now.toISOString();
  if (current < seasonStart) return seasonStart;
  return current < seasonEnd ? current : seasonEnd;
}
