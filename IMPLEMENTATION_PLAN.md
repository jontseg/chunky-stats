# Chunky Stats - Implementation Plan

> A high-performance NFL QB statistics dashboard with pre-calculated defensive rankings

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHUNKY STATS ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │   nflverse       │     │   PostgreSQL     │     │   Next.js        │    │
│  │   (Data Source)  │────▶│   (Storage)      │────▶│   (Frontend)     │    │
│  │                  │     │                  │     │                  │    │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘    │
│         │                        │                        │                │
│         │                        │                        │                │
│         ▼                        ▼                        ▼                │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │  Python Pipeline │     │  Prisma ORM      │     │  Recharts +      │    │
│  │  (nfl-data-py)   │     │  (Type-safe)     │     │  Tailwind CSS    │    │
│  └──────────────────┘     └──────────────────┘     └──────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Update Schedule

- **Tuesday Morning**: Sync after Monday Night Football
- **Friday Morning**: Sync after Thursday Night Football

---

## Phase 1: Database Foundation

### 1.1 Database Setup & Migrations

- [x] **1.1.1** Verify PostgreSQL connection in `.env`
  - Ensure `DATABASE_URL` is correctly configured
  - Test connection with `npx prisma db push --dry-run`

- [x] **1.1.2** Run initial Prisma migration
  ```bash
  npx prisma migrate dev --name init
  ```

- [x] **1.1.3** Generate Prisma client
  ```bash
  npx prisma generate
  ```

- [x] **1.1.4** Seed initial team data (32 NFL teams)
  - Create `prisma/seed.ts`
  - Add all 32 team records with abbreviations and names
  - Run `npx prisma db seed`

### 1.2 Python Pipeline Database Integration

- [x] **1.2.1** Update `pipeline/sync.py` to connect to PostgreSQL
  - Replace CSV output with SQLAlchemy upserts
  - Use `psycopg2` for direct connection

- [x] **1.2.2** Implement team upsert logic
  - Insert/update Team records
  - Handle team relocations/name changes

- [x] **1.2.3** Implement TeamDefenseSnapshot upsert
  - Upsert weekly defensive snapshots
  - Calculate and store rankings (1-32)

- [x] **1.2.4** Implement QB upsert logic
  - Match QBs by `gsis_id`
  - Update `isNotable` flag (≥50 pass attempts)

- [x] **1.2.5** Implement QBPerformance upsert
  - Store game-level stats
  - Link to correct TeamDefenseSnapshot for context

- [x] **1.2.6** Add error handling and logging
  - Wrap operations in transactions
  - Log sync progress and errors
  - Create `pipeline/logs/` directory

- [x] **1.2.7** Test full sync with 2023-2024 data
  - Run `python pipeline/sync.py`
  - Verify data in database with Prisma Studio

---

## Phase 2: API Layer

### 2.1 Prisma Client Setup

- [x] **2.1.1** Create Prisma client singleton
  - Create `src/lib/prisma.ts`
  - Handle connection pooling for serverless

### 2.2 API Routes

- [x] **2.2.1** Create GET `/api/qbs` endpoint
  - Return list of notable QBs
  - Include basic info (name, team, headshot)
  - Support search query parameter

- [x] **2.2.2** Create GET `/api/qbs/[gsis_id]` endpoint
  - Return QB details with all performances
  - Include opponent context for each game
  - Support season filter parameter

- [x] **2.2.3** Create GET `/api/teams` endpoint
  - Return all 32 teams
  - Include current defensive rankings

- [x] **2.2.4** Create GET `/api/teams/[id]/defense` endpoint
  - Return TeamDefenseSnapshot history
  - Support season/week range parameters

- [x] **2.2.5** Create GET `/api/stats/leaders` endpoint
  - Return top QBs by various metrics
  - Support stat type and timeframe parameters

### 2.3 Data Utilities

