-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QB" (
    "id" TEXT NOT NULL,
    "gsis_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headshot_url" TEXT,
    "team_id" TEXT,
    "isNotable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QB_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QBPerformance" (
    "id" TEXT NOT NULL,
    "qb_id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "opponent_id" TEXT NOT NULL,
    "pass_yards" INTEGER NOT NULL,
    "pass_tds" INTEGER NOT NULL,
    "pass_attempts" INTEGER NOT NULL,
    "completions" INTEGER NOT NULL,
    "rush_yards" INTEGER NOT NULL,
    "rush_tds" INTEGER NOT NULL,
    "interceptions" INTEGER NOT NULL,
    "sacks" INTEGER NOT NULL,
    "fumbles" INTEGER NOT NULL,
    "opp_win_pct" DOUBLE PRECISION NOT NULL,
    "opp_pass_def_rank" INTEGER NOT NULL,
    "opp_total_def_rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QBPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamDefenseSnapshot" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "pass_yards_allowed" INTEGER NOT NULL,
    "rush_yards_allowed" INTEGER NOT NULL,
    "total_yards_allowed" INTEGER NOT NULL,
    "points_allowed" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "losses" INTEGER NOT NULL,
    "ties" INTEGER NOT NULL,
    "pass_def_rank" INTEGER NOT NULL,
    "rush_def_rank" INTEGER NOT NULL,
    "total_def_rank" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamDefenseSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_abbreviation_key" ON "Team"("abbreviation");

-- CreateIndex
CREATE UNIQUE INDEX "QB_gsis_id_key" ON "QB"("gsis_id");

-- CreateIndex
CREATE INDEX "QBPerformance_season_week_idx" ON "QBPerformance"("season", "week");

-- CreateIndex
CREATE INDEX "QBPerformance_opponent_id_idx" ON "QBPerformance"("opponent_id");

-- CreateIndex
CREATE UNIQUE INDEX "QBPerformance_qb_id_season_week_key" ON "QBPerformance"("qb_id", "season", "week");

-- CreateIndex
CREATE INDEX "TeamDefenseSnapshot_season_week_idx" ON "TeamDefenseSnapshot"("season", "week");

-- CreateIndex
CREATE UNIQUE INDEX "TeamDefenseSnapshot_team_id_season_week_key" ON "TeamDefenseSnapshot"("team_id", "season", "week");

-- AddForeignKey
ALTER TABLE "QBPerformance" ADD CONSTRAINT "QBPerformance_qb_id_fkey" FOREIGN KEY ("qb_id") REFERENCES "QB"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QBPerformance" ADD CONSTRAINT "QBPerformance_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamDefenseSnapshot" ADD CONSTRAINT "TeamDefenseSnapshot_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
