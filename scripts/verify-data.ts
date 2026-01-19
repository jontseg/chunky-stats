import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

async function main() {
  const teamCount = await prisma.team.count();
  const qbCount = await prisma.qB.count();
  const notableQbCount = await prisma.qB.count({ where: { isNotable: true } });
  const performanceCount = await prisma.qBPerformance.count();
  const snapshotCount = await prisma.teamDefenseSnapshot.count();

  console.log("=== Database Verification ===");
  console.log(`Teams: ${teamCount}`);
  console.log(`QBs: ${qbCount}`);
  console.log(`Notable QBs: ${notableQbCount}`);
  console.log(`QB Performances: ${performanceCount}`);
  console.log(`Team Defense Snapshots: ${snapshotCount}`);

  // Sample notable QBs
  const notableQbs = await prisma.qB.findMany({
    where: { isNotable: true },
    take: 10,
    orderBy: { name: "asc" },
  });

  console.log("\n=== Sample Notable QBs ===");
  for (const qb of notableQbs) {
    console.log(`- ${qb.name} (${qb.team_id})`);
  }

  // Sample performance with context
  const samplePerf = await prisma.qBPerformance.findFirst({
    where: {
      qb: { isNotable: true },
    },
    include: {
      qb: true,
      opponent: true,
    },
    orderBy: { pass_yards: "desc" },
  });

  if (samplePerf) {
    console.log("\n=== Highest Passing Yard Game ===");
    console.log(`${samplePerf.qb.name} vs ${samplePerf.opponent.name}`);
    console.log(`Season ${samplePerf.season} Week ${samplePerf.week}`);
    console.log(`Pass Yards: ${samplePerf.pass_yards}`);
    console.log(`Opponent Pass Def Rank: #${samplePerf.opp_pass_def_rank}`);
    console.log(`Opponent Win %: ${(samplePerf.opp_win_pct * 100).toFixed(1)}%`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
