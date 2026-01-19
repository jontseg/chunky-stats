"use client";

import { memo } from "react";
import type { Performance, StatType } from "@/lib/types";
import { STAT_CONFIG } from "@/lib/utils/statHighlight";
import { getDefenseRankLabel, getDefenseRankColor } from "@/lib/utils/defenseRank";

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    payload: Performance & { label: string };
  }>;
  showClickHint?: boolean;
};

function ChartTooltipComponent({ active, payload, showClickHint }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const statKey = payload[0].dataKey as StatType;
  const statConfig = STAT_CONFIG[statKey];
  const statValue = data[statKey];

  return (
    <div className="card p-3 shadow-lg border border-card-border text-sm">
      <div className="font-semibold mb-1">
        Week {data.week} vs {data.opponent.abbreviation}
      </div>
      <div className="text-2xl font-bold mb-2" style={{ color: statConfig.color }}>
        {statValue.toLocaleString()} {statConfig.label}
      </div>
      <div className="space-y-1 text-muted">
        <div className="flex items-center gap-2">
          <span>Pass Def:</span>
          <span
            className="font-medium"
            style={{ color: getDefenseRankColor(data.opp_pass_def_rank) }}
          >
            #{data.opp_pass_def_rank} ({getDefenseRankLabel(data.opp_pass_def_rank)})
          </span>
        </div>
        <div>
          Opp Record: {(data.opp_win_pct * 100).toFixed(0)}% Win
        </div>
      </div>
      {showClickHint && (
        <div className="mt-2 pt-2 border-t border-card-border text-primary text-xs font-medium">
          Click to compare vs other QBs
        </div>
      )}
    </div>
  );
}

export const ChartTooltip = memo(ChartTooltipComponent);
