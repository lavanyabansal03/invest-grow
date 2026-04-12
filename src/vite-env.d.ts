/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Backend origin only (no `/api`). Leave unset in dev to use Vite proxy. */
  readonly VITE_API_URL?: string;
}
