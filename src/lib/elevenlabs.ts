/**
 * ElevenLabs TTS via the Flask proxy (`/api/elevenlabs/tts`) so the API key stays on the server.
 *
 * Server `.env` (repo root):
 *   ELEVENLABS_API_KEY=xi-...
 *   ELEVENLABS_VOICE_ID=<id from Voice Lab / My Voices>
 *   ELEVENLABS_MODEL_ID=eleven_multilingual_v2   (optional)
 *
 * Client `.env` (optional override sent in JSON so you can swap voices without redeploying the server):
 *   VITE_ELEVENLABS_VOICE_ID=<same or different voice id>
 *
 * Dev: leave `VITE_API_URL` unset so Vite proxies `/api` to Flask (see vite.config.ts).
 */

const LOCAL_FLASK_PORTS = new Set(["5000", "5050"]);

function isLocalFlaskOrigin(base: string): boolean {
  try {
    const u = new URL(base);
    const host = u.hostname.toLowerCase();
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    return (host === "localhost" || host === "127.0.0.1" || host === "[::1]") && LOCAL_FLASK_PORTS.has(port);
  } catch {
    return false;
  }
}

function resolveApiOrigin(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined;
  if (raw == null || String(raw).trim() === "") return "";
  let base = String(raw).trim().replace(/\/$/, "");
  if (base.endsWith("/api")) base = base.slice(0, -4);
  if (import.meta.env.DEV && isLocalFlaskOrigin(base)) {
    return "";
  }
  return base;
}

const TTS_MAX_CHARS = 7500;

export interface SynthesizeSpeechOptions {
  /** Overrides `VITE_ELEVENLABS_VOICE_ID` and server default for this request. */
  voiceId?: string;
}

/** POSTs text to the backend proxy; returns MP3 (or other) audio bytes. */
export async function synthesizeAssistantSpeech(text: string, options?: SynthesizeSpeechOptions): Promise<Blob> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("No text to speak");
  }
  const body: { text: string; voice_id?: string } = {
    text: trimmed.length > TTS_MAX_CHARS ? `${trimmed.slice(0, TTS_MAX_CHARS)}…` : trimmed,
  };
  const envVoice = typeof import.meta.env.VITE_ELEVENLABS_VOICE_ID === "string" ? import.meta.env.VITE_ELEVENLABS_VOICE_ID.trim() : "";
  const override = options?.voiceId?.trim();
  if (override) body.voice_id = override;
  else if (envVoice) body.voice_id = envVoice;

  const origin = resolveApiOrigin();
  const url = `${origin}/api/elevenlabs/tts`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const err = (await res.json()) as { error?: string; details?: string };
      detail = err.details || err.error || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail || `TTS failed (${res.status})`);
  }

  return res.blob();
}
