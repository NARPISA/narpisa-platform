-- Add vector-backed network recommendations and graph clustering.
-- This migration intentionally follows the already-applied LinkedIn network
-- schema migration, so existing deployments can apply only this delta.

create extension if not exists vector with schema extensions;

create table public.network_profile_embeddings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  profile_text text not null,
  content_hash text not null,
  embedding extensions.vector(1536) not null,
  model text not null default 'text-embedding-3-small',
  dimensions integer not null default 1536,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint network_profile_embeddings_hash_not_blank check (length(trim(content_hash)) > 0),
  constraint network_profile_embeddings_dimensions_check check (dimensions = 1536)
);

comment on table public.network_profile_embeddings is
'Server-generated profile text embeddings for opt-in network recommendations. Generated on the Render backend with OpenAI.';

create table public.network_edges (
  source_profile_id uuid not null references public.profiles (id) on delete cascade,
  target_profile_id uuid not null references public.profiles (id) on delete cascade,
  score numeric(8, 4) not null,
  semantic_score numeric(8, 4) not null default 0,
  structured_score numeric(8, 4) not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  edge_type text not null default 'hybrid',
  computed_at timestamptz not null default timezone('utc', now()),
  primary key (source_profile_id, target_profile_id),
  constraint network_edges_no_self check (source_profile_id <> target_profile_id),
  constraint network_edges_ordered_pair check (source_profile_id < target_profile_id),
  constraint network_edges_reasons_array check (jsonb_typeof(reasons) = 'array'),
  constraint network_edges_type_check check (edge_type in ('semantic', 'structured', 'explicit', 'imported', 'hybrid'))
);

create table public.network_clusters (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  cluster_id text not null,
  cluster_label text not null,
  confidence numeric(6, 4) not null default 1,
  computed_at timestamptz not null default timezone('utc', now())
);

create index network_profile_embeddings_hnsw_idx
  on public.network_profile_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

create index network_edges_target_idx
  on public.network_edges (target_profile_id, score desc);

create index network_edges_score_idx
  on public.network_edges (score desc);

create index network_clusters_cluster_idx
  on public.network_clusters (cluster_id);

create trigger network_profile_embeddings_set_updated_at
before update on public.network_profile_embeddings
for each row execute procedure public.set_updated_at();

alter table public.network_profile_embeddings enable row level security;
alter table public.network_edges enable row level security;
alter table public.network_clusters enable row level security;

create policy "users can read their own network embedding metadata"
on public.network_profile_embeddings
for select
to authenticated
using ((select auth.uid()) = profile_id);

create policy "authenticated users can read visible network edges"
on public.network_edges
for select
to authenticated
using (
  exists (
    select 1
    from public.network_profiles source_profile
    where source_profile.profile_id = network_edges.source_profile_id
      and source_profile.is_visible
  )
  and exists (
    select 1
    from public.network_profiles target_profile
    where target_profile.profile_id = network_edges.target_profile_id
      and target_profile.is_visible
  )
);

create policy "authenticated users can read visible network clusters"
on public.network_clusters
for select
to authenticated
using (
  exists (
    select 1
    from public.network_profiles network_profiles
    where network_profiles.profile_id = network_clusters.profile_id
      and network_profiles.is_visible
  )
);

grant select on public.network_profile_embeddings to authenticated;
grant select on public.network_edges to authenticated;
grant select on public.network_clusters to authenticated;

create or replace function public.match_network_profile_embeddings(
  query_embedding extensions.vector(1536),
  excluded_profile_id uuid default null,
  match_count integer default 20,
  min_similarity double precision default 0.55
)
returns table (
  profile_id uuid,
  similarity double precision
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    embeddings.profile_id,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from public.network_profile_embeddings embeddings
  join public.network_profiles profiles on profiles.profile_id = embeddings.profile_id
  where profiles.is_visible
    and (excluded_profile_id is null or embeddings.profile_id <> excluded_profile_id)
    and 1 - (embeddings.embedding <=> query_embedding) >= min_similarity
  order by embeddings.embedding <=> query_embedding
  limit greatest(match_count, 0);
$$;
