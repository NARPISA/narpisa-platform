-- Directory RPC: profiles + tier name + auth email (SECURITY DEFINER to read auth.users).
-- Callable only by authenticated role (see GRANT below).

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

revoke all on function public.list_profiles_for_directory() from public;
grant execute on function public.list_profiles_for_directory() to authenticated;