- [x] **2.3.1** Create `src/lib/stats.ts`
  - Helper functions for stat calculations
  - Passer rating formula
  - Fantasy points calculation

- [x] **2.3.2** Create `src/lib/sorting.ts`
  - `getSortedPerformances(metric)` function
  - Sort by opponent defensive rank
  - Sort by opponent win percentage
  - Sort by combined difficulty score

---

## Phase 3: Frontend - Core Layout

### 3.1 Layout & Navigation

- [x] **3.1.1** Update `src/app/layout.tsx`
  - Add site header with logo
  - Configure metadata for SEO
  - Set up dark/light theme support

- [x] **3.1.2** Create `src/components/Header.tsx`
  - Logo/branding
  - QB search bar (typeahead)
  - Theme toggle

- [x] **3.1.3** Create `src/components/Footer.tsx`
  - Data source attribution (nflverse)
  - Last sync timestamp

### 3.2 Home Page

- [x] **3.2.1** Update `src/app/page.tsx`
  - Featured QBs section
  - Quick stats summary
  - Navigation to QB profiles

- [x] **3.2.2** Create `src/components/QBCard.tsx`
  - QB headshot
  - Name and team
  - Key stats preview
  - Click to navigate to profile

---

## Phase 4: Frontend - QB Profile Dashboard

### 4.1 Page Structure

- [x] **4.1.1** Create `src/app/qb/[gsis_id]/page.tsx`
  - Fetch QB data server-side
  - Layout with header, chart, stats table

- [x] **4.1.2** Create `src/components/QBHeader.tsx`
  - Large headshot
  - QB name and team
  - Season summary stats

### 4.2 Stat Selector ("Chunky Buttons")

- [x] **4.2.1** Create `src/components/StatSelector.tsx`
  - Large, high-contrast buttons
  - Stats: Pass Yards, Pass TDs, Rush Yards, Rush TDs, INTs
  - Active state with `border-b-8` and `translate-y-1`

- [x] **4.2.2** Implement button styling
  ```css
  /* Chunky button styles */
  .chunky-btn {
    @apply px-6 py-4 text-lg font-bold rounded-xl;
    @apply border-b-8 border-blue-700 bg-blue-500;
    @apply hover:bg-blue-600 active:translate-y-1 active:border-b-4;
    @apply transition-all duration-100;
  }
  ```

- [x] **4.2.3** Add state management for selected stat
  - Use React `useState` or URL params
  - Persist selection across navigation

### 4.3 Performance Chart

- [x] **4.3.1** Create `src/components/PerformanceChart.tsx`
  - Recharts `ResponsiveContainer` wrapper
  - `AreaChart` with gradient fill
  - X-axis: Week labels (W1, W2... or opponent names)
  - Y-axis: Selected stat values

- [x] **4.3.2** Implement gradient fill
  ```jsx
  <defs>
    <linearGradient id="statGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
    </linearGradient>
  </defs>
  <Area fill="url(#statGradient)" />
  ```

- [x] **4.3.3** Add `<Brush />` component for 2-season scroll
  - Position at bottom of chart
  - Default view: last 10 games
  - Allow sliding through full history

- [x] **4.3.4** Implement custom tooltip
  - Show game details on hover
  - Include opponent info
  - Show opponent's defensive rank at time of game

- [x] **4.3.5** Add chart animations
  - Smooth transitions when changing stats
  - Entrance animation on load

### 4.4 Timeframe Filter

- [x] **4.4.1** Create `src/components/TimeframeFilter.tsx`
  - Options: Last 5, Last 10, Season, All (2 seasons)
  - Style as pill buttons or segmented control

- [x] **4.4.2** Implement data slicing logic
  - `data.slice(-5)` for Last 5
  - `data.slice(-10)` for Last 10
  - Filter by season for Season view
  - Full array for All

### 4.5 Sort Controls

