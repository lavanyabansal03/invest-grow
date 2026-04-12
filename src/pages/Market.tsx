import { useState, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getStockQuote } from "@/api/finnhub";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/usePaperPortfolio";
import { num } from "@/lib/money";

const allStocks = [
  { symbol: "AAPL", name: "Apple Inc.", price: 189.84, change: 1.25 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 378.91, change: -0.3 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 141.8, change: 0.62 },
  { symbol: "AMZN", name: "Amazon.com", price: 186.13, change: 1.75 },
  { symbol: "NVDA", name: "NVIDIA Corp.", price: 875.38, change: 1.44 },
  { symbol: "TSLA", name: "Tesla Inc.", price: 248.42, change: -2.1 },
  { symbol: "META", name: "Meta Platforms", price: 505.15, change: 0.88 },
  { symbol: "JPM", name: "JPMorgan Chase", price: 198.47, change: 0.33 },
];

export default function Market() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();

  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<(typeof allStocks)[0] | null>(null);
  const [buyMode, setBuyMode] = useState<"shares" | "dollars">("shares");
  const [buyAmount, setBuyAmount] = useState("");
  const [stocksList, setStocksList] = useState(allStocks);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    async function loadRealPrices() {
      const updated = await Promise.all(
        allStocks.map(async (stock) => {
          try {
            const data = await getStockQuote(stock.symbol);
            return {
              ...stock,
              price: data.c,
              change: data.dp,
            };
          } catch (e) {
            console.error(`Failed to fetch ${stock.symbol}`, e);
            return stock;
          }
        }),
      );
      setStocksList(updated);

      setSelectedStock((prev) => {
        if (!prev) return prev;
        return updated.find((s) => s.symbol === prev.symbol) || prev;
      });
    }

    loadRealPrices();
  }, []);

  const cash = profile ? num(profile.cash_balance) : 0;

  const computeShares = (): number | null => {
    if (!selectedStock || !buyAmount.trim()) return null;
    const raw = parseFloat(buyAmount);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    if (buyMode === "shares") return raw;
    const s = raw / selectedStock.price;
    return Math.round(s * 1e6) / 1e6;
  };

  const handleBuy = async () => {
    if (!selectedStock) return;
    const shares = computeShares();
    if (shares == null || shares <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid number of shares or dollars.", variant: "destructive" });
      return;
    }

    const total = shares * selectedStock.price;
    if (total > cash + 1e-6) {
      toast({ title: "Insufficient cash", description: `You have $${cash.toFixed(2)} available.`, variant: "destructive" });
      return;
    }

    setBuyLoading(true);
    try {
      const { error } = await supabase.rpc("execute_paper_buy", {
        p_symbol: selectedStock.symbol,
        p_company_name: selectedStock.name,
        p_shares: shares,
        p_price: selectedStock.price,
      });

      if (error) throw error;

      toast({
        title: `Bought ${selectedStock.symbol}`,
        description: `${shares.toFixed(4)} shares for ~$${total.toFixed(2)}.`,
      });
      setBuyAmount("");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["holdings"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Buy failed.";
      toast({ title: "Order failed", description: message, variant: "destructive" });
    } finally {
      setBuyLoading(false);
    }
  };

  const filtered = query
    ? stocksList.filter(
        (s) =>
          s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()),
      )
    : stocksList;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Market</h1>
        <p className="text-sm text-muted-foreground">Search and trade stocks</p>
      </div>

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
        <div className="lg:col-span-2 space-y-2">
          {filtered.map((stock) => (
            <motion.button
              key={stock.symbol}
              type="button"
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
                  {stock.change >= 0 ? "+" : ""}
                  {stock.change.toFixed(2)}%
                </div>
              </div>
            </motion.button>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No stocks found</p>}
        </div>

        <div className="glass-card p-5 h-fit sticky top-6">
          {profile && (
            <p className="text-xs text-muted-foreground mb-3">
              Cash balance: <span className="font-display font-semibold text-foreground">${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          )}
          {selectedStock ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-foreground">{selectedStock.symbol}</h2>
                <p className="text-sm text-muted-foreground">{selectedStock.name}</p>
                <p className="text-2xl font-display font-bold text-foreground mt-2">${selectedStock.price.toFixed(2)}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={buyMode === "shares" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBuyMode("shares")}
                  className={buyMode === "shares" ? "bg-primary text-primary-foreground" : "border-border text-muted-foreground"}
                >
                  Shares
                </Button>
                <Button
                  type="button"
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
                    : `≈ ${(parseFloat(buyAmount) / selectedStock.price).toFixed(6)} shares`}
                </p>
              )}

              <Button
                type="button"
                disabled={buyLoading || !computeShares()}
                onClick={handleBuy}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold flex items-center justify-center gap-2"
              >
                {buyLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Processing…
                  </>
                ) : (
                  `Buy ${selectedStock.symbol}`
                )}
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
