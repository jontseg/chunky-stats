"""
NFL Data Sync Pipeline
Syncs QB performance data from ESPN API and calculates defensive rankings.
Run on Tuesdays (after MNF) and Fridays (after TNF).
"""

import logging
import os
import ssl
import sys
import urllib.request
import json
from datetime import datetime

# Fix SSL certificate verification on macOS
ssl._create_default_https_context = ssl._create_unverified_context

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

DATABASE_URL = os.getenv("DIRECT_DATABASE_URL")
if not DATABASE_URL:
    logger.error("DIRECT_DATABASE_URL not found in environment variables")
    sys.exit(1)

SEASONS = [2025, 2024, 2023]
MIN_PASS_ATTEMPTS = 50


def get_engine():
    return create_engine(DATABASE_URL)


def espn_request(url: str) -> dict:
    """Make ESPN API request with proper headers."""
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read())


def fetch_season_games(season: int) -> list[dict]:
    """Fetch all games for a season from ESPN."""
    logger.info(f"Fetching games for {season} season...")
    games = []

    for week in range(1, 19):  # Weeks 1-18
        try:
            url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week={week}&dates={season}"
            data = espn_request(url)

            for event in data.get('events', []):
                game_id = event.get('id')
                comps = event.get('competitions', [{}])[0]
                competitors = comps.get('competitors', [])

                if len(competitors) != 2:
                    continue

                home_team = None
                away_team = None
                for c in competitors:
                    team_abbr = c.get('team', {}).get('abbreviation')
                    if c.get('homeAway') == 'home':
                        home_team = team_abbr
                    else:
                        away_team = team_abbr

                # Only include completed games
                status = comps.get('status', {}).get('type', {}).get('completed', False)
                if status and home_team and away_team:
                    games.append({
                        'game_id': game_id,
                        'season': season,
                        'week': week,
                        'home_team': home_team,
                        'away_team': away_team,
                    })
        except Exception as e:
            logger.warning(f"Error fetching week {week}: {e}")
            continue

    logger.info(f"Found {len(games)} completed games for {season}")
    return games


def fetch_game_qb_stats(game: dict) -> list[dict]:
    """Fetch QB stats from a game's boxscore."""
    game_id = game['game_id']

    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event={game_id}"
        data = espn_request(url)

        boxscore = data.get('boxscore', {})
        players = boxscore.get('players', [])

        qb_stats = []

        for team_data in players:
            team_abbr = team_data.get('team', {}).get('abbreviation')

            # Determine opponent
            if team_abbr == game['home_team']:
                opponent = game['away_team']
            else:
                opponent = game['home_team']

            stats_groups = team_data.get('statistics', [])

            # Get passing stats
            passing_stats = {}
            for group in stats_groups:
                if group.get('name') == 'passing':
                    labels = group.get('labels', [])
                    for athlete_data in group.get('athletes', []):
                        athlete = athlete_data.get('athlete', {})
                        stats = athlete_data.get('stats', [])

                        # Parse C/ATT
                        c_att = stats[0] if len(stats) > 0 else '0/0'
                        completions, attempts = map(int, c_att.split('/')) if '/' in c_att else (0, 0)

                        passing_stats[athlete.get('id')] = {
                            'player_id': athlete.get('id'),
                            'name': athlete.get('displayName'),
                            'headshot_url': athlete.get('headshot', {}).get('href'),
                            'team_abbr': team_abbr,
                            'completions': completions,
                            'attempts': attempts,
                            'pass_yards': int(stats[1]) if len(stats) > 1 and stats[1] != '--' else 0,
                            'pass_tds': int(stats[3]) if len(stats) > 3 and stats[3] != '--' else 0,
                            'interceptions': int(stats[4]) if len(stats) > 4 and stats[4] != '--' else 0,
                            'sacks': int(stats[5].split('-')[0]) if len(stats) > 5 and '-' in str(stats[5]) else 0,
                        }

            # Get rushing stats for QBs
            for group in stats_groups:
                if group.get('name') == 'rushing':
                    for athlete_data in group.get('athletes', []):
                        athlete = athlete_data.get('athlete', {})
                        player_id = athlete.get('id')
                        stats = athlete_data.get('stats', [])

                        if player_id in passing_stats:
                            # CAR, YDS, AVG, TD, LONG
                            passing_stats[player_id]['rush_yards'] = int(stats[1]) if len(stats) > 1 and stats[1] != '--' else 0
                            passing_stats[player_id]['rush_tds'] = int(stats[3]) if len(stats) > 3 and stats[3] != '--' else 0

            # Add game context to each QB
            for player_id, stats in passing_stats.items():
                if stats['attempts'] > 0:  # Only include QBs who actually played
                    stats['season'] = game['season']
                    stats['week'] = game['week']
                    stats['opponent'] = opponent
                    stats['rush_yards'] = stats.get('rush_yards', 0)
                    stats['rush_tds'] = stats.get('rush_tds', 0)
                    stats['fumbles'] = 0  # ESPN doesn't provide this easily
                    qb_stats.append(stats)

        return qb_stats

    except Exception as e:
        logger.warning(f"Error fetching boxscore for game {game_id}: {e}")
        return []


