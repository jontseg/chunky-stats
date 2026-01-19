/**
 * Defense rank utilities
 * Shared logic for defense rank display and styling
 */

export type DefenseRankTier = "elite" | "good" | "average" | "below-average" | "weak";

/**
 * Get defense rank tier based on rank number
 * Lower rank = better defense = harder matchup
 */
export function getDefenseRankTier(rank: number): DefenseRankTier {
  if (rank <= 5) return "elite";
  if (rank <= 10) return "good";
  if (rank <= 20) return "average";
  if (rank <= 27) return "below-average";
  return "weak";
}

/**
 * Get human-readable label for defense rank
 */
export function getDefenseRankLabel(rank: number): string {
  const tier = getDefenseRankTier(rank);
  const labels: Record<DefenseRankTier, string> = {
    elite: "Elite",
    good: "Good",
    average: "Average",
    "below-average": "Below Avg",
    weak: "Weak",
  };
  return labels[tier];
}

/**
 * Get color for defense rank (for charts/badges)
 * Better defense = red (harder), worse = green (easier)
 */
export function getDefenseRankColor(rank: number): string {
  const tier = getDefenseRankTier(rank);
  const colors: Record<DefenseRankTier, string> = {
    elite: "#ef4444",
    good: "#f97316",
    average: "#eab308",
    "below-average": "#22c55e",
    weak: "#16a34a",
  };
  return colors[tier];
}

/**
 * Get CSS class for defense rank styling
 */
export function getDefenseRankClass(rank: number): string {
  const tier = getDefenseRankTier(rank);
  const classes: Record<DefenseRankTier, string> = {
    elite: "rank-elite",
    good: "rank-good",
    average: "rank-average",
    "below-average": "rank-below-average",
    weak: "rank-weak",
  };
  return classes[tier];
}

/**
 * Get row background class based on matchup difficulty
 */
export function getMatchupRowBgClass(rank: number): string {
  if (rank <= 10) return "bg-red-50 dark:bg-red-950/30";
  if (rank <= 22) return "bg-yellow-50 dark:bg-yellow-950/20";
  return "bg-green-50 dark:bg-green-950/20";
}
