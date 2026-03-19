# Cloud Project Setup

This document explains how to create the hosted projects for the NaRPISA monorepo.

## What gets deployed where

- `Vercel`: hosts the frontend in `apps/web`
- `Render`: hosts the FastAPI API service, Render Key Value broker, and Celery background worker in `apps/backend`
- `Supabase`: hosts Postgres, Auth, and project-level API credentials

## Before you start

- The GitHub repo should already be published.
- At least one teammate should have owner/admin access in GitHub, Vercel, Render, and Supabase.
- Keep the source-link data model in mind: PDFs are fetched transiently by the worker and are not stored permanently.

## 1. Create the Supabase project

### In the dashboard

1. Go to [supabase.com](https://supabase.com) and create a new organization if needed.
2. Create a new project named `narpisa-platform`.
3. Choose a region close to your team or target users.
4. Save the generated database password in your password manager.

### Gather the values you need

From `Project Settings -> API`, copy:

- `Project URL`
- `anon public key`
- `service_role key`

These map to:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Apply the schema

Recommended workflow:

1. Install the Supabase CLI locally using a supported install method.
2. Do not use `npm install -g supabase`. Supabase explicitly does not support global npm installation for the CLI.
3. Use a supported method from the official docs for your OS, such as Scoop, Homebrew, or another official binary/package option. Use `npx supabase --help`
4. Run `supabase login`
5. Run `supabase link --project-ref <your-project-ref>`
6. Run `supabase db push`

Fallback workflow if the CLI is not installed yet:

1. Open the SQL editor in Supabase.
2. Copy the migration from `supabase/migrations/20260315220000_initial_schema.sql`
3. Run it manually once.

## 2. Create the Vercel project

### Recommended project settings

- Repository: this GitHub repo
- Framework preset: `Next.js`
- Root Directory: `apps/web`
- Install Command: leave default unless Vercel asks for a custom command
- Build Command: leave default for `apps/web`, or set `pnpm --filter @narpisa/web build` if needed
- Production Branch: `main`

### Environment variables

Add these in `Project Settings -> Environment Variables`:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For the first deploy:

- Set `NEXT_PUBLIC_APP_URL` to the Vercel production URL after the project is created.
- Use the Supabase values from the previous step.

### Notes for this repo

- The frontend lives in a monorepo, so make sure the project points at `apps/web`.
- Vercel is the only public frontend host in this architecture. The backend stays on Render.

## 3. Create the Render project

### Recommended path

Use the `render.yaml` file in the repo root.

1. Go to [render.com](https://render.com)
2. Choose `New + -> Blueprint`
3. Select this GitHub repo
4. Confirm that Render detects `render.yaml`
5. Create the Blueprint instance so Render provisions:
   - `narpisa-pdf-worker` web service
   - `narpisa-pdf-worker-jobs` background worker
   - `narpisa-pdf-broker` Key Value broker

### What the blueprint does

- Deploys `apps/backend`
- Uses the existing `Dockerfile`
- Sets the health check to `/api/v1/health`
- Provisions a Key Value instance and injects its private `connectionString` into `CELERY_BROKER_URL`
- Runs the Celery worker with concurrency `1` so only one PDF is downloaded and processed at a time
- Leaves secret values unsynced so you can enter them safely in the dashboard

### Required environment variables

Set these in both Render backend services:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

These are already represented in `render.yaml`.

Render also injects:

- `CELERY_BROKER_URL` from the Key Value instance
- `PDF_WORKER_DOWNLOAD_DIR=/tmp/narpisa-pdf-worker`

## 4. Wire the systems together

### `.env` for local development

Copy `.env.example` to `.env` and fill in:

- Supabase URL
- Supabase anon key
- Supabase service role key
- `CELERY_BROKER_URL` if you are not using the Docker Compose Redis service
- Optional: `KEEP_DOWNLOADED_PDFS=true` when you want local worker runs to retain downloaded PDFs for inspection

### GitHub Actions secrets

Add secrets later if you enable deployment jobs from CI. For now, the included workflows only run checks.

## 5. First deployment checklist

- Supabase project exists and schema has been applied
- Vercel project points to `apps/web`
- Render Blueprint created all three services from `render.yaml`
- Local `.env` file is filled in
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## 6. Suggested team ownership

- One person owns Supabase schema and migrations
- One person owns the web frontend
- One person owns the PDF worker and source validation
- One person owns testing, docs, and deployment hygiene

For a four-person student team, this keeps responsibilities clear without blocking collaboration.