def fetch_all_qb_stats(seasons: list[int]) -> pd.DataFrame:
    """Fetch all QB stats for given seasons."""
    all_stats = []

    for season in seasons:
        games = fetch_season_games(season)

        for i, game in enumerate(games):
            if i % 50 == 0:
                logger.info(f"Processing game {i+1}/{len(games)} for {season}...")

            qb_stats = fetch_game_qb_stats(game)
            all_stats.extend(qb_stats)

    logger.info(f"Fetched {len(all_stats)} total QB performances")
    return pd.DataFrame(all_stats)


def calculate_defensive_rankings(qb_stats: pd.DataFrame) -> pd.DataFrame:
    """Calculate cumulative defensive rankings based on yards allowed."""
    logger.info("Calculating defensive rankings...")

    # Aggregate yards allowed by defense per week
    def_stats = qb_stats.groupby(['season', 'week', 'opponent']).agg({
        'pass_yards': 'sum',
        'rush_yards': 'sum',
    }).reset_index()

    def_stats = def_stats.rename(columns={
        'opponent': 'team_id',
        'pass_yards': 'pass_yards_allowed',
        'rush_yards': 'rush_yards_allowed',
    })

    def_stats = def_stats.sort_values(['season', 'team_id', 'week'])

    # Cumulative stats
    def_stats['cum_pass_yards_allowed'] = def_stats.groupby(['season', 'team_id'])['pass_yards_allowed'].cumsum()
    def_stats['cum_rush_yards_allowed'] = def_stats.groupby(['season', 'team_id'])['rush_yards_allowed'].cumsum()
    def_stats['cum_total_yards_allowed'] = def_stats['cum_pass_yards_allowed'] + def_stats['cum_rush_yards_allowed']

    # Rank (1 = best, 32 = worst)
    def_stats['pass_def_rank'] = def_stats.groupby(['season', 'week'])['cum_pass_yards_allowed'].rank(method='min', ascending=True)
    def_stats['rush_def_rank'] = def_stats.groupby(['season', 'week'])['cum_rush_yards_allowed'].rank(method='min', ascending=True)
    def_stats['total_def_rank'] = def_stats.groupby(['season', 'week'])['cum_total_yards_allowed'].rank(method='min', ascending=True)

    logger.info(f"Calculated defensive rankings for {len(def_stats)} team-weeks")
    return def_stats


