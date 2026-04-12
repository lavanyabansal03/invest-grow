/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Same as the dashboard “anon” / publishable key; accepted as an alias for VITE_SUPABASE_PUBLISHABLE_KEY. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Backend origin only (no `/api`). Leave unset in dev to use Vite proxy. */
  readonly VITE_API_URL?: string;
  /** Optional ElevenLabs voice id (Voice Lab) sent to `/api/elevenlabs/tts`; server can also set `ELEVENLABS_VOICE_ID`. */
  readonly VITE_ELEVENLABS_VOICE_ID?: string;
}
