# Cloud Project Setup

This document explains how to create and wire the hosted cloud projects for the NaRPISA monorepo.

## What gets deployed where

- `Vercel`: hosts the frontend in `apps/web`
- `Google Cloud Run`: hosts the PDF worker service in `apps/backend`
- `Google Cloud Tasks`: queues asynchronous parsing jobs for the worker
- `Supabase`: hosts Postgres, Auth, and project-level API credentials

## Before you start

- The GitHub repo should already be published.
- At least one teammate should have owner/admin access in GitHub, Vercel, GCP, and Supabase.
- Keep the source-link data model in mind: PDFs are fetched transiently by the worker and are not stored permanently.
- Decide which GCP project and region you want to use before creating queues or services.

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
3. Use a supported method from the official docs for your OS, such as Scoop, Homebrew, or another official binary/package option. Use `npx supabase --help`.
4. Run `npx supabase login`
5. Run `npx supabase link --project-ref <your-project-ref>`
6. Run `npx supabase db push`

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
- Vercel is the only public frontend host in this architecture.

## 3. Create the Google Cloud project and enable APIs

### Project and API setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project for the worker.
3. Enable these APIs:
   - `Cloud Run Admin API`
   - `Cloud Tasks API`
   - `IAM Service Account Credentials API`
   - `Artifact Registry API` if you plan to build/deploy through Google tooling

### Choose a region

Use a single region for both Cloud Run and Cloud Tasks when possible. A good default is `us-central1` unless your data residency or latency needs say otherwise.

## 4. Create service accounts and IAM bindings

### Recommended service accounts

- `narpisa-worker-runtime`: runtime identity for the Cloud Run worker
- `narpisa-tasks-invoker`: identity used by Cloud Tasks to call the internal task endpoint

### Recommended IAM

- Grant `narpisa-worker-runtime` the minimum permissions needed for:
  - Cloud Tasks enqueueing if the same service enqueues tasks
  - Secret access if you move secrets into Secret Manager
  - logging by default through Cloud Run
- Grant `narpisa-tasks-invoker` the `Cloud Run Invoker` role on the worker service.
- Ensure the runtime identity that creates tasks can specify the OIDC service account used by Cloud Tasks.

### Best-practice note

Cloud Tasks should call the worker with OIDC-authenticated HTTP requests. The worker should treat Cloud Task callbacks as internal task execution, not as a public endpoint.

## 5. Create the Cloud Tasks queue

Create a queue such as `narpisa-pdf-jobs`.

### Queue settings to define

- queue name
- region
- retry policy
- maximum attempts
- minimum and maximum backoff
- maximum concurrent dispatches
- maximum dispatches per second

### Recommended starting defaults

- moderate concurrency
- exponential backoff
- finite retries for transient failures
- explicit handling of permanent validation failures in the worker so they stop retrying

The worker is designed for at-least-once delivery, so task handlers must be idempotent.

## 6. Deploy the backend to Cloud Run

### What gets deployed

- Docker context: `apps/backend`
- HTTP service with health endpoint at `/api/v1/health`
- internal task endpoint at `/api/v1/tasks/process-source`
- public enqueue endpoint at `/api/v1/process-source`

### Required environment variables

Set these on the Cloud Run service:

- `PDF_WORKER_LOG_LEVEL`
- `PDF_WORKER_FETCH_TIMEOUT_SECONDS`
- `PDF_WORKER_FETCH_MAX_BYTES`
- `PDF_WORKER_FETCH_ALLOWED_DOMAINS`
- `PDF_WORKER_TASKS_PROVIDER=gcp`
- `PDF_WORKER_TASK_AUTH_ENABLED=true`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SCHEMA`
- `GCP_PROJECT_ID`
- `GCP_LOCATION`
- `CLOUD_TASKS_QUEUE`
- `CLOUD_RUN_SERVICE_URL`
- `CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL`
- `CLOUD_TASKS_AUDIENCE`

### Best-practice deployment decisions

- Use a dedicated service account for the Cloud Run worker.
- Keep the task callback authenticated.
- Let the worker return `2xx` only when the task is complete or intentionally marked non-retryable.
- Let transient failures surface as `5xx` so Cloud Tasks retries them.

## 7. Wire local development

### `.env` for local development

Copy `.env.example` to `.env` and fill in:

- Supabase URL
- Supabase anon key
- Supabase service role key
- allowed PDF source domains
- GCP project/region/queue details if you want to test real task enqueueing

### Local mode recommendation

Use:

- `PDF_WORKER_TASKS_PROVIDER=inline`
- `PDF_WORKER_TASK_AUTH_ENABLED=false`

for local development unless you are explicitly testing the real Cloud Tasks integration.

That keeps local development simple while production uses the queue-first GCP path.

## 8. GitHub Actions and secrets

The current workflows only run validation checks, not cloud deploys.

If you later add deploy workflows, you will likely need:

- GCP workload identity or service-account auth
- Supabase secrets
- Vercel project credentials if deploy automation is added

## 9. First deployment checklist

- Supabase project exists and schema has been applied
- Vercel project points to `apps/web`
- GCP project exists and required APIs are enabled
- Cloud Run worker service is deployed
- Cloud Tasks queue exists
- service accounts and IAM bindings are configured
- local `.env` file is filled in
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## 10. Manual verification checklist

After deploy:

1. Hit `/api/v1/health` on the Cloud Run service.
2. Submit a request to `/api/v1/process-source`.
3. Confirm a Cloud Task is created.
4. Confirm the internal task endpoint receives the callback.
5. Confirm `processing_jobs` updates in Supabase.
6. Confirm parsed results appear in `extracted_records`.
7. Confirm invalid inputs stop cleanly and transient failures retry correctly.

## 11. Suggested team ownership

- One person owns Supabase schema and migrations
- One person owns the web frontend
- One person owns the Cloud Run worker and Cloud Tasks integration
- One person owns testing, docs, and deployment hygiene

For a four-person student team, this keeps responsibilities clear without blocking collaboration.