def calculate_team_records(qb_stats: pd.DataFrame, games_data: list[dict]) -> pd.DataFrame:
    """Calculate team win/loss records from game results."""
    logger.info("Calculating team records...")

    # We need to fetch game scores - for now use a simplified approach
    # In production, we'd fetch actual scores from ESPN
    records = []

    # Group by season/week/team and mark as having played
    for season in qb_stats['season'].unique():
        season_games = qb_stats[qb_stats['season'] == season]
        teams = set(season_games['team_abbr'].unique()) | set(season_games['opponent'].unique())

        for team in teams:
            for week in range(1, season_games['week'].max() + 1):
                records.append({
                    'season': season,
                    'week': week,
                    'team': team,
                    'wins': 0,  # Simplified - would need actual game scores
                    'losses': 0,
                    'ties': 0,
                    'win_pct': 0.5,  # Default
                })

    return pd.DataFrame(records)


def identify_notable_qbs(qb_stats: pd.DataFrame) -> set:
    """Identify QBs with >= 50 pass attempts in most recent season."""
    logger.info("Identifying notable QBs...")

    most_recent = qb_stats['season'].max()
    logger.info(f"Using most recent season: {most_recent}")

    current = qb_stats[qb_stats['season'] == most_recent]
    season_attempts = current.groupby('player_id')['attempts'].sum().reset_index()
    notable = set(season_attempts[season_attempts['attempts'] >= MIN_PASS_ATTEMPTS]['player_id'])

    logger.info(f"Found {len(notable)} notable QBs")
    return notable