- [x] **4.5.1** Create `src/components/SortControls.tsx`
  - Sort by: Chronological, Opponent Defense, Opponent Win %
  - Visual indicator for current sort

- [x] **4.5.2** Implement sort logic
  - Chronological: default time order
  - Opponent Defense: by `opp_pass_def_rank` (hardest first)
  - Opponent Win %: by `opp_win_pct` (best teams first)

---

## Phase 5: Frontend - Stats Table

### 5.1 Game Log Table

- [ ] **5.1.1** Create `src/components/GameLogTable.tsx`
  - Responsive table with all games
  - Columns: Week, Opponent, Def Rank, Pass Yds, TDs, INTs, Rush Yds

- [ ] **5.1.2** Add visual indicators for context
  - Color-code opponent difficulty (red=hard, green=easy)
  - Highlight exceptional performances

- [ ] **5.1.3** Implement table sorting
  - Click column headers to sort
  - Sync with chart sort state

### 5.2 Season Averages

- [ ] **5.2.1** Create `src/components/SeasonAverages.tsx`
  - Calculate and display averages
  - Compare vs league average
  - Show rank among notable QBs

---

## Phase 6: Search & Discovery

### 6.1 QB Search

- [ ] **6.1.1** Create `src/components/QBSearch.tsx`
  - Typeahead search input
  - Debounced API calls
  - Dropdown results with headshots

- [ ] **6.1.2** Implement keyboard navigation
  - Arrow keys to navigate results
  - Enter to select
  - Escape to close

### 6.2 QB Comparison (Stretch Goal)

- [ ] **6.2.1** Create `src/app/compare/page.tsx`
  - Select 2-4 QBs to compare
  - Overlay their performance charts

- [ ] **6.2.2** Create `src/components/ComparisonChart.tsx`
  - Multiple lines/areas on same chart
  - Legend with QB names

---

## Phase 7: Polish & Performance

### 7.1 Loading States

- [ ] **7.1.1** Create `src/components/Skeleton.tsx`
  - Skeleton loaders for all components
  - Match component dimensions

- [ ] **7.1.2** Implement Suspense boundaries
  - Wrap async components
  - Show skeletons while loading

### 7.2 Error Handling

- [ ] **7.2.1** Create `src/app/error.tsx`
  - Global error boundary
  - User-friendly error messages
  - Retry functionality

- [ ] **7.2.2** Create `src/app/not-found.tsx`
  - 404 page for invalid QB IDs
  - Suggest similar QBs

### 7.3 Responsive Design

- [ ] **7.3.1** Test and fix mobile layout
  - Collapsible stat selector on small screens
  - Touch-friendly chart interactions
  - Horizontal scroll for tables

- [ ] **7.3.2** Test tablet layout
  - Optimal chart size
  - Side-by-side controls where appropriate

### 7.4 Performance Optimization

- [ ] **7.4.1** Implement ISR for QB pages
  - `revalidate` every 24 hours
  - Static generation for notable QBs

- [ ] **7.4.2** Optimize images
  - Use Next.js `Image` component
  - Set proper sizes and priority

- [ ] **7.4.3** Add caching headers
  - Cache API responses appropriately
  - Use `stale-while-revalidate`

---

## Phase 8: Deployment & Operations

### 8.1 CI/CD Pipeline

- [ ] **8.1.1** Create GitHub Actions workflow
  - Run linting on PR
  - Run type checking
  - Build verification

- [ ] **8.1.2** Set up deployment pipeline
  - Deploy to Vercel on merge to main
  - Preview deployments for PRs

### 8.2 Data Sync Automation

- [ ] **8.2.1** Create sync cron job
  - Schedule: Tuesday 6am, Friday 6am
  - Run `python pipeline/sync.py`
  - Trigger ISR revalidation after sync

- [ ] **8.2.2** Set up sync monitoring
  - Slack/email notification on sync complete
  - Alert on sync failure

### 8.3 Production Database

