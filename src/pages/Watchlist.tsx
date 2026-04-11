import { useState } from "react";
import { Star, TrendingUp, TrendingDown, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const initialWatchlist = [
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.42, change: -2.10 },
  { symbol: "META", name: "Meta Platforms", price: 505.15, change: 0.88 },
];

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState(initialWatchlist);
  const [newSymbol, setNewSymbol] = useState("");
  const { toast } = useToast();

  const addStock = () => {
    if (!newSymbol.trim()) return;
    if (watchlist.length >= 5) {
      toast({ title: "Watchlist full", description: "Maximum 5 stocks allowed.", variant: "destructive" });
      return;
    }
    if (watchlist.some((s) => s.symbol === newSymbol.toUpperCase())) {
      toast({ title: "Already added", description: "This stock is already in your watchlist.", variant: "destructive" });
      return;
    }
    setWatchlist([...watchlist, { symbol: newSymbol.toUpperCase(), name: "Stock", price: 100 + Math.random() * 200, change: (Math.random() - 0.5) * 5 }]);
    setNewSymbol("");
  };

  const removeStock = (symbol: string) => {
    setWatchlist(watchlist.filter((s) => s.symbol !== symbol));
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Watchlist</h1>
        <p className="text-sm text-muted-foreground">{watchlist.length}/5 stocks</p>
      </div>

      {/* Add */}
      <div className="flex gap-2">
        <Input
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Add symbol (e.g. AAPL)"
          className="bg-secondary border-border text-foreground"
          onKeyDown={(e) => e.key === "Enter" && addStock()}
        />
        <Button onClick={addStock} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {watchlist.map((stock) => (
          <motion.div
            key={stock.symbol}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Star className="h-4 w-4 text-warning fill-warning" />
              <div>
                <p className="font-display font-semibold text-foreground">{stock.symbol}</p>
                <p className="text-xs text-muted-foreground">{stock.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-display font-semibold text-foreground">${stock.price.toFixed(2)}</p>
                <div className={`flex items-center gap-1 text-xs ${stock.change >= 0 ? "text-primary" : "text-destructive"}`}>
                  {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}%
                </div>
              </div>
              <button onClick={() => removeStock(stock.symbol)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
        {watchlist.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Your watchlist is empty. Add stocks above!</p>
        )}
      </div>
    </div>
  );
}
