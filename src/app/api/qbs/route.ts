import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search");
  // When searching, include all QBs; otherwise default to notable only
  const notableOnly = search ? false : searchParams.get("notable") !== "false";

  try {
    const qbs = await prisma.qB.findMany({
      where: {
        ...(notableOnly && { isNotable: true }),
        ...(search && {
          name: {
            contains: search,
            mode: "insensitive",
          },
        }),
      },
      select: {
        id: true,
        gsis_id: true,
        name: true,
        headshot_url: true,
        team_id: true,
        isNotable: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(qbs);
  } catch (error) {
    console.error("Error fetching QBs:", error);
    return NextResponse.json(
      { error: "Failed to fetch QBs" },
      { status: 500 }
    );
  }
}
