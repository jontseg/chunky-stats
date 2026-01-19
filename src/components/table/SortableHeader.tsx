"use client";

import { memo } from "react";
import type { SortMetricType } from "@/lib/types";

type SortableHeaderProps = {
  label: string;
  metric?: SortMetricType;
  currentMetric: SortMetricType;
  onSort: (metric: SortMetricType) => void;
  className?: string;
};

function SortableHeaderComponent({
  label,
  metric,
  currentMetric,
  onSort,
  className = "",
}: SortableHeaderProps) {
  const isSortable = metric !== undefined;
  const isActive = metric === currentMetric;

  return (
    <th
      className={`
        px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider
        ${isSortable ? "cursor-pointer hover:bg-card-border/50" : ""}
        ${isActive ? "text-primary" : "text-muted"}
        ${className}
      `}
      onClick={() => isSortable && onSort(metric)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        )}
      </span>
    </th>
  );
}

export const SortableHeader = memo(SortableHeaderComponent);
