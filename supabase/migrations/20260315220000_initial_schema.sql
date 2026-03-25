create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'researcher');
create type public.processing_job_status as enum (
  'queued',
  'fetching',
  'parsing',
  'completed',
  'failed'
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

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.app_role not null default 'researcher',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
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
  document_id uuid not null references public.documents (id) on delete cascade,
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
  document_id uuid not null references public.documents (id) on delete cascade,
  job_id uuid references public.processing_jobs (id) on delete set null,
  record_type text not null,
  source_section text,
  confidence numeric(4, 3),
  payload jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index documents_source_domain_idx on public.documents (source_domain);
create index documents_latest_job_status_idx on public.documents (latest_job_status);
create index processing_jobs_document_id_idx on public.processing_jobs (document_id);
create index processing_jobs_status_idx on public.processing_jobs (status);
create index extracted_records_document_id_idx on public.extracted_records (document_id);
create index extracted_records_payload_gin_idx on public.extracted_records using gin (payload);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute procedure public.set_updated_at();

create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.extracted_records enable row level security;

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

create policy "authenticated users can create documents"
on public.documents
for insert
to authenticated
with check (auth.uid() = created_by);

create policy "authenticated users can update documents"
on public.documents
for update
to authenticated
using (true)
with check (true);

create policy "authenticated users can read processing jobs"
on public.processing_jobs
for select
to authenticated
using (true);

create policy "authenticated users can read extracted records"
on public.extracted_records
for select
to authenticated
using (true);
