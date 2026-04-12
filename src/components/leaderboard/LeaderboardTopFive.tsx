import { motion } from "framer-motion";
import { Crown, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type LeaderboardEntry = {
  rank: number;
  username: string;
  profitPct: number;
  isYou?: boolean;
  isDemo?: boolean;
};

/** Mock data for UI previews — page passes real merged data instead. */
export const MOCK_LEADERBOARD_TOP_FIVE: LeaderboardEntry[] = [
  { rank: 1, username: "InvestorX", profitPct: 34.52 },
  { rank: 2, username: "TradeMaster", profitPct: 28.19 },
  { rank: 3, username: "StockNinja", profitPct: 22.84 },
  { rank: 4, username: "BullRunner", profitPct: 18.41 },
  { rank: 5, username: "MarketOwl", profitPct: 15.07 },
];

export function initials(username: string) {
  const parts = username.replace(/[^a-zA-Z0-9]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

function formatProfitPct(pct: number): string {
  const rounded = Math.round(pct * 100) / 100;
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(2)}%`;
}

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] as const },
});

type RunnerUpRowProps = {
  entry: LeaderboardEntry;
  delayIndex: number;
  isLast: boolean;
};

export function RunnerUpRow({ entry, delayIndex, isLast }: RunnerUpRowProps) {
  const positive = entry.profitPct >= 0;
  return (
    <motion.li
      {...stagger(delayIndex)}
      className={cn(
        "flex list-none items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4",
        "bg-muted/50 transition-colors hover:bg-muted/70",
        !isLast && "border-b border-border/80",
        entry.isYou && "bg-primary/5 ring-1 ring-inset ring-primary/25",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted font-display text-sm font-bold tabular-nums text-muted-foreground ring-1 ring-border/60">
        {entry.rank}
      </span>
      <Avatar className="h-10 w-10 shrink-0 ring-1 ring-border/50">
        <AvatarFallback className="font-display text-xs font-bold bg-secondary text-secondary-foreground">
          {initials(entry.username)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold text-foreground">
          {entry.username}
          {entry.isYou && <span className="text-primary"> · you</span>}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Rank {entry.rank}
          {entry.isDemo ? " · demo" : ""}
        </p>
      </div>
      <div className={cn("flex shrink-0 items-center gap-1.5", positive ? "text-primary" : "text-destructive")}>
        {positive ? <TrendingUp className="h-3.5 w-3.5" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden />}
        <span className="font-display text-sm font-bold tabular-nums">{formatProfitPct(entry.profitPct)}</span>
      </div>
    </motion.li>
  );
}

type PodiumSlotProps = {
  entry: LeaderboardEntry;
  place: "first" | "second" | "third";
  delayIndex: number;
};

function PodiumSlot({ entry, place, delayIndex }: PodiumSlotProps) {
  const isFirst = place === "first";
  const isSecond = place === "second";
  const isThird = place === "third";
  const positive = entry.profitPct >= 0;

  return (
    <motion.div
      {...stagger(delayIndex)}
      className={cn(
        "flex flex-col items-stretch flex-1 min-w-0 max-w-[152px]",
        isFirst && "z-10",
        isSecond && "mt-8",
        isThird && "mt-14",
        entry.isYou && "scale-[1.02]",
      )}
    >
      <div
        className={cn(
          "relative flex h-full min-h-0 w-full flex-col rounded-2xl border-2 bg-card/40 backdrop-blur-sm transition-shadow",
          isFirst ? "overflow-visible" : "overflow-hidden",
          entry.isYou && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
          isFirst &&
            "min-h-[min(22rem,72vw)] border-[hsl(48_96%_58%/0.9)] bg-gradient-to-b from-[hsl(48_100%_54%/0.22)] via-[hsl(220_18%_9%/0.92)] to-[hsl(220_22%_6%/0.95)] shadow-[0_0_52px_-8px_hsl(48_100%_55%/0.4),inset_0_0_0_1px_hsl(48_100%_70%/0.12)]",
          isSecond &&
            "min-h-[min(19rem,62vw)] border-[hsl(210_38%_72%/0.95)] bg-gradient-to-b from-[hsl(210_30%_78%/0.2)] via-[hsl(220_18%_10%/0.92)] to-[hsl(220_20%_7%/0.96)] shadow-[0_0_40px_-10px_hsl(210_45%_80%/0.22),inset_0_0_0_1px_hsl(210_35%_88%/0.1)]",
          isThird &&
            "min-h-[min(16.5rem,56vw)] border-[hsl(28_88%_52%/0.95)] bg-gradient-to-b from-[hsl(28_95%_48%/0.24)] via-[hsl(220_18%_10%/0.9)] to-[hsl(220_20%_7%/0.96)] shadow-[0_0_40px_-10px_hsl(28_90%_50%/0.32),inset_0_0_0_1px_hsl(32_90%_58%/0.12)]",
        )}
      >
        {isFirst && (
          <div className="absolute -top-12 left-1/2 z-10 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-[hsl(48_100%_65%/0.95)] bg-[hsl(48_100%_54%/0.4)] shadow-[0_0_18px_hsl(48_100%_55%/0.5)]">
            <Crown className="h-4 w-4 text-[hsl(52_100%_76%)] drop-shadow-[0_0_8px_hsl(48_100%_55%/0.9)]" aria-hidden />
          </div>
        )}

        <div className={cn("flex flex-1 flex-col items-center justify-center gap-2 px-3 pt-7 pb-2 text-center")}>
          <Avatar
            className={cn(
              "ring-2 ring-offset-2 ring-offset-[hsl(220_22%_8%)]",
              isFirst && "-translate-y-3 h-14 w-14 ring-[hsl(48_100%_58%/0.95)] shadow-[0_0_22px_hsl(48_100%_55%/0.38)]",
              isSecond && "h-11 w-11 ring-[hsl(210_35%_82%/0.9)] shadow-[0_0_16px_hsl(210_40%_80%/0.25)]",
              isThird && "h-11 w-11 ring-[hsl(28_90%_55%/0.95)] shadow-[0_0_16px_hsl(28_85%_48%/0.32)]",
            )}
          >
            <AvatarFallback
              className={cn(
                "font-display text-sm font-bold",
                isFirst && "bg-[hsl(43_90%_38%/0.65)] text-[hsl(52_100%_76%)]",
                isSecond && "bg-[hsl(215_22%_32%)] text-[hsl(210_40%_92%)]",
                isThird && "bg-[hsl(22_75%_32%/0.9)] text-[hsl(32_98%_72%)]",
              )}
            >
              {initials(entry.username)}
            </AvatarFallback>
          </Avatar>
          <p className="w-full truncate px-0.5 font-display text-sm font-semibold text-foreground">
            {entry.username}
            {entry.isYou && <span className="text-primary"> · you</span>}
          </p>
          {entry.isDemo && <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Demo</p>}
          <div className={cn("flex items-center justify-center gap-1", positive ? "text-primary" : "text-destructive")}>
            {positive ? <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            <span className="font-display text-sm font-bold tabular-nums">{formatProfitPct(entry.profitPct)}</span>
          </div>
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center justify-center px-3 font-display font-bold",
            isFirst && "min-h-[7.5rem] pb-6 pt-2 text-2xl",
            isSecond && "min-h-[6rem] pb-5 pt-2 text-xl",
            isThird && "min-h-[5rem] pb-4 pt-2 text-xl",
            isFirst &&
              "bg-[radial-gradient(ellipse_90%_100%_at_50%_0%,transparent_0%,hsl(48_100%_45%/0.12)_120%)] text-[hsl(52_100%_72%)] [text-shadow:0_0_24px_hsl(48_100%_55%/0.4)]",
            isSecond &&
              "bg-[radial-gradient(ellipse_90%_100%_at_50%_0%,transparent_0%,hsl(210_35%_70%/0.1)_120%)] text-[hsl(210_38%_90%)]",
            isThird &&
              "bg-[radial-gradient(ellipse_90%_100%_at_50%_0%,transparent_0%,hsl(28_80%_45%/0.12)_120%)] text-[hsl(32_95%_68%)]",
          )}
        >
          <span className="tabular-nums leading-none">{entry.rank}</span>
        </div>
      </div>
    </motion.div>
  );
}

export type LeaderboardTopFiveProps = {
  entries?: LeaderboardEntry[];
  className?: string;
};

/**
 * Podium for ranks 1–3 and “Final stretch” list for ranks 4–10 (pass up to 10 entries).
 */
export function LeaderboardTopFive({ entries = MOCK_LEADERBOARD_TOP_FIVE, className }: LeaderboardTopFiveProps) {
  const sorted = [...entries].sort((a, b) => a.rank - b.rank).slice(0, 10);
  const byRank = (n: number) => sorted.find((e) => e.rank === n);
  const second = byRank(2) ?? sorted[1];
  const first = byRank(1) ?? sorted[0];
  const third = byRank(3) ?? sorted[2];
  const runnersUp = sorted.filter((e) => e.rank >= 4 && e.rank <= 10);

  if (sorted.length === 0) return null;

  return (
    <div className={cn("space-y-8", className)}>
      <div className="relative overflow-visible rounded-2xl border border-border/40">
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(232_28%_11%)] via-[hsl(218_24%_5%)] to-[hsl(268_22%_8%)]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220_30%_4%)] via-transparent to-transparent opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_55%_at_50%_-15%,hsl(160_84%_42%/0.22),transparent_52%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_0%_85%,hsl(48_95%_54%/0.1),transparent_50%),radial-gradient(ellipse_50%_40%_at_100%_75%,hsl(217_91%_62%/0.12),transparent_48%)]" />
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_35%,hsl(172_65%_42%/0.14),transparent_42%)]"
            animate={{ opacity: [0.45, 0.9, 0.45] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_82%_30%,hsl(280_55%_50%/0.1),transparent_40%)]"
            animate={{ opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-primary/[0.1] via-primary/[0.03] to-transparent" />
          <div className="absolute inset-0 bg-[conic-gradient(from_200deg_at_50%_100%,transparent_0deg,hsl(160_70%_40%/0.08)_25deg,transparent_55deg,transparent_360deg)] opacity-80" />
          <div className="absolute inset-0 opacity-[0.35] bg-[linear-gradient(hsl(210_25%_98%/0.045)_1px,transparent_1px),linear-gradient(90deg,hsl(210_25%_98%/0.045)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_88%_78%_at_50%_42%,black_15%,transparent_72%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_50%,transparent_40%,hsl(220_30%_4%/0.85)_100%)]" />
        </div>

        <div className="relative z-[1] flex items-end justify-center gap-2 px-3 pb-10 pt-24 sm:gap-5 sm:px-6 sm:pb-12 sm:pt-28">
          {second && <PodiumSlot entry={second} place="second" delayIndex={0} />}
          {first && <PodiumSlot entry={first} place="first" delayIndex={1} />}
          {third && <PodiumSlot entry={third} place="third" delayIndex={2} />}
        </div>
      </div>

      {runnersUp.length > 0 && (
        <div className="space-y-4">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.35 }}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">Final stretch</h3>
            <span className="text-[11px] text-muted-foreground">Ranks 4–10</span>
          </motion.div>

          <ul className="list-none overflow-hidden rounded-xl border border-border bg-muted/30 p-0 shadow-sm">
            {runnersUp.map((entry, i) => (
              <RunnerUpRow
                key={`${entry.rank}-${entry.username}`}
                entry={entry}
                delayIndex={4 + i}
                isLast={i === runnersUp.length - 1}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export type LeaderboardMoreRanksProps = {
  entries: LeaderboardEntry[];
  title: string;
  subtitle?: string;
  startDelayIndex?: number;
  className?: string;
};

/** Ranks 6+ in the same row style as podium runners-up. */
export function LeaderboardMoreRanks({
  entries,
  title,
  subtitle,
  startDelayIndex = 8,
  className,
}: LeaderboardMoreRanksProps) {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.rank - b.rank);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </motion.div>
      <ul className="list-none overflow-hidden rounded-xl border border-border bg-muted/30 p-0 shadow-sm">
        {sorted.map((entry, i) => (
          <RunnerUpRow
            key={`${entry.rank}-${entry.username}`}
            entry={entry}
            delayIndex={startDelayIndex + i}
            isLast={i === sorted.length - 1}
          />
        ))}
      </ul>
    </div>
  );
}
