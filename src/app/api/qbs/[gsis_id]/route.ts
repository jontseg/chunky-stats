import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ gsis_id: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { gsis_id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const season = searchParams.get("season");

  try {
    const qb = await prisma.qB.findUnique({
      where: { gsis_id },
      include: {
        performances: {
          where: season ? { season: parseInt(season, 10) } : undefined,
          include: {
            opponent: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
              },
            },
          },
          orderBy: [{ season: "desc" }, { week: "asc" }],
        },
      },
    });

    if (!qb) {
      return NextResponse.json(
        { error: "QB not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(qb);
  } catch (error) {
    console.error("Error fetching QB:", error);
    return NextResponse.json(
      { error: "Failed to fetch QB" },
      { status: 500 }
    );
  }
}
