-- Return auth email for every row. Prior version gated on is_admin_user(), which could
-- evaluate false under SECURITY DEFINER in some setups; directory is already limited
-- to authenticated callers via GRANT EXECUTE.

create or replace function public.list_profiles_for_directory()
returns table (
  id uuid,
  firstname text,
  lastname text,
  tier_id uuid,
  created_at timestamptz,
  tier_name text,
  email text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    p.id,
    p.firstname,
    p.lastname,
    p.tier_id,
    p.created_at,
    t.name::text as tier_name,
    u.email::text as email
  from public.profiles p
  inner join auth.users u on u.id = p.id
  inner join public.tiers t on t.id = p.tier_id
  order by p.created_at desc;
$$;
