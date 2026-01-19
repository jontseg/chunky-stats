/**
 * Stat highlight utilities
 * Shared logic for highlighting exceptional stat values
 */

import type { StatType, Performance } from "@/lib/types";

export type HighlightType = "good" | "average" | "bad" | undefined;

/**
 * Stat configuration for display
 */
export const STAT_CONFIG: Record<StatType, { label: string; color: string }> = {
  pass_yards: { label: "Pass Yards", color: "#3b82f6" },
  pass_tds: { label: "Pass TDs", color: "#22c55e" },
  rush_yards: { label: "Rush Yards", color: "#a855f7" },
  rush_tds: { label: "Rush TDs", color: "#f97316" },
  interceptions: { label: "INTs", color: "#ef4444" },
};

export const STAT_LABELS: Record<StatType, string> = {
  pass_yards: "Pass Yards",
  pass_tds: "Pass TDs",
  rush_yards: "Rush Yards",
  rush_tds: "Rush TDs",
  interceptions: "Interceptions",
};

/**
 * Check if a performance is exceptional based on thresholds
 */
export function isExceptionalPerformance(perf: Performance): boolean {
  return (
    perf.pass_yards >= 300 ||
    perf.pass_tds >= 3 ||
    perf.rush_yards >= 75 ||
    perf.rush_tds >= 2
  );
}

/**
 * Get highlight class for stat column based on selection
 */
export function getStatColumnHighlight(stat: StatType, selectedStat: StatType): string {
  return stat === selectedStat ? "font-bold text-primary" : "";
}

/**
 * Get highlight class for exceptional stat values in tables
 */
export function getStatValueHighlight(stat: StatType, value: number): string {
  switch (stat) {
    case "pass_yards":
      return value >= 300 ? "text-accent" : "";
    case "pass_tds":
      return value >= 3 ? "text-accent" : "";
    case "rush_yards":
      return value >= 75 ? "text-accent" : "";
    case "rush_tds":
      return value >= 2 ? "text-accent" : "";
    case "interceptions":
      return value >= 3 ? "text-danger" : "";
    default:
      return "";
  }
}

/**
 * Get highlight type for passer rating
 */
export function getRatingHighlight(rating: number): HighlightType {
  if (rating >= 100) return "good";
  if (rating >= 85) return "average";
  return "bad";
}

/**
 * Get highlight type for completion percentage
 */
export function getCompletionPctHighlight(pct: number): HighlightType {
  if (pct >= 67) return "good";
  if (pct >= 62) return "average";
  return "bad";
}

/**
 * Get highlight type for yards per attempt
 */
export function getYardsPerAttemptHighlight(ypa: number): HighlightType {
  if (ypa >= 8) return "good";
  if (ypa >= 7) return "average";
  return "bad";
}

/**
 * Get highlight type for average stat values
 */
export function getAverageStatHighlight(stat: string, value: number): HighlightType {
  switch (stat) {
    case "pass_yards":
      if (value >= 250) return "good";
      if (value >= 200) return "average";
      return "bad";
    case "pass_tds":
      if (value >= 2) return "good";
      if (value >= 1.5) return "average";
      return "bad";
    case "interceptions":
      if (value <= 0.5) return "good";
      if (value <= 1) return "average";
      return "bad";
    case "rush_yards":
      if (value >= 30) return "good";
      return undefined;
    case "total_tds":
      if (value >= 2.5) return "good";
      if (value >= 1.5) return "average";
      return "bad";
    default:
      return undefined;
  }
}

/**
 * Get highlight type for TD:INT ratio
 */
export function getTdIntRatioHighlight(ratio: string | number): HighlightType {
  if (ratio === "∞") return "good";
  const numRatio = typeof ratio === "string" ? parseFloat(ratio) : ratio;
  if (numRatio >= 3) return "good";
  if (numRatio >= 2) return "average";
  return "bad";
}
