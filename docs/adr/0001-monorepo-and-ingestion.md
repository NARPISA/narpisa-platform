# ADR 0001: Monorepo and source-link ingestion

## Status
Accepted

## Context
The project needs a scalable starter architecture for a four-person student team, a Vercel-hosted React frontend, a Render-hosted PDF parsing worker, and a Supabase-backed data layer. The team also wants to minimize storage costs and avoid persisting third-party PDF binaries.

## Decision
- Use a `pnpm` + `Turborepo` monorepo with separate `apps/web` and `apps/backend` applications.
- Use `Next.js` for the web frontend and `FastAPI` for the parsing worker.
- Store source URLs, attribution metadata, processing status, and extracted records in Supabase.
- Fetch PDFs only during processing and discard the binary immediately after parsing completes.

## Consequences
- Hosting stays simple: Vercel for the web app and Render for the worker.
- Researchers can trace extracted records back to their public sources without retaining raw files.
- The worker must enforce MIME validation, retry policies, and source attribution rules.
