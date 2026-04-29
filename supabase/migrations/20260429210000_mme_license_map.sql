-- Store Namibia MME license source metadata and GeoJSON map geometries.

alter table public.licenses
  add column if not exists source_system text,
  add column if not exists source_layer text,
  add column if not exists source_license_no text,
  add column if not exists source_status text,
  add column if not exists source_properties jsonb not null default '{}'::jsonb;

alter table public.licenses
  alter column application_date drop not null,
  add constraint licenses_source_properties_object
    check (jsonb_typeof(source_properties) = 'object');

create unique index if not exists licenses_source_identity_idx
  on public.licenses (source_system, source_layer, source_license_no)
  where source_system is not null
    and source_layer is not null
    and source_license_no is not null;

create index if not exists licenses_source_layer_idx
  on public.licenses (source_layer)
  where source_layer is not null;

create index if not exists licenses_source_status_idx
  on public.licenses (source_status)
  where source_status is not null;

create index if not exists licenses_source_properties_gin_idx
  on public.licenses using gin (source_properties);

create table if not exists public.mme_source_files (
  layer_key text primary key,
  layer_label text not null,
  source_url text not null,
  content_hash text,
  source_status integer,
  feature_count integer not null default 0,
  last_fetched_at timestamptz,
  last_processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.license_geometries (
  id bigserial primary key,
  license_id integer not null references public.licenses (id) on delete cascade,
  source_system text not null default 'namibia_mme',
  source_layer text not null,
  source_feature_id text not null,
  geometry_geojson jsonb not null,
  bbox jsonb,
  properties jsonb not null default '{}'::jsonb,
  source_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (source_system, source_layer, source_feature_id),
  check (jsonb_typeof(geometry_geojson) = 'object'),
  check (bbox is null or jsonb_typeof(bbox) = 'array'),
  check (jsonb_typeof(properties) = 'object')
);

create index if not exists license_geometries_license_id_idx
  on public.license_geometries (license_id);

create index if not exists license_geometries_source_layer_idx
  on public.license_geometries (source_layer);

create index if not exists license_geometries_properties_gin_idx
  on public.license_geometries using gin (properties);

create trigger mme_source_files_set_updated_at
before update on public.mme_source_files
for each row execute function public.set_updated_at();

create trigger license_geometries_set_updated_at
before update on public.license_geometries
for each row execute function public.set_updated_at();

create or replace function public.can_access_map()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles profiles
    join public.tiers tiers on tiers.id = profiles.tier_id
    where profiles.id = (select auth.uid())
      and lower(tiers.name) in ('gold', 'platinum', 'admin')
  );
$$;

alter table public.mme_source_files enable row level security;
alter table public.license_geometries enable row level security;

drop policy if exists "gold users can read mme source files" on public.mme_source_files;
create policy "gold users can read mme source files"
on public.mme_source_files
for select
to authenticated
using (public.can_access_map());

drop policy if exists "gold users can read license geometries" on public.license_geometries;
create policy "gold users can read license geometries"
on public.license_geometries
for select
to authenticated
using (public.can_access_map());

drop policy if exists "admins can manage mme source files" on public.mme_source_files;
create policy "admins can manage mme source files"
on public.mme_source_files
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "admins can manage license geometries" on public.license_geometries;
create policy "admins can manage license geometries"
on public.license_geometries
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());
