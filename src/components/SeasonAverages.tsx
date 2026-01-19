"use client";

import { useMemo, memo } from "react";
import {
  aggregateStats,
  calculateAverages,
  calculatePasserRating,
  calculateCompletionPercentage,
  calculateYardsPerAttempt,
} from "@/lib/stats";
import type { Performance } from "@/lib/types";
import {
  getRatingHighlight,
  getCompletionPctHighlight,
  getYardsPerAttemptHighlight,
  getAverageStatHighlight,
  getTdIntRatioHighlight,
} from "@/lib/utils/statHighlight";
import { StatCard } from "./ui";

type SeasonAveragesProps = {
  performances: Performance[];
  timeframeLabel: string;
};

// Memoized stat display component for totals section
const StatTotal = memo(function StatTotal({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <span className="text-muted">{label}:</span>{" "}
      <span className="font-semibold">{value}</span>
    </div>
  );
});

function SeasonAveragesComponent({
  performances,
  timeframeLabel,
}: SeasonAveragesProps) {
  // Memoize all calculations
  const stats = useMemo(() => {
    if (performances.length === 0) return null;

    const totals = aggregateStats(performances);
    const averages = calculateAverages(totals);

    const passerRating = calculatePasserRating(
      totals.completions,
      totals.pass_attempts,
      totals.pass_yards,
      totals.pass_tds,
      totals.interceptions
    );

    const completionPct = calculateCompletionPercentage(
      totals.completions,
      totals.pass_attempts
    );

    const yardsPerAttempt = calculateYardsPerAttempt(
      totals.pass_yards,
      totals.pass_attempts
    );

    const tdToIntRatio =
      totals.interceptions > 0
        ? (totals.pass_tds / totals.interceptions).toFixed(1)
        : totals.pass_tds > 0
        ? "∞"
        : "0.0";

    const totalTdsPerGame = averages.pass_tds + averages.rush_tds;

    return {
      totals,
      averages,
      passerRating,
      completionPct,
      yardsPerAttempt,
      tdToIntRatio,
      totalTdsPerGame,
    };
  }, [performances]);

  if (!stats) return null;

  const { totals, averages, passerRating, completionPct, yardsPerAttempt, tdToIntRatio, totalTdsPerGame } = stats;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-foreground">
        {timeframeLabel} Averages
        <span className="text-sm font-normal text-muted ml-2">
          ({totals.games} game{totals.games !== 1 ? "s" : ""})
        </span>
      </h3>

      {/* Per-Game Averages */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <StatCard
          label="Pass Yds/G"
          value={averages.pass_yards.toFixed(1)}
          highlight={getAverageStatHighlight("pass_yards", averages.pass_yards)}
        />
        <StatCard
          label="Pass TDs/G"
          value={averages.pass_tds.toFixed(1)}
          highlight={getAverageStatHighlight("pass_tds", averages.pass_tds)}
        />
        <StatCard
          label="INTs/G"
          value={averages.interceptions.toFixed(1)}
          highlight={getAverageStatHighlight("interceptions", averages.interceptions)}
        />
        <StatCard
          label="Rush Yds/G"
          value={averages.rush_yards.toFixed(1)}
          highlight={getAverageStatHighlight("rush_yards", averages.rush_yards)}
        />
        <StatCard
          label="Total TDs/G"
          value={totalTdsPerGame.toFixed(1)}
          highlight={getAverageStatHighlight("total_tds", totalTdsPerGame)}
        />
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Passer Rating"
          value={passerRating}
          highlight={getRatingHighlight(passerRating)}
        />
        <StatCard
          label="Comp %"
          value={`${completionPct}%`}
          highlight={getCompletionPctHighlight(completionPct)}
        />
        <StatCard
          label="Yds/Att"
          value={yardsPerAttempt}
          highlight={getYardsPerAttemptHighlight(yardsPerAttempt)}
        />
        <StatCard
          label="TD:INT"
          value={tdToIntRatio}
          subValue={`${totals.pass_tds}:${totals.interceptions}`}
          highlight={getTdIntRatioHighlight(tdToIntRatio)}
        />
      </div>

      {/* Season Totals */}
      <div className="mt-4 pt-4 border-t border-card-border">
        <h4 className="text-sm font-semibold text-muted mb-3">
          {timeframeLabel} Totals
        </h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <StatTotal label="Pass Yds" value={totals.pass_yards.toLocaleString()} />
          <StatTotal label="Pass TDs" value={totals.pass_tds} />
          <StatTotal label="INTs" value={totals.interceptions} />
          <StatTotal label="Rush Yds" value={totals.rush_yards.toLocaleString()} />
          <StatTotal label="Rush TDs" value={totals.rush_tds} />
          <StatTotal label="Sacks" value={totals.sacks} />
        </div>
      </div>
    </div>
  );
}

export const SeasonAverages = memo(SeasonAveragesComponent);
