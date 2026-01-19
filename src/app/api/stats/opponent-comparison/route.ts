import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/stats/opponent-comparison
 * Returns all QB performances against a specific opponent in a given season
 * Used for comparing how a QB performed vs others who faced the SAME team
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const season = searchParams.get("season");
  const opponentId = searchParams.get("opponent_id");
  const stat = searchParams.get("stat") || "pass_yards";

  if (!season || !opponentId) {
    return NextResponse.json(
      { error: "season and opponent_id parameters are required" },
      { status: 400 }
    );
  }

  try {
    // Get all performances against this opponent in this season
    const performances = await prisma.qBPerformance.findMany({
      where: {
        season: parseInt(season),
        opponent_id: opponentId,
        qb: {
          isNotable: true,
        },
      },
      select: {
        id: true,
        week: true,
        pass_yards: true,
        pass_tds: true,
        interceptions: true,
        rush_yards: true,
        rush_tds: true,
        completions: true,
        pass_attempts: true,
        qb: {
          select: {
            gsis_id: true,
            name: true,
            headshot_url: true,
            team_id: true,
          },
        },
      },
    });

    // Get opponent team info
    const opponent = await prisma.team.findUnique({
      where: { id: opponentId },
      select: { name: true, abbreviation: true },
    });

    // Sort by the requested stat (descending, except INTs which is ascending)
    const sortedPerformances = performances.sort((a, b) => {
      switch (stat) {
        case "pass_yards":
          return b.pass_yards - a.pass_yards;
        case "pass_tds":
          return b.pass_tds - a.pass_tds;
        case "rush_yards":
          return b.rush_yards - a.rush_yards;
        case "rush_tds":
          return b.rush_tds - a.rush_tds;
        case "interceptions":
          return a.interceptions - b.interceptions;
        default:
          return b.pass_yards - a.pass_yards;
      }
    });

    // Add rank to each performance
    const rankedPerformances = sortedPerformances.map((perf, index) => ({
      ...perf,
      rank: index + 1,
      totalQBs: sortedPerformances.length,
    }));

    return NextResponse.json({
      season: parseInt(season),
      opponent,
      stat,
      performances: rankedPerformances,
    });
  } catch (error) {
    console.error("Error fetching opponent comparison:", error);
    return NextResponse.json(
      { error: "Failed to fetch opponent comparison" },
      { status: 500 }
    );
  }
}
