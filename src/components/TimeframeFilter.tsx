"use client";

import type { TimeframeType } from "@/lib/types";

type TimeframeFilterProps = {
  selected: TimeframeType;
  onSelect: (timeframe: TimeframeType) => void;
};

const TIMEFRAMES: { key: TimeframeType; label: string }[] = [
  { key: "last5", label: "Last 5" },
  { key: "last10", label: "Last 10" },
  { key: "season", label: "Season" },
  { key: "all", label: "All" },
];

export function TimeframeFilter({ selected, onSelect }: TimeframeFilterProps) {
  return (
    <div className="flex rounded-lg border border-card-border overflow-hidden">
      {TIMEFRAMES.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`
            px-4 py-2 text-sm font-medium transition-colors
            ${
              selected === key
                ? "bg-primary text-white"
                : "bg-card-bg text-foreground hover:bg-card-border"
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
