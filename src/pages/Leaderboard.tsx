import { useMemo } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useUserProfile, useHoldings } from "@/hooks/usePaperPortfolio";
import { LEADERBOARD_DUMMY_TRADERS } from "@/lib/leaderboard-dummy";
import { computeTotalReturnPct } from "@/lib/total-return";
import { LeaderboardTopFive, type LeaderboardEntry } from "@/components/leaderboard/LeaderboardTopFive";

export type LeaderboardRow = {
  key: string;
  place: number;
  username: string;
  total_return_pct: number;
  isYou: boolean;
  isDemo: boolean;
};

function formatReturnPct(pct: number): string {
  const rounded = Math.round(pct * 100) / 100;
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(2)}%`;
}

function rowToEntry(r: LeaderboardRow): LeaderboardEntry {
  return {
    rank: r.place,
    username: r.username,
    profitPct: r.total_return_pct,
    isYou: r.isYou,
    isDemo: r.isDemo,
  };
}

function buildMergedLeaderboard(
  userPct: number | null,
  displayName: string,
): { rows: LeaderboardRow[]; userPlace: number | null; userPct: number | null; totalCount: number } {
  const base = LEADERBOARD_DUMMY_TRADERS.map((d) => ({
    key: d.id,
    username: d.username,
    total_return_pct: d.total_return_pct,
    isYou: false,
    isDemo: true,
  }));

  const merged =
    userPct != null
      ? [
          ...base,
          {
            key: "you",
            username: displayName.trim() || "You",
            total_return_pct: userPct,
            isYou: true,
            isDemo: false,
          },
        ]
      : base.slice();

  merged.sort((a, b) => b.total_return_pct - a.total_return_pct);

  const rows: LeaderboardRow[] = merged.map((e, i) => ({
    ...e,
    place: i + 1,
  }));

  const you = rows.find((r) => r.isYou);
  return {
    rows,
    userPlace: you?.place ?? null,
    userPct: userPct,
    totalCount: rows.length,
  };
}

export default function Leaderboard() {
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings();

  const displayName = profile?.username?.trim() || profile?.email?.split("@")[0] || "You";

  const userReturnPct = useMemo(() => {
    if (!profile?.onboarding_completed) return null;
    return computeTotalReturnPct(profile, holdings);
  }, [profile, holdings]);

  const { rows, userPlace, userPct, totalCount } = useMemo(
    () => buildMergedLeaderboard(userReturnPct, displayName),
    [userReturnPct, displayName],
  );

  const arenaEntries = useMemo(() => rows.slice(0, 10).map(rowToEntry), [rows]);

  const loading = profileLoading || holdingsLoading;

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-warning" />
        <h1 className="font-display text-2xl font-bold text-foreground">Leaderboard</h1>
      </div>

      {loading && (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && profile && userPlace != null && userPct != null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm"
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">Your position</p>
          <p className="font-display text-2xl font-bold text-foreground">
            #{userPlace}{" "}
            <span className="text-base font-normal text-muted-foreground">
              of {totalCount} ({formatReturnPct(userPct)} total return)
            </span>
          </p>
        </motion.div>
      )}

      {!loading && profile && !profile.onboarding_completed && (
        <p className="text-sm text-muted-foreground">Finish onboarding to see your rank and return on the leaderboard.</p>
      )}

      {!loading && arenaEntries.length > 0 && <LeaderboardTopFive entries={arenaEntries} />}
    </div>
  );
}
