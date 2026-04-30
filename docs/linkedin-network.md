# LinkedIn Network Feature

## MVP Scope

The first network release uses first-party, opt-in NaRPISA data:

- Supabase Auth links the member's LinkedIn OIDC identity into `profile_social_accounts`.
- Users control their public mining-network profile in `network_profiles`.
- User-entered commodities, countries, regions, sites, and disciplines create graph tags through `network_interests`.
- The Render backend turns opted-in profile text into OpenAI embeddings stored in `network_profile_embeddings`.
- The `/network` route shows authenticated users a SigmaJS directory and recommendation graph built from cached `network_edges` and `network_clusters`.

This avoids depending on LinkedIn's restricted Connections API.

## LinkedIn Data Boundaries

LinkedIn OIDC is used for verified account association only. It can provide account identifiers and basic claims such as name, email, and avatar, but it should not be treated as a source of a user's connections.

Do not store LinkedIn OAuth access tokens in browser-readable tables. If future LinkedIn products require tokens, store them only in a server-only table or secret store with explicit consent, retention rules, and RLS/service-role isolation.

## Recommendation Engine

Network recommendations are generated on the Render FastAPI backend:

- `OPEN_API_KEY` is a backend-only Render secret used for OpenAI embeddings. It must never be prefixed with `NEXT_PUBLIC_` or exposed to the browser.
- The default embedding model is `text-embedding-3-small` with 1536 dimensions.
- Profile text is built from opted-in profile fields, graph tags, and LinkedIn verification status.
- Embeddings are stored in Supabase pgvector and refreshed only when the profile content hash changes.
- Cached edges combine semantic similarity with structured overlap from tags, company, role, countries, sites, regions, and disciplines.
- Clusters are derived from connected components of the strongest recommendation edges and labeled from common graph tags.

The web app calls the backend after a profile save to refresh that user's embedding and rebuild cached graph edges. If the backend or OpenAI is unavailable, profile data still saves; recommendations can be rebuilt later from the backend admin endpoint.

## Future LinkedIn API Paths

The LinkedIn Connections API remains out of scope unless NaRPISA receives explicit access and can satisfy LinkedIn's data-use terms. If it becomes available, add it as a separate ingestion job that writes consented edges into `network_connections` with clear provenance.

NaRPISA has access to Member Data Portability (3rd Party). Treat that product as a future user-authorized import path, not a live graph dependency:

- Request only the minimum portability domains needed for mining-network enrichment.
- Import only data for the consenting member.
- Store portability-derived data only after explicit consent and label its provenance.
- Prefer derived, user-reviewable suggestions for network profile tags over automatically publishing imported data.
- Keep imports behind a feature flag until product, legal, and retention requirements are finalized.
