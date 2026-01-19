import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const season = searchParams.get("season");
  const startWeek = searchParams.get("startWeek");
  const endWeek = searchParams.get("endWeek");

  try {
    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true, name: true, abbreviation: true },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    const snapshots = await prisma.teamDefenseSnapshot.findMany({
      where: {
        team_id: id,
        ...(season && { season: parseInt(season, 10) }),
        ...(startWeek && { week: { gte: parseInt(startWeek, 10) } }),
        ...(endWeek && { week: { lte: parseInt(endWeek, 10) } }),
      },
      orderBy: [{ season: "desc" }, { week: "desc" }],
      select: {
        id: true,
        season: true,
        week: true,
        pass_yards_allowed: true,
        rush_yards_allowed: true,
        total_yards_allowed: true,
        points_allowed: true,
        wins: true,
        losses: true,
        ties: true,
        pass_def_rank: true,
        rush_def_rank: true,
        total_def_rank: true,
      },
    });

    return NextResponse.json({
      team,
      snapshots,
    });
  } catch (error) {
    console.error("Error fetching team defense:", error);
    return NextResponse.json(
      { error: "Failed to fetch team defense data" },
      { status: 500 }
    );
  }
}
