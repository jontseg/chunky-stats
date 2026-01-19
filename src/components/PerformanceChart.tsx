"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Brush,
  CartesianGrid,
} from "recharts";
import type { Performance, StatType, SortMetricType } from "@/lib/types";

type PerformanceChartProps = {
  performances: Performance[];
  selectedStat: StatType;
  sortMetric: SortMetricType;
};

const STAT_CONFIG: Record<StatType, { label: string; color: string }> = {
  pass_yards: { label: "Pass Yards", color: "#3b82f6" },
  pass_tds: { label: "Pass TDs", color: "#22c55e" },
  rush_yards: { label: "Rush Yards", color: "#a855f7" },
  rush_tds: { label: "Rush TDs", color: "#f97316" },
  interceptions: { label: "INTs", color: "#ef4444" },
};

function getDefenseRankLabel(rank: number): string {
  if (rank <= 5) return "Elite";
  if (rank <= 10) return "Good";
  if (rank <= 20) return "Average";
  if (rank <= 27) return "Below Avg";
  return "Weak";
}

function getDefenseRankColor(rank: number): string {
  if (rank <= 5) return "#ef4444";
  if (rank <= 10) return "#f97316";
  if (rank <= 20) return "#eab308";
  if (rank <= 27) return "#22c55e";
  return "#16a34a";
}

type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    dataKey: string;
    payload: Performance & { label: string };
  }>;
};

function CustomTooltip({ active, payload }: TooltipProps) {
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
    </div>
  );
}

export function PerformanceChart({
  performances,
  selectedStat,
  sortMetric,
}: PerformanceChartProps) {
  const config = STAT_CONFIG[selectedStat];

  if (performances.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted">
        No performance data available for the selected timeframe.
      </div>
    );
  }

  // Prepare chart data with X-axis labels
  const chartData = performances.map((p) => ({
    ...p,
    label:
      sortMetric === "chronological"
        ? `W${p.week}`
        : p.opponent.abbreviation,
  }));

  // Calculate brush indices for default view (last 10 games visible)
  const dataLength = chartData.length;
  const brushStartIndex = Math.max(0, dataLength - 10);

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id={`gradient-${selectedStat}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="5%" stopColor={config.color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--card-border)"
            strokeOpacity={0.5}
          />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            stroke="var(--muted)"
            tickLine={false}
          />

          <YAxis
            tick={{ fontSize: 12 }}
            stroke="var(--muted)"
            width={45}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey={selectedStat}
            stroke={config.color}
            strokeWidth={2}
            fill={`url(#gradient-${selectedStat})`}
            animationDuration={300}
          />

          {dataLength > 10 && (
            <Brush
              dataKey="label"
              height={30}
              stroke="var(--primary)"
              fill="var(--card-bg)"
              startIndex={brushStartIndex}
              endIndex={dataLength - 1}
              tickFormatter={() => ""}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
