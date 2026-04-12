import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getStockQuote, searchStocks, type FinnhubSearchItem } from "@/api/finnhub";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/usePaperPortfolio";
import { num } from "@/lib/money";

const CURATED: { symbol: string; name: string }[] = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com" },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "JPM", name: "JPMorgan Chase" },
];

export type StockRow = {
  symbol: string;
  name: string;
  price: number;
  change: number;
};

const TRADABLE_TYPES = new Set([
  "Common Stock",
  "ADR",
  "American Depositary Receipt",
  "Depositary Receipt",
  "ETF",
  "ETP",
  "REIT",
]);

function isTradableHit(row: FinnhubSearchItem): boolean {
  const sym = (row.displaySymbol || row.symbol || "").trim().toUpperCase();
  if (!sym || sym.includes(":")) return false;
  const t = (row.type || "").trim();
  if (TRADABLE_TYPES.has(t)) return true;
  if (t.toLowerCase().includes("stock")) return true;
  return false;
}

/** Use Finnhub `symbol` for quotes when it is a plain ticker; otherwise `displaySymbol`. */
function quoteSymbol(row: FinnhubSearchItem): string {
  const sym = (row.symbol || "").trim();
  if (sym && !sym.includes(":")) return sym.toUpperCase();
  return (row.displaySymbol || "").trim().toUpperCase();
}

async function hydrateQuotes(rows: { symbol: string; name: string }[]): Promise<StockRow[]> {
  const out = await Promise.all(
    rows.map(async (r) => {
      try {
        const q = await getStockQuote(r.symbol);
        return { symbol: r.symbol, name: r.name, price: q.c, change: q.dp };
      } catch {
        return { symbol: r.symbol, name: r.name, price: 0, change: 0 };
      }
    }),
  );
  return out.filter((r) => r.price > 0);
}

export default function Market() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();

  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockRow | null>(null);
  const [buyMode, setBuyMode] = useState<"shares" | "dollars">("shares");
  const [buyAmount, setBuyAmount] = useState("");
  const [curatedList, setCuratedList] = useState<StockRow[]>([]);
  const [searchResults, setSearchResults] = useState<StockRow[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await hydrateQuotes(CURATED);
      if (!cancelled) setCuratedList(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      try {
        const hits = await searchStocks(trimmed);
        const picked = hits
          .filter(isTradableHit)
          .map((h) => ({
            symbol: quoteSymbol(h),
            name: (h.description || h.displaySymbol || h.symbol || "").trim() || h.symbol,
          }))
          .filter((r, i, arr) => arr.findIndex((x) => x.symbol === r.symbol) === i)
          .slice(0, 15);

        if (picked.length === 0) {
          setSearchResults([]);
          return;
        }

        const withQuotes = await hydrateQuotes(picked);
        setSearchResults(withQuotes);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Search failed.";
        toast({ title: "Search failed", description: message, variant: "destructive" });
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const t = window.setTimeout(() => {
      void runSearch(query.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [query, runSearch]);

  const displayStocks = useMemo(() => {
    if (!query.trim()) return curatedList;
    return searchResults ?? [];
  }, [query, curatedList, searchResults]);

  useEffect(() => {
    if (!selectedStock?.symbol) return;
    let cancelled = false;
    (async () => {
      try {
        const q = await getStockQuote(selectedStock.symbol);
        if (cancelled) return;
        setSelectedStock((prev) =>
          prev && prev.symbol === selectedStock.symbol
            ? { ...prev, price: q.c, change: q.dp }
            : prev,
        );
      } catch {
        /* keep last price */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStock?.symbol]);

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

  const showEmptySearch =
    query.trim().length > 0 && !searchLoading && searchResults !== null && displayStocks.length === 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Market</h1>
        <p className="text-sm text-muted-foreground">Search symbols or company names (Finnhub), then buy paper shares</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search e.g. Disney, NVDA, Coca-Cola…"
          className="pl-10 bg-secondary border-border text-foreground"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-2">
          {searchLoading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Searching…</span>
            </div>
          )}
          {!searchLoading &&
            displayStocks.map((stock) => (
              <motion.button
                key={stock.symbol}
                type="button"
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedStock(stock)}
                className={`w-full glass-card p-4 flex items-center justify-between transition-all ${
                  selectedStock?.symbol === stock.symbol ? "border-primary/50" : ""
                }`}
              >
                <div className="text-left min-w-0 pr-3">
                  <p className="font-display font-semibold text-foreground">{stock.symbol}</p>
                  <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-semibold text-foreground">${stock.price.toFixed(2)}</p>
                  <div className={`flex items-center justify-end gap-1 text-xs ${stock.change >= 0 ? "text-primary" : "text-destructive"}`}>
                    {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stock.change >= 0 ? "+" : ""}
                    {stock.change.toFixed(2)}%
                  </div>
                </div>
              </motion.button>
            ))}
          {!searchLoading && !query.trim() && curatedList.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Loading prices…</p>
          )}
          {showEmptySearch && (
            <p className="text-center text-muted-foreground py-8">No tradable matches. Try a ticker (e.g. DIS) or another name.</p>
          )}
        </div>

        <div className="glass-card p-5 h-fit sticky top-6">
          {profile && (
            <p className="text-xs text-muted-foreground mb-3">
              Cash balance:{" "}
              <span className="font-display font-semibold text-foreground">
                ${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
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
