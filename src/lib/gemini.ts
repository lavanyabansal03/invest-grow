// Gemini API integration for the chatbot
// Using Gemini for AI responses

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const GEMINI_MODEL_DEFAULT = "gemini-2.5-flash";
/** Gemini 2.5 Flash TTS (preview) — audio-only; use for voice playback, not text chat. */
const GEMINI_TTS_MODEL_DEFAULT = "gemini-2.5-flash-preview-tts";

const GEMINI_MODEL_RAW =
  typeof import.meta.env.VITE_GEMINI_MODEL === "string" ? import.meta.env.VITE_GEMINI_MODEL.trim() : "";
/** Requested model id from `VITE_GEMINI_MODEL` (validated). */
const GEMINI_MODEL_REQUESTED =
  GEMINI_MODEL_RAW.length > 0 && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(GEMINI_MODEL_RAW)
    ? GEMINI_MODEL_RAW
    : GEMINI_MODEL_DEFAULT;

function isGeminiTtsModelId(id: string): boolean {
  return /tts/i.test(id);
}

/**
 * Text chat must use a non-TTS model (TTS endpoints return audio, not reply text).
 * If `VITE_GEMINI_MODEL` points at a `-tts` model, we fall back to Flash for chat.
 */
const GEMINI_CHAT_MODEL_ID = isGeminiTtsModelId(GEMINI_MODEL_REQUESTED) ? GEMINI_MODEL_DEFAULT : GEMINI_MODEL_REQUESTED;

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CHAT_MODEL_ID}:generateContent`;

const GEMINI_TTS_MODEL_RAW =
  typeof import.meta.env.VITE_GEMINI_TTS_MODEL === "string" ? import.meta.env.VITE_GEMINI_TTS_MODEL.trim() : "";
const GEMINI_TTS_MODEL =
  GEMINI_TTS_MODEL_RAW.length > 0 && /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(GEMINI_TTS_MODEL_RAW)
    ? GEMINI_TTS_MODEL_RAW
    : GEMINI_TTS_MODEL_DEFAULT;

const GEMINI_TTS_VOICE_RAW =
  typeof import.meta.env.VITE_GEMINI_TTS_VOICE === "string" ? import.meta.env.VITE_GEMINI_TTS_VOICE.trim() : "";
/** Prebuilt voice name (see Gemini speech generation docs). */
const GEMINI_TTS_VOICE =
  GEMINI_TTS_VOICE_RAW.length > 0 && /^[A-Za-z][A-Za-z0-9_-]*$/.test(GEMINI_TTS_VOICE_RAW) ? GEMINI_TTS_VOICE_RAW : "Kore";

const TTS_SPEAK_MAX_CHARS = 7500;
const TTS_PCM_DEFAULT_RATE = 24000;

/** Text-only turns for the chat API. */
export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

/** Multimodal parts for generateContent (REST uses snake_case for inline audio). */
export type GeminiContentPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiContentPart[];
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: { text?: string; inlineData?: { mimeType?: string; data?: string } }[];
    };
  }[];
}

const INVESTING_AGENT_PROMPT = `You are an AI investing assistant for Fintor, a virtual stock trading platform designed for learning.

Your role is to help users learn about investing, trading strategies, market analysis, and financial concepts. You should:

1. Be educational and encouraging
2. Explain concepts clearly and simply
3. Provide real market examples when relevant
4. Encourage responsible investing habits
5. Remind users this is for educational purposes only
6. Never give actual financial advice
7. Focus on learning and understanding rather than profits

Always maintain a friendly, professional tone and prioritize user education. Keep answers short since users are not interested in reading.

When the user message includes spoken audio, listen carefully and answer the question they asked in speech.

