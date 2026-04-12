import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ProfileRow = Tables<"profiles">;
export type HoldingRow = Tables<"holdings">;
export type TransactionRow = Tables<"transactions">;
export type SoldStockRow = Tables<"sold_stocks">;
export type WatchlistRow = Tables<"watchlist">;

/** Single row from `public.profiles` where `user_id` equals the signed-in user (`auth.users.id`). */
export function useUserProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!isSupabaseConfigured) return null;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const userId = user.id;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useHoldings() {
  return useQuery({
    queryKey: ["holdings"],
    queryFn: async (): Promise<HoldingRow[]> => {
      if (!isSupabaseConfigured) return [];
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("holdings").select("*").eq("user_id", user.id).order("stock_symbol");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTransactions(limit = 80) {
  return useQuery({
    queryKey: ["transactions", limit],
    queryFn: async (): Promise<TransactionRow[]> => {
      if (!isSupabaseConfigured) return [];
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSoldStocks(limit = 100) {
  return useQuery({
    queryKey: ["sold_stocks", limit],
    queryFn: async (): Promise<SoldStockRow[]> => {
      if (!isSupabaseConfigured) return [];
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("sold_stocks")
        .select("*")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWatchlist() {
  return useQuery({
    queryKey: ["watchlist"],
    queryFn: async (): Promise<WatchlistRow[]> => {
      if (!isSupabaseConfigured) return [];
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("watchlist").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
