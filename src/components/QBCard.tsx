import Link from "next/link";

type QBCardProps = {
  gsis_id: string;
  name: string;
  headshot_url: string | null;
  team_id: string | null;
  stats?: {
    pass_yards?: number;
    pass_tds?: number;
    games?: number;
  };
};

export function QBCard({
  gsis_id,
  name,
  headshot_url,
  team_id,
  stats,
}: QBCardProps) {
  return (
    <Link href={`/qb/${gsis_id}`} className="block">
      <div className="card card-hover cursor-pointer">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 flex-shrink-0">
            {headshot_url ? (
              <img
                src={headshot_url}
                alt={name}
                className="h-full w-full rounded-full object-cover bg-card-bg"
              />
            ) : (
              <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="h-8 w-8 text-primary"
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
              <div className="absolute -bottom-1 -right-1 rounded-full bg-background px-1.5 py-0.5 text-xs font-semibold border border-card-border">
                {team_id}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{name}</h3>
            {stats && (
              <div className="flex gap-4 mt-1 text-sm text-muted">
                {stats.pass_yards !== undefined && (
                  <span>
                    <span className="font-medium text-foreground">
                      {stats.pass_yards.toLocaleString()}
                    </span>{" "}
                    yds
                  </span>
                )}
                {stats.pass_tds !== undefined && (
                  <span>
                    <span className="font-medium text-foreground">
                      {stats.pass_tds}
                    </span>{" "}
                    TDs
                  </span>
                )}
                {stats.games !== undefined && (
                  <span className="text-xs">({stats.games} games)</span>
                )}
              </div>
            )}
          </div>

          <svg
            className="h-5 w-5 text-muted flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
