-- ENUMS
create type public.processing_job_status as enum (
    'queued',
    'fetching',
    'parsing',
    'completed',
    'failed'
);

create type public.mine_type as enum (
    'open_air',
    'underground'
);

create type public.site_status as enum (
    'active',
    'inactive',
    'decommissioned'
);

create type public.user_type as enum (
    'admin',
    'researcher'
);

create type public.site_stage as enum (
    'pea',
    'pfs',
    'fs',
    'permitting',
    'construction',
    'production'
);

create type public.site_fact_value_type as enum (
    'numeric',
    'text',
    'boolean',
    'date',
    'json'
);

create type public.site_fact_status as enum (
    'candidate',
    'accepted',
    'rejected',
    'superseded'
);

create type public.site_table_target as enum (
    'sites',
    'site_data',
    'underground_sites',
    'open_air_sites',
    'site_water_metrics',
    'site_commodity_metrics'
);

create type public.admin_field_data_type as enum (
    'text',
    'numeric',
    'integer',
    'boolean',
    'date',
    'json',
    'enum',
    'foreign_key'
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
create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    firstname text,
    lastname text,
    role public.user_type not null default 'researcher',
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = (select auth.uid()) and p.role = 'admin'
    );
$$;

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
    payload jsonb not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create table public.citations (
    id serial primary key,
    document_id integer not null references public.documents (id) on delete cascade,
    page_from integer,
    page_to integer,
    line_from integer,
    line_to integer,
    section_name text,
    locator_text text,
    quote_text text,
    created_at timestamptz not null default timezone('utc', now())
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
    start_date date,
    end_date date,
    status public.site_status not null default 'active',
    site_type public.mine_type not null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.sites is
'Base site table. Treat this as the superclass for all mining site types.';

create table public.site_data (
    site_id integer primary key references public.sites (id) on delete cascade,
    stage public.site_stage,
    latitude numeric(10, 6),
    longitude numeric(10, 6),
    lifetime_of_mine_years numeric(8, 2),
    field_packets jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint site_data_field_packets_object
        check (jsonb_typeof(field_packets) = 'object')
);

comment on table public.site_data is
'Admin-facing current site profile for fields shared across site types. Use subtype tables for type-specific attributes and site_facts for provenance.';

comment on column public.site_data.field_packets is
'JSON object keyed by field name. Each value can store the selected fact_id, source details, and upload timestamp for the currently surfaced value.';

create table public.open_air_sites (
    site_id integer primary key references public.sites (id) on delete cascade,
    pit_depth numeric,
    surface_area numeric,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.open_air_sites is
'Subtype table for open-pit / open-air mines.';

create table public.underground_sites (
    site_id integer primary key references public.sites (id) on delete cascade,
    shaft_depth numeric,
    tunnel_length numeric,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.underground_sites is
'Subtype table for underground mines.';

create table public.site_data_fields (
    id serial primary key,
    field_key text not null unique,
    label text not null,
    data_type public.admin_field_data_type not null,
    table_target public.site_table_target not null,
    column_name text not null,
    subtype_scope public.mine_type,
    is_active boolean not null default true,
    is_llm_exposed boolean not null default true,
    is_admin_editable boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default timezone('utc', now())
);

comment on table public.site_data_fields is
'Registry of fields shown to the admin UI and LLM parser, including which table/column each field maps to.';


-- NOTE: Site order 
-- The field_key is used to identify the field in the database.
-- The label is used to display the field in the admin UI.
-- The data_type is used to define the data type of the field.
-- The table_target is used to define the table that the field belongs to.
-- The column_name is used to define the column that the field belongs to.
-- The subtype_scope is used to define the subtype that the field belongs to.
-- The sort_order is used to define the sort order of the field in the admin UI.

insert into public.site_data_fields (
    field_key,
    label,
    data_type,
    table_target,
    column_name,
    subtype_scope,
    sort_order
)
values
    ('country_id', 'Country', 'foreign_key', 'sites', 'country_id', null, 10),
    ('stage', 'Stage', 'enum', 'site_data', 'stage', null, 20),
    ('site_type', 'Type', 'enum', 'sites', 'site_type', null, 30),
    ('latitude', 'Latitude', 'numeric', 'site_data', 'latitude', null, 40),
    ('longitude', 'Longitude', 'numeric', 'site_data', 'longitude', null, 50),
    ('lifetime_of_mine_years', 'Lifetime of Mine', 'numeric', 'site_data', 'lifetime_of_mine_years', null, 60),
    ('shaft_depth', 'Shaft Depth', 'numeric', 'underground_sites', 'shaft_depth', 'underground', 70),
    ('tunnel_length', 'Tunnel Length', 'numeric', 'underground_sites', 'tunnel_length', 'underground', 80),
    ('pit_depth', 'Pit Depth', 'numeric', 'open_air_sites', 'pit_depth', 'open_air', 90),
    ('surface_area', 'Surface Area', 'numeric', 'open_air_sites', 'surface_area', 'open_air', 100);

create table public.site_water_metric_definitions (
    id serial primary key,
    metric_key text not null unique,
    label text not null,
    default_unit text,
    sort_order integer not null default 0,
    created_at timestamptz not null default timezone('utc', now())
);

insert into public.site_water_metric_definitions (
    metric_key,
    label,
    default_unit,
    sort_order
)
values
    ('groundwater', 'Groundwater', 'ML', 10),
    ('fresh_water', 'Fresh water', 'ML', 20),
    ('recycled_water', 'Recycled water', 'ML', 30),
    ('total_water', 'Total water', 'ML', 40),
    ('water_use_efficiency', 'Water use efficiency', 'kL/t', 50);

create table public.site_commodity_metric_definitions (
    id serial primary key,
    metric_key text not null unique,
    label text not null,
    default_unit text,
    commodity_scoped boolean not null default false,
    sort_order integer not null default 0,
    created_at timestamptz not null default timezone('utc', now())
);

insert into public.site_commodity_metric_definitions (
    metric_key,
    label,
    default_unit,
    commodity_scoped,
    sort_order
)
values
    ('annual_milling_capacity', 'Annual milling capacity', 'kt', false, 10),
    ('ore_tonnes_mined', 'Ore tonnes mined', 'kt', true, 20),
    ('tonnes_milled', 'Tonnes milled', 'kt', true, 30),
    ('stripping_ratio', 'Stripping ratio', null, true, 40),
    ('waste', 'Waste', 'kt', true, 50),
    ('total_tonnes_mined', 'Total tonnes mined', 'kt', false, 60);

-- COMMODITIES
create table public.commodities (
    id serial primary key,
    name text not null unique,
    ore_type text not null
);

create table public.site_commodities (
    site_id integer references public.sites(id) on delete cascade,
    commodity_id integer references public.commodities(id) on delete cascade,
    created_at timestamptz not null default timezone('utc', now()),
    primary key (site_id, commodity_id)
);

create table public.site_facts (
    id uuid primary key default gen_random_uuid(),
    site_id integer not null references public.sites (id) on delete cascade,
    document_id integer references public.documents (id) on delete set null,
    citation_id integer references public.citations (id) on delete set null,
    extracted_record_id uuid references public.extracted_records (id) on delete set null,
    commodity_id integer references public.commodities (id) on delete set null,
    field_key text not null,
    table_target public.site_table_target not null,
    subtype_scope public.mine_type,
    value_type public.site_fact_value_type not null,
    value_numeric numeric,
    value_text text,
    value_boolean boolean,
    value_date date,
    value_json jsonb,
    effective_year integer,
    unit text,
    project_label text,
    status public.site_fact_status not null default 'candidate',
    provenance jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint site_facts_exactly_one_value check (
        (
            (value_numeric is not null)::integer +
            (value_text is not null)::integer +
            (value_boolean is not null)::integer +
            (value_date is not null)::integer +
            (value_json is not null)::integer
        ) = 1
    ),
    constraint site_facts_provenance_object
        check (jsonb_typeof(provenance) = 'object')
);

comment on table public.site_facts is
'Append-only fact ledger. Each row is one sourced claim about a base site field, subtype attribute, or year-by-year metric.';

comment on column public.site_facts.provenance is
'JSON packet containing source metadata such as document_id, source_url, quote, upload timestamp, parser version, and admin review notes.';

create table public.site_water_metrics (
    id bigserial primary key,
    site_id integer not null references public.sites (id) on delete cascade,
    definition_id integer not null references public.site_water_metric_definitions (id) on delete restrict,
    yr integer not null,
    value_numeric numeric not null,
    unit text not null,
    project_label text,
    fact_id uuid references public.site_facts (id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.site_water_metrics is
'Current accepted year-by-year water metrics for each site.';

create table public.site_commodity_metrics (
    id bigserial primary key,
    site_id integer not null references public.sites (id) on delete cascade,
    commodity_id integer references public.commodities (id) on delete set null,
    definition_id integer not null references public.site_commodity_metric_definitions (id) on delete restrict,
    yr integer not null,
    value_numeric numeric not null,
    unit text not null,
    project_label text,
    fact_id uuid references public.site_facts (id) on delete set null,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.site_commodity_metrics is
'Current accepted year-by-year mining and processing metrics for each site and commodity when applicable.';

-- LICENSES
create table public.licenses (
    id serial primary key,
    type text not null,
    country_id integer references public.countries (id) on delete cascade,
    region text,
    status text check (status in ('active', 'inactive')) default 'active',
    applicants text[] not null,
    application_date date not null,
    start_date date,
    end_date date,
    check (end_date is null or end_date >= start_date)
);

-- INDEXES
create index documents_source_domain_idx on public.documents (source_domain);
create index documents_latest_job_status_idx on public.documents (latest_job_status);
create index processing_jobs_document_id_idx on public.processing_jobs (document_id);
create index processing_jobs_status_idx on public.processing_jobs (status);
create index extracted_records_document_id_idx on public.extracted_records (document_id);
create index extracted_records_payload_gin_idx on public.extracted_records using gin (payload);
create index citations_document_id_idx on public.citations (document_id);
create index sites_country_id_idx on public.sites (country_id);
create index subscriptions_profile_id_idx on public.subscriptions (profile_id);
create index subscriptions_tier_id_idx on public.subscriptions (tier_id);
create index documents_created_by_idx on public.documents (created_by);
create index site_data_stage_idx on public.site_data (stage);
create index extracted_records_job_id_idx on public.extracted_records (job_id);
create index site_commodities_commodity_id_idx on public.site_commodities (commodity_id);
create index site_facts_site_field_idx on public.site_facts (site_id, field_key);
create index site_facts_site_field_year_idx on public.site_facts (site_id, field_key, effective_year);
create index site_facts_status_idx on public.site_facts (status);
create index site_facts_document_id_idx on public.site_facts (document_id);
create index site_facts_citation_id_idx on public.site_facts (citation_id);
create index site_facts_extracted_record_id_idx on public.site_facts (extracted_record_id);
create index site_facts_commodity_id_idx on public.site_facts (commodity_id);
create index site_facts_provenance_gin_idx on public.site_facts using gin (provenance);
create index site_water_metrics_definition_id_idx on public.site_water_metrics (definition_id);
create index site_water_metrics_fact_id_idx on public.site_water_metrics (fact_id);
create index site_commodity_metrics_commodity_id_idx on public.site_commodity_metrics (commodity_id);
create index site_commodity_metrics_definition_id_idx on public.site_commodity_metrics (definition_id);
create index site_commodity_metrics_fact_id_idx on public.site_commodity_metrics (fact_id);
create index licenses_country_id_idx on public.licenses (country_id);

create unique index site_water_metrics_unique_idx
on public.site_water_metrics (
    site_id,
    definition_id,
    yr,
    coalesce(project_label, '')
);

create unique index site_commodity_metrics_unique_idx
on public.site_commodity_metrics (
    site_id,
    coalesce(commodity_id, 0),
    definition_id,
    yr,
    coalesce(project_label, '')
);

-- TRIGGERS
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

create trigger sites_set_updated_at
before update on public.sites
for each row execute procedure public.set_updated_at();

create trigger site_data_set_updated_at
before update on public.site_data
for each row execute procedure public.set_updated_at();

create trigger open_air_sites_set_updated_at
before update on public.open_air_sites
for each row execute procedure public.set_updated_at();

create trigger underground_sites_set_updated_at
before update on public.underground_sites
for each row execute procedure public.set_updated_at();

create trigger site_facts_set_updated_at
before update on public.site_facts
for each row execute procedure public.set_updated_at();

create trigger site_water_metrics_set_updated_at
before update on public.site_water_metrics
for each row execute procedure public.set_updated_at();

create trigger site_commodity_metrics_set_updated_at
before update on public.site_commodity_metrics
for each row execute procedure public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.tiers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.documents enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.extracted_records enable row level security;
alter table public.citations enable row level security;
alter table public.countries enable row level security;
alter table public.sites enable row level security;
alter table public.site_data enable row level security;
alter table public.open_air_sites enable row level security;
alter table public.underground_sites enable row level security;
alter table public.site_data_fields enable row level security;
alter table public.site_water_metric_definitions enable row level security;
alter table public.site_commodity_metric_definitions enable row level security;
alter table public.commodities enable row level security;
alter table public.site_commodities enable row level security;
alter table public.site_facts enable row level security;
alter table public.site_water_metrics enable row level security;
alter table public.site_commodity_metrics enable row level security;
alter table public.licenses enable row level security;

create policy "admins can create documents"
on public.documents
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update documents"
on public.documents
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete documents"
on public.documents
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can read processing jobs"
on public.processing_jobs
for select
to authenticated
using (public.is_admin_user());

create policy "profiles are readable by authenticated users"
on public.profiles
for select
to authenticated
using (true);

create policy "public users can read tiers"
on public.tiers
for select
to anon, authenticated
using (true);

create policy "users can read their own subscriptions"
on public.subscriptions
for select
to authenticated
using (public.is_admin_user() or (select auth.uid()) = profile_id);

create policy "users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "public users can read documents"
on public.documents
for select
to anon, authenticated
using (true);

create policy "public users can read extracted records"
on public.extracted_records
for select
to anon, authenticated
using (true);

create policy "public users can read citations"
on public.citations
for select
to anon, authenticated
using (true);

create policy "public users can read countries"
on public.countries
for select
to anon, authenticated
using (true);

create policy "public users can read sites"
on public.sites
for select
to anon, authenticated
using (true);

create policy "public users can read site data"
on public.site_data
for select
to anon, authenticated
using (true);

create policy "public users can read open air sites"
on public.open_air_sites
for select
to anon, authenticated
using (true);

create policy "public users can read underground sites"
on public.underground_sites
for select
to anon, authenticated
using (true);

create policy "public users can read site data fields"
on public.site_data_fields
for select
to anon, authenticated
using (true);

create policy "public users can read water metric definitions"
on public.site_water_metric_definitions
for select
to anon, authenticated
using (true);

create policy "public users can read commodity metric definitions"
on public.site_commodity_metric_definitions
for select
to anon, authenticated
using (true);

create policy "public users can read commodities"
on public.commodities
for select
to anon, authenticated
using (true);

create policy "public users can read site commodities"
on public.site_commodities
for select
to anon, authenticated
using (true);

create policy "public users can read site facts"
on public.site_facts
for select
to anon, authenticated
using (true);

create policy "public users can read site water metrics"
on public.site_water_metrics
for select
to anon, authenticated
using (true);

create policy "public users can read site commodity metrics"
on public.site_commodity_metrics
for select
to anon, authenticated
using (true);

create policy "public users can read licenses"
on public.licenses
for select
to anon, authenticated
using (true);

create policy "admins can manage citations"
on public.citations
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update citations"
on public.citations
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete citations"
on public.citations
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage countries"
on public.countries
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update countries"
on public.countries
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete countries"
on public.countries
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage sites"
on public.sites
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update sites"
on public.sites
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete sites"
on public.sites
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage site data"
on public.site_data
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update site data"
on public.site_data
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete site data"
on public.site_data
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage open air sites"
on public.open_air_sites
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update open air sites"
on public.open_air_sites
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete open air sites"
on public.open_air_sites
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage underground sites"
on public.underground_sites
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update underground sites"
on public.underground_sites
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete underground sites"
on public.underground_sites
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage site data fields"
on public.site_data_fields
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update site data fields"
on public.site_data_fields
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete site data fields"
on public.site_data_fields
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage water metric definitions"
on public.site_water_metric_definitions
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update water metric definitions"
on public.site_water_metric_definitions
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete water metric definitions"
on public.site_water_metric_definitions
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage commodity metric definitions"
on public.site_commodity_metric_definitions
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update commodity metric definitions"
on public.site_commodity_metric_definitions
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete commodity metric definitions"
on public.site_commodity_metric_definitions
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage commodities"
on public.commodities
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update commodities"
on public.commodities
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete commodities"
on public.commodities
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage site commodities"
on public.site_commodities
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update site commodities"
on public.site_commodities
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete site commodities"
on public.site_commodities
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage site facts"
on public.site_facts
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update site facts"
on public.site_facts
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete site facts"
on public.site_facts
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage site water metrics"
on public.site_water_metrics
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update site water metrics"
on public.site_water_metrics
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete site water metrics"
on public.site_water_metrics
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage site commodity metrics"
on public.site_commodity_metrics
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update site commodity metrics"
on public.site_commodity_metrics
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete site commodity metrics"
on public.site_commodity_metrics
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can manage licenses"
on public.licenses
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update licenses"
on public.licenses
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete licenses"
on public.licenses
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can create tiers"
on public.tiers
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update tiers"
on public.tiers
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete tiers"
on public.tiers
for delete
to authenticated
using (public.is_admin_user());

create policy "admins can create subscriptions"
on public.subscriptions
for insert
to authenticated
with check (public.is_admin_user());

create policy "admins can update subscriptions"
on public.subscriptions
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can delete subscriptions"
on public.subscriptions
for delete
to authenticated
using (public.is_admin_user());
