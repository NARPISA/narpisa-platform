# Team Onboarding Guide

This guide is for teammates who are new to web development, full-stack projects, or cloud deployment. It is intentionally detailed. You should be able to read this once and understand what this repository is, how the pieces fit together, how to run it locally, and how to contribute without breaking the project.

## 1. What this project is

NaRPISA Platform is a prototype web application for natural-resources intelligence.

At a high level, the app is meant to:

- save links to source documents
- fetch PDFs only when needed
- extract structured data from those PDFs
- store parsed data in a database
- let users explore that parsed data through a web interface
- avoid permanent PDF storage so hosting costs stay lower and the system stays simpler

This project is not a general file storage app. It is a source-driven research platform. That difference matters.

### The most important product rule

- The system stores source links, metadata, job history, and parsed output.
- The system does not permanently store the original PDF binaries.

That rule affects the architecture, the database, the worker logic, the docs, and the deployment setup.

## 2. What problems the app is solving

The project exists because important mining and value-addition information often lives in scattered documents, reports, and feasibility studies.

Without software help, people have to:

- manually find documents
- manually open and read them
- manually extract numbers, claims, and sections
- manually compare current sources with older ones

This app aims to reduce that manual work.

The intended workflow is:

1. a researcher finds a useful public document
2. they register the source URL in the app
3. the backend worker fetches and parses the PDF
4. parsed output is saved in a structured way
5. users can search, review, and eventually analyze the extracted records

## 3. Big picture architecture

There are three main cloud parts:

- `Vercel` runs the website users interact with
- `Render` runs the backend worker that fetches and parses PDFs
- `Supabase` stores relational data and authentication data

Think of the system in layers:

- `web layer`: pages, forms, tables, dashboards, user interactions
- `processing layer`: fetching PDFs, validating sources, parsing text, creating extracted records
- `data layer`: tables, relationships, access policies, and saved outputs

### End-to-end flow

1. A user registers a source link in the frontend.
2. The frontend saves source metadata in Supabase.
3. The backend worker receives a processing request.
4. The worker fetches the PDF from the external source URL.
5. The worker parses the file in memory.
6. The worker stores only derived information in Supabase.
7. The frontend reads that structured data and displays it.

### Why this architecture was chosen

- `Next.js` on Vercel is a strong default for fast frontend development.
- `FastAPI` is a good fit for PDF processing and Python-based parsing libraries.
- `Supabase` gives the team Postgres, auth, and a simple hosted developer experience.
- Splitting frontend and backend lets each part scale independently.
- The link-first ingestion model reduces storage cost and lowers legal/operational risk.

## 4. What a monorepo means

A monorepo is one Git repository that contains multiple related applications and shared packages.

In this project, the monorepo contains:

- one frontend app
- one backend worker
- shared TypeScript packages
- database schema files
- docs and project rules

### Why we use a monorepo

- shared code lives in one place
- frontend and backend changes can be reviewed together
- CI can run one consistent set of checks
- docs and deployment config stay close to the code
- student contributors can learn one repository instead of juggling several

### Tradeoff to understand

Monorepos are convenient, but they require discipline:

- do not put frontend code in backend folders
- do not put backend logic in shared UI packages
- do not change database structure without a migration

## 5. Repo map

This section explains what each major folder is for and when to edit it.

### `apps/web`

This is the frontend application built with Next.js and React, using Material UI as the primary component system while keeping Tailwind available for optional utility styling.

Work here when you are changing:

- pages and layouts
- forms and buttons
- tables and dashboards
- user-facing validation
- frontend data fetching
- browser-side Supabase usage
- React components and hooks

### `apps/backend`

This is the backend worker built with FastAPI.

Work here when you are changing:

- source URL validation
- remote PDF fetching
- parsing logic
- worker endpoints
- error handling for processing
- backend tests
- worker config and environment handling

### `packages/config`

Shared project constants and configuration defaults.

Put code here when:

- multiple parts of the repo need the same constant or project metadata
- you want shared non-UI config used by the frontend and/or docs

### `packages/types`

Shared TypeScript contracts and schemas.

Put code here when:

- frontend code and shared utilities need the same type or schema
- you want one source of truth for request/response shapes

### `packages/ui`

Reusable frontend UI components.

Put code here when:

- a component is general enough to be reused
- you want consistent styling or component APIs across the app

### `supabase`

Database configuration and SQL migrations.

Put code here when:

- you are changing tables
- you are changing policies
- you are adding indexes, enums, triggers, or helper SQL functions
- you need version-controlled database changes

### `docs`

Project documentation for humans.

Put content here when:

- the team needs setup instructions
- you need to explain architecture
- you want onboarding or workflow docs
- a decision deserves durable written context

### `.github`

GitHub Actions and collaboration templates.

This folder contains:

