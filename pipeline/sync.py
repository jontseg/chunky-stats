"""
NFL Data Sync Pipeline
Syncs QB performance data from nflverse and calculates defensive rankings.
Run on Tuesdays (after MNF) and Fridays (after TNF).
"""

import os
from datetime import datetime

import nfl_data_py as nfl
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
CURRENT_YEAR = datetime.now().year
SEASONS = [CURRENT_YEAR - 1, CURRENT_YEAR]  # Last 2 seasons
MIN_PASS_ATTEMPTS = 50  # Threshold for "notable" QB


def get_engine():
    """Create SQLAlchemy engine from DATABASE_URL."""
    return create_engine(DATABASE_URL)


def fetch_weekly_data(seasons: list[int]) -> pd.DataFrame:
    """Fetch weekly player data from nflverse."""
    print(f"Fetching weekly data for seasons: {seasons}")
    weekly = nfl.import_weekly_data(seasons)
    return weekly


def fetch_team_schedules(seasons: list[int]) -> pd.DataFrame:
    """Fetch team schedules including wins/losses."""
    print(f"Fetching schedules for seasons: {seasons}")
    schedules = nfl.import_schedules(seasons)
    return schedules


def calculate_defensive_rankings(weekly: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate cumulative defensive rankings for each team at each week.
    This is the "magic" - knowing how good a defense was AT THE TIME of the game.
    """
    print("Calculating defensive rankings...")

    # Aggregate passing yards allowed by each defense per week
    # (yards thrown against them = opponent_team's passing_yards)
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
    def_stats["cum_pass_yards_allowed"] = def_stats.groupby(
        ["season", "opponent_team"]
    )["pass_yards_allowed"].cumsum()

    def_stats["cum_rush_yards_allowed"] = def_stats.groupby(
        ["season", "opponent_team"]
    )["rush_yards_allowed"].cumsum()

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

    return def_stats


def calculate_team_records(schedules: pd.DataFrame) -> pd.DataFrame:
    """Calculate cumulative W/L records for each team at each week."""
    print("Calculating team records...")

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
            records.append(
                {"season": season, "week": week, "team": home_team, "result": "W"}
            )
            records.append(
                {"season": season, "week": week, "team": away_team, "result": "L"}
            )
        elif away_score > home_score:
            records.append(
                {"season": season, "week": week, "team": away_team, "result": "W"}
            )
            records.append(
                {"season": season, "week": week, "team": home_team, "result": "L"}
            )
        else:
            records.append(
                {"season": season, "week": week, "team": home_team, "result": "T"}
            )
            records.append(
                {"season": season, "week": week, "team": away_team, "result": "T"}
            )

    records_df = pd.DataFrame(records)

    # Calculate cumulative wins/losses
    records_df = records_df.sort_values(["season", "team", "week"])
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

    return records_df


def extract_qb_performances(weekly: pd.DataFrame) -> pd.DataFrame:
    """Extract QB-specific performance data."""
    print("Extracting QB performances...")

    # Filter to QBs only (position_group == 'QB' or position == 'QB')
    qb_data = weekly[weekly["position"] == "QB"].copy()

    # Select relevant columns
    qb_performances = qb_data[
        [
            "player_id",
            "player_name",
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
            "player_name": "name",
            "recent_team": "team_id",
            "passing_yards": "pass_yards",
            "passing_tds": "pass_tds",
            "attempts": "pass_attempts",
            "rushing_yards": "rush_yards",
            "rushing_tds": "rush_tds",
            "sack_fumbles_lost": "fumbles",
        }
    )

    # Fill NaN with 0 for numeric columns
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

    return qb_performances


def identify_notable_qbs(qb_performances: pd.DataFrame) -> pd.DataFrame:
    """Identify QBs with >= 50 pass attempts in current season."""
    print("Identifying notable QBs...")

    current_season = qb_performances[qb_performances["season"] == CURRENT_YEAR]
    season_attempts = (
        current_season.groupby("gsis_id")["pass_attempts"].sum().reset_index()
    )
    notable_qbs = season_attempts[season_attempts["pass_attempts"] >= MIN_PASS_ATTEMPTS]

    return notable_qbs[["gsis_id"]]


def sync_to_database(
    qb_performances: pd.DataFrame,
    def_rankings: pd.DataFrame,
    team_records: pd.DataFrame,
    notable_qbs: pd.DataFrame,
):
    """Sync all data to PostgreSQL database."""
    print("Syncing to database...")
    engine = get_engine()

    # Merge defensive rankings into QB performances
    enriched = qb_performances.merge(
        def_rankings[
            [
                "season",
                "week",
                "opponent_team",
                "pass_def_rank",
                "rush_def_rank",
                "total_def_rank",
            ]
        ],
        left_on=["season", "week", "opponent_team"],
        right_on=["season", "week", "opponent_team"],
        how="left",
    )

    # Merge team records (opponent's record at time of game)
    enriched = enriched.merge(
        team_records[["season", "week", "team", "win_pct"]],
        left_on=["season", "week", "opponent_team"],
        right_on=["season", "week", "team"],
        how="left",
    )

    enriched = enriched.rename(columns={"win_pct": "opp_win_pct"})

    # Mark notable QBs
    enriched["is_notable"] = enriched["gsis_id"].isin(notable_qbs["gsis_id"])

    print(f"Total QB performances: {len(enriched)}")
    print(f"Notable QBs: {notable_qbs['gsis_id'].nunique()}")

    # For now, just output to CSV for testing
    # In production, this would upsert to PostgreSQL
    enriched.to_csv("pipeline/output/enriched_qb_data.csv", index=False)
    def_rankings.to_csv("pipeline/output/defensive_rankings.csv", index=False)

    print("Sync complete!")


def main():
    """Main sync pipeline."""
    print(f"Starting sync at {datetime.now()}")
    print(f"Processing seasons: {SEASONS}")

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
    os.makedirs("pipeline/output", exist_ok=True)
    sync_to_database(qb_performances, def_rankings, team_records, notable_qbs)

    print(f"Finished sync at {datetime.now()}")


if __name__ == "__main__":
    main()
