# NaRPISA Platform Guidance

## Project scope
- This is a monorepo with `apps/web` for the Next.js frontend, `apps/backend` for the FastAPI PDF worker, and `supabase/*` for schema and data contracts.
- The product stores source links, attribution, job history, and parsed records. Do not add persistent PDF storage without explicit approval.

## Working style
- Make the smallest change that satisfies the request.
- Plan before broad refactors or multi-file feature work.
- Prefer typed contracts, explicit validation, and tests over hidden assumptions.
- Keep feature boundaries clean: web UI in `apps/web`, parsing logic in `apps/backend`, and schema/data work in `supabase/*`.

## Quality bar
- Run relevant checks after changes.
- For frontend work, prefer `pnpm --filter @narpisa/web lint`, `typecheck`, and `test`.
- For backend work, run `python -m ruff`, `black --check`, `mypy`, and `pytest` in `apps/backend`.
- Update tests and docs whenever behavior or contracts change.

## Data and security
- Preserve source attribution and URL governance rules.
- Validate external source URLs, MIME types, and size limits before parsing.
- Keep secrets out of source control and update `.env.example` when new variables are required.

## Team defaults
- Favor readable code over clever abstractions.
- Leave concise comments only when they prevent confusion.
- Record major architecture changes in `docs/adr`.