- CI workflows
- pull request template
- issue templates

### `.cursor` and `CLAUDE.md`

Persistent guidance for AI-assisted development.

These files tell the agent how to behave in this project:

- respect monorepo boundaries
- keep changes reviewable
- run checks
- avoid storing PDFs
- preserve source governance

## 6. Technology overview

If you are brand new to the stack, this section gives you the minimum needed context.

### Next.js

Next.js is a React framework.

In practice, that means:

- React builds the UI components
- Next.js adds routing, project structure, and deployment-friendly behavior
- pages are created from files and folders

### React

React is the frontend UI library.

You will mostly use React to:

- render components
- pass props
- handle user input
- manage state

### Tailwind CSS

Tailwind is still installed in this project, but it is no longer the primary UI system.

In this repo, Tailwind should be treated as:

- an optional utility layer
- something you use intentionally for edge cases
- secondary to the shared Material UI theme and components

### Material UI

Material UI is the main frontend component library for this project.

You will use it for:

- layout primitives like containers, stacks, cards, and papers
- typography and buttons
- theme-driven spacing, colors, and shape
- reusable shared UI patterns across the app

### FastAPI

FastAPI is the backend framework.

You will use it to:

- define API routes
- validate request data
- return JSON responses
- structure processing logic

### Supabase

Supabase is a hosted Postgres-based backend platform.

In this project it provides:

- the Postgres database
- authentication
- API credentials

### Turborepo

Turborepo helps run scripts across the monorepo efficiently.

That is why commands like `pnpm lint` and `pnpm test` can validate multiple packages consistently.

### pnpm

`pnpm` is the JavaScript package manager used by this repo.

Use it instead of `npm` for workspace dependencies in this project.

## 7. Data model and source policy

This project only makes sense if everyone understands what is and is not persisted.

### What we store

- source URL
- title
- attribution
- source domain
- processing status
- content hash
- extracted excerpt
- extracted structured records
- job history and metadata

### What we do not store

- original PDFs as permanent files
- random downloaded binaries in the repo
- secrets in tracked files

### Why we do it this way

- lower storage costs
- less duplication
- easier operations
- clearer data governance
- reduced risk from accumulating third-party files

### Where this rule is enforced

- worker design
- docs
- source governance rules
- environment config
- Render service configuration

## 8. Vocabulary for beginners

These are the terms you will see most often.

- `frontend`: the website users interact with
- `backend`: server-side code that performs processing or exposes APIs
- `API`: a structured way for software components to talk to each other
- `route`: a URL path handled by frontend or backend code
- `request`: data sent to an API
- `response`: data returned from an API
- `schema`: the shape of data, often enforced through SQL or validation libraries
- `validation`: checking that input data is allowed and correctly formatted
- `migration`: a version-controlled database change
- `env var`: a secret or configuration value stored outside the code
- `CI`: automated checks that run when code changes are pushed or reviewed
- `deploy`: publishing the app to a hosting platform
- `lint`: automated code quality/style checks
- `typecheck`: automated checks that verify code matches expected data types
- `fixture`: stable test data used for deterministic automated tests
- `blueprint`: infrastructure-as-code configuration for a cloud platform like Render
- `monorepo`: one repository containing multiple apps and shared packages

## 9. Local setup from scratch

Follow this section if you are setting up the repo on your computer for the first time.

### Requirements

- Node.js installed
- `pnpm` available
- Python 3.11 installed
- Git installed

Optional but useful:

- Docker Desktop
- Supabase CLI
- VS Code or Cursor

### Step 1: clone and enter the repo

```powershell
git clone <repo-url>
cd narpisa-platform
```

### Step 2: install frontend/workspace dependencies

```powershell
pnpm install
```

### Step 3: create a Python virtual environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -e .\apps\backend[dev]
```

macOS/Linux:

```bash
python -m venv .venv
./.venv/bin/python -m pip install -e ./apps/backend[dev]
```

### Step 4: create local environment variables

```powershell
Copy-Item .env.example .env
```

Then fill in the values in `.env`.

### Step 5: run the apps

Frontend:

```powershell
pnpm dev:web
```

Backend:

```powershell
pnpm dev:backend
```

### Step 6: open the apps

- frontend: `http://localhost:3000`
- backend docs: `http://localhost:8000/docs`

## 10. Local setup troubleshooting

### If `pnpm` is missing

- enable Corepack, or install `pnpm` using a supported method for your OS

### If Python package install fails

- make sure you are using Python 3.11 or later
- make sure you activated or referenced the `.venv` interpreter

### If the backend cannot start

- check `.env`
- verify the `.venv` install succeeded
- open `http://localhost:8000/docs` to see whether FastAPI is running

### If the frontend cannot start

- run `pnpm install` again
- check for missing environment values
- look for TypeScript or Next.js errors in the terminal

