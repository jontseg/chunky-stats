# Chunky Stats

NFL QB Statistics Dashboard with a "Sync & Serve" architecture. Pre-calculates defensive rankings and serves them via a lightning-fast API.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   nflverse      │      │   PostgreSQL    │      │   Next.js       │
│   (nfl-data-py) │ ───► │   (Storage)     │ ───► │   (Frontend)    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                        │                        │
   Python Sync             Prisma ORM              Recharts UI
   (Tue/Fri)            Pre-calculated           "Chunky" Design
                          Rankings
```

## Tech Stack

- **Data Source**: [nfl-data-py](https://github.com/nflverse/nfl-data-py) (Python wrapper for nflverse)
- **Storage**: PostgreSQL with Prisma ORM
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Charts**: Recharts with Brush component for 2-season scroll

## Key Features

- **Notable QBs**: Any QB with >= 50 pass attempts in current season
- **Defensive Difficulty Score**: Pre-calculated rank (1-32) for every team for every week
- **Time-Contextual Stats**: "The Eagles were the #1 Pass Defense in Week 4" - stats reflect reality at game time
- **Update Cadence**: Syncs Tuesday mornings (after MNF) and Friday mornings (after TNF)

## Project Structure

```
chunky-stats/
├── src/                    # Next.js application
│   ├── app/               # App Router pages
│   └── generated/         # Prisma client
├── pipeline/              # Python data sync
│   ├── sync.py           # Main ingestion script
│   └── requirements.txt  # Python dependencies
├── prisma/
│   └── schema.prisma     # Database schema
└── public/               # Static assets
```

## Data Models

### QBPerformance
Stores individual game performances with pre-calculated context:
- Core stats: pass_yards, pass_tds, rush_yards, rush_tds, interceptions
- Context: `opp_pass_def_rank` (1-32), `opp_win_pct` at time of game

### TeamDefenseSnapshot
Weekly snapshots enabling historical queries:
- Cumulative yards allowed (pass, rush, total)
- Weekly rankings (1-32, lower = better defense)

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+

### Installation

```bash
# Install Node dependencies
npm install

# Set up Python environment
cd pipeline
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### Running the Sync

```bash
cd pipeline
python sync.py
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Implementation Phases

### Phase 1: Ingestion Pipeline (Python)
- [x] Fetch raw data from nflverse
- [x] Calculate weekly defensive rankings
- [x] Calculate cumulative team records
- [ ] Database upsert logic

### Phase 2: "Chunky" Dashboard (Frontend)
- [ ] Stat selector with large, high-contrast buttons
- [ ] AreaChart with gradient fill
- [ ] Brush component for 2-season scroll
- [ ] Time-frame filter (Last 5, Last 10, Season)

### Phase 3: Advanced Sorting
- [ ] Sort by opponent defensive rank
- [ ] Sort by opponent win percentage
- [ ] Combined difficulty score

## License

MIT
