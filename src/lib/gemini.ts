// Gemini API integration for the chatbot
// Using Gemini for AI responses

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

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
      maxOutputTokens: 120,
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

export async function sendMessageToGemini(messages: ChatMessage[]): Promise<string> {
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
