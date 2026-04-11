import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

const holdings = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 5, avgPrice: 182.50, currentPrice: 189.84 },
  { symbol: "NVDA", name: "NVIDIA Corp.", shares: 2, avgPrice: 850.00, currentPrice: 875.38 },
];

const tradeHistory = [
  { date: "2024-01-15", type: "BUY", symbol: "AAPL", shares: 5, price: 182.50 },
  { date: "2024-01-16", type: "BUY", symbol: "NVDA", shares: 2, price: 850.00 },
];

export default function Portfolio() {
  const cashBalance = 3474.12;
  const portfolioValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.shares, 0);
  const totalValue = cashBalance + portfolioValue;
  const confidence = 42;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-foreground">Portfolio</h1>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Cash Balance", value: `$${cashBalance.toLocaleString()}` },
          { label: "Portfolio Value", value: `$${portfolioValue.toFixed(2)}` },
          { label: "Total Value", value: `$${totalValue.toFixed(2)}` },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Confidence */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-warning" />
            <span className="font-display font-semibold text-foreground text-sm">Confidence Score</span>
          </div>
          <span className="font-display font-bold text-warning">{confidence}/100</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-warning rounded-full transition-all" style={{ width: `${confidence}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Keep learning and trading to increase your confidence!</p>
      </div>

      {/* Holdings */}
      <div className="glass-card p-5">
        <h2 className="font-display font-semibold text-foreground mb-4">Holdings</h2>
        <div className="space-y-3">
          {holdings.map((h) => {
            const gain = ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100;
            const totalGain = (h.currentPrice - h.avgPrice) * h.shares;
            return (
              <div key={h.symbol} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                <div>
                  <p className="font-display font-semibold text-foreground">{h.symbol}</p>
                  <p className="text-xs text-muted-foreground">{h.name} · {h.shares} shares @ ${h.avgPrice}</p>
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
        </div>
      </div>

      {/* Trade History */}
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
              {tradeHistory.map((t, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0">
                  <td className="py-2 text-muted-foreground">{t.date}</td>
                  <td className={`py-2 font-medium ${t.type === "BUY" ? "text-primary" : "text-destructive"}`}>{t.type}</td>
                  <td className="py-2 font-display font-semibold text-foreground">{t.symbol}</td>
                  <td className="py-2 text-right text-foreground">{t.shares}</td>
                  <td className="py-2 text-right text-foreground">${t.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
