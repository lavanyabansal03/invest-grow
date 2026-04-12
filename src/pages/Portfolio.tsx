import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getStockQuote } from "@/api/finnhub";
import { TrendingUp, TrendingDown, Target, Loader2 } from "lucide-react";
import { useUserProfile, useHoldings, useTransactions } from "@/hooks/usePaperPortfolio";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { explainSupabaseRequestError } from "@/lib/supabase-errors";
import { num } from "@/lib/money";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

const SHARE_EPS = 1e-9;
const DOLLAR_EPS = 0.005; // half-cent: float noise on notional vs quote

type ParsedSell = { shares: number } | { error: string };

function parseSellOrder(
  sellRow: HoldingView,
  sellMode: "shares" | "dollars",
  sellAmount: string,
  sellPrice: number,
): ParsedSell | null {
  if (!sellAmount.trim() || sellPrice <= 0) return null;
  const raw = parseFloat(sellAmount);
  if (!Number.isFinite(raw) || raw <= 0) return null;

  const maxShares = sellRow.shares;
  const maxDollars = maxShares * sellPrice;

  if (sellMode === "shares") {
    if (raw > maxShares + SHARE_EPS) {
      return { error: `You own ${maxShares.toFixed(4)} shares — you can sell at most that many (not more).` };
    }
    return { shares: raw };
  }

  if (raw > maxDollars + DOLLAR_EPS) {
    return {
      error: `At $${sellPrice.toFixed(2)} per share, this position is worth about $${maxDollars.toFixed(2)} — you can't sell more than that (not more).`,
    };
  }

  const shares = Math.round((raw / sellPrice) * 1e6) / 1e6;
  if (shares <= 0) return null;
  if (shares > maxShares + SHARE_EPS) {
    return {
      error: `That dollar amount rounds to more shares than you own (${maxShares.toFixed(4)}). Enter a slightly smaller amount or use Shares.`,
    };
  }
  return { shares };
}

export default function Portfolio() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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

  const [sellOpen, setSellOpen] = useState(false);
  const [sellRow, setSellRow] = useState<HoldingView | null>(null);
  const [sellMode, setSellMode] = useState<"shares" | "dollars">("shares");
  const [sellAmount, setSellAmount] = useState("");
  const [sellLoading, setSellLoading] = useState(false);

  const sellPrice = sellRow && sellRow.currentPrice > 0 ? sellRow.currentPrice : 0;

  const parsedSell = useMemo(
    () => (sellRow ? parseSellOrder(sellRow, sellMode, sellAmount, sellPrice) : null),
    [sellRow, sellMode, sellAmount, sellPrice],
  );

  const openSell = (h: HoldingView) => {
    setSellRow(h);
    setSellAmount("");
    setSellMode("shares");
    setSellOpen(true);
  };

  const handleSellOpenChange = (open: boolean) => {
    setSellOpen(open);
    if (!open) {
      setSellRow(null);
      setSellAmount("");
      setSellLoading(false);
    }
  };

  const handleSell = async () => {
    if (!sellRow) return;
    if (!parsedSell || "error" in parsedSell) {
      const desc =
        parsedSell && "error" in parsedSell
          ? parsedSell.error
          : sellMode === "shares"
            ? "Enter how many shares to sell (no more than you own)."
            : "Enter how many dollars of this position to sell (no more than it is worth now).";
      toast({ title: "Invalid amount", description: desc, variant: "destructive" });
      return;
    }
    const { shares } = parsedSell;
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase not configured",
        description:
          "Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) in .env, then restart npm run dev.",
        variant: "destructive",
      });
      return;
    }
    setSellLoading(true);
    try {
      const { error } = await supabase.rpc("execute_paper_sell", {
        p_symbol: sellRow.symbol,
        p_shares: shares,
        p_price: sellPrice,
      });
      if (error) throw error;
      const proceeds = shares * sellPrice;
      const avg = sellRow.avgPrice;
      const pctVsAvg = avg > 0 ? ((sellPrice - avg) / avg) * 100 : null;
      const pctLine =
        pctVsAvg != null
          ? pctVsAvg >= 0
            ? ` Profit on this trade: +${pctVsAvg.toFixed(2)}% (vs your avg cost).`
            : ` Loss on this trade: ${Math.abs(pctVsAvg).toFixed(2)}% (vs your avg cost).`
          : "";
      toast({
        title: `Sold ${sellRow.symbol}`,
        description: `${shares.toFixed(4)} shares for ~$${proceeds.toFixed(2)}.${pctLine}`,
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["holdings"] });
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["sold_stocks"] });
      handleSellOpenChange(false);
    } catch (e: unknown) {
      toast({
        title: "Order failed",
        description: explainSupabaseRequestError(e, { rpc: "execute_paper_sell" }),
        variant: "destructive",
      });
    } finally {
      setSellLoading(false);
    }
  };

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
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
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
              <TableHead className="h-10 px-3 text-xs text-muted-foreground text-right w-[5.5rem]"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {realHoldings.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
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
                    <TableCell className="px-3 py-2.5 text-right">
                      <Button type="button" variant="outline" size="sm" className="h-8 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => openSell(h)}>
                        Sell
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={sellOpen} onOpenChange={handleSellOpenChange}>
        <DialogContent className="sm:max-w-md">
          {sellRow && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">Sell {sellRow.symbol}</DialogTitle>
                <DialogDescription>
                  You hold {sellRow.shares.toFixed(4)} shares. At ${sellPrice.toFixed(2)} / share, the position is worth about $
                  {(sellRow.shares * sellPrice).toFixed(2)}. You can sell any amount up to those limits — not more; by shares, the
                  order size is exactly what you enter.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-1">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={sellMode === "shares" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSellMode("shares")}
                    className={sellMode === "shares" ? "" : "border-border text-muted-foreground"}
                  >
                    Shares
                  </Button>
                  <Button
                    type="button"
                    variant={sellMode === "dollars" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSellMode("dollars")}
                    className={sellMode === "dollars" ? "" : "border-border text-muted-foreground"}
                  >
                    Dollars
                  </Button>
                </div>
                <Input
                  type="number"
                  value={sellAmount}
                  onChange={(e) => setSellAmount(e.target.value)}
                  placeholder={sellMode === "shares" ? "Number of shares" : "Dollar amount"}
                  className="bg-secondary border-border"
                />
                {parsedSell && "shares" in parsedSell && (
                  <p className="text-xs text-muted-foreground">
                    Order:{" "}
                    <span className="font-medium text-foreground tabular-nums">{parsedSell.shares.toFixed(6)}</span> shares · ≈ $
                    {(parsedSell.shares * sellPrice).toFixed(2)} at ${sellPrice.toFixed(2)}
                    /sh
                    {sellMode === "dollars" && Number.isFinite(parseFloat(sellAmount)) ? (
                      <span className="text-muted-foreground"> (from ${parseFloat(sellAmount).toFixed(2)} notional)</span>
                    ) : null}
                  </p>
                )}
                {parsedSell && "error" in parsedSell && (
                  <p className="text-xs text-destructive" role="alert">
                    {parsedSell.error}
                  </p>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => handleSellOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={sellLoading || !parsedSell || "error" in parsedSell}
                  onClick={() => void handleSell()}
                >
                  {sellLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                      Processing…
                    </>
                  ) : (
                    "Confirm sell"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
