import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { LeaderboardTopFive } from "@/components/leaderboard/LeaderboardTopFive";

export default function Leaderboard() {
  return (
    <div className="relative min-h-full">
      {/* Neon green ambient light on the page chrome (outside the glass card) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 left-1/2 h-[min(20rem,52vh)] w-[min(32rem,95%)] -translate-x-1/2 rounded-full bg-[hsl(155_100%_46%/0.07)] blur-[100px]" />
        <div className="absolute -top-20 -left-32 h-64 w-64 rounded-full bg-[hsl(160_100%_42%/0.04)] blur-[90px]" />
        <div className="absolute -top-16 -right-24 h-56 w-56 rounded-full bg-[hsl(150_95%_48%/0.035)] blur-[80px]" />
        {/* Side wash — soft neon along left / right */}
        <div className="absolute top-1/2 left-0 h-[min(70vh,36rem)] w-48 max-w-[40vw] -translate-x-1/3 -translate-y-1/2 rounded-full bg-[hsl(158_95%_44%/0.09)] blur-[92px]" />
        <div className="absolute top-1/2 right-0 h-[min(70vh,36rem)] w-48 max-w-[40vw] translate-x-1/3 -translate-y-1/2 rounded-full bg-[hsl(155_95%_46%/0.08)] blur-[92px]" />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[hsl(160_90%_38%/0.1)] via-[hsl(160_70%_32%/0.04)] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_55%_at_50%_100%,hsl(158_100%_48%/0.08),transparent_58%)]" />
      </div>

      <div className="relative z-10 p-6 space-y-8 max-w-3xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-4">
          <motion.div
            className="relative flex h-14 w-14 shrink-0 items-center justify-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
            transition={{
              opacity: { duration: 0.35 },
              scale: { duration: 0.35 },
              y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            }}
            aria-hidden
          >
            <div className="absolute -inset-0.5 rounded-2xl bg-[hsl(48_100%_50%/0.18)] blur-lg opacity-50" />
            <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-[hsl(48_95%_52%/0.55)] bg-gradient-to-br from-[hsl(48_100%_58%/0.35)] via-[hsl(38_90%_42%/0.2)] to-[hsl(28_85%_35%/0.25)] shadow-[0_0_14px_-4px_hsl(48_100%_55%/0.28),inset_0_1px_0_hsl(52_100%_70%/0.14)]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_30%,hsl(52_100%_85%/0.06)_48%,transparent_62%)]" />
              <Trophy
                className="relative h-7 w-7 text-[hsl(52_100%_72%)] drop-shadow-[0_0_4px_hsl(48_100%_55%/0.35)]"
                strokeWidth={2.25}
              />
            </div>
          </motion.div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              Top performers by portfolio return. Usernames only — privacy first.
            </p>
          </div>
        </div>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-card relative overflow-hidden rounded-2xl border-border/50 p-6 sm:p-8"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-30%,hsl(160_84%_39%/0.08),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_100%,hsl(265_40%_45%/0.06),transparent_45%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(220_25%_6%/0.5)]" />
        </div>

        <div className="relative z-[1]">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Top 5 this week</h2>
              <p className="text-xs text-muted-foreground mt-1">Rankings reset weekly · Mock data for preview</p>
            </div>
          </div>

          <LeaderboardTopFive />
        </div>
      </motion.section>
      </div>
    </div>
  );
}
