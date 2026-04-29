-- Store auth email on public.profiles so the web app can read it via PostgREST.
-- Joining auth.users from client-callable RPCs is unreliable in hosted Supabase.

alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists linkedin_url text;

update public.profiles profiles
set email = users.email
from auth.users users
where users.id = profiles.id
  and (profiles.email is null or profiles.email is distinct from users.email);

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

  insert into public.profiles (id, firstname, lastname, tier_id, email)
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
    basic_tier_id,
    new.email
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email);

  return new;
end;
$$;

create or replace function app_private.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles
  set email = new.email
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
execute function app_private.sync_profile_email_from_auth();

grant update (firstname, lastname, tier_id, linkedin_url) on public.profiles to authenticated;

drop function if exists public.list_profiles_for_directory();
