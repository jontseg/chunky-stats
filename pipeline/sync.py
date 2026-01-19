"""
NFL Data Sync Pipeline
Syncs QB performance data from nflverse and calculates defensive rankings.
Run on Tuesdays (after MNF) and Fridays (after TNF).
"""

import logging
import os
import ssl
import sys
from datetime import datetime

# Fix SSL certificate verification on macOS
ssl._create_default_https_context = ssl._create_unverified_context

import nfl_data_py as nfl
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f"pipeline/logs/sync_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
    ],
)
logger = logging.getLogger(__name__)

load_dotenv()

# Use DIRECT_DATABASE_URL for Python (bypasses Prisma Postgres proxy)
DATABASE_URL = os.getenv("DIRECT_DATABASE_URL")
if not DATABASE_URL:
    logger.error("DIRECT_DATABASE_URL not found in environment variables")
    sys.exit(1)

# NFL season runs Sept-Feb, so in Jan 2026 the current season is 2025
# Note: nflverse data availability depends on their release schedule
CURRENT_YEAR = 2024
SEASONS = [2023, 2024]  # Last 2 completed seasons with available data
MIN_PASS_ATTEMPTS = 50  # Threshold for "notable" QB


def get_engine():
    """Create SQLAlchemy engine from DATABASE_URL."""
    return create_engine(DATABASE_URL)


def fetch_weekly_data(seasons: list[int]) -> pd.DataFrame:
    """Fetch weekly player data from nflverse."""
    logger.info(f"Fetching weekly data for seasons: {seasons}")
    weekly = nfl.import_weekly_data(seasons)
    logger.info(f"Fetched {len(weekly)} weekly records")
    return weekly


def fetch_team_schedules(seasons: list[int]) -> pd.DataFrame:
    """Fetch team schedules including wins/losses."""
    logger.info(f"Fetching schedules for seasons: {seasons}")
    schedules = nfl.import_schedules(seasons)
    logger.info(f"Fetched {len(schedules)} schedule records")
    return schedules


