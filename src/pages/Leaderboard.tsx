import { Trophy, Medal } from "lucide-react";
import { motion } from "framer-motion";

const leaderboardData = [
  { rank: 1, username: "InvestorX", profit: 34.5 },
  { rank: 2, username: "TradeMaster", profit: 28.2 },
  { rank: 3, username: "StockNinja", profit: 22.8 },
  { rank: 4, username: "BullRunner", profit: 18.4 },
  { rank: 5, username: "MarketOwl", profit: 15.1 },
  { rank: 6, username: "WallStreetKid", profit: 12.7 },
  { rank: 7, username: "CashFlow42", profit: 9.3 },
  { rank: 8, username: "You", profit: 5.6 },
];

const rankColors = ["text-warning", "text-muted-foreground", "text-orange-400"];

export default function Leaderboard() {
  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-warning" />
        <h1 className="font-display text-2xl font-bold text-foreground">Leaderboard</h1>
      </div>
      <p className="text-sm text-muted-foreground">Ranked by portfolio profit percentage. Usernames only — privacy first.</p>

      <div className="space-y-2">
        {leaderboardData.map((entry, i) => (
          <motion.div
            key={entry.username}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass-card p-4 flex items-center justify-between ${entry.username === "You" ? "border-primary/50 glow-green" : ""}`}
          >
            <div className="flex items-center gap-4">
              <span className={`font-display font-bold text-lg w-8 ${rankColors[i] || "text-muted-foreground"}`}>
                {entry.rank <= 3 ? <Medal className={`h-5 w-5 ${rankColors[i]}`} /> : `#${entry.rank}`}
              </span>
              <span className={`font-display font-semibold ${entry.username === "You" ? "text-primary" : "text-foreground"}`}>
                {entry.username}
              </span>
            </div>
            <span className="font-display font-bold text-primary">+{entry.profit}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
