-- Move profile authorization from the legacy user_type enum to the tiers table,
-- and ensure every Supabase Auth user has a matching public.profiles row.

insert into public.tiers (id, name, description, price_per_month)
values
  ('004c839a-0f41-4a32-861c-62544968b4b0', 'Silver', 'Data Exporting
Precise Filtering', 1.00),
  ('6ff8cf79-8184-4e69-bfaa-c67a947206e0', 'Platinum', 'Networking Hub + Gold', 3.00),
  ('9580e38a-6744-4ba0-906e-577e00fa2465', 'basic', 'default account', 0.00),
  ('aac14783-eb24-45d0-b949-e82c8d0320a1', 'gold', 'Map Access + Silver features', 2.00),
  ('bb175e87-94a3-4839-b55a-8acbe0a98ee9', 'Admin', 'Admin privs', 0.00)
on conflict (name) do update
set
  description = excluded.description,
  price_per_month = excluded.price_per_month;

alter table public.profiles
  add column if not exists tier_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_tier_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_tier_id_fkey
      foreign key (tier_id)
      references public.tiers (id)
      not valid;
  end if;
end;
$$;

do $$
declare
  basic_tier_id uuid;
  admin_tier_id uuid;
begin
  select id into basic_tier_id
  from public.tiers
  where lower(name) = 'basic'
  limit 1;

  select id into admin_tier_id
  from public.tiers
  where lower(name) = 'admin'
  limit 1;

  if basic_tier_id is null then
    raise exception 'Missing required basic tier.';
  end if;

  if admin_tier_id is null then
    raise exception 'Missing required Admin tier.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    update public.profiles
    set tier_id = case
      when role::text = 'admin' then admin_tier_id
      else basic_tier_id
    end
    where tier_id is null;
  else
    update public.profiles
    set tier_id = basic_tier_id
    where tier_id is null;
  end if;

  insert into public.profiles (id, tier_id)
  select users.id, basic_tier_id
  from auth.users
  where not exists (
    select 1
    from public.profiles profiles
    where profiles.id = users.id
  );
end;
$$;

alter table public.profiles
  alter column tier_id set not null;

alter table public.profiles
  validate constraint profiles_tier_id_fkey;

create index if not exists profiles_tier_id_idx
  on public.profiles (tier_id);

create or replace function public.is_admin_user()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles profiles
    join public.tiers tiers on tiers.id = profiles.tier_id
    where profiles.id = (select auth.uid())
      and lower(tiers.name) = 'admin'
  );
$$;

create schema if not exists app_private;
revoke all on schema app_private from public;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  basic_tier_id uuid;
begin
  select id into basic_tier_id
  from public.tiers
  where lower(name) = 'basic'
  limit 1;

  if basic_tier_id is null then
    raise exception 'Missing required basic tier.';
  end if;

  insert into public.profiles (id, firstname, lastname, tier_id)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'firstname',
      new.raw_user_meta_data ->> 'first_name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'lastname',
      new.raw_user_meta_data ->> 'last_name'
    ),
    basic_tier_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

create or replace function app_private.prevent_non_admin_profile_tier_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.tier_id is distinct from new.tier_id
    and coalesce((select auth.role()), '') <> 'service_role'
    and not exists (
      select 1
      from public.profiles profiles
      join public.tiers tiers on tiers.id = profiles.tier_id
      where profiles.id = (select auth.uid())
        and lower(tiers.name) = 'admin'
    )
  then
    raise exception 'Only admins can update profile tiers.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_non_admin_tier_update on public.profiles;
drop function if exists public.prevent_non_admin_profile_tier_update();

create trigger profiles_prevent_non_admin_tier_update
before update of tier_id on public.profiles
for each row execute function app_private.prevent_non_admin_profile_tier_update();

drop policy if exists "users can update their own profile" on public.profiles;
drop policy if exists "users can update their own profile fields" on public.profiles;
drop policy if exists "admins can update profiles" on public.profiles;

create policy "users can update their own profile fields"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke update on public.profiles from anon, authenticated;
grant update (firstname, lastname, tier_id) on public.profiles to authenticated;

alter table public.profiles
  drop column if exists role;

drop type if exists public.user_type;