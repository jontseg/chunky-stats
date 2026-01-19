import type { QBPerformanceStats } from "@/lib/stats";

type QBHeaderProps = {
  name: string;
  headshot_url: string | null;
  team_id: string | null;
  summaryStats: {
    totals: QBPerformanceStats & { games: number };
    averages: Record<keyof QBPerformanceStats, number>;
  };
  gamesCount: number;
};

export function QBHeader({
  name,
  headshot_url,
  team_id,
  summaryStats,
  gamesCount,
}: QBHeaderProps) {
  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Large headshot */}
        <div className="relative h-32 w-32 flex-shrink-0">
          {headshot_url ? (
            <img
              src={headshot_url}
              alt={name}
              className="h-full w-full rounded-full object-cover bg-card-bg border-4 border-primary"
            />
          ) : (
            <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/30">
              <svg
                className="h-16 w-16 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          )}
          {team_id && (
            <div className="absolute -bottom-2 -right-2 rounded-full bg-background px-3 py-1 text-sm font-bold border-2 border-card-border">
              {team_id}
            </div>
          )}
        </div>

        {/* Name and summary stats */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-bold">{name}</h1>

          {/* Summary stat pills */}
          <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {summaryStats.totals.pass_yards.toLocaleString()}
              </div>
              <div className="text-xs text-muted">Pass Yards</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {summaryStats.totals.pass_tds}
              </div>
              <div className="text-xs text-muted">Pass TDs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {summaryStats.averages.pass_yards.toFixed(1)}
              </div>
              <div className="text-xs text-muted">Yds/Game</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {summaryStats.averages.pass_tds.toFixed(1)}
              </div>
              <div className="text-xs text-muted">TDs/Game</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-medium text-muted">{gamesCount}</div>
              <div className="text-xs text-muted">Games</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
