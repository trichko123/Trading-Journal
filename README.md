# Trading Journal

A full-stack trading journal web app for logging trades, reviewing performance, and improving consistency.

## Tech Stack

Backend:
- Java + Spring Boot
- Spring Security (JWT)
- Maven

Frontend:
- React (inside `frontend/`)
- Node.js + npm

## Project Structure

- `src/` — Spring Boot backend source
- `frontend/` — React frontend app
- `pom.xml` — Maven configuration
- `mvnw`, `mvnw.cmd` — Maven wrapper scripts
- `.mvn/` — Maven wrapper files

## Prerequisites

- Java 17+ (recommended)
- Node.js 18+ (recommended)
- Git

Note: Maven wrapper is included, so you can run the backend without installing Maven globally.

## Getting Started (Local Development)

1) Clone the repository

    git clone git@github.com:trichko123/Trading-Journal.git  
    cd Trading-Journal

2) Run the backend (Spring Boot) from the repo root

    Windows:  
    mvnw.cmd spring-boot:run

    Mac/Linux:  
    ./mvnw spring-boot:run

    Backend runs on: http://localhost:8080

3) Run the frontend (React) in a separate terminal

    cd frontend  
    npm install  
    npm run dev

    The dev server URL will be shown in the terminal (often http://localhost:5173).

## Authentication (JWT)

The backend uses JWT authentication.

Send the token on requests with the header:

    Authorization: Bearer <YOUR_JWT_TOKEN>

## Configuration / Secrets

Do not commit secrets (JWT keys, passwords, etc.).

Recommended approach:
- use environment variables and/or local-only config files (ignored by `.gitignore`)
- keep safe defaults in `application.properties`

Example local-only config (do not commit):

    JWT_SECRET=change_me

## Git Workflow (Team Style)

Start work:
- `git checkout main`
- `git pull`
- `git checkout -b feature/<short-name>`

Commit and push:
- `git add .`
- `git commit -m "feat: <short description>"`
- `git push -u origin feature/<short-name>`

Open a Pull Request → review → merge into `main`

## Roadmap

- Persistence with PostgreSQL (optional)
- Advanced analytics (win rate, expectancy, drawdown)
- Filters by pair/session/strategy
- Export trades (CSV)
- Trade screenshots & notes

## License

No license specified yet.
