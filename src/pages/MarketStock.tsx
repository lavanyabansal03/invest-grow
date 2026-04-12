import { useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, ExternalLink, Loader2, Star } from "lucide-react";
import { getCompanyProfile, getStockQuote } from "@/api/finnhub";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { explainSupabaseRequestError } from "@/lib/supabase-errors";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile, useWatchlist, useHoldings, type WatchlistRow } from "@/hooks/usePaperPortfolio";
import { googleFinanceQuoteUrl } from "@/lib/googleFinanceUrl";
import { formatCapMillion, quoteDetailRows } from "@/lib/marketQuoteDisplay";
import { num } from "@/lib/money";
import type { StockRow } from "@/pages/Market";

const MAX_WATCHLIST = 5;
const EMPTY_WATCHLIST: WatchlistRow[] = [];

export default function MarketStock() {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const location = useLocation();
  const navigateBack = "/market";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const { data: watchlistData } = useWatchlist();
  const watchlistRows = watchlistData ?? EMPTY_WATCHLIST;
  const { data: holdings = [] } = useHoldings();

  const symbol = (rawSymbol || "").trim().toUpperCase();
  const nameHint = (location.state as { name?: string } | null)?.name?.trim();

  const [buyMode, setBuyMode] = useState<"shares" | "dollars">("shares");
  const [buyAmount, setBuyAmount] = useState("");
  const [buyLoading, setBuyLoading] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);

  const {
    data: quote,
    isPending: quotePending,
    isError: quoteError,
    error: quoteErr,
  } = useQuery({
    queryKey: ["quote", symbol],
    queryFn: () => getStockQuote(symbol),
    enabled: symbol.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: company } = useQuery({
    queryKey: ["profile", symbol],
    queryFn: () => getCompanyProfile(symbol),
    enabled: symbol.length > 0,
  });

  const displayName = company?.name?.trim() || nameHint || symbol;

  const stock: StockRow | null = useMemo(() => {
    if (!symbol || !quote || !Number.isFinite(quote.c) || quote.c <= 0) return null;
    return { symbol, name: displayName, price: quote.c, change: quote.dp };
  }, [symbol, quote, displayName]);

  const watchSymbols = useMemo(
    () => new Set(watchlistRows.map((r) => r.stock_symbol.toUpperCase())),
    [watchlistRows],
  );
  const onWatchlist = watchSymbols.has(symbol);
  const holding = holdings.find((h) => h.stock_symbol.toUpperCase() === symbol);
  const cash = profile ? num(profile.cash_balance) : 0;

  const livePrice = quote && Number.isFinite(quote.c) && quote.c > 0 ? quote.c : 0;

  const computeShares = (): number | null => {
    if (!stock || !buyAmount.trim() || livePrice <= 0) return null;
    const raw = parseFloat(buyAmount);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    if (buyMode === "shares") return raw;
    return Math.round((raw / livePrice) * 1e6) / 1e6;
  };

  const addToWatchlist = async () => {
    if (!stock) return;
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description:
          "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env, then restart npm run dev.",
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

  const handleBuy = async () => {
    if (!stock) return;
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description:
          "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env, then restart npm run dev.",
        variant: "destructive",
      });
      return;
    }
    const shares = computeShares();
    if (shares == null || shares <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid number of shares or dollars.", variant: "destructive" });
      return;
    }
    const total = shares * livePrice;
    if (total > cash + 1e-6) {
      toast({ title: "Insufficient cash", description: `You have $${cash.toFixed(2)} available.`, variant: "destructive" });
      return;
    }
    setBuyLoading(true);
    try {
      const { error } = await supabase.rpc("execute_paper_buy", {
        p_symbol: stock.symbol,
        p_company_name: stock.name,
        p_shares: shares,
        p_price: livePrice,
      });
      if (error) throw error;
      window.dispatchEvent(new CustomEvent("paper-stock-buy"));
      toast({ title: `Bought ${stock.symbol}`, description: `${shares.toFixed(4)} shares for ~$${total.toFixed(2)}.` });
      setBuyAmount("");
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["holdings"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e: unknown) {
      toast({
        title: "Order failed",
        description: explainSupabaseRequestError(e, { rpc: "execute_paper_buy" }),
        variant: "destructive",
      });
    } finally {
      setBuyLoading(false);
    }
  };

  const sharesLabel = holding
    ? `${num(holding.shares)} @ $${num(holding.avg_buy_price).toFixed(2)}`
    : "None";

  if (!symbol) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center space-y-4">
        <p className="text-muted-foreground">Invalid symbol.</p>
        <Button asChild variant="outline">
          <Link to={navigateBack}>Back to Market</Link>
        </Button>
      </div>
    );
  }

  if (quoteError && !quotePending) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <Link to={navigateBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Market
        </Link>
        <p className="text-destructive text-sm">{quoteErr instanceof Error ? quoteErr.message : "Could not load symbol."}</p>
        <Button asChild variant="outline">
          <Link to={navigateBack}>Back to Market</Link>
        </Button>
      </div>
    );
  }

  const isPositive = (stock?.change ?? 0) >= 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Link to={navigateBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Market
      </Link>

      {quotePending || !stock ? (
        <div className="flex justify-center py-24 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin" aria-label="Loading" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 lg:col-span-2 lg:row-start-1 min-w-0">
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-bold text-foreground">{stock.symbol}</h1>
                <p className="text-muted-foreground">{stock.name}</p>
              </div>
              <div className="text-right shrink-0 ml-auto">
                <p className="font-display text-3xl font-bold text-foreground tabular-nums">${stock.price.toFixed(2)}</p>
                <div
                  className={`mt-1 flex flex-wrap items-center justify-end gap-1 text-sm font-semibold ${
                    isPositive ? "text-primary" : "text-destructive"
                  }`}
                >
                  {isPositive ? <ArrowUpRight className="h-4 w-4 shrink-0" /> : <ArrowDownRight className="h-4 w-4 shrink-0" />}
                  {quote && Number.isFinite(quote.d) && (
                    <span className="tabular-nums">
                      {quote.d > 0 ? "+" : quote.d < 0 ? "−" : ""}
                      {Math.abs(quote.d).toFixed(2)}
                    </span>
                  )}
                  {quote && Number.isFinite(quote.d) && <span className="text-muted-foreground font-normal">·</span>}
                  <span className="tabular-nums">
                    {isPositive ? "+" : ""}
                    {stock.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-1 lg:row-start-1" aria-hidden />

            <Card className="border-border/80 shadow-none min-w-0 lg:col-span-2 lg:row-start-2">
                <CardContent className="space-y-4 pt-6">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Market values</h3>
                  <div className="rounded-lg border border-border/80 bg-muted/20 overflow-hidden">
                    <div className="divide-y divide-border/60">
                      {quoteDetailRows(quote).map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 min-h-[2.5rem]"
                        >
                          <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                          <span
                            className={`font-display text-sm font-semibold tabular-nums text-right ${row.valueClass ?? "text-foreground"}`}
                          >
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    asChild
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700 border-0 shadow-sm"
                  >
                    <a
                      href={googleFinanceQuoteUrl(symbol, company?.exchange)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2 shrink-0" aria-hidden />
                      Visual data
                    </a>
                  </Button>
                </CardContent>
            </Card>

            <Card className="border-border/80 shadow-none h-fit w-full min-w-0 lg:col-span-1 lg:row-start-2 lg:sticky lg:top-6 self-start">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display">Trade</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile && (
                  <p className="text-xs text-muted-foreground">
                    Cash:{" "}
                    <span className="font-display font-semibold text-foreground">
                      ${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={watchBusy || onWatchlist || watchlistRows.length >= MAX_WATCHLIST}
                  onClick={() => void addToWatchlist()}
                >
                  <Star className="h-4 w-4 mr-2" />
                  {onWatchlist ? "On watchlist" : "Add to watchlist"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={buyMode === "shares" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBuyMode("shares")}
                    className={buyMode === "shares" ? "" : "border-border text-muted-foreground"}
                  >
                    Shares
                  </Button>
                  <Button
                    type="button"
                    variant={buyMode === "dollars" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBuyMode("dollars")}
                    className={buyMode === "dollars" ? "" : "border-border text-muted-foreground"}
                  >
                    Dollars
                  </Button>
                </div>
                <Input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  placeholder={buyMode === "shares" ? "Number of shares" : "Dollar amount"}
                  className="bg-secondary border-border"
                />
                {buyAmount && stock && (
                  <p className="text-xs text-muted-foreground">
                    {buyMode === "shares"
                      ? `Total: $${(parseFloat(buyAmount) * stock.price).toFixed(2)}`
                      : `≈ ${(parseFloat(buyAmount) / stock.price).toFixed(6)} shares`}
                  </p>
                )}
                <Button
                  type="button"
                  disabled={buyLoading || !computeShares()}
                  onClick={() => void handleBuy()}
                  className="w-full font-display font-semibold"
                >
                  {buyLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                      Processing…
                    </>
                  ) : (
                    `Buy ${stock.symbol}`
                  )}
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/portfolio">Open portfolio to sell</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Volume", value: "—" },
              { label: "Market cap", value: formatCapMillion(company?.marketCapitalization ?? 0) },
              { label: "Sector", value: company?.finnhubIndustry?.trim() || "—" },
              { label: "Your shares", value: sharesLabel },
            ].map((item) => (
              <Card key={item.label} className="border-border/80 shadow-none">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold font-display text-foreground mt-1">{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {(company?.weburl || company?.finnhubIndustry) && (
            <Card className="border-border/80 shadow-none">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">About {stock.symbol}</span>
                  {company?.finnhubIndustry ? (
                    <>
                      {" "}
                      · {company.finnhubIndustry}
                    </>
                  ) : null}
                  {company?.weburl ? (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        href={company.weburl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Company site
                      </a>
                    </>
                  ) : null}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
