"use client";

import type { SortMetricType } from "@/lib/types";

type SortControlsProps = {
  selected: SortMetricType;
  onSelect: (metric: SortMetricType) => void;
};

const SORT_OPTIONS: { key: SortMetricType; label: string }[] = [
  { key: "chronological", label: "By Date" },
  { key: "opponent_pass_defense", label: "By Defense" },
  { key: "opponent_win_pct", label: "By Win %" },
];

export function SortControls({ selected, onSelect }: SortControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted">Sort:</span>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value as SortMetricType)}
        className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {SORT_OPTIONS.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
