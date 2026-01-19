import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

const NFL_TEAMS = [
  { id: "ARI", abbreviation: "ARI", name: "Arizona Cardinals" },
  { id: "ATL", abbreviation: "ATL", name: "Atlanta Falcons" },
  { id: "BAL", abbreviation: "BAL", name: "Baltimore Ravens" },
  { id: "BUF", abbreviation: "BUF", name: "Buffalo Bills" },
  { id: "CAR", abbreviation: "CAR", name: "Carolina Panthers" },
  { id: "CHI", abbreviation: "CHI", name: "Chicago Bears" },
  { id: "CIN", abbreviation: "CIN", name: "Cincinnati Bengals" },
  { id: "CLE", abbreviation: "CLE", name: "Cleveland Browns" },
  { id: "DAL", abbreviation: "DAL", name: "Dallas Cowboys" },
  { id: "DEN", abbreviation: "DEN", name: "Denver Broncos" },
  { id: "DET", abbreviation: "DET", name: "Detroit Lions" },
  { id: "GB", abbreviation: "GB", name: "Green Bay Packers" },
  { id: "HOU", abbreviation: "HOU", name: "Houston Texans" },
  { id: "IND", abbreviation: "IND", name: "Indianapolis Colts" },
  { id: "JAX", abbreviation: "JAX", name: "Jacksonville Jaguars" },
  { id: "KC", abbreviation: "KC", name: "Kansas City Chiefs" },
  { id: "LA", abbreviation: "LA", name: "Los Angeles Rams" },
  { id: "LAC", abbreviation: "LAC", name: "Los Angeles Chargers" },
  { id: "LV", abbreviation: "LV", name: "Las Vegas Raiders" },
  { id: "MIA", abbreviation: "MIA", name: "Miami Dolphins" },
  { id: "MIN", abbreviation: "MIN", name: "Minnesota Vikings" },
  { id: "NE", abbreviation: "NE", name: "New England Patriots" },
  { id: "NO", abbreviation: "NO", name: "New Orleans Saints" },
  { id: "NYG", abbreviation: "NYG", name: "New York Giants" },
  { id: "NYJ", abbreviation: "NYJ", name: "New York Jets" },
  { id: "PHI", abbreviation: "PHI", name: "Philadelphia Eagles" },
  { id: "PIT", abbreviation: "PIT", name: "Pittsburgh Steelers" },
  { id: "SEA", abbreviation: "SEA", name: "Seattle Seahawks" },
  { id: "SF", abbreviation: "SF", name: "San Francisco 49ers" },
  { id: "TB", abbreviation: "TB", name: "Tampa Bay Buccaneers" },
  { id: "TEN", abbreviation: "TEN", name: "Tennessee Titans" },
  { id: "WAS", abbreviation: "WAS", name: "Washington Commanders" },
];

async function main() {
  console.log("Seeding database with NFL teams...");

  for (const team of NFL_TEAMS) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: { name: team.name, abbreviation: team.abbreviation },
      create: team,
    });
  }

  console.log(`Seeded ${NFL_TEAMS.length} NFL teams.`);
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
