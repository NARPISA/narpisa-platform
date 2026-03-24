-- ENUMS
-- processing job status
create type public.processing_job_status as enum (
    'queued', 
    'fetching', 
    'parsing', 
    'completed',
    'failed'
);

-- metric type
create type public.metric_type as enum (
    'water',
    'energy',
    'workers',
    'upkeep',
    'production'
);

-- mine type
create type public.mine_type as enum (
    'open_air', 
    'underground'
);

-- status
create type public.site_status as enum (
    'active',
    'inactive',
    'decommissioned'
);

-- user type
create type public.user_type as enum (
    'admin',
    'researcher'
);


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


-- USERS
-- Extend Supabase auth.users
create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    firstname text,
    lastname text,
    role public.user_type not null default 'researcher',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);


-- BILLING
create table public.tiers (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    price_per_month numeric(10, 2) not null
);

create table public.subscriptions (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles (id) on delete cascade,
    tier_id uuid not null references public.tiers (id) on delete cascade,
    start_date timestamptz not null default timezone('utc', now()),
    end_date timestamptz,
    status text check (status in ('active', 'canceled', 'past_due')) default 'active',
    updated_at timestamptz not null default timezone('utc', now())
);


-- DOCUMENTS & PROCESSING PIPELINE
create table public.documents (
  id serial primary key,
  title text not null,
  source_url text not null unique,
  source_domain text not null,
  attribution text not null,
  notes text,
  mime_type text not null default 'application/pdf',
  content_hash text,
  last_http_status integer,
  last_fetched_at timestamptz,
  latest_processed_at timestamptz,
  latest_job_status public.processing_job_status not null default 'queued',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id integer not null references public.documents (id) on delete cascade,
  status public.processing_job_status not null default 'queued',
  source_http_status integer,
  worker_version text not null default '0.1.0',
  page_count integer,
  extracted_excerpt text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.extracted_records (
  id uuid primary key default gen_random_uuid(),
  document_id integer not null references public.documents (id) on delete cascade,
  job_id uuid references public.processing_jobs (id) on delete set null,
  record_type text not null,
  source_section text,
  confidence numeric(4, 3),
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.citations (
    id serial primary key,
    document_id integer not null references public.documents (id) on delete cascade,
    page_number integer,
    line_number integer
);


-- GEOGRAPHY & SITES
create table public.countries (
    id serial primary key,
    name text not null unique
);

create table public.sites (
    id serial primary key,
    name text not null,
    owner text not null,
    country_id integer references public.countries (id) on delete set null,
    longitude numeric(10, 6) not null,
    latitude numeric(10, 6) not null,
    start_date date,
    end_date date,
    status public.site_status not null default 'active',
    site_type public.mine_type not null,
    updated_at timestamptz not null default timezone('utc', now())
);

create table public.open_air_sites (
    site_id integer primary key references public.sites (id) on delete cascade,
    pit_depth numeric,
    surface_area numeric
);

create table public.underground_sites (
    site_id integer primary key references public.sites (id) on delete cascade,
    shaft_depth numeric,
    tunnel_length numeric
);


-- SITE DATA
create table public.site_data (
    id serial primary key,
    site_id integer not null references public.sites (id) on delete cascade,
    citation_id integer references public.citations (id) on delete cascade,
    metric_type public.metric_type not null,
    value_per_year numeric not null,
    unit text not null,
    yr integer not null,
    updated_at timestamptz not null default timezone('utc', now())
);


-- COMMODITIES
create table public.commodities (
    id serial primary key,
    name text not null unique,
    ore_type text not null
);

create table public.site_commodities (
  site_id integer references public.sites(id) on delete cascade,
  commodity_id integer references public.commodities(id) on delete cascade,
  primary key (site_id, commodity_id)
);



create index documents_source_domain_idx on public.documents (source_domain);
create index documents_latest_job_status_idx on public.documents (latest_job_status);
create index processing_jobs_document_id_idx on public.processing_jobs (document_id);
create index processing_jobs_status_idx on public.processing_jobs (status);
create index extracted_records_document_id_idx on public.extracted_records (document_id);
create index extracted_records_payload_gin_idx on public.extracted_records using gin (payload);
create index sites_country_id_idx on public.sites (country_id);
create index sites_data_site_id_idx on public.site_data (site_id);
create index subscriptions_profile_id_idx on public.subscriptions (profile_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute procedure public.set_updated_at();

create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute procedure public.set_updated_at();

create trigger extracted_records_set_updated_at
before update on public.extracted_records
for each row execute procedure public.set_updated_at();

create trigger site_data_set_updated_at
before update on public.site_data
for each row execute procedure public.set_updated_at();

create trigger sites_set_updated_at
before update on public.sites
for each row execute procedure public.set_updated_at();


alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.extracted_records enable row level security;

alter table public.site_data
add constraint unique_site_metric_year 
unique (site_id, metric_type, yr);


-- drop existing policies first
drop policy if exists "admins can create documents" on public.documents;
drop policy if exists "admins can update documents" on public.documents;
drop policy if exists "admins can delete documents" on public.documents;
drop policy if exists "admins can read processing jobs" on public.processing_jobs;
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
drop policy if exists "users can update their own profile" on public.profiles;
drop policy if exists "authenticated users can read documents" on public.documents;
drop policy if exists "authenticated users can read extracted records" on public.extracted_records;

create policy "admins can create documents"
on public.documents
for insert
to authenticated
with check (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
);

create policy "admins can update documents"
on public.documents
for update
to authenticated
using (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
)
with check (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
);

create policy "admins can delete documents"
on public.documents
for delete
to authenticated
using (
    exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
    )
);

create policy "admins can read processing jobs"
on public.processing_jobs
for select
to authenticated
using (
    exists (
        select 1 from public.profiles 
        where id = auth.uid() and role = 'admin'
    )
);

create policy "profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "authenticated users can read documents"
on public.documents
for select
to authenticated
using (true);

create policy "authenticated users can read extracted records"
on public.extracted_records
for select
to authenticated
using (true);
