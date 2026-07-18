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
