export type BudgetMembership = { id:string; purchase_price:number; acquired_at:string; released_at:string | null };

const saleReturn = (price:number) => Math.floor((price / 2) / 5) * 5;

export function remainingBudget(memberships:BudgetMembership[], at?:string) {
  const cutoff = at ? new Date(at).getTime() : Number.POSITIVE_INFINITY;
  let balance = 1000;
  const ordered = [...memberships].sort((a, b) => a.acquired_at.localeCompare(b.acquired_at));
  for (const player of ordered) {
    if (new Date(player.acquired_at).getTime() >= cutoff) continue;
    const outgoing = memberships.find(previous => previous.id !== player.id && previous.released_at === player.acquired_at);
    balance += outgoing ? saleReturn(outgoing.purchase_price) - player.purchase_price : -player.purchase_price;
  }
  return balance;
}

export function currentSeasonBudgetDate(now = new Date()) {
  const seasonEnd = new Date(Date.parse('2025-08-12T05:00:00.000Z') + 42 * 7 * 24 * 60 * 60 * 1000).toISOString();
  const current = now.toISOString();
  return current < seasonEnd ? current : seasonEnd;
}
