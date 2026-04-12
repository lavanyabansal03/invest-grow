/** Google Finance quote URL for charts and full quote UI (external). */

export function inferGoogleFinanceMic(exchange?: string | null): string | undefined {
  if (!exchange) return undefined;
  const u = exchange.toUpperCase();
  if (u.includes("NASDAQ")) return "NASDAQ";
  if (u.includes("NYSE ARCA") || u === "ARCA") return "ARCA";
  if (u.includes("AMEX") || u.includes("NYSE AMERICAN") || u.includes("NYSE MKT")) return "NYSEAMERICAN";
  if (u.includes("NYSE")) return "NYSE";
  if (u.includes("OTC")) return "OTCMKTS";
  return undefined;
}

export function googleFinanceQuoteUrl(symbol: string, exchange?: string | null): string {
  const sym = symbol.trim().toUpperCase();
  if (!sym) return "https://www.google.com/finance";
  const mic = inferGoogleFinanceMic(exchange);
  if (mic) {
    return `https://www.google.com/finance/quote/${encodeURIComponent(sym)}:${encodeURIComponent(mic)}`;
  }
  return `https://www.google.com/finance/quote/${encodeURIComponent(sym)}`;
}
