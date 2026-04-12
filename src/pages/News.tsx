import { useMemo } from "react";
import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const placeholderArticles = [
  {
    title: "Tech giants lead midday rally as rates cool",
    source: "FinWire",
    summary:
      "Mega-cap names push indexes higher after softer inflation print; traders eye next week's earnings.",
    timeAgo: "12m ago",
  },
  {
    title: "Energy stocks slide with crude on inventory surprise",
    source: "MarketBeat",
    summary: "WTI dips 2.3% after a larger-than-expected build; refiners lag broader market.",
    timeAgo: "32m ago",
  },
  {
    title: "Banks extend gains as yield curve steepens",
    source: "StreetDaily",
    summary: "Regional lenders outperform on improving net interest margin outlook; credit quality remains stable.",
    timeAgo: "55m ago",
  },
  {
    title: "AI hardware names jump on new data-center spending survey",
    source: "ChipWatch",
    summary: "Survey points to another capex upgrade cycle in 2H; analysts lift GPU demand estimates.",
    timeAgo: "1h 20m ago",
  },
];

export default function News() {
  const todayLabel = useMemo(() => format(new Date(), "eeee, MMMM d, yyyy"), []);

  return (
    <div className="min-h-[calc(100dvh-3rem)] bg-background p-6 space-y-6 max-w-6xl mx-auto">
        <header className="space-y-3">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold text-foreground">Market news</h1>
            <p className="text-sm text-muted-foreground">{todayLabel}</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Headlines below are for today’s session. A live Finnhub feed will replace placeholders next.
          </p>
        </header>

        <Separator />

        <section aria-labelledby="today-headlines" className="space-y-4">
          <h2 id="today-headlines" className="sr-only">
            Today’s headlines
          </h2>
          <div className="space-y-3">
            {placeholderArticles.map((article) => (
              <Card key={article.title} className="border-border/80 shadow-sm transition-colors hover:bg-muted/20">
                <CardHeader className="space-y-1 pb-2 pt-5">
                  <CardTitle className="text-base font-semibold leading-snug">{article.title}</CardTitle>
                  <CardDescription className="text-xs font-normal">
                    {article.source} · {article.timeAgo}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-5 pt-0">
                  <p className="text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span>Live wire: waiting for API connection</span>
        </p>
    </div>
  );
}
