"use client";

import { useState, useMemo } from "react";
import { QBHeader } from "./QBHeader";
import { StatSelector } from "./StatSelector";
import { TimeframeFilter } from "./TimeframeFilter";
import { SortControls } from "./SortControls";
import { PerformanceChart } from "./PerformanceChart";
import { GameLogTable } from "./GameLogTable";
import { SeasonAverages } from "./SeasonAverages";
import { GameComparisonModal } from "./GameComparisonModal";
import {
  getSortedPerformances,
  sortChronologically,
} from "@/lib/sorting";
import { aggregateStats, calculateAverages } from "@/lib/stats";
import type {
  QBData,
  StatType,
  TimeframeType,
  SortMetricType,
  Performance,
} from "@/lib/types";

type QBProfileClientProps = {
  qb: QBData;
};

export function QBProfileClient({ qb }: QBProfileClientProps) {
  const [selectedStat, setSelectedStat] = useState<StatType>("pass_yards");
  const [timeframe, setTimeframe] = useState<TimeframeType>("season");
  const [sortMetric, setSortMetric] = useState<SortMetricType>("chronological");
  const [comparisonGame, setComparisonGame] = useState<Performance | null>(null);

  // Compute filtered performances based on timeframe
  const filteredPerformances = useMemo(() => {
    // First sort chronologically to get correct "last N" games (newest first)
    const chronological = sortChronologically(
      qb.performances as Performance[],
      "desc"
    );

    switch (timeframe) {
      case "last5":
        return chronological.slice(0, 5);
      case "last10":
        return chronological.slice(0, 10);
      case "season": {
        const currentSeason = chronological[0]?.season;
        return chronological.filter((p) => p.season === currentSeason);
      }
      case "all":
      default:
        return chronological;
    }
  }, [qb.performances, timeframe]);

  // Apply sort to filtered performances
  const sortedPerformances = useMemo(() => {
    // For chronological, we want oldest first for the chart to read left-to-right
    if (sortMetric === "chronological") {
      return sortChronologically(filteredPerformances, "asc");
    }
    return getSortedPerformances(filteredPerformances, sortMetric);
  }, [filteredPerformances, sortMetric]);

  // Calculate summary stats for header
  const summaryStats = useMemo(() => {
    const totals = aggregateStats(filteredPerformances);
    const averages = calculateAverages(totals);
    return { totals, averages };
  }, [filteredPerformances]);

  // Get timeframe label for display
  const timeframeLabel = useMemo(() => {
    switch (timeframe) {
      case "last5":
        return "Last 5 Games";
      case "last10":
        return "Last 10 Games";
      case "season":
        return "Season";
      case "all":
        return "Career";
      default:
        return "Season";
    }
  }, [timeframe]);

  return (
    <div className="space-y-6">
      <QBHeader
        name={qb.name}
        headshot_url={qb.headshot_url}
        team_id={qb.team_id}
        summaryStats={summaryStats}
        gamesCount={filteredPerformances.length}
      />

      <div className="card">
        <StatSelector selected={selectedStat} onSelect={setSelectedStat} />

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TimeframeFilter selected={timeframe} onSelect={setTimeframe} />
          <SortControls selected={sortMetric} onSelect={setSortMetric} />
        </div>

        <div className="mt-6">
          <PerformanceChart
            performances={sortedPerformances}
            selectedStat={selectedStat}
            sortMetric={sortMetric}
            onDataPointClick={setComparisonGame}
          />
        </div>
      </div>

      {/* Season Averages */}
      <div className="card">
        <SeasonAverages
          performances={filteredPerformances}
          timeframeLabel={timeframeLabel}
        />
      </div>

      {/* Game Log Table */}
      <div className="card">
        <h3 className="text-lg font-bold text-foreground mb-4">Game Log</h3>
        <GameLogTable
          performances={sortedPerformances}
          selectedStat={selectedStat}
          sortMetric={sortMetric}
          onSortChange={setSortMetric}
        />
      </div>

      {/* Comparison Modal */}
      {comparisonGame && (
        <GameComparisonModal
          isOpen={!!comparisonGame}
          onClose={() => setComparisonGame(null)}
          season={comparisonGame.season}
          opponentId={comparisonGame.opponent_id}
          opponentName={comparisonGame.opponent.name}
          currentQBId={qb.gsis_id}
          selectedStat={selectedStat}
        />
      )}
    </div>
  );
}