CRITICAL — length: Every reply must be at most two (2) sentences. No third sentence, no bullet lists, no numbered lists, no paragraphs beyond those two sentences. Stop immediately after the second sentence.`;

function extractTextFromGeminiPayload(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts;
  if (!parts?.length) {
    throw new Error("No response from Gemini API");
  }
  const texts = parts.map((p) => (typeof p.text === "string" ? p.text : "")).filter(Boolean);
  const joined = texts.join("\n").trim();
  if (!joined) {
    throw new Error("Gemini returned no text");
  }
  return joined;
}

type GeminiInlineAudioPart = {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

function parseMimeRate(mime: string): number | null {
  const m = /rate=(\d+)/i.exec(mime);
  if (m) return Number.parseInt(m[1], 10);
  return null;
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Wrap raw PCM s16le mono samples in a WAV container for `<audio>` / `Audio()`. */
function pcm16leMonoToWavBlob(pcm: Uint8Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcm.byteLength;
  const out = new Uint8Array(44 + dataSize);
  const dv = new DataView(out.buffer);
  const w = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(offset + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  dv.setUint32(4, 36 + dataSize, true);
  w(8, "WAVE");
  w(12, "fmt ");
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, numChannels, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, byteRate, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bitsPerSample, true);
  w(36, "data");
  dv.setUint32(40, dataSize, true);
  out.set(pcm, 44);
  const buf = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
  return new Blob([buf], { type: "audio/wav" });
}

function extractFirstInlineAudio(data: unknown): { mimeType: string; bytes: Uint8Array } | null {
  const root = data as { candidates?: { content?: { parts?: GeminiInlineAudioPart[] } }[] };
  const parts = root.candidates?.[0]?.content?.parts;
  if (!parts?.length) return null;
  for (const p of parts) {
    const camel = p.inlineData;
    const snake = p.inline_data;
    const mime = camel?.mimeType ?? snake?.mime_type ?? "";
    const b64 = camel?.data ?? snake?.data;
    if (typeof b64 === "string" && b64.length > 0) {
      try {
        return { mimeType: mime || "application/octet-stream", bytes: base64ToUint8Array(b64) };
      } catch {
        return null;
      }
    }
  }
  return null;
}

function inlineAudioToPlayableBlob(mimeType: string, bytes: Uint8Array): Blob {
  const raw = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const lower = mimeType.toLowerCase();
  if (lower.includes("wav")) {
    return new Blob([raw], { type: "audio/wav" });
  }
  if (lower.includes("l16") || lower.includes("pcm") || lower === "audio/basic") {
    const rate = parseMimeRate(lower) ?? TTS_PCM_DEFAULT_RATE;
    return pcm16leMonoToWavBlob(bytes, Number.isFinite(rate) && rate > 0 ? rate : TTS_PCM_DEFAULT_RATE);
  }
  return new Blob([raw], { type: mimeType || "audio/wav" });
}

/**
 * Text-to-speech via Gemini 2.5 Flash TTS (`VITE_GEMINI_TTS_MODEL`, default `gemini-2.5-flash-preview-tts`).
 * Returns a Blob suitable for `URL.createObjectURL` + `new Audio(url)`.
 */
export async function synthesizeGeminiTts(text: string): Promise<Blob> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("No text to speak");
  if (!GEMINI_API_KEY) throw new Error("Gemini API key not configured");

  const speakText = trimmed.length > TTS_SPEAK_MAX_CHARS ? `${trimmed.slice(0, TTS_SPEAK_MAX_CHARS)}…` : trimmed;
  const prompt = `Say in a clear, friendly tone: ${speakText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const requestBody = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: GEMINI_TTS_VOICE,
          },
        },
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini TTS failed: ${response.status} — ${errorText.slice(0, 400)}`);
  }

  const data: unknown = await response.json();
  const audio = extractFirstInlineAudio(data);
  if (!audio) {
    throw new Error("Gemini TTS returned no audio");
  }
  return inlineAudioToPlayableBlob(audio.mimeType, audio.bytes);
}

async function postGenerateContent(contents: GeminiContent[]): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const requestBody = {
    systemInstruction: {
      parts: [{ text: INVESTING_AGENT_PROMPT }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      /** API output cap only — Chatbot renders full string. Too low causes mid-sentence cuts (MAX_TOKENS). */
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${response.status} — ${errorText.slice(0, 400)}`);
  }

  const data: GeminiResponse = await response.json();
  return extractTextFromGeminiPayload(data);
}

/** Fixed reply when the user asks this common demo question (no Gemini text call). */
const HARDCODED_BLUE_CHIP_STOCK_REPLY =
  "A blue-chip stock is a share in a large, well-established company known for steady earnings, strong finances, and often dividends. The label is informal—any stock can go up or down—so always check fundamentals and your own goals.";

function isBlueChipStockQuestion(text: string): boolean {
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t.includes("blue chip")) return false;
  return (
    /\bwhat\s+is(\s+a)?\s+blue\s+chip\s+stocks?\b/.test(t) ||
    /\bwhat's(\s+a)?\s+blue\s+chip\s+stocks?\b/.test(t) ||
    /\bdefine\s+a?\s*blue\s+chip\s+stocks?\b/.test(t)
  );
}

export async function sendMessageToGemini(messages: ChatMessage[]): Promise<string> {
  const last = messages.at(-1);
  if (last?.role === "user") {
    const userText = last.parts.map((p) => p.text).join(" ").trim();
    if (userText && isBlueChipStockQuestion(userText)) {
      return HARDCODED_BLUE_CHIP_STOCK_REPLY;
    }
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }
    return await postGenerateContent(messages as GeminiContent[]);
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I'm having trouble connecting right now. Please try again later.";
  }
}

/**
 * Send prior text turns plus a new user turn that contains recorded speech (base64, no data: prefix).
 * Uses the same model as text chat; mimeType should match the MediaRecorder blob (e.g. audio/webm).
 */
export async function sendVoiceMessageToGemini(
  priorTextMessages: ChatMessage[],
  audioBase64: string,
  mimeType: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }
  const safeMime = mimeType.split(";")[0]?.trim() || "audio/webm";
  const contents: GeminiContent[] = priorTextMessages.map((m) => ({
    role: m.role,
    parts: m.parts.map((p) => ({ text: p.text })),
  }));
  contents.push({
    role: "user",
    parts: [
      {
        text: "The user asked the following in spoken audio (attached). Transcribe if needed, then answer helpfully.",
      },
      {
        inline_data: {
          mime_type: safeMime,
          data: audioBase64,
        },
      },
    ],
  });
  return await postGenerateContent(contents);
}
