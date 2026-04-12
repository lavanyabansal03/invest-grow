import { num } from "@/lib/money";
import type { HoldingRow, ProfileRow } from "@/hooks/usePaperPortfolio";

export function portfolioBookValue(holdings: HoldingRow[]): number {
  return holdings.reduce((sum, h) => sum + num(h.shares) * num(h.avg_buy_price), 0);
}

/**
 * Total return % vs starting cash: (cash + holdings at cost) / starting − 1.
 * Matches “account value vs what you started with” before live marks.
 */
export function computeTotalReturnPct(profile: ProfileRow | null | undefined, holdings: HoldingRow[]): number | null {
  if (!profile) return null;
  const start = Math.max(num(profile.starting_cash), 1);
  const total = num(profile.cash_balance) + portfolioBookValue(holdings);
  return ((total - start) / start) * 100;
}
