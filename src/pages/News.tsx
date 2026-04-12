import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronRight, Loader2, Newspaper } from "lucide-react";
import { getMarketNews, type MarketNewsCategory } from "@/api/finnhub";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const NEWS_CATEGORIES: { value: MarketNewsCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
  { value: "merger", label: "M&A" },
];

export default function News() {
  const todayLabel = useMemo(() => format(new Date(), "eeee, MMMM d, yyyy"), []);
  const [category, setCategory] = useState<MarketNewsCategory>("general");

  const { data: articles = [], isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["market-news", category, 0],
    queryFn: () => getMarketNews({ category, minId: 0 }),
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="min-h-[calc(100dvh-3rem)] bg-background p-6 space-y-8 max-w-6xl mx-auto">
      <header className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-foreground">Market news</h1>
          <p className="text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <Tabs value={category} onValueChange={(v) => setCategory(v as MarketNewsCategory)} className="w-full max-w-xl">
          <TabsList className="grid w-full grid-cols-4 h-auto flex-wrap gap-1 p-1">
            {NEWS_CATEGORIES.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="text-xs sm:text-sm px-2">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <Separator />

      <section aria-labelledby="top-stories-heading" className="space-y-6">
        <h2
          id="top-stories-heading"
          className="flex items-center gap-0.5 text-lg font-semibold tracking-tight text-foreground"
        >
          Top stories
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
        </h2>

        {isPending && (
          <div className="flex justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading news" />
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm space-y-2">
            <p className="text-destructive font-medium">Could not load news</p>
            <p className="text-muted-foreground">{error instanceof Error ? error.message : "Unknown error"}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        )}

        {!isPending && !isError && articles.length === 0 && (
          <p className="text-sm text-muted-foreground py-8">No headlines returned right now. Try again in a moment.</p>
        )}

        {!isPending && !isError && articles.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {articles.map((article) => {
                const published = new Date(article.datetime * 1000);
                const timeAgo = formatDistanceToNow(published, { addSuffix: true });
                const thumb = article.image?.trim();
                return (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex gap-3 rounded-md p-1 -m-1 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <div className="shrink-0">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover bg-muted"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
                          aria-hidden
                        >
                          <Newspaper className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        <span>{timeAgo}</span>
                        <span className="mx-1.5 text-muted-foreground/70">·</span>
                        <span>{article.source || "News"}</span>
                      </p>
                      <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground group-hover:underline underline-offset-2 decoration-foreground/30">
                        {article.headline}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline disabled:opacity-50 disabled:pointer-events-none"
            >
              Keep reading
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </>
        )}
      </section>
    </div>
  );
}
