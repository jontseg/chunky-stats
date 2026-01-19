"use client";

import { memo } from "react";
import type { StatType } from "@/lib/types";
import { Headshot } from "../ui";

type ComparisonPerformance = {
  id: string;
  week: number;
  pass_yards: number;
  pass_tds: number;
  interceptions: number;
  rush_yards: number;
  rush_tds: number;
  completions: number;
  pass_attempts: number;
  rank: number;
  totalQBs: number;
  qb: {
    gsis_id: string;
    name: string;
    headshot_url: string | null;
    team_id: string | null;
  };
};

type PerformanceRowProps = {
  perf: ComparisonPerformance;
  stat: StatType;
  isCurrentQB: boolean;
};

function PerformanceRowComponent({ perf, stat, isCurrentQB }: PerformanceRowProps) {
  const value = perf[stat];

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-xl transition-all
        ${isCurrentQB
          ? "bg-primary/20 ring-2 ring-primary scale-[1.02]"
          : "bg-card-bg hover:bg-card-border/30"}
      `}
    >
      {/* Rank */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
        ${isCurrentQB ? "bg-primary text-white" : "bg-card-border text-muted"}
      `}>
        {perf.rank}
      </div>

      {/* Headshot */}
      <div className="ring-2 ring-card-border rounded-full">
        <Headshot
          url={perf.qb.headshot_url}
          name={perf.qb.name}
          size="md"
        />
      </div>

      {/* Name & Week */}
      <div className="flex-1 min-w-0">
        <div className={`font-semibold truncate ${isCurrentQB ? "text-primary" : ""}`}>
          {perf.qb.name}
        </div>
        <div className="text-xs text-muted">
          Week {perf.week}
        </div>
      </div>

      {/* Stat Value */}
      <div className="text-right">
        <div className={`font-bold text-2xl ${isCurrentQB ? "text-primary" : ""}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

export const PerformanceRow = memo(PerformanceRowComponent);

export type { ComparisonPerformance };