## 11. Day-to-day development workflow

This is the recommended normal workflow for most contributors.

1. Pull the latest `main`.
2. Create a feature branch.
3. Make one focused change.
4. Run the relevant checks locally.
5. Open a pull request.
6. Respond to code review feedback.
7. Merge only after CI passes.

### Good branch naming examples

- `feature/source-registration-form`
- `fix/pdf-timeout-validation`
- `docs/team-onboarding-update`

### What a good pull request looks like

- one clear purpose
- small enough to review in one sitting
- includes tests if behavior changed
- includes docs if setup or workflow changed
- mentions schema changes if the database changed

## 12. Commands you should know

This section is a practical cheat sheet for the commands new teammates will use most often.

### Project setup commands

```powershell
pnpm install
python -m venv .venv
.\.venv\Scripts\python -m pip install -e .\apps\backend[dev]
Copy-Item .env.example .env
```

What these do:

- `pnpm install`: installs JavaScript and monorepo dependencies
- `python -m venv .venv`: creates the backend Python virtual environment
- `.\.venv\Scripts\python -m pip install -e .\apps\backend[dev]`: installs backend dependencies and dev tools
- `Copy-Item .env.example .env`: creates the local environment file from the example

### Frontend and workspace commands

```powershell
pnpm dev:web
pnpm --filter @narpisa/web build
pnpm --filter @narpisa/web start
pnpm --filter @narpisa/web lint
pnpm --filter @narpisa/web typecheck
pnpm --filter @narpisa/web test
pnpm --filter @narpisa/web test:e2e
pnpm lint
pnpm typecheck
pnpm test
pnpm check
pnpm test:e2e
```

What these do:

- `pnpm dev:web`: starts the frontend locally
- `pnpm --filter @narpisa/web build`: builds the frontend for production
- `pnpm --filter @narpisa/web start`: runs the production frontend build locally
- `pnpm --filter @narpisa/web lint`: checks frontend code quality
- `pnpm --filter @narpisa/web typecheck`: checks frontend TypeScript types
- `pnpm --filter @narpisa/web test`: runs frontend unit tests
- `pnpm --filter @narpisa/web test:e2e`: runs Playwright browser tests
- `pnpm lint`: runs linting across the monorepo
- `pnpm typecheck`: runs type checks across the monorepo
- `pnpm test`: runs tests across the monorepo
- `pnpm check`: runs the main validation sequence before a PR

### Backend commands

