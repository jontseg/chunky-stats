import { memo } from "react";
import type { HighlightType } from "@/lib/utils/statHighlight";

type StatCardProps = {
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: HighlightType;
  compact?: boolean;
};

function StatCardComponent({
  label,
  value,
  subValue,
  highlight,
  compact = false,
}: StatCardProps) {
  const highlightClass =
    highlight === "good"
      ? "border-accent"
      : highlight === "bad"
      ? "border-danger"
      : "border-card-border";

  if (compact) {
    return (
      <div className="text-center">
        <div className="text-lg font-bold text-foreground">{value}</div>
        <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-card-bg rounded-lg p-4 border-2 ${highlightClass}
        flex flex-col items-center justify-center min-w-[100px]
      `}
    >
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted mt-1">
        {label}
      </div>
      {subValue && (
        <div className="text-xs text-secondary mt-1">{subValue}</div>
      )}
    </div>
  );
}

export const StatCard = memo(StatCardComponent);
