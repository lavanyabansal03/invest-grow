import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, TrendingUp, TrendingDown, Loader2, Star, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getStockQuote, searchStocks, type FinnhubSearchItem } from "@/api/finnhub";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useWatchlist, type WatchlistRow } from "@/hooks/usePaperPortfolio";

const MAX_WATCHLIST = 5;

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

type WatchDisplayRow = { id: string; symbol: string; name: string; price: number; change: number };

/** Stable empty list so `data ?? EMPTY` does not create a new `[]` every render (avoids useEffect loops). */
const EMPTY_WATCHLIST: WatchlistRow[] = [];

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
  const { data: watchlistData, isLoading: watchlistLoading } = useWatchlist();
  const watchlistRows = watchlistData ?? EMPTY_WATCHLIST;

  const [query, setQuery] = useState("");
  const [curatedList, setCuratedList] = useState<StockRow[]>([]);
  const [searchResults, setSearchResults] = useState<StockRow[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);
  const [watchDisplay, setWatchDisplay] = useState<WatchDisplayRow[]>([]);

  const watchSymbols = useMemo(
    () => new Set(watchlistRows.map((r) => r.stock_symbol.toUpperCase())),
    [watchlistRows],
  );

  const watchIdsKey = useMemo(() => watchlistRows.map((r) => r.id).join(","), [watchlistRows]);

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

  useEffect(() => {
    let cancelled = false;
    async function quotes() {
      if (!watchlistRows.length) {
        if (!cancelled) setWatchDisplay([]);
        return;
      }
      const enriched = await Promise.all(
        watchlistRows.map(async (r) => {
          const sym = r.stock_symbol;
          let price = 0;
          let change = 0;
          try {
            const q = await getStockQuote(sym);
            price = q.c;
            change = q.dp;
          } catch {
            /* ignore */
          }
          return {
            id: r.id,
            symbol: sym,
            name: r.display_name?.trim() || sym,
            price,
            change,
          } satisfies WatchDisplayRow;
        }),
      );
      if (!cancelled) setWatchDisplay(enriched);
    }
    void quotes();
    return () => {
      cancelled = true;
    };
  }, [watchIdsKey, watchlistRows]);

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

  const displayStocksBase = useMemo(() => {
    if (!query.trim()) return curatedList;
    return searchResults ?? [];
  }, [query, curatedList, searchResults]);

  const watchOrderRank = useMemo(() => {
    const m = new Map<string, number>();
    watchlistRows.forEach((r, i) => m.set(r.stock_symbol.toUpperCase(), i));
    return m;
  }, [watchlistRows]);

  const displayStocks = useMemo(() => {
    const base = displayStocksBase;
    if (base.length === 0) return base;
    return [...base].sort((a, b) => {
      const symA = a.symbol.toUpperCase();
      const symB = b.symbol.toUpperCase();
      const aW = watchSymbols.has(symA);
      const bW = watchSymbols.has(symB);
      if (aW !== bW) return aW ? -1 : 1;
      if (aW && bW) {
        const ia = watchOrderRank.get(symA) ?? -1;
        const ib = watchOrderRank.get(symB) ?? -1;
        return ib - ia;
      }
      return 0;
    });
  }, [displayStocksBase, watchSymbols, watchOrderRank]);

  const addToWatchlist = async (stock: StockRow) => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description:
          "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env, then restart npm run dev. Keys must use the VITE_ prefix.",
        variant: "destructive",
      });
      return;
    }
    const sym = stock.symbol.toUpperCase();
    if (watchSymbols.has(sym)) {
      toast({ title: "Already tracking", description: `${sym} is on your watchlist.`, variant: "destructive" });
      return;
    }
    if (watchlistRows.length >= MAX_WATCHLIST) {
      toast({
        title: "Watchlist full",
        description: `Remove a symbol to add another (max ${MAX_WATCHLIST}).`,
        variant: "destructive",
      });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }

    setWatchBusy(true);
    try {
      const { error } = await supabase.from("watchlist").insert({
        user_id: user.id,
        stock_symbol: sym,
        display_name: stock.name?.trim() || sym,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast({ title: "Tracking", description: `${sym} added to your watchlist.` });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not add.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setWatchBusy(false);
    }
  };

  const removeFromWatchlist = async (id: string) => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description: "Add VITE_SUPABASE_URL and a publishable/anon key in .env, then restart the dev server.",
        variant: "destructive",
      });
      return;
    }
    setWatchBusy(true);
    try {
      const { error } = await supabase.from("watchlist").delete().eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not remove.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setWatchBusy(false);
    }
  };

  const showEmptySearch =
    query.trim().length > 0 && !searchLoading && searchResults !== null && displayStocks.length === 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Market</h1>
        <p className="text-sm text-muted-foreground">
          Find the stock that you want to trade, then invest in it with Finto Coins.
        </p>
      </div>

      {!isSupabaseConfigured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-display">Supabase is not connected</AlertTitle>
          <AlertDescription>
            Watchlist and paper trading need API credentials. In the project root <code className="rounded bg-muted px-1">.env</code>, set{" "}
            <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> and either{" "}
            <code className="rounded bg-muted px-1">VITE_SUPABASE_PUBLISHABLE_KEY</code> or{" "}
            <code className="rounded bg-muted px-1">VITE_SUPABASE_ANON_KEY</code> (from Supabase → Settings → API). Restart{" "}
            <code className="rounded bg-muted px-1">npm run dev</code> after saving.
          </AlertDescription>
        </Alert>
      )}

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
            displayStocks.map((stock) => {
              const onList = watchSymbols.has(stock.symbol.toUpperCase());
              return (
                <motion.div
                  key={stock.symbol}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card flex items-stretch overflow-hidden transition-all"
                >
                  <Link
                    to={`/market/${encodeURIComponent(stock.symbol)}`}
                    state={{ name: stock.name }}
                    className="flex flex-1 min-w-0 items-center justify-between gap-3 p-4 text-left hover:bg-muted/30"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-display font-semibold text-foreground">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display font-semibold text-foreground">${stock.price.toFixed(2)}</p>
                      <div
                        className={`flex items-center justify-end gap-1 text-xs ${stock.change >= 0 ? "text-primary" : "text-destructive"}`}
                      >
                        {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {stock.change >= 0 ? "+" : ""}
                        {stock.change.toFixed(2)}%
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    disabled={watchBusy || onList}
                    onClick={(e) => {
                      e.preventDefault();
                      void addToWatchlist(stock);
                    }}
                    title={onList ? "Already on watchlist" : "Add to watchlist"}
                    className="shrink-0 border-l border-border/60 px-3 flex items-center justify-center bg-muted/20 hover:bg-muted/40 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Star className={`h-5 w-5 ${onList ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  </button>
                </motion.div>
              );
            })}
          {!searchLoading && !query.trim() && curatedList.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Loading prices…</p>
          )}
          {showEmptySearch && (
            <p className="text-center text-muted-foreground py-8">No tradable matches. Try a ticker (e.g. DIS) or another name.</p>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-5 border-border/80 lg:sticky lg:top-6">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-sm font-bold text-foreground uppercase tracking-wide">Watchlist</h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {watchlistRows.length}/{MAX_WATCHLIST}
              </span>
            </div>
            {watchlistLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : watchDisplay.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Star any symbol in the list to track it here.</p>
            ) : (
              <ul className="space-y-2 max-h-[min(22rem,50vh)] overflow-y-auto pr-1">
                {watchDisplay.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5"
                  >
                    <Link
                      to={`/market/${encodeURIComponent(w.symbol)}`}
                      state={{ name: w.name }}
                      className="min-w-0 flex flex-1 items-center gap-2 hover:opacity-90"
                    >
                      <Star className="h-3.5 w-3.5 shrink-0 text-warning fill-warning" />
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold text-foreground">{w.symbol}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{w.name}</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p className="font-display text-xs font-semibold text-foreground tabular-nums">
                          {w.price > 0 ? `$${w.price.toFixed(2)}` : "—"}
                        </p>
                        {w.price > 0 && (
                          <p className={`text-[10px] tabular-nums ${w.change >= 0 ? "text-primary" : "text-destructive"}`}>
                            {w.change >= 0 ? "+" : ""}
                            {w.change.toFixed(2)}%
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={watchBusy}
                        onClick={() => void removeFromWatchlist(w.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label={`Remove ${w.symbol}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
