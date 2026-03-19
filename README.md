# NaRPISA Platform

Monorepo starter for the NaRPISA natural resources value-addition prototype.

## Stack

- `apps/web`: Next.js, React, Material UI-first frontend with Tailwind still available, Vercel-ready
- `apps/backend`: FastAPI worker for transient PDF fetching and parsing on Render
- `supabase`: Postgres schema, auth roles, and extracted-record contracts
- `apps/web/src/components` and `apps/web/src/lib`: frontend-local UI components, helpers, and typed browser-side contracts

## Product principles

- Source-link ingestion first: store URLs, attribution, job history, and parsed records
- No persistent PDF binaries
- Typed contracts, explicit docs, and CI-enforced checks

## Quick start

1. Copy `.env.example` to `.env` and fill in Supabase values.
2. Install pnpm with `npm install -g pnpm`.
3. Install workspace dependencies with `pnpm install`.
4. Create a Python virtual environment and install backend deps:
  - Windows PowerShell: `python -m venv .venv` then `.\\.venv\\Scripts\\python -m pip install -e .\\apps\\backend[dev]`
  - macOS/Linux: `python -m venv .venv` then `./.venv/bin/python -m pip install -e ./apps/backend[dev]`
5. Start Redis for the Celery broker:
  - Docker: `docker compose up redis -d`
  - Local Redis: use `redis://localhost:6379/0`
  - Optional local debugging: set `KEEP_DOWNLOADED_PDFS=true` in `.env` to retain fetched PDFs after processing
6. Run the apps:
  - Web: `pnpm dev:web`
  - Backend API:
```python
python -m venv .venv
.venv\Scripts\python -m pip install -e .\apps\backend[dev]
pnpm dev:backend
```
  - Backend worker:
```python
pnpm dev:backend-worker
```
Then open:
- `http://localhost:3000/data_input`
- `http://localhost:8000/docs`

  - Local Supabase:
```
npx supabase start
npx supabase status
```
And when done: `npx supabase stop`


## Quality checks
### Backend quality
```
pnpm format:backend
pnpm check:backend
.\.venv\Scripts\python -m pytest -q apps/backend/tests
.\.venv\Scripts\python -m mypy apps/backend/app
.\.venv\Scripts\python -m ruff check apps/backend/app apps/backend/tests
.\.venv\Scripts\python -m black --check apps/backend/app apps/backend/tests
```
### Frontend quality
```
pnpm --filter @narpisa/web test
pnpm --filter @narpisa/web test:e2e
pnpm --filter @narpisa/web lint
pnpm --filter @narpisa/web typecheck
```
### Full repo validation
```
pnpm check:backend
pnpm lint
pnpm typecheck
pnpm test
pnpm check
```

## Docker

- `docker compose up --build`
- This now starts `web`, `backend`, `backend-worker`, and `redis` so queue jobs can be dispatched and processed locally.

## Hosted setup

- `docs/cloud-project-setup.md`: how to create the Vercel, Render, and Supabase projects
- `render.yaml`: Render Blueprint for the FastAPI API service, Render Key Value broker, and Celery background worker

## Team onboarding

- `docs/team-onboarding.md`: beginner-friendly guide to the architecture, workflow, and repo layout

## Repository map

- `CLAUDE.md`: project-wide AI guidance
- `.cursor/rules/*`: focused Cursor rules
- `docs/adr`: architecture decisions
- `docs/source-governance.md`: source-link and retention policy

## CI

- Pull requests run web lint/typecheck/tests, Playwright smoke coverage, and backend lint/typecheck/tests.
- Pushes to `main` run full repository verification.

