"use client";

import { memo, useCallback } from "react";
import type { Performance, StatType, SortMetricType } from "@/lib/types";
import { EmptyState } from "./ui";
import { GameLogRow, SortableHeader } from "./table";

type GameLogTableProps = {
  performances: Performance[];
  selectedStat: StatType;
  sortMetric: SortMetricType;
  onSortChange: (metric: SortMetricType) => void;
  onGameClick?: (performance: Performance) => void;
};

function GameLogTableComponent({
  performances,
  selectedStat,
  sortMetric,
  onSortChange,
  onGameClick,
}: GameLogTableProps) {
  // Memoize column header class generator
  const getColumnHeaderClass = useCallback(
    (stat: StatType) =>
      `px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider ${
        selectedStat === stat ? "text-primary" : "text-muted"
      }`,
    [selectedStat]
  );

  if (performances.length === 0) {
    return <EmptyState message="No games to display" icon="data" />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-card-border">
      <table className="min-w-full divide-y divide-card-border">
        <thead className="bg-card-bg">
          <tr>
            <SortableHeader
              label="Week"
              metric="chronological"
              currentMetric={sortMetric}
              onSort={onSortChange}
            />
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
              Opp
            </th>
            <SortableHeader
              label="Def Rank"
              metric="opponent_pass_defense"
              currentMetric={sortMetric}
              onSort={onSortChange}
            />
            <SortableHeader
              label="Win %"
              metric="opponent_win_pct"
              currentMetric={sortMetric}
              onSort={onSortChange}
            />
            <th className={getColumnHeaderClass("pass_yards")}>Pass Yds</th>
            <th className={getColumnHeaderClass("pass_tds")}>Pass TDs</th>
            <th className={getColumnHeaderClass("interceptions")}>INTs</th>
            <th className={getColumnHeaderClass("rush_yards")}>Rush Yds</th>
            <th className={getColumnHeaderClass("rush_tds")}>Rush TDs</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-card-border">
          {performances.map((perf) => (
            <GameLogRow
              key={perf.id}
              perf={perf}
              selectedStat={selectedStat}
              onClick={onGameClick ? () => onGameClick(perf) : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const GameLogTable = memo(GameLogTableComponent);
