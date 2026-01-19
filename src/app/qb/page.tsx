import { prisma } from "@/lib/prisma";
import { QBCard } from "@/components/QBCard";
import Link from "next/link";

async function getAllQBs() {
  const qbs = await prisma.qB.findMany({
    include: {
      performances: {
        select: {
          pass_yards: true,
          pass_tds: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return qbs.map((qb) => {
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
}

export default async function AllQBsPage() {
  const qbs = await getAllQBs();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/" className="text-primary hover:underline text-sm">
          ← Back to Home
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">All Quarterbacks</h1>

      {qbs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {qbs.map((qb) => (
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
          <p className="text-muted">No QBs found in the database.</p>
          <p className="text-sm text-muted mt-2">
            Run the data sync pipeline to populate QB statistics.
          </p>
        </div>
      )}
    </div>
  );
}
