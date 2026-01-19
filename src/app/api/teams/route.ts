import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        defenseSnapshots: {
          orderBy: [{ season: "desc" }, { week: "desc" }],
          take: 1,
          select: {
            season: true,
            week: true,
            pass_def_rank: true,
            rush_def_rank: true,
            total_def_rank: true,
            pass_yards_allowed: true,
            rush_yards_allowed: true,
            total_yards_allowed: true,
            points_allowed: true,
            wins: true,
            losses: true,
            ties: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Flatten the response to include latest defensive stats at root level
    const teamsWithDefense = teams.map((team) => {
      const latestSnapshot = team.defenseSnapshots[0] || null;
      return {
        id: team.id,
        name: team.name,
        abbreviation: team.abbreviation,
        currentDefense: latestSnapshot,
      };
    });

    return NextResponse.json(teamsWithDefense);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    );
  }
}
