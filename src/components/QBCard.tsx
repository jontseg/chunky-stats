import { memo } from "react";
import Link from "next/link";
import { Headshot } from "./ui";

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

function QBCardComponent({
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
          <Headshot
            url={headshot_url}
            name={name}
            size="lg"
            showTeamBadge
            teamId={team_id}
          />

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
            className="h-5 w-5 text-muted shrink-0"
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

export const QBCard = memo(QBCardComponent);