def upsert_team_defense_snapshots(engine, def_rankings: pd.DataFrame):
    """Upsert team defensive snapshots to database."""
    logger.info("Upserting team defense snapshots...")

    # Get valid teams first
    with engine.connect() as conn:
        valid_teams = set(row[0] for row in conn.execute(text('SELECT id FROM "Team"')).fetchall())
    logger.info(f"Found {len(valid_teams)} valid teams")

    upsert_count = 0
    batch_size = 100

    for i in range(0, len(def_rankings), batch_size):
        batch = def_rankings.iloc[i:i+batch_size]

        with engine.connect() as conn:
            for _, row in batch.iterrows():
                team_id = row['team_id']

                if team_id not in valid_teams:
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
                            0, 0, 0,
                            :pass_def_rank, :rush_def_rank, :total_def_rank,
                            NOW(), NOW()
                        )
                        ON CONFLICT (team_id, season, week)
                        DO UPDATE SET
                            pass_yards_allowed = EXCLUDED.pass_yards_allowed,
                            rush_yards_allowed = EXCLUDED.rush_yards_allowed,
                            total_yards_allowed = EXCLUDED.total_yards_allowed,
                            pass_def_rank = EXCLUDED.pass_def_rank,
                            rush_def_rank = EXCLUDED.rush_def_rank,
                            total_def_rank = EXCLUDED.total_def_rank,
                            "updatedAt" = NOW()
                    """),
                    {
                        "team_id": team_id,
                        "season": int(row['season']),
                        "week": int(row['week']),
                        "pass_yards_allowed": int(row['cum_pass_yards_allowed']),
                        "rush_yards_allowed": int(row['cum_rush_yards_allowed']),
                        "total_yards_allowed": int(row['cum_total_yards_allowed']),
                        "pass_def_rank": int(row['pass_def_rank']),
                        "rush_def_rank": int(row['rush_def_rank']),
                        "total_def_rank": int(row['total_def_rank']),
                    },
                )
                upsert_count += 1

            conn.commit()

    logger.info(f"Upserted {upsert_count} team defense snapshots")


def upsert_qbs_and_performances(engine, qb_stats: pd.DataFrame, def_rankings: pd.DataFrame, notable_qbs: set):
    """Upsert QBs and their performances."""
    logger.info("Upserting QBs and performances...")

    # Merge defensive rankings
    enriched = qb_stats.merge(
        def_rankings[['season', 'week', 'team_id', 'pass_def_rank', 'total_def_rank']],
        left_on=['season', 'week', 'opponent'],
        right_on=['season', 'week', 'team_id'],
        how='left'
    )

    enriched['pass_def_rank'] = enriched['pass_def_rank'].fillna(16).astype(int)
    enriched['total_def_rank'] = enriched['total_def_rank'].fillna(16).astype(int)
    enriched['opp_win_pct'] = 0.5  # Simplified

    # Get valid teams
    with engine.connect() as conn:
        valid_teams = set(row[0] for row in conn.execute(text('SELECT id FROM "Team"')).fetchall())

    # Upsert QBs first
    qb_count = 0
    unique_qbs = enriched.drop_duplicates(subset=['player_id'])[
        ['player_id', 'name', 'headshot_url', 'team_abbr']
    ]

    with engine.connect() as conn:
        for _, qb in unique_qbs.iterrows():
            is_notable = str(qb['player_id']) in notable_qbs or qb['player_id'] in notable_qbs

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
                    "gsis_id": str(qb['player_id']),
                    "name": qb['name'],
                    "headshot_url": qb['headshot_url'] if pd.notna(qb['headshot_url']) else None,
                    "team_id": qb['team_abbr'] if pd.notna(qb['team_abbr']) else None,
                    "is_notable": is_notable,
                },
            )
            qb_count += 1

        conn.commit()
    logger.info(f"Upserted {qb_count} QBs")

    # Get QB ID mapping
    with engine.connect() as conn:
        qb_map = {row[0]: row[1] for row in conn.execute(text('SELECT gsis_id, id FROM "QB"')).fetchall()}

    # Upsert performances in batches
    perf_count = 0
    batch_size = 100

    for i in range(0, len(enriched), batch_size):
        batch = enriched.iloc[i:i+batch_size]

        with engine.connect() as conn:
            for _, perf in batch.iterrows():
                qb_id = qb_map.get(str(perf['player_id']))
                opponent_id = perf['opponent']

                if not qb_id or opponent_id not in valid_teams:
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
                        "season": int(perf['season']),
                        "week": int(perf['week']),
                        "opponent_id": opponent_id,
                        "pass_yards": int(perf['pass_yards']),
                        "pass_tds": int(perf['pass_tds']),
                        "pass_attempts": int(perf['attempts']),
                        "completions": int(perf['completions']),
                        "rush_yards": int(perf['rush_yards']),
                        "rush_tds": int(perf['rush_tds']),
                        "interceptions": int(perf['interceptions']),
                        "sacks": int(perf['sacks']),
                        "fumbles": int(perf['fumbles']),
                        "opp_win_pct": float(perf['opp_win_pct']),
                        "opp_pass_def_rank": int(perf['pass_def_rank']),
                        "opp_total_def_rank": int(perf['total_def_rank']),
                    },
                )
                perf_count += 1

            conn.commit()

        if (i + batch_size) % 500 == 0:
            logger.info(f"Processed {i + batch_size} performances...")

    logger.info(f"Upserted {perf_count} QB performances")


def main():
    """Main sync pipeline."""
    logger.info(f"Starting sync at {datetime.now()}")
    logger.info(f"Fetching seasons: {SEASONS}")

    try:
        engine = get_engine()

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successful")

        # Fetch all QB stats from ESPN
        qb_stats = fetch_all_qb_stats(SEASONS)

        if len(qb_stats) == 0:
            logger.error("No QB stats fetched!")
            sys.exit(1)

        # Calculate defensive rankings
        def_rankings = calculate_defensive_rankings(qb_stats)

        # Identify notable QBs
        notable_qbs = identify_notable_qbs(qb_stats)

        # Sync to database
        upsert_team_defense_snapshots(engine, def_rankings)
        upsert_qbs_and_performances(engine, qb_stats, def_rankings, notable_qbs)

        logger.info(f"Sync completed successfully at {datetime.now()}")

    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise


if __name__ == "__main__":
    os.makedirs("pipeline/logs", exist_ok=True)
    main()
