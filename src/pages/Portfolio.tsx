import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { getStockQuote } from "@/api/finnhub";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { useUserProfile, useHoldings, useTransactions } from "@/hooks/usePaperPortfolio";
import { num } from "@/lib/money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type HoldingView = {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
};

/** Finnhub quotes for holdings refresh on this interval (ms). */
const HOLDINGS_QUOTE_REFRESH_MS = 2 * 60 * 1000;

export default function Portfolio() {
  const { data: profile } = useUserProfile();
  const { data: holdings = [] } = useHoldings();
  const { data: transactions = [] } = useTransactions(80);

  const [realHoldings, setRealHoldings] = useState<HoldingView[]>([]);
  const holdingsRef = useRef(holdings);
  holdingsRef.current = holdings;

  const cashBalance = profile ? num(profile.cash_balance) : 0;
  const confidence = profile?.confidence_score ?? 0;

  const holdingKey = useMemo(
    () => holdings.map((h) => `${h.stock_symbol}:${h.shares}:${h.avg_buy_price}`).join("|"),
    [holdings],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHoldings() {
      const list = holdingsRef.current;
      if (!list.length) {
        if (!cancelled) setRealHoldings([]);
        return;
      }
      const rows = await Promise.all(
        list.map(async (h) => {
          const shares = num(h.shares);
          const avgPrice = num(h.avg_buy_price);
          let currentPrice = avgPrice;
          try {
            const data = await getStockQuote(h.stock_symbol);
            currentPrice = data.c;
          } catch {
            /* fallback */
          }
          const name = h.company_name?.trim() || h.stock_symbol;
          return { symbol: h.stock_symbol, name, shares, avgPrice, currentPrice };
        }),
      );
      if (!cancelled) setRealHoldings(rows);
    }

    void loadHoldings();
    const intervalId = window.setInterval(() => void loadHoldings(), HOLDINGS_QUOTE_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [holdingKey]);

  const portfolioValue = realHoldings.reduce((sum, h) => sum + h.currentPrice * h.shares, 0);
  const totalValue = cashBalance + portfolioValue;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-foreground">Portfolio</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Cash Balance", value: `$${cashBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Portfolio Value", value: `$${portfolioValue.toFixed(2)}` },
          { label: "Total Value", value: `$${totalValue.toFixed(2)}` },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-warning" />
            <span className="font-display font-semibold text-foreground text-sm">Confidence Score</span>
          </div>
          <span className="font-display font-bold text-warning">{confidence}/100</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${Math.min(100, confidence)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Based on your experience level at signup (0–100).</p>
      </div>

      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 mb-4">
          <h2 className="font-display font-semibold text-foreground">Holdings</h2>
          <p className="text-xs text-muted-foreground">Live prices refresh every 2 minutes.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="h-10 px-3 text-xs text-muted-foreground">Symbol</TableHead>
              <TableHead className="h-10 px-3 text-xs text-muted-foreground text-right">Price bought</TableHead>
              <TableHead className="h-10 px-3 text-xs text-muted-foreground text-right">Shares</TableHead>
              <TableHead className="h-10 px-3 text-xs text-muted-foreground text-right">Price now</TableHead>
              <TableHead className="h-10 px-3 text-xs text-muted-foreground text-right">P / L ($)</TableHead>
              <TableHead className="h-10 px-3 text-xs text-muted-foreground text-right">P / L (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {realHoldings.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No holdings yet. Buy from Market!
                </TableCell>
              </TableRow>
            ) : (
              realHoldings.map((h) => {
                const gainPct = h.avgPrice > 0 ? ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0;
                const totalGain = (h.currentPrice - h.avgPrice) * h.shares;
                const up = totalGain >= 0;
                const plClass = up ? "text-primary" : "text-destructive";
                return (
                  <TableRow key={h.symbol}>
                    <TableCell className="px-3 py-2.5">
                      <p className="font-display font-semibold text-foreground">{h.symbol}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[10rem] sm:max-w-[14rem]">{h.name}</p>
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-right tabular-nums text-foreground">${h.avgPrice.toFixed(2)}</TableCell>
                    <TableCell className="px-3 py-2.5 text-right tabular-nums text-foreground">{h.shares.toFixed(4)}</TableCell>
                    <TableCell className="px-3 py-2.5 text-right tabular-nums text-foreground">${h.currentPrice.toFixed(2)}</TableCell>
                    <TableCell className={`px-3 py-2.5 text-right tabular-nums ${plClass}`}>
                      <span className="inline-flex items-center justify-end gap-1 text-sm font-display font-semibold">
                        {up ? <TrendingUp className="h-3.5 w-3.5 shrink-0" /> : <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
                        {totalGain >= 0 ? "+" : "-"}${Math.abs(totalGain).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className={`px-3 py-2.5 text-right tabular-nums text-sm font-medium ${plClass}`}>
                      {gainPct >= 0 ? "+" : ""}
                      {gainPct.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="glass-card p-5">
        <h2 className="font-display font-semibold text-foreground mb-4">Trade History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-border/50">
                <th className="text-left pb-2 font-medium">Date</th>
                <th className="text-left pb-2 font-medium">Type</th>
                <th className="text-left pb-2 font-medium">Symbol</th>
                <th className="text-right pb-2 font-medium">Shares</th>
                <th className="text-right pb-2 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No trades yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border/30 last:border-0">
                    <td className="py-2 text-muted-foreground">{new Date(t.recorded_at).toLocaleString()}</td>
                    <td className={`py-2 font-medium ${t.type === "BUY" ? "text-primary" : "text-destructive"}`}>{t.type}</td>
                    <td className="py-2 font-display font-semibold text-foreground">{t.stock_symbol}</td>
                    <td className="py-2 text-right text-foreground">{Number(num(t.shares)).toFixed(4)}</td>
                    <td className="py-2 text-right text-foreground">${num(t.prices).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
