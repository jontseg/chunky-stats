"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import type { StatType } from "@/lib/types";
import { STAT_LABELS } from "@/lib/utils/statHighlight";
import { CloseButton, LoadingSpinner, EmptyState } from "./ui";
import { PerformanceRow, type ComparisonPerformance } from "./modal";

type GameComparisonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  season: number;
  opponentId: string;
  opponentName: string;
  currentQBId: string;
  selectedStat: StatType;
};

function GameComparisonModalComponent({
  isOpen,
  onClose,
  season,
  opponentId,
  opponentName,
  currentQBId,
  selectedStat,
}: GameComparisonModalProps) {
  const [performances, setPerformances] = useState<ComparisonPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comparison data
  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();

    const fetchComparison = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/stats/opponent-comparison?season=${season}&opponent_id=${opponentId}&stat=${selectedStat}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();
        setPerformances(data.performances);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("Failed to load comparison data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();

    return () => controller.abort();
  }, [isOpen, season, opponentId, selectedStat]);

  // Memoize current QB lookup
  const { currentQBPerf, currentQBRank } = useMemo(() => {
    const perf = performances.find((p) => p.qb.gsis_id === currentQBId);
    return {
      currentQBPerf: perf,
      currentQBRank: perf?.rank || 0,
    };
  }, [performances, currentQBId]);

  // Memoize backdrop click handler
  const handleBackdropClick = useCallback(() => onClose(), [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div className="relative bg-background border border-card-border rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-card-border bg-card-bg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">vs {opponentName}</h2>
              <p className="text-sm text-muted mt-1">
                {season} Season · {STAT_LABELS[selectedStat]}
              </p>
            </div>
            <CloseButton onClick={onClose} />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[55vh]">
          {loading && <LoadingSpinner className="py-12" />}

          {error && (
            <EmptyState message={error} icon="error" />
          )}

          {!loading && !error && performances.length === 0 && (
            <EmptyState message="No other QBs faced this team this season" icon="data" />
          )}

          {!loading && !error && performances.length > 0 && (
            <div className="space-y-2">
              {performances.map((perf) => (
                <PerformanceRow
                  key={perf.id}
                  perf={perf}
                  stat={selectedStat}
                  isCurrentQB={perf.qb.gsis_id === currentQBId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && currentQBPerf && (
          <div className="p-4 border-t border-card-border bg-card-bg">
            <div className="text-center">
              <span className="text-lg font-bold text-primary">
                #{currentQBRank}
              </span>
              <span className="text-muted ml-2">
                of {performances.length} QBs who faced {opponentName}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const GameComparisonModal = memo(GameComparisonModalComponent);