def calculate_defensive_rankings(weekly: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate cumulative defensive rankings for each team at each week.
    This is the "magic" - knowing how good a defense was AT THE TIME of the game.
    """
    logger.info("Calculating defensive rankings...")

    # Aggregate passing yards allowed by each defense per week
    def_stats = (
        weekly.groupby(["season", "week", "opponent_team"])
        .agg(
            pass_yards_allowed=("passing_yards", "sum"),
            rush_yards_allowed=("rushing_yards", "sum"),
        )
        .reset_index()
    )

    # Sort by season, team, week to ensure proper cumulative calculation
    def_stats = def_stats.sort_values(["season", "opponent_team", "week"])

    # Calculate cumulative stats
    def_stats["cum_pass_yards_allowed"] = def_stats.groupby(["season", "opponent_team"])[
        "pass_yards_allowed"
    ].cumsum()

    def_stats["cum_rush_yards_allowed"] = def_stats.groupby(["season", "opponent_team"])[
        "rush_yards_allowed"
    ].cumsum()

    def_stats["cum_total_yards_allowed"] = (
        def_stats["cum_pass_yards_allowed"] + def_stats["cum_rush_yards_allowed"]
    )

    # Rank teams within each season-week (1 = best defense, 32 = worst)
    def_stats["pass_def_rank"] = def_stats.groupby(["season", "week"])[
        "cum_pass_yards_allowed"
    ].rank(method="min", ascending=True)

    def_stats["rush_def_rank"] = def_stats.groupby(["season", "week"])[
        "cum_rush_yards_allowed"
    ].rank(method="min", ascending=True)

    def_stats["total_def_rank"] = def_stats.groupby(["season", "week"])[
        "cum_total_yards_allowed"
    ].rank(method="min", ascending=True)

    logger.info(f"Calculated defensive rankings for {len(def_stats)} team-weeks")
    return def_stats


def calculate_team_records(schedules: pd.DataFrame) -> pd.DataFrame:
    """Calculate cumulative W/L records for each team at each week."""
    logger.info("Calculating team records...")

    records = []
    for _, game in schedules.iterrows():
        if pd.isna(game.get("home_score")) or pd.isna(game.get("away_score")):
            continue  # Skip unplayed games

        season = game["season"]
        week = game["week"]
        home_team = game["home_team"]
        away_team = game["away_team"]
        home_score = game["home_score"]
        away_score = game["away_score"]

        if home_score > away_score:
            records.append({"season": season, "week": week, "team": home_team, "result": "W"})
            records.append({"season": season, "week": week, "team": away_team, "result": "L"})
        elif away_score > home_score:
            records.append({"season": season, "week": week, "team": away_team, "result": "W"})
            records.append({"season": season, "week": week, "team": home_team, "result": "L"})
        else:
            records.append({"season": season, "week": week, "team": home_team, "result": "T"})
            records.append({"season": season, "week": week, "team": away_team, "result": "T"})

    records_df = pd.DataFrame(records)
    records_df = records_df.sort_values(["season", "team", "week"])

    # Calculate cumulative wins/losses
    records_df["wins"] = records_df.groupby(["season", "team"])["result"].transform(
        lambda x: (x == "W").cumsum()
    )
    records_df["losses"] = records_df.groupby(["season", "team"])["result"].transform(
        lambda x: (x == "L").cumsum()
    )
    records_df["ties"] = records_df.groupby(["season", "team"])["result"].transform(
        lambda x: (x == "T").cumsum()
    )
    records_df["games"] = records_df["wins"] + records_df["losses"] + records_df["ties"]
    records_df["win_pct"] = records_df["wins"] / records_df["games"]

    logger.info(f"Calculated records for {len(records_df)} team-weeks")
    return records_df


def extract_qb_performances(weekly: pd.DataFrame) -> pd.DataFrame:
    """Extract QB-specific performance data."""
    logger.info("Extracting QB performances...")

    qb_data = weekly[weekly["position"] == "QB"].copy()

    qb_performances = qb_data[
        [
            "player_id",
            "player_display_name",
            "headshot_url",
            "recent_team",
            "season",
            "week",
            "opponent_team",
            "passing_yards",
            "passing_tds",
            "attempts",
            "completions",
            "rushing_yards",
            "rushing_tds",
            "interceptions",
            "sacks",
            "sack_fumbles_lost",
        ]
    ].copy()

    qb_performances = qb_performances.rename(
        columns={
            "player_id": "gsis_id",
            "player_display_name": "name",
            "recent_team": "team_id",
            "passing_yards": "pass_yards",
            "passing_tds": "pass_tds",
            "attempts": "pass_attempts",
            "rushing_yards": "rush_yards",
            "rushing_tds": "rush_tds",
            "sack_fumbles_lost": "fumbles",
        }
    )

    numeric_cols = [
        "pass_yards",
        "pass_tds",
        "pass_attempts",
        "completions",
        "rush_yards",
        "rush_tds",
        "interceptions",
        "sacks",
        "fumbles",
    ]
    qb_performances[numeric_cols] = qb_performances[numeric_cols].fillna(0).astype(int)

    logger.info(f"Extracted {len(qb_performances)} QB performances")
    return qb_performances


def identify_notable_qbs(qb_performances: pd.DataFrame) -> set:
    """Identify QBs with >= 50 pass attempts in current season."""
    logger.info("Identifying notable QBs...")

    current_season = qb_performances[qb_performances["season"] == CURRENT_YEAR]
    season_attempts = current_season.groupby("gsis_id")["pass_attempts"].sum().reset_index()
    notable_qbs = set(
        season_attempts[season_attempts["pass_attempts"] >= MIN_PASS_ATTEMPTS]["gsis_id"]
    )

    logger.info(f"Found {len(notable_qbs)} notable QBs")
    return notable_qbs


def upsert_team_defense_snapshots(
    engine, def_rankings: pd.DataFrame, team_records: pd.DataFrame
):
    """Upsert team defensive snapshots to database."""
    logger.info("Upserting team defense snapshots...")

    # Merge defensive stats with team records
    merged = def_rankings.merge(
        team_records[["season", "week", "team", "wins", "losses", "ties"]],
        left_on=["season", "week", "opponent_team"],
        right_on=["season", "week", "team"],
        how="left",
    )

    # Fill NaN for teams with no games yet
    merged["wins"] = merged["wins"].fillna(0).astype(int)
    merged["losses"] = merged["losses"].fillna(0).astype(int)
    merged["ties"] = merged["ties"].fillna(0).astype(int)

    upsert_count = 0
    with engine.connect() as conn:
        for _, row in merged.iterrows():
            team_id = row["opponent_team"]
            season = int(row["season"])
            week = int(row["week"])

            # Check if team exists
            team_check = conn.execute(
                text('SELECT id FROM "Team" WHERE id = :team_id'), {"team_id": team_id}
            ).fetchone()

            if not team_check:
                logger.warning(f"Team {team_id} not found in database, skipping")
                continue

            conn.execute(
                text("""
                    INSERT INTO "TeamDefenseSnapshot" (
                        id, team_id, season, week,
                        pass_yards_allowed, rush_yards_allowed, total_yards_allowed, points_allowed,
                        wins, losses, ties,
                        pass_def_rank, rush_def_rank, total_def_rank,
                        "createdAt", "updatedAt"
                    )
                    VALUES (
                        gen_random_uuid(), :team_id, :season, :week,
                        :pass_yards_allowed, :rush_yards_allowed, :total_yards_allowed, 0,
                        :wins, :losses, :ties,
                        :pass_def_rank, :rush_def_rank, :total_def_rank,
                        NOW(), NOW()
                    )
                    ON CONFLICT (team_id, season, week)
                    DO UPDATE SET
                        pass_yards_allowed = EXCLUDED.pass_yards_allowed,
                        rush_yards_allowed = EXCLUDED.rush_yards_allowed,
                        total_yards_allowed = EXCLUDED.total_yards_allowed,
                        wins = EXCLUDED.wins,
                        losses = EXCLUDED.losses,
                        ties = EXCLUDED.ties,
                        pass_def_rank = EXCLUDED.pass_def_rank,
                        rush_def_rank = EXCLUDED.rush_def_rank,
                        total_def_rank = EXCLUDED.total_def_rank,
                        "updatedAt" = NOW()
                """),
                {
                    "team_id": team_id,
                    "season": season,
                    "week": week,
                    "pass_yards_allowed": int(row["cum_pass_yards_allowed"]),
                    "rush_yards_allowed": int(row["cum_rush_yards_allowed"]),
                    "total_yards_allowed": int(row["cum_total_yards_allowed"]),
                    "wins": int(row["wins"]),
                    "losses": int(row["losses"]),
                    "ties": int(row["ties"]),
                    "pass_def_rank": int(row["pass_def_rank"]),
                    "rush_def_rank": int(row["rush_def_rank"]),
                    "total_def_rank": int(row["total_def_rank"]),
                },
            )
            upsert_count += 1

        conn.commit()

    logger.info(f"Upserted {upsert_count} team defense snapshots")


def upsert_qbs_and_performances(
    engine,
    qb_performances: pd.DataFrame,
    def_rankings: pd.DataFrame,
    team_records: pd.DataFrame,
    notable_qbs: set,
):
    """Upsert QBs and their performances to database."""
    logger.info("Upserting QBs and performances...")

    # Merge enrichment data
    enriched = qb_performances.merge(
        def_rankings[
            ["season", "week", "opponent_team", "pass_def_rank", "rush_def_rank", "total_def_rank"]
        ],
        left_on=["season", "week", "opponent_team"],
        right_on=["season", "week", "opponent_team"],
        how="left",
    )

    enriched = enriched.merge(
        team_records[["season", "week", "team", "win_pct"]],
        left_on=["season", "week", "opponent_team"],
        right_on=["season", "week", "team"],
        how="left",
    )
    enriched = enriched.rename(columns={"win_pct": "opp_win_pct"})

    # Fill NaN values
    enriched["pass_def_rank"] = enriched["pass_def_rank"].fillna(16).astype(int)
    enriched["rush_def_rank"] = enriched["rush_def_rank"].fillna(16).astype(int)
    enriched["total_def_rank"] = enriched["total_def_rank"].fillna(16).astype(int)
    enriched["opp_win_pct"] = enriched["opp_win_pct"].fillna(0.5)

    qb_count = 0
    perf_count = 0

    with engine.connect() as conn:
        # Get unique QBs
        unique_qbs = enriched.drop_duplicates(subset=["gsis_id"])[
            ["gsis_id", "name", "headshot_url", "team_id"]
        ]

        # Upsert QBs
        for _, qb in unique_qbs.iterrows():
            is_notable = qb["gsis_id"] in notable_qbs

            conn.execute(
                text("""
                    INSERT INTO "QB" (id, gsis_id, name, headshot_url, team_id, "isNotable", "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), :gsis_id, :name, :headshot_url, :team_id, :is_notable, NOW(), NOW())
                    ON CONFLICT (gsis_id)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        headshot_url = EXCLUDED.headshot_url,
                        team_id = EXCLUDED.team_id,
                        "isNotable" = EXCLUDED."isNotable",
                        "updatedAt" = NOW()
                """),
                {
                    "gsis_id": qb["gsis_id"],
                    "name": qb["name"],
                    "headshot_url": qb["headshot_url"] if pd.notna(qb["headshot_url"]) else None,
                    "team_id": qb["team_id"] if pd.notna(qb["team_id"]) else None,
                    "is_notable": is_notable,
                },
            )
            qb_count += 1

        conn.commit()
        logger.info(f"Upserted {qb_count} QBs")

        # Upsert performances
        for _, perf in enriched.iterrows():
            # Get QB internal ID
            qb_result = conn.execute(
                text('SELECT id FROM "QB" WHERE gsis_id = :gsis_id'),
                {"gsis_id": perf["gsis_id"]},
            ).fetchone()

            if not qb_result:
                logger.warning(f"QB {perf['gsis_id']} not found, skipping performance")
                continue

            qb_id = qb_result[0]
            opponent_id = perf["opponent_team"]

            # Check if opponent exists
            opp_check = conn.execute(
                text('SELECT id FROM "Team" WHERE id = :team_id'), {"team_id": opponent_id}
            ).fetchone()

            if not opp_check:
                logger.warning(f"Opponent team {opponent_id} not found, skipping performance")
                continue

            conn.execute(
                text("""
                    INSERT INTO "QBPerformance" (
                        id, qb_id, season, week, opponent_id,
                        pass_yards, pass_tds, pass_attempts, completions,
                        rush_yards, rush_tds, interceptions, sacks, fumbles,
                        opp_win_pct, opp_pass_def_rank, opp_total_def_rank,
                        "createdAt", "updatedAt"
                    )
                    VALUES (
                        gen_random_uuid(), :qb_id, :season, :week, :opponent_id,
                        :pass_yards, :pass_tds, :pass_attempts, :completions,
                        :rush_yards, :rush_tds, :interceptions, :sacks, :fumbles,
                        :opp_win_pct, :opp_pass_def_rank, :opp_total_def_rank,
                        NOW(), NOW()
                    )
                    ON CONFLICT (qb_id, season, week)
                    DO UPDATE SET
                        opponent_id = EXCLUDED.opponent_id,
                        pass_yards = EXCLUDED.pass_yards,
                        pass_tds = EXCLUDED.pass_tds,
                        pass_attempts = EXCLUDED.pass_attempts,
                        completions = EXCLUDED.completions,
                        rush_yards = EXCLUDED.rush_yards,
                        rush_tds = EXCLUDED.rush_tds,
                        interceptions = EXCLUDED.interceptions,
                        sacks = EXCLUDED.sacks,
                        fumbles = EXCLUDED.fumbles,
                        opp_win_pct = EXCLUDED.opp_win_pct,
                        opp_pass_def_rank = EXCLUDED.opp_pass_def_rank,
                        opp_total_def_rank = EXCLUDED.opp_total_def_rank,
                        "updatedAt" = NOW()
                """),
                {
                    "qb_id": qb_id,
                    "season": int(perf["season"]),
                    "week": int(perf["week"]),
                    "opponent_id": opponent_id,
                    "pass_yards": int(perf["pass_yards"]),
                    "pass_tds": int(perf["pass_tds"]),
                    "pass_attempts": int(perf["pass_attempts"]),
                    "completions": int(perf["completions"]),
                    "rush_yards": int(perf["rush_yards"]),
                    "rush_tds": int(perf["rush_tds"]),
                    "interceptions": int(perf["interceptions"]),
                    "sacks": int(perf["sacks"]),
                    "fumbles": int(perf["fumbles"]),
                    "opp_win_pct": float(perf["opp_win_pct"]),
                    "opp_pass_def_rank": int(perf["pass_def_rank"]),
                    "opp_total_def_rank": int(perf["total_def_rank"]),
                },
            )
            perf_count += 1

        conn.commit()

    logger.info(f"Upserted {perf_count} QB performances")


def main():
    """Main sync pipeline."""
    logger.info(f"Starting sync at {datetime.now()}")
    logger.info(f"Processing seasons: {SEASONS}")

    try:
        engine = get_engine()

        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")

        # Fetch raw data
        weekly = fetch_weekly_data(SEASONS)
        schedules = fetch_team_schedules(SEASONS)

        # Calculate rankings and records
        def_rankings = calculate_defensive_rankings(weekly)
        team_records = calculate_team_records(schedules)

        # Extract QB data
        qb_performances = extract_qb_performances(weekly)
        notable_qbs = identify_notable_qbs(qb_performances)

        # Sync to database
        upsert_team_defense_snapshots(engine, def_rankings, team_records)
        upsert_qbs_and_performances(
            engine, qb_performances, def_rankings, team_records, notable_qbs
        )

        logger.info(f"Sync completed successfully at {datetime.now()}")

    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise


if __name__ == "__main__":
    # Ensure logs directory exists
    os.makedirs("pipeline/logs", exist_ok=True)
    main()
