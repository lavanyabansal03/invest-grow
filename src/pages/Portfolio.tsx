import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { getStockQuote } from "@/api/finnhub";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { useUserProfile, useHoldings, useTransactions } from "@/hooks/usePaperPortfolio";
import { num } from "@/lib/money";

type HoldingView = {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
};

export default function Portfolio() {
  const { data: profile } = useUserProfile();
  const { data: holdings = [] } = useHoldings();
  const { data: transactions = [] } = useTransactions(80);

  const [realHoldings, setRealHoldings] = useState<HoldingView[]>([]);

  const cashBalance = profile ? num(profile.cash_balance) : 0;
  const confidence = profile?.confidence_score ?? 0;

  const holdingKey = useMemo(
    () => holdings.map((h) => `${h.stock_symbol}:${h.shares}:${h.avg_buy_price}`).join("|"),
    [holdings],
  );

  useEffect(() => {
    async function loadHoldings() {
      if (!holdings.length) {
        setRealHoldings([]);
        return;
      }
      const rows = await Promise.all(
        holdings.map(async (h) => {
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
      setRealHoldings(rows);
    }
    loadHoldings();
  }, [holdingKey, holdings]);

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
        <h2 className="font-display font-semibold text-foreground mb-4">Holdings</h2>
        <div className="space-y-3">
          {realHoldings.map((h) => {
            const gain = ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100;
            const totalGain = (h.currentPrice - h.avgPrice) * h.shares;
            return (
              <div key={h.symbol} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                <div>
                  <p className="font-display font-semibold text-foreground">{h.symbol}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.name} · {h.shares} shares @ ${h.avgPrice.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display font-semibold text-foreground">${(h.currentPrice * h.shares).toFixed(2)}</p>
                  <div className={`flex items-center justify-end gap-1 text-xs ${gain >= 0 ? "text-primary" : "text-destructive"}`}>
                    {gain >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {totalGain >= 0 ? "+" : ""}${totalGain.toFixed(2)} ({gain.toFixed(2)}%)
                  </div>
                </div>
              </div>
            );
          })}
          {realHoldings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No holdings yet. Buy from Market!</p>}
        </div>
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
