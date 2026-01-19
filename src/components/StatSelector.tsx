"use client";

import type { StatType } from "@/lib/types";

type StatSelectorProps = {
  selected: StatType;
  onSelect: (stat: StatType) => void;
};

const STATS: { key: StatType; label: string; color: string }[] = [
  { key: "pass_yards", label: "Pass Yards", color: "bg-blue-500 border-blue-700" },
  { key: "pass_tds", label: "Pass TDs", color: "bg-green-500 border-green-700" },
  { key: "rush_yards", label: "Rush Yards", color: "bg-purple-500 border-purple-700" },
  { key: "rush_tds", label: "Rush TDs", color: "bg-orange-500 border-orange-700" },
  { key: "interceptions", label: "INTs", color: "bg-red-500 border-red-700" },
];

export function StatSelector({ selected, onSelect }: StatSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATS.map(({ key, label, color }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`
            stat-btn text-white ${color}
            ${selected === key ? "stat-btn-active" : ""}
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
