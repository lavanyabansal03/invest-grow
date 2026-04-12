import { TrendingUp, TrendingDown, Flame, Target, DollarSign, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
const mockChartData = [
  { day: "Mon", value: 5000 },
  { day: "Tue", value: 5120 },
  { day: "Wed", value: 4980 },
  { day: "Thu", value: 5300 },
  { day: "Fri", value: 5450 },
  { day: "Sat", value: 5380 },
  { day: "Sun", value: 5600 },
];

const topStocks = [
  { symbol: "AAPL", name: "Apple Inc.", price: 189.84, change: 2.34 },
  { symbol: "MSFT", name: "Microsoft", price: 378.91, change: -1.12 },
  { symbol: "GOOGL", name: "Alphabet", price: 141.80, change: 0.87 },
  { symbol: "AMZN", name: "Amazon", price: 186.13, change: 3.21 },
  { symbol: "NVDA", name: "NVIDIA", price: 875.38, change: 12.45 },
];

const holdings = [
  { symbol: "AAPL", shares: 5, avgPrice: 182.50, currentPrice: 189.84 },
  { symbol: "NVDA", shares: 2, avgPrice: 850.00, currentPrice: 875.38 },
];

const card = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export default function Dashboard() {
  const cashBalance = 3474.12;
  const portfolioValue = 2700.96;
  const totalValue = cashBalance + portfolioValue;
  const profitPct = ((totalValue - 5000) / 5000) * 100;
  const confidence = 42;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground font-body">Welcome back, Trader!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Cash Balance", value: `$${cashBalance.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
          { label: "Portfolio Value", value: `$${portfolioValue.toLocaleString()}`, icon: BarChart3, color: "text-info" },
          { label: "Total Return", value: `${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(2)}%`, icon: profitPct >= 0 ? TrendingUp : TrendingDown, color: profitPct >= 0 ? "text-primary" : "text-destructive" },
          { label: "Confidence", value: `${confidence}/100`, icon: Target, color: "text-warning" },
        ].map((stat, i) => (
          <motion.div key={stat.label} {...card(i * 0.1)} className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-body">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="font-display text-xl font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Streak */}
      <motion.div {...card(0.4)} className="glass-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
          <Flame className="h-5 w-5 text-warning" />
        </div>
        <div>
          <p className="font-display font-semibold text-foreground">3-Day Streak 🔥</p>
          <p className="text-xs text-muted-foreground">Keep it up! Log in daily to grow your streak.</p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Portfolio Chart */}
        <motion.div {...card(0.5)} className="glass-card p-5 lg:col-span-2">
          <h2 className="font-display font-semibold text-foreground mb-4">Portfolio Performance</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockChartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160,84%,39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(215,12%,55%)", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(215,12%,55%)", fontSize: 12 }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "hsl(220,18%,12%)", border: "1px solid hsl(220,14%,18%)", borderRadius: "8px", color: "hsl(210,20%,95%)" }}
              />
              <Area type="monotone" dataKey="value" stroke="hsl(160,84%,39%)" fill="url(#colorValue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Holdings */}
        <motion.div {...card(0.6)} className="glass-card p-5">
          <h2 className="font-display font-semibold text-foreground mb-4">Holdings</h2>
          <div className="space-y-3">
            {holdings.map((h) => {
              const gain = ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100;
              return (
                <div key={h.symbol} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-display font-semibold text-foreground text-sm">{h.symbol}</p>
                    <p className="text-xs text-muted-foreground">{h.shares} shares</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">${(h.currentPrice * h.shares).toFixed(2)}</p>
                    <p className={`text-xs ${gain >= 0 ? "text-primary" : "text-destructive"}`}>
                      {gain >= 0 ? "+" : ""}{gain.toFixed(2)}%
                    </p>
                  </div>
                </div>
              );
            })}
            {holdings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No holdings yet. Start trading!</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Market Overview */}
      <motion.div {...card(0.7)} className="glass-card p-5">
        <h2 className="font-display font-semibold text-foreground mb-4">Market Overview — Top 5</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs border-b border-border/50">
                <th className="text-left pb-2 font-medium">Symbol</th>
                <th className="text-left pb-2 font-medium">Name</th>
                <th className="text-right pb-2 font-medium">Price</th>
                <th className="text-right pb-2 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {topStocks.map((stock) => (
                <tr key={stock.symbol} className="border-b border-border/30 last:border-0">
                  <td className="py-3 font-display font-semibold text-foreground">{stock.symbol}</td>
                  <td className="py-3 text-muted-foreground">{stock.name}</td>
                  <td className="py-3 text-right text-foreground">${stock.price.toFixed(2)}</td>
                  <td className={`py-3 text-right font-medium ${stock.change >= 0 ? "text-primary" : "text-destructive"}`}>
                    {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
