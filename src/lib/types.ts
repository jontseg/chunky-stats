/**
 * Shared type definitions for QB Profile Dashboard
 */

// Re-export types from existing modules for convenience
export type { SortMetric, PerformanceWithContext } from "./sorting";
export type { QBPerformanceStats } from "./stats";

// Performance type matching the API response from /api/qbs/[gsis_id]
export type Performance = {
  id: string;
  season: number;
  week: number;
  opponent_id: string;
  pass_yards: number;
  pass_tds: number;
  pass_attempts: number;
  completions: number;
  rush_yards: number;
  rush_tds: number;
  interceptions: number;
  sacks: number;
  fumbles: number;
  opp_win_pct: number;
  opp_pass_def_rank: number;
  opp_total_def_rank: number;
  opponent: {
    name: string;
    abbreviation: string;
  };
};

// QB data type matching the API response
export type QBData = {
  id: string;
  gsis_id: string;
  name: string;
  headshot_url: string | null;
  team_id: string | null;
  isNotable: boolean;
  performances: Performance[];
};

// Stat types for the selector buttons
export type StatType =
  | "pass_yards"
  | "pass_tds"
  | "rush_yards"
  | "rush_tds"
  | "interceptions";

// Timeframe filter options
export type TimeframeType = "last5" | "last10" | "season" | "all";

// Sort metric type (subset of SortMetric used in the UI)
export type SortMetricType =
  | "chronological"
  | "opponent_pass_defense"
  | "opponent_win_pct";