- [ ] **8.3.1** Provision production PostgreSQL
  - Use Vercel Postgres, Supabase, or Railway
  - Configure connection pooling

- [ ] **8.3.2** Run migrations on production
  - `npx prisma migrate deploy`
  - Verify schema matches development

- [ ] **8.3.3** Run initial data sync on production
  - Execute full 2024-2025 sync
  - Verify data integrity

---

## Phase 9: Testing

### 9.1 Unit Tests

- [ ] **9.1.1** Set up testing framework
  - Install Vitest or Jest
  - Configure for TypeScript

- [ ] **9.1.2** Test utility functions
  - `src/lib/stats.ts` calculations
  - `src/lib/sorting.ts` sort logic

### 9.2 Integration Tests

- [ ] **9.2.1** Test API routes
  - Mock Prisma client
  - Test response shapes and error handling

### 9.3 E2E Tests (Stretch Goal)

- [ ] **9.3.1** Set up Playwright
  - Configure for Next.js

- [ ] **9.3.2** Test critical user flows
  - Search for QB → View profile → Change stats
  - Navigate between QBs

---

## File Structure (Final)

```
chunky-stats/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── pipeline/
│   ├── sync.py
│   ├── requirements.txt
│   └── logs/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── globals.css
│   │   ├── qb/
│   │   │   └── [gsis_id]/
│   │   │       └── page.tsx
│   │   ├── compare/
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── qbs/
│   │       │   ├── route.ts
│   │       │   └── [gsis_id]/
│   │       │       └── route.ts
│   │       ├── teams/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── defense/
│   │       │           └── route.ts
│   │       └── stats/
│   │           └── leaders/
│   │               └── route.ts
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── QBCard.tsx
│   │   ├── QBHeader.tsx
│   │   ├── QBSearch.tsx
│   │   ├── StatSelector.tsx
│   │   ├── PerformanceChart.tsx
│   │   ├── TimeframeFilter.tsx
│   │   ├── SortControls.tsx
│   │   ├── GameLogTable.tsx
│   │   ├── SeasonAverages.tsx
│   │   ├── ComparisonChart.tsx
│   │   └── Skeleton.tsx
│   └── lib/
│       ├── prisma.ts
│       ├── stats.ts
│       └── sorting.ts
├── .env
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

---

## Progress Tracker

| Phase | Description | Status | Completion |
|-------|-------------|--------|------------|
| 1 | Database Foundation | **Complete** | 100% |
| 2 | API Layer | **Complete** | 100% |
| 3 | Frontend - Core Layout | **Complete** | 100% |
| 4 | Frontend - QB Profile | **Complete** | 100% |
| 5 | Frontend - Stats Table | Not Started | 0% |
| 6 | Search & Discovery | Not Started | 0% |
| 7 | Polish & Performance | Not Started | 0% |
| 8 | Deployment & Operations | Not Started | 0% |
| 9 | Testing | Not Started | 0% |

---

## Key Technical Decisions

### Why PostgreSQL?
- Relational joins between QBs, games, and team snapshots
- Prisma provides excellent TypeScript integration
- Easy to query historical rankings

### Why Python for Ingestion?
- `nfl-data-py` is the official Python wrapper for nflverse
- Pandas makes cumulative ranking calculations straightforward
- Can run independently from the web server

### Why Pre-calculate Rankings?
- Avoids expensive runtime calculations
- "Rank at time of game" requires historical snapshots
- Enables instant page loads

### Why ISR over SSR?
- Data only changes twice per week
- Pre-rendered pages load instantly
- Reduces server load

---

## Notes & Reminders

1. **Notable QB Definition**: ≥50 pass attempts in current season
2. **Defensive Rank**: Lower is better (1 = best defense)
3. **Two-Season Limit**: Only show 2024 and 2025 data
4. **Sync Schedule**: Tuesday & Friday mornings
5. **Data Source**: Always attribute nflverse in footer
