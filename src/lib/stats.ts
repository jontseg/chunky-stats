/**
 * Stat calculation utilities for QB performance metrics
 */

export type QBPerformanceStats = {
  pass_yards: number;
  pass_tds: number;
  pass_attempts: number;
  completions: number;
  interceptions: number;
  rush_yards: number;
  rush_tds: number;
  sacks: number;
  fumbles: number;
};

/**
 * Calculates NFL Passer Rating using the official formula
 * Range: 0 to 158.3
 *
 * Formula components:
 * a = ((completions/attempts) - 0.3) * 5
 * b = ((yards/attempts) - 3) * 0.25
 * c = (touchdowns/attempts) * 20
 * d = 2.375 - ((interceptions/attempts) * 25)
 *
 * Each component is capped between 0 and 2.375
 * Rating = ((a + b + c + d) / 6) * 100
 */
export function calculatePasserRating(
  completions: number,
  attempts: number,
  yards: number,
  touchdowns: number,
  interceptions: number
): number {
  if (attempts === 0) return 0;

  const clamp = (value: number): number => Math.min(2.375, Math.max(0, value));

  const a = clamp((completions / attempts - 0.3) * 5);
  const b = clamp((yards / attempts - 3) * 0.25);
  const c = clamp((touchdowns / attempts) * 20);
  const d = clamp(2.375 - (interceptions / attempts) * 25);

  const rating = ((a + b + c + d) / 6) * 100;

  return Math.round(rating * 10) / 10;
}

/**
 * Calculates standard fantasy points (PPR scoring)
 *
 * Scoring:
 * - Pass yards: 1 point per 25 yards (0.04 per yard)
 * - Pass TDs: 4 points
 * - Interceptions: -2 points
 * - Rush yards: 1 point per 10 yards (0.1 per yard)
 * - Rush TDs: 6 points
 * - Fumbles lost: -2 points (assuming all fumbles are lost for simplicity)
 */
export function calculateFantasyPoints(stats: QBPerformanceStats): number {
  const passYardPoints = stats.pass_yards * 0.04;
  const passTdPoints = stats.pass_tds * 4;
  const intPoints = stats.interceptions * -2;
  const rushYardPoints = stats.rush_yards * 0.1;
  const rushTdPoints = stats.rush_tds * 6;
  const fumblePoints = stats.fumbles * -2;

  const total =
    passYardPoints +
    passTdPoints +
    intPoints +
    rushYardPoints +
    rushTdPoints +
    fumblePoints;

  return Math.round(total * 10) / 10;
}

/**
 * Calculates completion percentage
 */
export function calculateCompletionPercentage(
  completions: number,
  attempts: number
): number {
  if (attempts === 0) return 0;
  return Math.round((completions / attempts) * 1000) / 10;
}

/**
 * Calculates yards per attempt
 */
export function calculateYardsPerAttempt(
  yards: number,
  attempts: number
): number {
  if (attempts === 0) return 0;
  return Math.round((yards / attempts) * 10) / 10;
}

/**
 * Calculates adjusted yards per attempt (AY/A)
 * Formula: (yards + 20*TDs - 45*INTs) / attempts
 */
export function calculateAdjustedYardsPerAttempt(
  yards: number,
  touchdowns: number,
  interceptions: number,
  attempts: number
): number {
  if (attempts === 0) return 0;
  const adjustedYards = yards + 20 * touchdowns - 45 * interceptions;
  return Math.round((adjustedYards / attempts) * 10) / 10;
}

/**
 * Calculates QBR-style efficiency score (simplified)
 * This is a normalized score from 0-100 based on key metrics
 */
export function calculateEfficiencyScore(stats: QBPerformanceStats): number {
  const completionPct = calculateCompletionPercentage(
    stats.completions,
    stats.pass_attempts
  );
  const ypa = calculateYardsPerAttempt(stats.pass_yards, stats.pass_attempts);
  const tdRate =
    stats.pass_attempts > 0
      ? (stats.pass_tds / stats.pass_attempts) * 100
      : 0;
  const intRate =
    stats.pass_attempts > 0
      ? (stats.interceptions / stats.pass_attempts) * 100
      : 0;

  // Normalize each component (approximate NFL average benchmarks)
  const compScore = Math.min(100, (completionPct / 70) * 50);
  const ypaScore = Math.min(100, (ypa / 8) * 50);
  const tdScore = Math.min(100, (tdRate / 6) * 50);
  const intPenalty = Math.min(50, (intRate / 3) * 50);

  const score = compScore * 0.3 + ypaScore * 0.3 + tdScore * 0.25 - intPenalty * 0.15;

  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * Aggregates multiple game stats into season totals
 */
export function aggregateStats(
  games: QBPerformanceStats[]
): QBPerformanceStats & { games: number } {
  const initialValue: QBPerformanceStats & { games: number } = {
    pass_yards: 0,
    pass_tds: 0,
    pass_attempts: 0,
    completions: 0,
    interceptions: 0,
    rush_yards: 0,
    rush_tds: 0,
    sacks: 0,
    fumbles: 0,
    games: 0,
  };

  return games.reduce<QBPerformanceStats & { games: number }>((acc, game) => ({
    pass_yards: acc.pass_yards + game.pass_yards,
    pass_tds: acc.pass_tds + game.pass_tds,
    pass_attempts: acc.pass_attempts + game.pass_attempts,
    completions: acc.completions + game.completions,
    interceptions: acc.interceptions + game.interceptions,
    rush_yards: acc.rush_yards + game.rush_yards,
    rush_tds: acc.rush_tds + game.rush_tds,
    sacks: acc.sacks + game.sacks,
    fumbles: acc.fumbles + game.fumbles,
    games: acc.games + 1,
  }), initialValue);
}

/**
 * Calculates per-game averages from aggregated stats
 */
export function calculateAverages(
  totals: QBPerformanceStats & { games: number }
): Record<keyof QBPerformanceStats, number> {
  if (totals.games === 0) {
    return {
      pass_yards: 0,
      pass_tds: 0,
      pass_attempts: 0,
      completions: 0,
      interceptions: 0,
      rush_yards: 0,
      rush_tds: 0,
      sacks: 0,
      fumbles: 0,
    };
  }

  const round = (n: number) => Math.round(n * 10) / 10;

  return {
    pass_yards: round(totals.pass_yards / totals.games),
    pass_tds: round(totals.pass_tds / totals.games),
    pass_attempts: round(totals.pass_attempts / totals.games),
    completions: round(totals.completions / totals.games),
    interceptions: round(totals.interceptions / totals.games),
    rush_yards: round(totals.rush_yards / totals.games),
    rush_tds: round(totals.rush_tds / totals.games),
    sacks: round(totals.sacks / totals.games),
    fumbles: round(totals.fumbles / totals.games),
  };
}
