"use client";

import { useMemo, useCallback, memo } from "react";
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
import { STAT_CONFIG } from "@/lib/utils/statHighlight";
import { ChartTooltip } from "./chart/ChartTooltip";
import { EmptyState } from "./ui";

type PerformanceChartProps = {
  performances: Performance[];
  selectedStat: StatType;
  sortMetric: SortMetricType;
  onDataPointClick?: (performance: Performance) => void;
};

function PerformanceChartComponent({
  performances,
  selectedStat,
  sortMetric,
  onDataPointClick,
}: PerformanceChartProps) {
  const config = STAT_CONFIG[selectedStat];

  // Memoize chart data transformation
  const chartData = useMemo(
    () =>
      performances.map((p) => ({
        ...p,
        label:
          sortMetric === "chronological"
            ? `W${p.week}`
            : p.opponent.abbreviation,
      })),
    [performances, sortMetric]
  );

  // Memoize brush indices
  const brushIndices = useMemo(() => {
    const dataLength = chartData.length;
    return {
      start: Math.max(0, dataLength - 10),
      end: dataLength - 1,
    };
  }, [chartData.length]);

  // Memoize click handler
  const handleChartClick = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => {
      if (!onDataPointClick) return;
      const index = state?.activeIndex;
      if (index !== undefined && chartData[index]) {
        onDataPointClick(chartData[index] as Performance);
      }
    },
    [onDataPointClick, chartData]
  );

  if (performances.length === 0) {
    return (
      <div className="h-80">
        <EmptyState
          message="No performance data available for the selected timeframe."
          icon="chart"
        />
      </div>
    );
  }

  const showBrush = chartData.length > 10;
  const isClickable = !!onDataPointClick;

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          onClick={isClickable ? handleChartClick : undefined}
          style={{ cursor: isClickable ? "pointer" : "default" }}
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

          <Tooltip content={<ChartTooltip showClickHint={isClickable} />} />

          <Area
            type="monotone"
            dataKey={selectedStat}
            stroke={config.color}
            strokeWidth={2}
            fill={`url(#gradient-${selectedStat})`}
            animationDuration={300}
            activeDot={{
              r: 8,
              strokeWidth: 2,
              stroke: config.color,
              fill: "var(--background)",
              cursor: isClickable ? "pointer" : "default",
            }}
            dot={{
              r: 4,
              fill: config.color,
              strokeWidth: 0,
              cursor: isClickable ? "pointer" : "default",
            }}
          />

          {showBrush && (
            <Brush
              dataKey="label"
              height={30}
              stroke="var(--primary)"
              fill="var(--card-bg)"
              startIndex={brushIndices.start}
              endIndex={brushIndices.end}
              tickFormatter={() => ""}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export const PerformanceChart = memo(PerformanceChartComponent);
