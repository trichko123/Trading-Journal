# Trading Journal

A full-stack trading journal for logging trades, reviewing performance, and keeping screenshots and risk notes in one place.

## Demo / Screenshots

- /docs/screenshots/dashboard.png
- /docs/screenshots/trade-details.png
- /docs/screenshots/risk-calculator.png

## Features

- Email/password registration and JWT-based login
- Optional Google sign-in (requires Google client IDs)
- Trade CRUD with per-user scoping
- Close trades with exit price/time and close reason (TP/SL/BreakEven/Manual)
- Auto metrics for SL/TP pips and RR based on Entry, SL, and TP
- Post-trade review notes (followed plan, mistakes, improvements, confidence)
- Screenshot attachments per trade (Preparation, Entry, Exit) with timeframe tags
- Filters by symbol, direction, status, session, created date, and closed date
- Summary bar (total R, win rate, avg R, avg confidence, counts)
- CSV export of the current table
- Position size / risk calculator (units, lots, 2R and 3R targets)
- Session labeling and trade duration

## Tech Stack

Frontend
- React 19 + Vite
- @react-oauth/google

Backend
- Java 17 + Spring Boot 4
- Spring Security (JWT)
- Spring Data JPA + Flyway
- jjwt for token signing

Database
- PostgreSQL (default profile)
- H2 file-based database (optional for local dev)

Auth
- Email/password + JWT
- Google OAuth ID token verification

## Getting Started

Prerequisites
- Java 17+
- Node.js 18+
- npm
- PostgreSQL
- Git

## Local Setup

### 1) Backend + PostgreSQL

Create a database (example):

```
createdb trading_journal
```

Set environment variables (example):

PowerShell
```
$env:DB_URL="jdbc:postgresql://localhost:5432/trading_journal"
$env:DB_USER="postgres"
$env:DB_PASSWORD="password"
$env:JWT_SECRET="replace_with_a_long_random_string"
# Optional
$env:APP_GOOGLE_CLIENT_ID="your_google_client_id"
$env:APP_CORS_ALLOWED_ORIGINS="http://localhost:5173"
$env:FINNHUB_API_KEY="your_finnhub_key"
$env:APP_UPLOAD_DIR="uploads"
```

Bash
```
export DB_URL="jdbc:postgresql://localhost:5432/trading_journal"
export DB_USER="postgres"
export DB_PASSWORD="password"
export JWT_SECRET="replace_with_a_long_random_string"
# Optional
export APP_GOOGLE_CLIENT_ID="your_google_client_id"
export APP_CORS_ALLOWED_ORIGINS="http://localhost:5173"
export FINNHUB_API_KEY="your_finnhub_key"
export APP_UPLOAD_DIR="uploads"
```

Run the backend from the repo root:

Windows
```
mvnw.cmd spring-boot:run
```

Mac/Linux
```
./mvnw spring-boot:run
```

Backend runs on http://localhost:8080.

Optional H2 (file-based) instead of Postgres:
- Remove or override `spring.profiles.active=postgres` in `src/main/resources/application.properties`.
- Restart the app and it will use the H2 file database configured in `application.properties`.

### 2) Frontend

```
cd frontend/trading-journal-ui
npm install
```

Create `frontend/trading-journal-ui/.env.local`:

```
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Run the frontend:

```
npm run dev
```

### 3) Run Both

- Terminal 1: backend (`mvnw spring-boot:run`)
- Terminal 2: frontend (`npm run dev`)

## Environment Variables

Backend (Spring Boot)
- `JWT_SECRET` (required for JWT signing)
- `DB_URL` (Postgres JDBC URL)
- `DB_USER`
- `DB_PASSWORD`
- `APP_GOOGLE_CLIENT_ID` (required for Google sign-in)
- `APP_CORS_ALLOWED_ORIGINS` (comma-separated list, default is `http://localhost:5173`)
- `APP_UPLOAD_DIR` (upload directory for screenshots, default is `uploads`)
- `FINNHUB_API_KEY` (only required for `/api/quote/test`)

Frontend (Vite)
- `VITE_API_BASE_URL` (defaults to `http://localhost:8080`)
- `VITE_GOOGLE_CLIENT_ID` (required to enable Google sign-in in the UI)

## Usage Notes

- Register or log in in the UI; the JWT is stored in localStorage and sent on API requests.
- Trades and attachments are scoped per user (JWT subject email).
- R outcome is calculated only when Entry, Stop Loss, and Exit are present; otherwise it is excluded from summary stats.
- Close reason is derived from Exit vs SL/TP (with a small tolerance) but can be overridden; Manual reason is required when Manual is selected.
- CSV export downloads the current filtered table.
- Screenshot uploads accept PNG/JPG/WEBP up to 10MB and are served from `/uploads/**`.
- Session labels are calculated using a fixed GMT+1 offset in the UI.

## Project Structure

- `src/main/java` - Spring Boot backend
- `src/main/resources` - application config and Flyway migrations
- `frontend/trading-journal-ui` - React frontend (Vite)
- `uploads` - stored screenshots
- `data` - local H2 database files (if H2 profile is used)

## Roadmap

No roadmap items are tracked in the repo yet.

## Contributing

PRs and issues are welcome. Please include clear reproduction steps for bugs and screenshots for UI changes.

## License

TBD
