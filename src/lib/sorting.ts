/**
 * Sorting utilities for QB performances
 * Used to sort games by various opponent difficulty metrics
 */

export type PerformanceWithContext = {
  season: number;
  week: number;
  opp_pass_def_rank: number;
  opp_total_def_rank: number;
  opp_win_pct: number;
  [key: string]: unknown;
};

export type SortMetric =
  | "chronological"
  | "opponent_pass_defense"
  | "opponent_total_defense"
  | "opponent_win_pct"
  | "combined_difficulty";

export type SortDirection = "asc" | "desc";

/**
 * Sorts performances chronologically by season and week
 */
export function sortChronologically<T extends PerformanceWithContext>(
  performances: T[],
  direction: SortDirection = "asc"
): T[] {
  return [...performances].sort((a, b) => {
    const dateComparison = a.season !== b.season
      ? a.season - b.season
      : a.week - b.week;
    return direction === "asc" ? dateComparison : -dateComparison;
  });
}

/**
 * Sorts performances by opponent pass defense rank
 * Lower rank = better defense = harder opponent
 * Default: hardest first (ascending rank order)
 */
export function sortByOpponentPassDefense<T extends PerformanceWithContext>(
  performances: T[],
  direction: SortDirection = "asc"
): T[] {
  return [...performances].sort((a, b) => {
    const comparison = a.opp_pass_def_rank - b.opp_pass_def_rank;
    return direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Sorts performances by opponent total defense rank
 * Lower rank = better defense = harder opponent
 * Default: hardest first (ascending rank order)
 */
export function sortByOpponentTotalDefense<T extends PerformanceWithContext>(
  performances: T[],
  direction: SortDirection = "asc"
): T[] {
  return [...performances].sort((a, b) => {
    const comparison = a.opp_total_def_rank - b.opp_total_def_rank;
    return direction === "asc" ? comparison : -comparison;
  });
}

/**
 * Sorts performances by opponent win percentage
 * Higher win % = better team = harder opponent
 * Default: hardest first (descending win %)
 */
export function sortByOpponentWinPct<T extends PerformanceWithContext>(
  performances: T[],
  direction: SortDirection = "desc"
): T[] {
  return [...performances].sort((a, b) => {
    const comparison = a.opp_win_pct - b.opp_win_pct;
    return direction === "desc" ? -comparison : comparison;
  });
}

/**
 * Calculates a combined difficulty score based on multiple factors
 *
 * Factors:
 * - Pass defense rank (40% weight) - normalized to 0-1
 * - Total defense rank (30% weight) - normalized to 0-1
 * - Win percentage (30% weight) - already 0-1
 *
 * Higher score = harder opponent
 */
export function calculateDifficultyScore(
  performance: PerformanceWithContext
): number {
  // Normalize defense ranks (1-32) to 0-1 scale where 1 is hardest (rank 1)
  const passDefScore = (33 - performance.opp_pass_def_rank) / 32;
  const totalDefScore = (33 - performance.opp_total_def_rank) / 32;
  const winPctScore = performance.opp_win_pct;

  return passDefScore * 0.4 + totalDefScore * 0.3 + winPctScore * 0.3;
}

/**
 * Sorts performances by combined difficulty score
 * Default: hardest first (descending score)
 */
export function sortByCombinedDifficulty<T extends PerformanceWithContext>(
  performances: T[],
  direction: SortDirection = "desc"
): T[] {
  return [...performances].sort((a, b) => {
    const aScore = calculateDifficultyScore(a);
    const bScore = calculateDifficultyScore(b);
    const comparison = aScore - bScore;
    return direction === "desc" ? -comparison : comparison;
  });
}

/**
 * Main sorting function that delegates to specific sort functions
 */
export function getSortedPerformances<T extends PerformanceWithContext>(
  performances: T[],
  metric: SortMetric,
  direction?: SortDirection
): T[] {
  switch (metric) {
    case "chronological":
      return sortChronologically(performances, direction || "asc");
    case "opponent_pass_defense":
      return sortByOpponentPassDefense(performances, direction || "asc");
    case "opponent_total_defense":
      return sortByOpponentTotalDefense(performances, direction || "asc");
    case "opponent_win_pct":
      return sortByOpponentWinPct(performances, direction || "desc");
    case "combined_difficulty":
      return sortByCombinedDifficulty(performances, direction || "desc");
    default:
      return sortChronologically(performances, "asc");
  }
}

/**
 * Groups performances by difficulty tier
 */
export type DifficultyTier = "elite" | "above_average" | "average" | "below_average" | "weak";

export function getDifficultyTier(score: number): DifficultyTier {
  if (score >= 0.8) return "elite";
  if (score >= 0.6) return "above_average";
  if (score >= 0.4) return "average";
  if (score >= 0.2) return "below_average";
  return "weak";
}

/**
 * Groups performances by opponent difficulty tier
 */
export function groupByDifficulty<T extends PerformanceWithContext>(
  performances: T[]
): Record<DifficultyTier, T[]> {
  const groups: Record<DifficultyTier, T[]> = {
    elite: [],
    above_average: [],
    average: [],
    below_average: [],
    weak: [],
  };

  for (const perf of performances) {
    const score = calculateDifficultyScore(perf);
    const tier = getDifficultyTier(score);
    groups[tier].push(perf);
  }

  return groups;
}

/**
 * Calculates the average performance against each difficulty tier
 */
export function getPerformanceByDifficultyTier<T extends PerformanceWithContext>(
  performances: T[],
  statKey: keyof T
): Record<DifficultyTier, { average: number; count: number }> {
  const grouped = groupByDifficulty(performances);

  const result: Record<DifficultyTier, { average: number; count: number }> = {
    elite: { average: 0, count: 0 },
    above_average: { average: 0, count: 0 },
    average: { average: 0, count: 0 },
    below_average: { average: 0, count: 0 },
    weak: { average: 0, count: 0 },
  };

  for (const tier of Object.keys(grouped) as DifficultyTier[]) {
    const tierPerfs = grouped[tier];
    if (tierPerfs.length === 0) continue;

    const sum = tierPerfs.reduce((acc, perf) => {
      const value = perf[statKey];
      return acc + (typeof value === "number" ? value : 0);
    }, 0);

    result[tier] = {
      average: Math.round((sum / tierPerfs.length) * 10) / 10,
      count: tierPerfs.length,
    };
  }

  return result;
}
