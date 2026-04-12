/** Human-readable PostgREST / Supabase error for toasts and logs. */
export function formatPostgrestError(err: { message?: string; details?: string; hint?: string; code?: string } | null): string {
  if (!err) return "Unknown error";
  const parts = [err.message, err.details, err.hint, err.code ? `(${err.code})` : ""].filter(Boolean);
  return parts.join(" — ") || "Unknown error";
}

type RpcName = "execute_paper_buy" | "execute_paper_sell";

/** Maps common Supabase/PostgREST/network failures to copy that explains what to fix (dev-friendly). */
export function explainSupabaseRequestError(err: unknown, context?: { rpc?: RpcName }): string {
  if (err && typeof err === "object" && "message" in err) {
    const o = err as { code?: string; message?: string; details?: string };
    const msg = [o.message, o.details].filter(Boolean).join(" ");
    if (o.code === "PGRST202" || /could not find the function|does not exist/i.test(msg)) {
      if (context?.rpc === "execute_paper_sell") {
        return "Sell is not available on the database yet. In Supabase → SQL, run the migration that creates execute_paper_sell (file supabase/migrations/20260412100000_execute_paper_sell.sql), then try again.";
      }
      if (context?.rpc === "execute_paper_buy") {
        return "Buy RPC missing or outdated on Supabase. Apply the repo’s profiles/holdings migration, then try again.";
      }
      return "That database function was not found. Apply the latest Supabase migrations from this repo, then try again.";
    }
    if (o.message || o.details) return formatPostgrestError(o);
  }
  if (err instanceof Error) {
    const m = err.message;
    if (/Failed to fetch|NetworkError|Load failed|ERR_NETWORK|ECONNREFUSED|disconnected/i.test(m)) {
      return "Cannot reach Supabase. Check VITE_SUPABASE_URL, your network/VPN, and restart npm run dev after changing .env (variables must start with VITE_).";
    }
    return m;
  }
  return "Request failed.";
}
