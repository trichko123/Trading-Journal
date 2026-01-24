# Trading Journal

A full-stack trading journal web app for logging trades, reviewing performance, and improving consistency.

## Features

- Secure JWT auth with email/password login and registration
- Google sign-in implemented on backend + UI (requires Google Cloud setup to function end-to-end)
- Trade CRUD with per-user data scoping
- Automatic trade metrics: SL/TP pips and RR ratio
- Filters (symbol, direction, session, created/closed date ranges)
- Pagination and sorting by newest trades
- CSV export
- Session labeling (Asian/London/New York + overlaps) and trade duration display
- Manual refresh and loading indicators

## Tech Stack

Backend:
- Java + Spring Boot
- Spring Security (JWT)
- Maven

Frontend:
- React (inside `frontend/`)
- Node.js + npm

Database:
- PostgreSQL (current, recommended)
- H2 file-based database for local/dev fallback

## Project Structure

- `src/` -- Spring Boot backend source
- `frontend/` -- React frontend app
- `pom.xml` -- Maven configuration
- `mvnw`, `mvnw.cmd` -- Maven wrapper scripts
- `.mvn/` -- Maven wrapper files

## Prerequisites

- Java 17+ (recommended)
- Node.js 18+ (recommended)
- Git

Note: Maven wrapper is included, so you can run the backend without installing Maven globally.

## Configuration / Secrets

Do not commit secrets (JWT keys, passwords, etc.).

Backend env vars:
- `JWT_SECRET` (required in production)
- `GOOGLE_CLIENT_ID` (required for Google sign-in)
- `CORS_ALLOWED_ORIGINS` (comma-separated, e.g. `http://localhost:5173,https://app.example.com`)
- `PORT` (optional, defaults to `8080`)
- `SPRING_PROFILES_ACTIVE=postgres` (use PostgreSQL config)
- `DB_URL` (PostgreSQL JDBC URL)
- `DB_USER`
- `DB_PASSWORD`

Frontend env vars (Vite):
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_BASE_URL` (optional, defaults to `http://localhost:8080`)

## Getting Started (Local Development)

1) Clone the repository

    git clone git@github.com:trichko123/Trading-Journal.git  
    cd Trading-Journal

2) Run the backend (Spring Boot) from the repo root

    H2 (default, local/dev):
    Windows:
    mvnw.cmd spring-boot:run

    Mac/Linux:
    ./mvnw spring-boot:run

    PostgreSQL (current usage):
    Windows (PowerShell):
    $env:SPRING_PROFILES_ACTIVE="postgres"
    $env:DB_URL="jdbc:postgresql://localhost:5432/trading_journal"
    $env:DB_USER="postgres"
    $env:DB_PASSWORD="postgres"
    mvnw.cmd spring-boot:run

    Mac/Linux:
    SPRING_PROFILES_ACTIVE=postgres \
    DB_URL=jdbc:postgresql://localhost:5432/trading_journal \
    DB_USER=postgres \
    DB_PASSWORD=postgres \
    ./mvnw spring-boot:run

    Backend runs on: http://localhost:8080

    H2 console (dev only): http://localhost:8080/h2-console

3) Run the frontend (React) in a separate terminal

    cd frontend  
    npm install  
    npm run dev

    The dev server URL will be shown in the terminal (often http://localhost:5173).

## Authentication (JWT)

The backend uses JWT authentication. Send the token on requests with the header:

    Authorization: Bearer <YOUR_JWT_TOKEN>

## Google OAuth Notes

- Backend and UI support Google sign-in, but you must configure Google Cloud for it to work end-to-end.
- Set `GOOGLE_CLIENT_ID` on the backend and `VITE_GOOGLE_CLIENT_ID` on the frontend.
- In Google Cloud Console, add an Authorized JavaScript origin for your frontend
  (e.g. `http://localhost:5173` for dev and your real domain for production).
- Ensure `CORS_ALLOWED_ORIGINS` includes the frontend origin(s).

## Roadmap

- Advanced analytics (win rate, expectancy, drawdown)
- Trade screenshots & notes
- Strategy tags/labels
- Performance dashboards

## License

No license specified yet.
