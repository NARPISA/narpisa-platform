# ADR 0002: Cloud Run And Cloud Tasks Worker

## Status

Accepted

## Context

The original worker deployment targeted Render and processed source PDFs synchronously. That model was simple, but it was a poor fit for bursty parsing workloads and increased the chance of paying for a worker footprint that sat idle between jobs.

The platform already stores source metadata and job state in Supabase, and the ingestion flow only needs PDFs transiently during parsing. That makes the worker a good fit for queue-first execution with retry handling instead of a long-lived always-on worker process.

## Decision

We will run the PDF worker on Google Cloud Run and enqueue background jobs with Google Cloud Tasks.

The worker architecture will follow these rules:

- public source-submission requests create a processing job and enqueue a task
- Cloud Tasks calls a dedicated internal worker route
- task callbacks use OIDC-authenticated HTTP requests
- the worker treats delivery as at-least-once and remains idempotent
- permanent validation failures are recorded and acknowledged without endless retries
- transient failures surface as retryable errors so Cloud Tasks can retry

## Why this decision was made

- Cloud Run is a better cost fit for bursty workloads than a continuously provisioned worker.
- Cloud Tasks gives explicit queue controls, retry policy, and dispatch rate management.
- OIDC-authenticated task callbacks are a strong default for service-to-service task execution.
- The queue-first model better matches the existing `processing_jobs` tables and future status-driven UI work.

## Consequences

### Positive

- better scaling behavior during ingest spikes
- lower operational cost when the worker is idle
- explicit control over retries, dispatch concurrency, and failure handling
- clearer separation between public enqueue APIs and internal processing routes

### Negative

- more initial cloud setup and IAM configuration
- more moving parts for new developers to understand
- local development needs an inline mode or real GCP configuration for queue testing

## Operational notes

- `Cloud Run Invoker` should be granted to the Cloud Tasks service account used for callbacks.
- queue configuration should live alongside deployment documentation so the team can reason about retries deliberately.
- Supabase remains the system of record for document metadata, job lifecycle, and extracted records.
