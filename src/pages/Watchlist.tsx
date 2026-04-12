import { useMemo, useEffect, useState } from "react";
import { Star, TrendingUp, TrendingDown, Plus, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getStockQuote } from "@/api/finnhub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWatchlist } from "@/hooks/usePaperPortfolio";

type Row = { id: string; symbol: string; name: string; price: number; change: number };

export default function Watchlist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: rows = [], isLoading } = useWatchlist();
  const [newSymbol, setNewSymbol] = useState("");
  const [display, setDisplay] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  const idsKey = useMemo(() => rows.map((r) => r.id).join(","), [rows]);

  useEffect(() => {
    let cancelled = false;
    async function quotes() {
      if (!rows.length) {
        if (!cancelled) setDisplay([]);
        return;
      }
      const enriched = await Promise.all(
        rows.map(async (r) => {
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
          } satisfies Row;
        }),
      );
      if (!cancelled) setDisplay(enriched);
    }
    quotes();
    return () => {
      cancelled = true;
    };
  }, [idsKey, rows]);

  const addStock = async () => {
    if (!newSymbol.trim()) return;
    if (rows.length >= 5) {
      toast({ title: "Watchlist full", description: "Maximum 5 stocks allowed.", variant: "destructive" });
      return;
    }
    const sym = newSymbol.trim().toUpperCase();
    if (rows.some((r) => r.stock_symbol === sym)) {
      toast({ title: "Already added", description: "This symbol is already on your watchlist.", variant: "destructive" });
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.from("watchlist").insert({
        user_id: user.id,
        stock_symbol: sym,
        display_name: sym,
      });
      if (error) throw error;

      setNewSymbol("");
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast({ title: "Added", description: `${sym} saved to Supabase.` });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not add.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const removeStock = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("watchlist").delete().eq("id", id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["watchlist"] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Could not remove.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Watchlist</h1>
        <p className="text-sm text-muted-foreground">{rows.length}/5 stocks · stored in Supabase</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Add symbol (e.g. AAPL)"
          className="bg-secondary border-border text-foreground"
          onKeyDown={(e) => e.key === "Enter" && !busy && addStock()}
          disabled={busy}
        />
        <Button onClick={addStock} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {display.map((stock) => (
            <motion.div
              key={stock.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
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
                  <div className={`flex items-center justify-end gap-1 text-xs ${stock.change >= 0 ? "text-primary" : "text-destructive"}`}>
                    {stock.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {stock.change >= 0 ? "+" : ""}
                    {stock.change.toFixed(2)}%
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => removeStock(stock.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
          {display.length === 0 && <p className="text-center text-muted-foreground py-8">Your watchlist is empty. Add symbols above!</p>}
        </div>
      )}
    </div>
  );
}