```powershell
pnpm dev:backend
.\.venv\Scripts\python -m ruff check apps/backend/app apps/backend/tests
.\.venv\Scripts\python -m black --check apps/backend/app apps/backend/tests
.\.venv\Scripts\python -m black apps/backend/app apps/backend/tests
.\.venv\Scripts\python -m mypy apps/backend/app
.\.venv\Scripts\python -m pytest -q apps/backend/tests
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

What these do:

- `pnpm dev:backend`: starts the backend using the repo script
- `ruff check`: lints the backend Python code
- `black --check`: checks backend formatting without changing files
- `black`: formats backend Python files
- `mypy`: checks backend type annotations
- `pytest`: runs backend tests
- `uvicorn ...`: starts the FastAPI app directly if needed

### Docker commands

```powershell
docker compose up --build
docker compose up
docker compose down
docker compose ps
docker compose logs
docker compose logs web
docker compose logs backend
```

What these do:

- `docker compose up --build`: builds and starts the containers
- `docker compose up`: starts the containers without rebuilding
- `docker compose down`: stops and removes containers
- `docker compose ps`: shows running containers
- `docker compose logs`: shows logs for all containers
- `docker compose logs web`: shows frontend container logs
- `docker compose logs backend`: shows backend container logs

### Supabase commands

Use `npx supabase ...` if you are using the Node-based CLI flow.

```powershell
npx supabase --version
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase start
npx supabase stop
npx supabase status
npx supabase db push
npx supabase db pull
npx supabase migration new <migration_name>
```

What these do:

- `npx supabase --version`: shows the CLI version
- `npx supabase login`: logs the CLI into Supabase
- `npx supabase link --project-ref <your-project-ref>`: links the repo to the hosted project
- `npx supabase start`: starts the local Supabase stack
- `npx supabase stop`: stops the local Supabase stack
- `npx supabase status`: shows local Supabase service status
- `npx supabase db push`: applies local migrations to the linked project
- `npx supabase db pull`: pulls remote schema changes into local migration history
- `npx supabase migration new <migration_name>`: creates a new migration file

Important note:

- do not use `npm install -g supabase`
- for this project, prefer `npx supabase ...` if you are using the npm-based install path

### Basic Git commands

These are the minimum Git commands every teammate should know.

```powershell
git status
git diff
git checkout main
git pull
git checkout -b feature/my-change
git add .
git add path/to/file
git commit -m "Describe the change"
git push -u origin feature/my-change
git log --oneline --decorate --graph -20
git restore path/to/file
git restore --staged path/to/file
git fetch
```

What these do:

- `git status`: shows changed, staged, and untracked files
- `git diff`: shows unstaged changes in detail
- `git checkout main`: switches to the main branch
- `git pull`: updates your current branch from the remote
- `git checkout -b feature/my-change`: creates and switches to a new branch
- `git add .`: stages all current changes
- `git add path/to/file`: stages one file
- `git commit -m "..."`: creates a commit from staged changes
- `git push -u origin feature/my-change`: pushes a new branch to GitHub
- `git log --oneline --decorate --graph -20`: shows recent commit history clearly
- `git restore path/to/file`: discards unstaged changes in a file
- `git restore --staged path/to/file`: unstages a file while keeping local edits
- `git fetch`: downloads remote updates without merging them

### Common command sequences

If you want to...

- start the frontend only:
`pnpm dev:web`
- start the backend only:
`pnpm dev:backend`
- run all core checks before opening a pull request:
`pnpm check`
- run just backend tests:
`.\.venv\Scripts\python -m pytest -q apps/backend/tests`
- run just frontend tests:
`pnpm --filter @narpisa/web test`
- push database migrations:
`npx supabase db push`
- create a new Git branch for your task:
`git checkout -b feature/my-change`

## 13. How deployments work

### Frontend deployment

Flow:

- GitHub repository
- Vercel project
- automatic deploy on push to the tracked branch

The frontend is the public-facing web app.

### Backend deployment

Flow:

- GitHub repository
- Render Blueprint
- backend service on Render

The backend is a separate service because PDF fetching and parsing belong on the server side.

### Database deployment

Flow:

- migration file
- Supabase project
- schema applied to the hosted Postgres database

### CI flow

The repo includes GitHub Actions workflows that:

- lint the web app
- typecheck the web app and shared packages
- run frontend unit tests
- run Playwright smoke tests
- lint, typecheck, and test the backend

## 14. Where different kinds of changes should go

Use this as a quick decision guide.

### Add or edit a page

- go to `apps/web`

### Add or edit a parser

- go to `apps/backend`

### Change a shared contract or schema used by frontend code

- go to `packages/types`

### Add a reusable UI card, button, or layout helper

- go to `packages/ui`

### Change a database table or policy

- go to `supabase`

### Explain how something works

- go to `docs`

## 15. How to think about backend changes

Beginners often put too much logic directly inside API routes. Avoid that.

A better pattern is:

1. route receives request
2. route validates the input
3. service does the real work
4. response model returns clean output

Why this matters:

- easier to test
- easier to reuse
- easier to debug
- easier to review

## 16. How to think about frontend changes

Beginners often mix layout, logic, data fetching, and styling in one large file. Try not to do that.

Prefer:

- small components
- clear prop names
- shared components when reuse is obvious
- frontend validation for form inputs
- Material UI primitives before custom styling
- Tailwind utilities only when Material UI theming or the `sx` prop is not the best fit

## 17. Database discipline

If you change the data model:

- update the SQL migration
- consider whether indexes are needed
- think about row-level security or access policies
- update docs if the contract changed
- mention the schema change in the pull request

Never treat the production database dashboard as the source of truth. The migration files in Git should be the source of truth.

## 18. Secrets and environment variables

Secrets must never go into:

- committed source files
- pull requests
- screenshots
- documentation examples using real values

This repo uses environment variables for:

- Supabase URLs and keys
- backend fetch policy configuration
- frontend public config

### Important distinction

- values prefixed with `NEXT_PUBLIC_` are safe to expose to the frontend
- service-role secrets are not safe to expose to the frontend

## 19. Testing expectations

If you change behavior, add or update tests.

### Frontend test types

- `Vitest`: unit and component tests
- `Playwright`: smoke-level browser tests

### Backend test types

- `pytest`: API and service tests

### Good test habits

- use fixtures instead of brittle live dependencies
- test behavior, not implementation trivia
- keep tests readable
- prefer deterministic tests

## 20. Team best practices

- Keep pull requests small and reviewable.
- Do not store secrets in Git.
- Do not store PDFs permanently.
- Update tests when behavior changes.
- Update docs when setup or workflow changes.
- Record major architecture decisions in `docs/adr`.
- Ask for clarification early instead of guessing on important architectural changes.
- Keep the repo easy for the next student to understand.

## 21. Common mistakes to avoid

- committing `.env`
- putting secrets in screenshots or docs
- changing database structure without a migration
- storing raw PDFs
- mixing unrelated changes in one pull request
- skipping tests after changing behavior
- editing shared types without checking frontend impact
- hardcoding URLs or keys

