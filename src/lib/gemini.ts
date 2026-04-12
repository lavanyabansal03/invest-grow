// Gemini API integration for the chatbot
// Replace this with your actual Gemini API implementation

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export interface ChatMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

const INVESTING_AGENT_PROMPT = `You are an AI investing assistant for PaperTrade, a virtual stock trading platform designed for learning.

Your role is to help users learn about investing, trading strategies, market analysis, and financial concepts. You should:

1. Be educational and encouraging
2. Explain concepts clearly and simply
3. Provide real market examples when relevant
4. Encourage responsible investing habits
5. Remind users this is for educational purposes only
6. Never give actual financial advice
7. Focus on learning and understanding rather than profits

Always maintain a friendly, professional tone and prioritize user education.`;

export async function sendMessageToGemini(messages: ChatMessage[]): Promise<string> {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: INVESTING_AGENT_PROMPT }]
        },
        ...messages
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: GeminiResponse = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API error:", error);
    return "Sorry, I'm having trouble connecting right now. Please try again later.";
  }
}