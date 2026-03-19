# Source Governance

## Core rule
The platform stores source links and structured parsed output. It does not persist PDF binaries after parsing.

## Allowed sources
- Prefer stable `https` links from public institutions, mining companies, research organizations, and approved data partners.
- Reject local file uploads and ad hoc third-party mirrors unless the team explicitly approves them.

## Required metadata
- `title`
- `source_url`
- `source_domain`
- `attribution`
- `notes` when the source requires extra context

## Fetch policy
- Default timeout: 20 seconds
- Default max file size: 10 MB
- Validate `content-type` before parsing
- Record HTTP status, fetch time, and content hash after processing attempts

## Retention policy
- Keep only source metadata, job history, extracted records, and derived analytics in the database.
- Never save source PDFs to Supabase Storage or backend disk outside transient processing.

## Review expectations
- Every new ingestion feature must update tests, the worker contract, and source-governance guidance when behavior changes.
