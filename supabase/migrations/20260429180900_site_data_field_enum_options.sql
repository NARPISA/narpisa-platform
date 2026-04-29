-- Populate enum metadata for dynamic field parsing and admin-created columns.

alter table public.site_data_fields
  add column if not exists enum_options text[];

alter table public.site_data_fields
  alter column enum_options drop not null,
  alter column enum_options drop default;

alter table if exists public.license_data_fields
  alter column enum_options drop not null,
  alter column enum_options drop default;

comment on column public.site_data_fields.enum_options is
'Allowed database values for enum fields. Null for non-enum fields.';

comment on column public.license_data_fields.enum_options is
'Allowed database values for enum fields. Null for non-enum fields.';

update public.site_data_fields
set enum_options = null
where data_type <> 'enum';

update public.site_data_fields
set enum_options = array(
  select unnest(enum_range(null::public.site_stage))::text
)
where field_key = 'stage';

update public.site_data_fields
set enum_options = array(
  select unnest(enum_range(null::public.mine_type))::text
)
where field_key = 'site_type';

update public.site_data_fields
set enum_options = array(
  select unnest(enum_range(null::public.site_status))::text
)
where field_key = 'status';

update public.license_data_fields
set enum_options = null
where data_type <> 'enum';

update public.license_data_fields
set enum_options = array['active', 'inactive']::text[]
where field_key = 'status';

create or replace function public.admin_create_database_column(
  target_category text,
  column_label text,
  data_type public.admin_field_data_type,
  enum_options text[] default null
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
  clean_enum_options text[];
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

  if data_type = 'enum' then
    select array_agg(option_value order by first_seen)
    into clean_enum_options
    from (
      select
        normalized.option_value,
        min(normalized.ordinality) as first_seen
      from (
        select
          trim(both '_' from lower(regexp_replace(trim(option), '[^a-zA-Z0-9]+', '_', 'g'))) as option_value,
          ordinality
        from unnest(enum_options) with ordinality as options(option, ordinality)
        where trim(option) <> ''
      ) as normalized
      where normalized.option_value <> ''
      group by normalized.option_value
    ) as deduped;

    if coalesce(array_length(clean_enum_options, 1), 0) = 0 then
      raise exception 'Enum columns require at least one option.';
    end if;
  else
    clean_enum_options := null;
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
      clean_enum_options,
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
      clean_enum_options,
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
