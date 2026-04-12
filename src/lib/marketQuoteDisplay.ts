import type { FinnhubQuote } from "@/api/finnhub";

export function formatUsd(n: number | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  return `$${n.toFixed(2)}`;
}

export function formatDeltaDollar(n: number | undefined): { text: string; up: boolean | null } {
  if (n == null || !Number.isFinite(n)) return { text: "—", up: null };
  if (n === 0) return { text: "$0.00", up: null };
  const up = n > 0;
  return { text: `${up ? "+" : "−"}$${Math.abs(n).toFixed(2)}`, up };
}

export type QuoteDetailRow = { label: string; value: string; valueClass?: string };

export function quoteDetailRows(q: FinnhubQuote): QuoteDetailRow[] {
  const dFmt = formatDeltaDollar(q.d);
  const dp = q.dp;
  const dpUp = dp > 0 ? true : dp < 0 ? false : null;
  return [
    { label: "Last (current)", value: formatUsd(q.c) },
    { label: "Open", value: formatUsd(q.o) },
    { label: "High", value: formatUsd(q.h) },
    { label: "Low", value: formatUsd(q.l) },
    { label: "Previous close", value: formatUsd(q.pc) },
    {
      label: "Change ($)",
      value: dFmt.text,
      valueClass: dFmt.up === true ? "text-primary" : dFmt.up === false ? "text-destructive" : "text-foreground",
    },
    {
      label: "Change (%)",
      value: Number.isFinite(dp) ? `${dp > 0 ? "+" : dp < 0 ? "−" : ""}${Math.abs(dp).toFixed(2)}%` : "—",
      valueClass: dpUp === true ? "text-primary" : dpUp === false ? "text-destructive" : "text-foreground",
    },
  ];
}

export function formatCapMillion(usdMillions: number): string {
  if (!Number.isFinite(usdMillions) || usdMillions <= 0) return "—";
  const usd = usdMillions * 1e6;
  if (usd >= 1e12) return `$${(usd / 1e12).toFixed(2)}T`;
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(2)}B`;
  return `$${(usd / 1e6).toFixed(0)}M`;
}
