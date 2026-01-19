import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type StatType =
  | "pass_yards"
  | "pass_tds"
  | "rush_yards"
  | "rush_tds"
  | "completions"
  | "interceptions";

type Timeframe = "week" | "season" | "all";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const statType = (searchParams.get("stat") || "pass_yards") as StatType;
  const timeframe = (searchParams.get("timeframe") || "season") as Timeframe;
  const season = searchParams.get("season");
  const week = searchParams.get("week");
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const validStats: StatType[] = [
    "pass_yards",
    "pass_tds",
    "rush_yards",
    "rush_tds",
    "completions",
    "interceptions",
  ];

  if (!validStats.includes(statType)) {
    return NextResponse.json(
      { error: `Invalid stat type. Must be one of: ${validStats.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    // Build where clause based on timeframe
    const whereClause: Record<string, unknown> = {};

    if (timeframe === "week" && season && week) {
      whereClause.season = parseInt(season, 10);
      whereClause.week = parseInt(week, 10);
    } else if (timeframe === "season" && season) {
      whereClause.season = parseInt(season, 10);
    }
    // "all" timeframe has no additional filters

    // For single-game leaders (week timeframe)
    if (timeframe === "week") {
      const performances = await prisma.qBPerformance.findMany({
        where: whereClause,
        include: {
          qb: {
            select: {
              gsis_id: true,
              name: true,
              headshot_url: true,
              team_id: true,
            },
          },
          opponent: {
            select: {
              abbreviation: true,
              name: true,
            },
          },
        },
        orderBy: {
          [statType]: "desc",
        },
        take: limit,
      });

      return NextResponse.json({
        statType,
        timeframe,
        season: season ? parseInt(season, 10) : null,
        week: week ? parseInt(week, 10) : null,
        leaders: performances.map((p) => ({
          qb: p.qb,
          opponent: p.opponent,
          value: p[statType],
          week: p.week,
          season: p.season,
        })),
      });
    }

    // For aggregated stats (season or all timeframe)
    const aggregatedStats = await prisma.qBPerformance.groupBy({
      by: ["qb_id"],
      where: whereClause,
      _sum: {
        pass_yards: true,
        pass_tds: true,
        rush_yards: true,
        rush_tds: true,
        completions: true,
        interceptions: true,
      },
      _count: {
        id: true,
      },
    });

    // Sort by the requested stat
    const sortedStats = aggregatedStats.sort((a, b) => {
      const aValue = a._sum[statType] || 0;
      const bValue = b._sum[statType] || 0;
      // For interceptions, lower is better, so we might want to handle this differently
      // But for leaderboards, we typically show most of everything
      return bValue - aValue;
    });

    // Get QB details for top performers
    const topQbIds = sortedStats.slice(0, limit).map((s) => s.qb_id);
    const qbDetails = await prisma.qB.findMany({
      where: {
        id: { in: topQbIds },
      },
      select: {
        id: true,
        gsis_id: true,
        name: true,
        headshot_url: true,
        team_id: true,
      },
    });

    const qbMap = new Map(qbDetails.map((qb) => [qb.id, qb]));

    const leaders = sortedStats.slice(0, limit).map((stat) => ({
      qb: qbMap.get(stat.qb_id),
      value: stat._sum[statType],
      games: stat._count.id,
      totals: {
        pass_yards: stat._sum.pass_yards,
        pass_tds: stat._sum.pass_tds,
        rush_yards: stat._sum.rush_yards,
        rush_tds: stat._sum.rush_tds,
        completions: stat._sum.completions,
        interceptions: stat._sum.interceptions,
      },
    }));

    return NextResponse.json({
      statType,
      timeframe,
      season: season ? parseInt(season, 10) : null,
      leaders,
    });
  } catch (error) {
    console.error("Error fetching stat leaders:", error);
    return NextResponse.json(
      { error: "Failed to fetch stat leaders" },
      { status: 500 }
    );
  }
}
