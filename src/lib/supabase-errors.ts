/** Human-readable PostgREST / Supabase error for toasts and logs. */
export function formatPostgrestError(err: { message?: string; details?: string; hint?: string; code?: string } | null): string {
  if (!err) return "Unknown error";
  const parts = [err.message, err.details, err.hint, err.code ? `(${err.code})` : ""].filter(Boolean);
  return parts.join(" — ") || "Unknown error";
}
