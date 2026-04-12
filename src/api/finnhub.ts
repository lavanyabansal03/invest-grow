/**
 * API base: empty = same-origin `/api/...` (Vite proxies to Flask in dev).
 * Set `VITE_API_URL` to your deployed backend origin only (no `/api` suffix), e.g. `https://api.myapp.com`
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

function stocksUrl(path: string): string {
  const origin = resolveApiOrigin();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${origin}/api/stocks${p}`;
}

export interface FinnhubQuote {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
}

export interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.clone().json();
    if (body && typeof body.error === "string") return body.error;
    if (body && typeof body.details === "string") return body.details;
  } catch {
    try {
      const text = await response.clone().text();
      if (text) return text.slice(0, 200);
    } catch {
      /* ignore */
    }
  }
  return response.statusText || "Request failed";
}

export async function getStockQuote(symbol: string): Promise<FinnhubQuote> {
  const sym = encodeURIComponent(symbol.trim().toUpperCase());
  const response = await fetch(stocksUrl(`/quote/${sym}`));
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded (50 calls/min). Please try again later.");
    }
    const msg = await readErrorMessage(response);
    throw new Error(msg || "Failed to fetch stock quote");
  }
  return response.json() as Promise<FinnhubQuote>;
}

export async function getCompanyProfile(symbol: string): Promise<FinnhubProfile> {
  const sym = encodeURIComponent(symbol.trim().toUpperCase());
  const response = await fetch(stocksUrl(`/profile/${sym}`));
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded (50 calls/min). Please try again later.");
    }
    const msg = await readErrorMessage(response);
    throw new Error(msg || "Failed to fetch company profile");
  }
  return response.json() as Promise<FinnhubProfile>;
}
