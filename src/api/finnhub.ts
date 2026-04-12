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

export interface FinnhubSearchItem {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

export interface FinnhubSearchResponse {
  count?: number;
  result?: FinnhubSearchItem[];
}

/** Finnhub symbol search (US & global). Results are filtered client-side for tradable names. */
export async function searchStocks(query: string): Promise<FinnhubSearchItem[]> {
  const q = query.trim();
  if (!q) return [];
  const response = await fetch(stocksUrl(`/search?q=${encodeURIComponent(q)}`));
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded (50 calls/min). Please try again later.");
    }
    const msg = await readErrorMessage(response);
    throw new Error(msg || "Search failed");
  }
  const data = (await response.json()) as FinnhubSearchResponse;
  return Array.isArray(data.result) ? data.result : [];
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

const BACKEND_HINT =
  "Start the Flask API on port 5050 (same as Vite’s /api proxy). From the repo root run `npm run dev` to start web + API together, or run `npm run server` in a second terminal.";

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.clone().json();
    if (body && typeof body.error === "string" && body.error.trim()) return body.error;
    if (body && typeof body.details === "string" && body.details.trim()) return body.details;
  } catch {
    try {
      const text = await response.clone().text();
      if (text.trim()) return text.slice(0, 200);
    } catch {
      /* ignore */
    }
  }
  if (response.status === 502 || response.status === 503 || response.status === 504) {
    return `${response.statusText || "Bad gateway"}. ${BACKEND_HINT}`;
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

/** Finnhub market-news item (see https://finnhub.io/docs/api/market-news). */
export type MarketNewsCategory = "general" | "forex" | "crypto" | "merger";

export interface MarketNewsItem {
  id: number;
  category?: string;
  datetime: number;
  headline: string;
  image?: string;
  related?: string;
  source: string;
  summary: string;
  url: string;
}

export type GetMarketNewsParams = {
  category?: MarketNewsCategory;
  /** Finnhub: return only items with id greater than this (default 0 = latest batch). */
  minId?: number;
};

function normalizeMarketNewsParams(
  opts: MarketNewsCategory | GetMarketNewsParams | undefined,
): { category: MarketNewsCategory; minId: number } {
  const allowed: MarketNewsCategory[] = ["general", "forex", "crypto", "merger"];
  if (opts === undefined || typeof opts === "string") {
    const c = (opts ?? "general") as string;
    const category = (allowed.includes(c as MarketNewsCategory) ? c : "general") as MarketNewsCategory;
    return { category, minId: 0 };
  }
  const raw = opts.category ?? "general";
  const category = (allowed.includes(raw as MarketNewsCategory) ? raw : "general") as MarketNewsCategory;
  const m = opts.minId;
  const minId = typeof m === "number" && Number.isFinite(m) && m >= 0 ? Math.floor(m) : 0;
  return { category, minId };
}

/** Market news from Finnhub via `/api/stocks/news` (category + optional minId). */
export async function getMarketNews(
  opts: MarketNewsCategory | GetMarketNewsParams = "general",
): Promise<MarketNewsItem[]> {
  const { category, minId } = normalizeMarketNewsParams(opts);
  const qs = new URLSearchParams();
  qs.set("category", category);
  qs.set("minId", String(minId));
  const response = await fetch(stocksUrl(`/news?${qs.toString()}`));
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded (50 calls/min). Please try again later.");
    }
    const msg = await readErrorMessage(response);
    throw new Error(msg || "Failed to fetch market news");
  }
  const data = (await response.json()) as unknown;
  return Array.isArray(data) ? (data as MarketNewsItem[]) : [];
}
