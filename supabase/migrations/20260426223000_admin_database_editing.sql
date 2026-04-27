-- Admin database editing metadata, audit trail, and controlled column creation.

alter table public.site_data_fields
  add column if not exists is_visible boolean not null default true,
  add column if not exists enum_options text[] not null default '{}'::text[],
  add column if not exists ui_field text,
  add column if not exists relation_table text,
  add column if not exists relation_label_column text,
  add column if not exists row_key_column text;

create table if not exists public.database_categories (
  id serial primary key,
  label text not null unique,
  source_key text not null unique,
  editable_table text,
  field_registry_table text,
  row_key_column text not null default 'id',
  can_edit_cells boolean not null default true,
  can_add_columns boolean not null default false,
  can_hide_columns boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.database_categories (
  label,
  source_key,
  editable_table,
  field_registry_table,
  row_key_column,
  can_edit_cells,
  can_add_columns,
  can_hide_columns,
  sort_order
)
values
  ('Mines', 'mines', null, 'site_data_fields', 'id', true, true, true, 10),
  ('Commodity Metrics', 'commodity_metrics', 'site_commodity_metrics', null, 'id', true, false, false, 20),
  ('Water Metrics', 'water_metrics', 'site_water_metrics', null, 'id', true, false, false, 30),
  ('Licenses', 'licenses', 'licenses', 'license_data_fields', 'id', true, true, true, 40)
on conflict (source_key) do update
set
  label = excluded.label,
  editable_table = excluded.editable_table,
  field_registry_table = excluded.field_registry_table,
  row_key_column = excluded.row_key_column,
  can_edit_cells = excluded.can_edit_cells,
  can_add_columns = excluded.can_add_columns,
  can_hide_columns = excluded.can_hide_columns,
  sort_order = excluded.sort_order;

create table if not exists public.license_data_fields (
  id serial primary key,
  field_key text not null unique,
  label text not null,
  data_type public.admin_field_data_type not null,
  table_target text not null default 'licenses',
  column_name text not null,
  ui_field text not null,
  relation_table text,
  relation_label_column text,
  row_key_column text not null default 'id',
  enum_options text[] not null default '{}'::text[],
  is_visible boolean not null default true,
  is_admin_editable boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.license_data_fields is
'Registry of fields shown in the Licenses database UI, including dynamic admin-created columns.';

insert into public.license_data_fields (
  field_key,
  label,
  data_type,
  table_target,
  column_name,
  ui_field,
  relation_table,
  relation_label_column,
  row_key_column,
  is_admin_editable,
  sort_order
)
values
  ('type', 'Type', 'text', 'licenses', 'type', 'type', null, null, 'id', true, 10),
  ('country', 'Country', 'foreign_key', 'licenses', 'country_id', 'country', 'countries', 'name', 'id', true, 20),
  ('region', 'Region', 'text', 'licenses', 'region', 'region', null, null, 'id', true, 30),
  ('status', 'Status', 'enum', 'licenses', 'status', 'status', null, null, 'id', true, 40),
  ('applicants', 'Applicants', 'text', 'licenses', 'applicants', 'applicants', null, null, 'id', true, 50),
  ('applicationDate', 'Applied', 'date', 'licenses', 'application_date', 'applicationDate', null, null, 'id', true, 60),
  ('startDate', 'Start', 'date', 'licenses', 'start_date', 'startDate', null, null, 'id', true, 70),
  ('endDate', 'End', 'date', 'licenses', 'end_date', 'endDate', null, null, 'id', true, 80)
on conflict (field_key) do update
set
  label = excluded.label,
  data_type = excluded.data_type,
  table_target = excluded.table_target,
  column_name = excluded.column_name,
  ui_field = excluded.ui_field,
  relation_table = excluded.relation_table,
  relation_label_column = excluded.relation_label_column,
  row_key_column = excluded.row_key_column,
  is_admin_editable = excluded.is_admin_editable,
  sort_order = excluded.sort_order;

insert into public.site_data_fields (
  field_key,
  label,
  data_type,
  table_target,
  column_name,
  ui_field,
  relation_table,
  relation_label_column,
  row_key_column,
  subtype_scope,
  is_admin_editable,
  sort_order
)
values
  ('mine', 'Mine', 'text', 'sites', 'name', 'mine', null, null, 'id', null, true, 1),
  ('owner', 'Owner', 'text', 'sites', 'owner', 'owner', null, null, 'id', null, true, 2),
  ('country_id', 'Country', 'foreign_key', 'sites', 'country_id', 'country', 'countries', 'name', 'id', null, true, 10),
  ('stage', 'Stage', 'enum', 'site_data', 'stage', 'stage', null, null, 'site_id', null, true, 20),
  ('site_type', 'Type', 'enum', 'sites', 'site_type', 'type', null, null, 'id', null, true, 30),
  ('status', 'Status', 'enum', 'sites', 'status', 'status', null, null, 'id', null, true, 35),
  ('latitude', 'Latitude', 'numeric', 'site_data', 'latitude', 'latitude', null, null, 'site_id', null, true, 40),
  ('longitude', 'Longitude', 'numeric', 'site_data', 'longitude', 'longitude', null, null, 'site_id', null, true, 50),
  ('lifetime_of_mine_years', 'Lifetime of Mine', 'numeric', 'site_data', 'lifetime_of_mine_years', 'lifetimeOfMine', null, null, 'site_id', null, true, 60),
  ('shaft_depth', 'Shaft Depth', 'numeric', 'underground_sites', 'shaft_depth', 'shaftDepth', null, null, 'site_id', 'underground', true, 70),
  ('tunnel_length', 'Tunnel Length', 'numeric', 'underground_sites', 'tunnel_length', 'tunnelLength', null, null, 'site_id', 'underground', true, 80),
  ('pit_depth', 'Pit Depth', 'numeric', 'open_air_sites', 'pit_depth', 'pitDepth', null, null, 'site_id', 'open_air', true, 90),
  ('surface_area', 'Surface Area', 'numeric', 'open_air_sites', 'surface_area', 'surfaceArea', null, null, 'site_id', 'open_air', true, 100)
on conflict (field_key) do update
set
  label = excluded.label,
  data_type = excluded.data_type,
  table_target = excluded.table_target,
  column_name = excluded.column_name,
  ui_field = excluded.ui_field,
  relation_table = excluded.relation_table,
  relation_label_column = excluded.relation_label_column,
  row_key_column = excluded.row_key_column,
  subtype_scope = excluded.subtype_scope,
  is_admin_editable = excluded.is_admin_editable,
  sort_order = excluded.sort_order;

create table if not exists public.admin_manual_edits (
  id bigserial primary key,
  category text not null,
  table_name text not null,
  row_id text not null,
  field_key text not null,
  old_value jsonb,
  new_value jsonb,
  provenance jsonb not null default '{}'::jsonb,
  edited_by uuid references auth.users (id) on delete set null,
  edited_by_email text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint admin_manual_edits_provenance_object
    check (jsonb_typeof(provenance) = 'object')
);

create index if not exists admin_manual_edits_category_row_idx
  on public.admin_manual_edits (category, row_id);

alter table public.license_data_fields enable row level security;
alter table public.admin_manual_edits enable row level security;
alter table public.database_categories enable row level security;

create policy "public users can read database categories"
on public.database_categories
for select
to anon, authenticated
using (true);

create policy "admins can manage database categories"
on public.database_categories
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "public users can read license data fields"
on public.license_data_fields
for select
to anon, authenticated
using (true);

create policy "admins can manage license data fields"
on public.license_data_fields
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admins can read manual edits"
on public.admin_manual_edits
for select
to authenticated
using (public.is_admin_user());

create policy "admins can create manual edits"
on public.admin_manual_edits
for insert
to authenticated
with check (public.is_admin_user());

create or replace function public.admin_create_database_column(
  target_category text,
  column_label text,
  data_type public.admin_field_data_type,
  enum_options text[] default '{}'::text[]
)
returns table(field_key text, column_name text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_key text;
  target_table text;
  sql_type text;
  next_order integer;
begin
  target_category := lower(trim(target_category));

  if target_category not in ('mines', 'licenses') then
    raise exception 'Columns can only be added to Mines or Licenses.';
  end if;

  normalized_key := lower(regexp_replace(trim(column_label), '[^a-zA-Z0-9]+', '_', 'g'));
  normalized_key := trim(both '_' from normalized_key);

  if normalized_key !~ '^[a-z][a-z0-9_]{0,50}$' then
    raise exception 'Column name must start with a letter and contain only letters, numbers, and underscores.';
  end if;

  sql_type := case data_type
    when 'text' then 'text'
    when 'numeric' then 'numeric'
    when 'integer' then 'integer'
    when 'boolean' then 'boolean'
    when 'date' then 'date'
    when 'enum' then 'text'
    else null
  end;

  if sql_type is null then
    raise exception 'Unsupported datatype for admin-created columns.';
  end if;

  target_table := case target_category
    when 'mines' then 'site_data'
    else 'licenses'
  end;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = target_table
      and column_name = normalized_key
  ) then
    raise exception 'Column % already exists on %.', normalized_key, target_table;
  end if;

  execute format('alter table public.%I add column %I %s', target_table, normalized_key, sql_type);

  if target_category = 'mines' then
    select coalesce(max(sort_order), 100) + 10 into next_order
    from public.site_data_fields;

    insert into public.site_data_fields (
      field_key,
      label,
      data_type,
      table_target,
      column_name,
      ui_field,
      row_key_column,
      enum_options,
      sort_order
    )
    values (
      normalized_key,
      trim(column_label),
      data_type,
      'site_data',
      normalized_key,
      normalized_key,
      'site_id',
      coalesce(enum_options, '{}'::text[]),
      next_order
    );
  else
    select coalesce(max(sort_order), 100) + 10 into next_order
    from public.license_data_fields;

    insert into public.license_data_fields (
      field_key,
      label,
      data_type,
      column_name,
      ui_field,
      enum_options,
      sort_order
    )
    values (
      normalized_key,
      trim(column_label),
      data_type,
      normalized_key,
      normalized_key,
      coalesce(enum_options, '{}'::text[]),
      next_order
    );
  end if;

  field_key := normalized_key;
  column_name := normalized_key;
  return next;
end;
$$;

revoke all on function public.admin_create_database_column(
  text,
  text,
  public.admin_field_data_type,
  text[]
) from public, anon, authenticated;

grant execute on function public.admin_create_database_column(
  text,
  text,
  public.admin_field_data_type,
  text[]
) to service_role;
