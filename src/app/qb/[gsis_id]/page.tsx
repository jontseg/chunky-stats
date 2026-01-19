import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { QBProfileClient } from "@/components/QBProfileClient";

type PageParams = {
  params: Promise<{ gsis_id: string }>;
};

async function getQB(gsis_id: string) {
  const qb = await prisma.qB.findUnique({
    where: { gsis_id },
    include: {
      performances: {
        include: {
          opponent: {
            select: { name: true, abbreviation: true },
          },
        },
        orderBy: [{ season: "desc" }, { week: "asc" }],
      },
    },
  });
  return qb;
}

export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { gsis_id } = await params;
  const qb = await getQB(gsis_id);

  if (!qb) {
    return { title: "QB Not Found - Chunky Stats" };
  }

  return {
    title: `${qb.name} Stats - Chunky Stats`,
    description: `View ${qb.name}'s NFL performance statistics with opponent difficulty context.`,
  };
}

export default async function QBProfilePage({ params }: PageParams) {
  const { gsis_id } = await params;
  const qb = await getQB(gsis_id);

  if (!qb) {
    notFound();
  }

  // Transform Prisma result to match our type
  const qbData = {
    id: qb.id,
    gsis_id: qb.gsis_id,
    name: qb.name,
    headshot_url: qb.headshot_url,
    team_id: qb.team_id,
    isNotable: qb.isNotable,
    performances: qb.performances.map((p) => ({
      id: p.id,
      season: p.season,
      week: p.week,
      opponent_id: p.opponent_id,
      pass_yards: p.pass_yards,
      pass_tds: p.pass_tds,
      pass_attempts: p.pass_attempts,
      completions: p.completions,
      rush_yards: p.rush_yards,
      rush_tds: p.rush_tds,
      interceptions: p.interceptions,
      sacks: p.sacks,
      fumbles: p.fumbles,
      opp_win_pct: p.opp_win_pct,
      opp_pass_def_rank: p.opp_pass_def_rank,
      opp_total_def_rank: p.opp_total_def_rank,
      opponent: {
        name: p.opponent.name,
        abbreviation: p.opponent.abbreviation,
      },
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <QBProfileClient qb={qbData} />
    </div>
  );
}
