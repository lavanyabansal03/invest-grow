import { useState } from "react";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const allStocks = [
  { symbol: "AAPL", name: "Apple Inc.", price: 189.84, change: 1.25 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 378.91, change: -0.30 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 141.80, change: 0.62 },
  { symbol: "AMZN", name: "Amazon.com", price: 186.13, change: 1.75 },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 875.38, change: 1.44 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.42, change: -2.10 },
  { symbol: "META", name: "Meta Platforms", price: 505.15, change: 0.88 },
  { symbol: "JPM", name: "JPMorgan Chase", price: 198.47, change: 0.33 },
];

export default function Market() {
  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<typeof allStocks[0] | null>(null);
  const [buyMode, setBuyMode] = useState<"shares" | "dollars">("shares");
  const [buyAmount, setBuyAmount] = useState("");

  const filtered = query
    ? allStocks.filter((s) => s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()))
    : allStocks;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Market</h1>
        <p className="text-sm text-muted-foreground">Search and trade stocks</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks (e.g. AAPL, Tesla)..."
          className="pl-10 bg-secondary border-border text-foreground"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stock list */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.map((stock) => (
            <motion.button
              key={stock.symbol}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedStock(stock)}
              className={`w-full glass-card p-4 flex items-center justify-between transition-all ${
                selectedStock?.symbol === stock.symbol ? "border-primary/50" : ""
              }`}
            >
              <div className="text-left">
                <p className="font-display font-semibold text-foreground">{stock.symbol}</p>
                <p className="text-xs text-muted-foreground">{stock.name}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-semibold text-foreground">${stock.price.toFixed(2)}</p>
                <div className={`flex items-center gap-1 text-xs ${stock.change >= 0 ? "text-primary" : "text-destructive"}`}>
                  {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                </div>
              </div>
            </motion.button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No stocks found</p>
          )}
        </div>

        {/* Buy panel */}
        <div className="glass-card p-5 h-fit sticky top-6">
          {selectedStock ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">{selectedStock.symbol}</h2>
                <p className="text-sm text-muted-foreground">{selectedStock.name}</p>
                <p className="text-2xl font-display font-bold text-foreground mt-2">${selectedStock.price.toFixed(2)}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={buyMode === "shares" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBuyMode("shares")}
                  className={buyMode === "shares" ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}
                >
                  Shares
                </Button>
                <Button
                  variant={buyMode === "dollars" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBuyMode("dollars")}
                  className={buyMode === "dollars" ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}
                >
                  Dollars
                </Button>
              </div>

              <Input
                type="number"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder={buyMode === "shares" ? "Number of shares" : "Dollar amount"}
                className="bg-secondary border-border text-foreground"
              />

              {buyAmount && (
                <p className="text-xs text-muted-foreground">
                  {buyMode === "shares"
                    ? `Total: $${(parseFloat(buyAmount) * selectedStock.price).toFixed(2)}`
                    : `≈ ${(parseFloat(buyAmount) / selectedStock.price).toFixed(4)} shares`}
                </p>
              )}

              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold">
                Buy {selectedStock.symbol}
              </Button>
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">Select a stock to trade</p>
          )}
        </div>
      </div>
    </div>
  );
}
