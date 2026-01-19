import { prisma } from "@/lib/prisma";
import { QBCard } from "@/components/QBCard";
import Link from "next/link";

async function getFeaturedQBs() {
  const qbs = await prisma.qB.findMany({
    where: { isNotable: true },
    include: {
      performances: {
        select: {
          pass_yards: true,
          pass_tds: true,
        },
      },
    },
  });

  // Calculate totals and sort by passing yards (top performers first)
  const qbsWithStats = qbs.map((qb) => {
    const totalYards = qb.performances.reduce((sum, p) => sum + p.pass_yards, 0);
    const totalTDs = qb.performances.reduce((sum, p) => sum + p.pass_tds, 0);

    return {
      ...qb,
      stats: {
        pass_yards: totalYards,
        pass_tds: totalTDs,
        games: qb.performances.length,
      },
    };
  });

  // Sort by total passing yards descending, take top 12
  return qbsWithStats
    .sort((a, b) => b.stats.pass_yards - a.stats.pass_yards)
    .slice(0, 12);
}

async function getQuickStats() {
  const totalQBs = await prisma.qB.count({ where: { isNotable: true } });
  const totalGames = await prisma.qBPerformance.count();
  const totalTeams = await prisma.team.count();

  return { totalQBs, totalGames, totalTeams };
}

export default async function Home() {
  const [featuredQBs, quickStats] = await Promise.all([
    getFeaturedQBs(),
    getQuickStats(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">
          NFL QB Performance Dashboard
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto">
          Analyze quarterback performance with context-aware opponent difficulty
          rankings. See how QBs perform against elite defenses vs. weaker ones.
        </p>
      </section>

      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary">
              {quickStats.totalQBs}
            </div>
            <div className="text-sm text-muted mt-1">Notable QBs</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary">
              {quickStats.totalGames.toLocaleString()}
            </div>
            <div className="text-sm text-muted mt-1">Games Tracked</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-primary">
              {quickStats.totalTeams}
            </div>
            <div className="text-sm text-muted mt-1">NFL Teams</div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Top Quarterbacks</h2>
          <Link
            href="/qb"
            className="text-primary hover:underline text-sm font-medium"
          >
            View all QBs →
          </Link>
        </div>

        {featuredQBs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredQBs.map((qb) => (
              <QBCard
                key={qb.id}
                gsis_id={qb.gsis_id}
                name={qb.name}
                headshot_url={qb.headshot_url}
                team_id={qb.team_id}
                stats={qb.stats}
              />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <div className="text-muted mb-4">
              <svg
                className="h-12 w-12 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No QBs Found</h3>
            <p className="text-sm text-muted">
              Run the data sync pipeline to populate QB statistics.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
